import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expectNoAxeViolations } from '../test/axe';
import { mockAuthoringApi } from '../test/authoring-api';
import { authoringFixture, courseDetailFixture, courseFixture, pageOf } from '../test/fixtures';
import { api, server } from '../test/msw';
import { renderRoute, renderWithProviders } from '../test/render';
import { ConfirmDialog } from '../shared/ui/confirm-dialog';
import { DataTable } from '../shared/ui/data-table';
import { StatusChip } from '../shared/ui/status-chip';

/**
 * axe on key components and on every main screen, as rendered in the app shell (landmarks,
 * one h1, labels, names, ARIA). Contrast is checked by the Playwright axe pass.
 */

vi.setConfig({ testTimeout: 30_000 });
vi.mock('../features/admin/dashboard/components/enrollment-chart', () => ({ default: () => null }));

describe('components', () => {
  it('StatusChip, DataTable and an open ConfirmDialog', async () => {
    function Demo() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <StatusChip status="pending_review" />
          <DataTable
            label="People"
            rows={[{ id: '1', name: 'Abebe' }]}
            rowKey={(row) => row.id}
            empty={null}
            pagination={{ page: 1, pageSize: 20, total: 1, onPageChange: () => undefined }}
            columns={[{ key: 'name', header: 'Name', rowHeader: true, cell: (row) => row.name }]}
          />
          <ConfirmDialog
            open={open}
            title="Delete it?"
            description="This can't be undone."
            confirmLabel="Delete"
            tone="danger"
            onConfirm={() => {
              setOpen(false);
            }}
            onClose={() => {
              setOpen(false);
            }}
          />
        </>
      );
    }
    await renderWithProviders(<Demo />);
    await screen.findByRole('dialog', { name: 'Delete it?' });
    await expectNoAxeViolations(document.body, { landmarks: false });
  });
});

