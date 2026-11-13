import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useMe } from '../features/auth';
import { api, server } from './msw';
import { renderWithProviders } from './render';

function WhoAmI() {
  const me = useMe();
  return <p>{me.data ? `${me.data.name ?? ''} (${me.data.role})` : 'loading'}</p>;
}

describe('renderWithProviders', () => {
  it('signs in a learner by default; /me answers from MSW with the Bearer token', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(api('/me'), ({ request }) => {
        authorization = request.headers.get('authorization');
        return HttpResponse.json({
          id: 'user-1',
          email: 'learner@example.com',
          name: 'Abebe Kebede',
          role: 'user',
          status: 'active',
          createdAt: '2026-11-01T09:30:00.000Z',
        });
      }),
    );
    const { auth } = await renderWithProviders(<WhoAmI />);
    expect(await screen.findByText('Abebe Kebede (user)')).toBeInTheDocument();
    expect(authorization).toBe('Bearer token-1');
    expect(auth.controller.getState().status).toBe('signedIn');
  });

  it('signs in an administrator', async () => {
    await renderWithProviders(<WhoAmI />, { as: 'admin' });
    expect(await screen.findByText('Admin (admin)')).toBeInTheDocument();
  });

  it('accepts profile overrides and a starting URL', async () => {
    const { router } = await renderWithProviders(<WhoAmI />, {
      me: { name: 'Sara' },
      path: '/courses?page=2',
    });
    expect(await screen.findByText('Sara (user)')).toBeInTheDocument();
    expect(router.state.location.href).toBe('/courses?page=2');
  });
});
