import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { pageOf } from '../../../test/fixtures';
import { api, apiError, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';

vi.setConfig({ testTimeout: 30_000 });

const userFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-2',
  email: 'sara@example.com',
  name: 'Sara Tesfaye',
  role: 'user',
  status: 'active',
  createdAt: '2026-10-01T09:00:00.000Z',
  courseCount: 2,
  enrollmentCount: 5,
  ...overrides,
});

describe('users list', () => {
  it('search and filters live in the URL and reach the API', async () => {
    const queries: Record<string, string>[] = [];
    server.use(
      http.get(api('/admin/users'), ({ request }) => {
        queries.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json(pageOf([userFixture()]));
      }),
    );
    const { user, router } = await renderRoute('/admin/users?role=%22admin%22', { as: 'admin' });
    const table = await screen.findByRole('table', { name: 'Users' });
    expect(within(table).getByRole('link', { name: 'Sara Tesfaye' })).toHaveAttribute(
      'href',
      '/admin/users/user-2',
    );
    expect(within(table).getByRole('link', { name: 'Manage Sara Tesfaye' })).toBeVisible();
    // The counts, and the user's email under the name.
    const row = within(
      within(table)
        .getByRole('rowheader', { name: /Sara Tesfaye/ })
        .closest('tr') as HTMLElement,
    );
    expect(row.getByText('sara@example.com')).toBeVisible();
    expect(row.getByText('2')).toBeInTheDocument();
    expect(row.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('1 user')).toBeVisible();
    expect(queries.at(-1)).toEqual({ role: 'admin', page: '1', pageSize: '20' });

    // Role and status are chips; "All roles" clears the role.
    const roles = screen.getByRole('group', { name: 'Role' });
    expect(within(roles).getByRole('button', { name: 'Admins' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(
      within(screen.getByRole('group', { name: 'Account' })).getByRole('button', {
        name: 'Suspended',
      }),
    );
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ role: 'admin', status: 'suspended' });
    });
    await user.click(within(roles).getByRole('button', { name: 'All roles' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ status: 'suspended' });
    });

    await user.type(screen.getByRole('searchbox', { name: 'Search by name or email' }), 'sara');
    await waitFor(() => {
      expect(router.state.location.search).toEqual({ status: 'suspended', q: 'sara' });
    });
    await waitFor(() => {
      expect(queries.at(-1)).toEqual({
        status: 'suspended',
        q: 'sara',
        page: '1',
        pageSize: '20',
      });
    });
  });

  it('says when nothing matches and clears the filters', async () => {
    server.use(http.get(api('/admin/users'), () => HttpResponse.json(pageOf([]))));
    const { user, router } = await renderRoute('/admin/users?status=%22suspended%22', {
      as: 'admin',
    });
    expect(await screen.findByRole('heading', { name: 'No users match' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => {
      expect(router.state.location.search).toEqual({});
    });
  });

  it('shows an error state with retry', async () => {
    server.use(http.get(api('/admin/users'), () => apiError(500)));
    await renderRoute('/admin/users', { as: 'admin' });
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  });
});

describe('user detail: role and status', () => {
  /** Stateful: a successful change is what the next GET returns. */
  function mockUser(role: () => Response, status?: () => Response) {
    const bodies: unknown[] = [];
    let current = userFixture();
    const record = async (response: Response) => {
      if (response.ok) current = ((await response.clone().json()) as { user: typeof current }).user;
      return response;
    };
    server.use(
      http.get(api('/admin/users/user-2'), () => HttpResponse.json(current)),
      http.patch(api('/admin/users/user-2/role'), async ({ request }) => {
        bodies.push(await request.json());
        return record(role());
      }),
      ...(status
        ? [
            http.patch(api('/admin/users/user-2/status'), async ({ request }) => {
              bodies.push(await request.json());
              return record(status());
            }),
          ]
        : []),
    );
    return bodies;
  }

  async function makeAdmin() {
    const view = await renderRoute('/admin/users/user-2', { as: 'admin' });
    await view.user.click(await screen.findByRole('button', { name: 'Make administrator' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Make Sara Tesfaye an administrator?',
    });
    await view.user.click(within(dialog).getByRole('button', { name: 'Make administrator' }));
    return view;
  }

  it('changes the role after a confirmation; a claim not synced yet is a note', async () => {
    const bodies = mockUser(() =>
      HttpResponse.json({ user: userFixture({ role: 'admin' }), claimSynced: false }),
    );
    await makeAdmin();
    await waitFor(() => {
      expect(bodies).toEqual([{ role: 'admin' }]);
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'The role is saved. Their app may show the old role until they next sign in.',
    );
    expect(await screen.findByRole('button', { name: 'Remove administrator role' })).toBeVisible();
  });

  it('explains SELF_CHANGE_FORBIDDEN', async () => {
    mockUser(() => apiError(403, { code: 'SELF_CHANGE_FORBIDDEN' }));
    await makeAdmin();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "You can't change your own role or status. Ask another administrator.",
    );
  });

  it('explains LAST_ADMIN', async () => {
    mockUser(() => apiError(409, { code: 'LAST_ADMIN' }));
    await makeAdmin();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The platform needs at least one active administrator.',
    );
  });

  it('suspends after a confirmation', async () => {
    const bodies = mockUser(
      () => apiError(500),
      () =>
        HttpResponse.json({ user: userFixture({ status: 'suspended' }), sessionsRevoked: true }),
    );
    const { user } = await renderRoute('/admin/users/user-2', { as: 'admin' });
    await user.click(await screen.findByRole('button', { name: 'Suspend account' }));
    const dialog = await screen.findByRole('dialog', { name: 'Suspend Sara Tesfaye?' });
    await user.click(within(dialog).getByRole('button', { name: 'Suspend account' }));
    await waitFor(() => {
      expect(bodies).toEqual([{ status: 'suspended' }]);
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(await screen.findByRole('button', { name: 'Reactivate account' })).toBeVisible();
  });

  it('your own account: a note instead of role and status actions', async () => {
    server.use(
      http.get(api('/admin/users/admin-1'), () =>
        HttpResponse.json(
          userFixture({ id: 'admin-1', role: 'admin', email: 'admin@example.com' }),
        ),
      ),
    );
    await renderRoute('/admin/users/admin-1', { as: 'admin' });
    expect(
      await screen.findByText(
        'This is your account. Another administrator has to change your role or status.',
      ),
    ).toBeVisible();
    expect(
      screen.getByText('Can also review courses, manage users and see analytics.'),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Remove administrator role' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suspend account' })).not.toBeInTheDocument();
  });
});