describe('screens', () => {
  it('catalog', async () => {
    server.use(
      http.get(api('/courses'), () =>
        HttpResponse.json({
          ...pageOf([
            courseFixture(),
            courseFixture({ id: 'course-2', language: 'am', title: 'የሥራ ቦታ ደህንነት' }),
          ]),
          pageSize: 12,
        }),
      ),
      http.get(api('/courses/categories'), () =>
        HttpResponse.json({ items: ['Safety'], categories: [{ name: 'Safety', courseCount: 1 }] }),
      ),
    );
    await renderRoute('/courses');
    await screen.findByRole('heading', { level: 2, name: 'Workplace safety basics' });
    await expectNoAxeViolations();
  });

  it('course detail', async () => {
    server.use(http.get(api('/courses/course-1'), () => HttpResponse.json(courseDetailFixture())));
    await renderRoute('/courses/course-1');
    await screen.findByRole('heading', { level: 1, name: 'Workplace safety basics' });
    await expectNoAxeViolations();
  });

  it('exam in progress', async () => {
    server.use(
      http.get(api('/courses/course-1'), () =>
        HttpResponse.json(courseDetailFixture({ enrolled: true })),
      ),
      http.get(api('/me/enrollments'), () => HttpResponse.json([])),
      http.get(api('/exams/item-3'), () =>
        HttpResponse.json({
          instructions: 'Answer every question.',
          passingScorePercent: 70,
          maxAttempts: 3,
          timeLimitMinutes: 15,
          questionCount: 1,
          attemptsUsed: 0,
          attemptsRemaining: 3,
          passed: false,
          hasOpenAttempt: false,
        }),
      ),
      http.get(api('/exams/item-3/attempts'), () => HttpResponse.json([])),
      http.post(api('/exams/item-3/start'), () =>
        HttpResponse.json(
          {
            attemptId: 'attempt-1',
            resumed: false,
            startedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
            questions: [
              {
                id: 'q1',
                prompt: 'Which are fire hazards?',
                isMultiple: true,
                points: 1,
                position: 0,
                choices: [
                  { id: 'a', text: 'Oily rags', position: 0 },
                  { id: 'b', text: 'Water', position: 1 },
                ],
              },
            ],
          },
          { status: 201, headers: { Date: new Date().toUTCString() } },
        ),
      ),
    );
    const { user } = await renderRoute('/learn/course-1/item-3');
    await user.click(await screen.findByRole('button', { name: 'Start exam' }));
    await screen.findByRole('heading', { name: 'Question 1 of 1' });
    await expectNoAxeViolations();
  });

  it('my courses and the draft editor', async () => {
    mockAuthoringApi(authoringFixture());
    server.use(
      http.get(api('/me/courses'), () =>
        HttpResponse.json([
          {
            ...courseFixture({ status: 'draft', publishedAt: null }),
            updatedAt: '2026-11-12T09:00:00.000Z',
            moduleCount: 2,
            enrollmentCount: 0,
            pendingRevision: null,
          },
        ]),
      ),
    );
    await renderRoute('/my-courses');
    await screen.findByRole('heading', { level: 1, name: 'My courses' });
    await expectNoAxeViolations();
  });

  it('editor content tab', async () => {
    mockAuthoringApi(authoringFixture());
    await renderRoute('/my-courses/course-1/edit?tab=%22content%22');
    await screen.findByRole('list', { name: 'Modules' });
    await expectNoAxeViolations();
  });

  it('account', async () => {
    await renderRoute('/account');
    await screen.findByRole('heading', { level: 1, name: 'Account' });
    await expectNoAxeViolations();
  });

  it('admin dashboard', async () => {
    server.use(
      http.get(api('/admin/analytics/overview'), () =>
        HttpResponse.json({
          userCount: 4,
          courseCount: 2,
          publishedCourseCount: 1,
          enrollmentCount: 3,
          submittedAttemptCount: 1,
          averageExamScore: 80,
          examPassRate: 100,
          enrollmentsLast30Days: 3,
          activeLearnerCount: 2,
          pendingRevisionCount: 1,
          coursesByStatus: { draft: 1, pending_review: 0, published: 1, rejected: 0, archived: 0 },
        }),
      ),
      http.get(api('/admin/analytics/enrollments'), () =>
        HttpResponse.json([{ date: '2026-11-14T00:00:00Z', count: 3 }]),
      ),
      http.get(api('/admin/analytics/courses'), () => HttpResponse.json([])),
    );
    await renderRoute('/admin', { as: 'admin' });
    await screen.findByText(/enrollments? from/);
    await expectNoAxeViolations();
  });

  it('admin users list', async () => {
    server.use(
      http.get(api('/admin/users'), () =>
        HttpResponse.json(
          pageOf([
            {
              id: 'user-2',
              email: 'sara@example.com',
              name: 'Sara Tesfaye',
              role: 'user',
              status: 'suspended',
              createdAt: '2026-10-01T09:00:00.000Z',
            },
          ]),
        ),
      ),
    );
    await renderRoute('/admin/users', { as: 'admin' });
    await screen.findByRole('link', { name: 'sara@example.com' });
    await expectNoAxeViolations();
  });

  it('revision review with the reject dialog open', async () => {
    const live = authoringFixture({ status: 'published' }).modules;
    server.use(
      http.get(api('/admin/revisions/revision-1'), () =>
        HttpResponse.json({
          id: 'revision-1',
          courseId: 'course-1',
          status: 'pending',
          rejectionReason: null,
          submittedBy: 'owner-1',
          submittedAt: '2026-11-11T09:00:00.000Z',
          lastDecision: null,
          changes: [
            { kind: 'edited', target: 'course', title: 'Safety at work', fields: ['title'] },
            { kind: 'added', target: 'item', title: 'Ladders', itemType: 'video' },
          ],
          diff: {
            course: {
              before: {
                title: 'Workplace safety basics',
                description: '',
                category: null,
                language: 'en',
              },
              after: { title: 'Safety at work', description: '', category: null, language: 'en' },
            },
            modules: { before: live, after: live },
          },
        }),
      ),
    );
    const { user } = await renderRoute('/admin/moderation/revisions/revision-1', { as: 'admin' });
    await screen.findByRole('heading', { level: 1, name: /Changes to/ });
    await expectNoAxeViolations();

    await user.click(screen.getByRole('button', { name: 'Reject changes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reject these changes?' });
    await user.click(within(dialog).getByRole('button', { name: 'Reject changes' }));
    await within(dialog).findByText('Give a reason so the owner knows what to change.');
    await expectNoAxeViolations();
  });
});
