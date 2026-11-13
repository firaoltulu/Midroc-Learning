import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { courseDetailFixture } from '../../../test/fixtures';
import { api, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import type { YouTubeNamespace, YouTubePlayerOptions } from '../lib/youtube-api';

// react-pdf needs a real canvas and worker; a stand-in reports three pages.
vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: {} },
  Document: ({
    children,
    onLoadSuccess,
  }: {
    children: ReactNode;
    onLoadSuccess: (pdf: { numPages: number }) => void;
  }) => {
    queueMicrotask(() => {
      onLoadSuccess({ numPages: 3 });
    });
    return <div data-testid="pdf-document">{children}</div>;
  },
  Page: ({ pageNumber }: { pageNumber: number }) => <div>Rendered page {pageNumber}</div>,
}));

/** Course detail, playback data and a recorder for progress saves. */
function mockPlayer(overrides: Record<string, unknown> = {}) {
  const saves: unknown[] = [];
  const course = courseDetailFixture({ enrolled: true, ...overrides });
  // Remembers completions like the real API, so refetches keep the check marks.
  const completed = new Set<string>(course.completedItemIds as string[]);
  server.use(
    http.get(api('/courses/course-1'), () =>
      HttpResponse.json({ ...course, completedItemIds: [...completed] }),
    ),
    http.get(api('/items/item-1/video'), () =>
      HttpResponse.json({
        youtubeVideoId: 'abcdefghijk',
        youtubeTitle: 'Welcome',
        isAvailable: true,
        lastPositionSeconds: 125,
        completed: false,
      }),
    ),
    http.get(
      api('/items/item-2/pdf'),
      () => new HttpResponse('%PDF-1.4', { headers: { 'Content-Type': 'application/pdf' } }),
    ),
    http.put(api('/items/:itemId/progress'), async ({ request, params }) => {
      const body = (await request.json()) as { completed?: boolean };
      saves.push({ itemId: params.itemId, ...body });
      if (body.completed) completed.add(String(params.itemId));
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(api('/me/enrollments'), () => HttpResponse.json([])),
  );
  return saves;
}

/** A stand-in for the YouTube IFrame API that lets the test drive the player. */
function fakeYouTube() {
  const player = {
    time: 0,
    duration: 600,
    iframe: document.createElement('iframe'),
    options: null as YouTubePlayerOptions | null,
    getCurrentTime: () => player.time,
    getDuration: () => player.duration,
    cueVideoById: vi.fn(),
    getIframe: () => player.iframe,
    destroy: vi.fn(),
  };
  // Called with `new` by the app; returning an object makes that object the instance.
  function FakePlayer(element: HTMLElement, options: YouTubePlayerOptions) {
    element.append(player.iframe);
    player.options = options;
    queueMicrotask(() => options.events.onReady?.({ target: player }));
    return player;
  }
  const YT: YouTubeNamespace = {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 },
    Player: FakePlayer as unknown as YouTubeNamespace['Player'],
  };
  window.YT = YT;
  onTestFinished(() => {
    delete window.YT;
  });
  const state = (data: number) => {
    act(() => {
      player.options?.events.onStateChange?.({ data, target: player });
    });
  };
  return { player, state };
}

describe('player shell', () => {
  it('shows the item, the outline with the current item, and previous/next across modules', async () => {
    mockPlayer({ completedItemIds: ['item-1'] });
    await renderRoute('/learn/course-1/item-2');

    expect(await screen.findByRole('heading', { level: 1, name: 'Safety handbook' })).toBeVisible();
    expect(screen.getByText('Getting started · Item 2 of 3')).toBeVisible();

    const outline = screen.getByRole('complementary', { name: 'Course content' });
    expect(within(outline).getByRole('link', { current: 'page' })).toHaveTextContent(
      'Safety handbook',
    );
    expect(within(outline).getByText('1 of 3 items done')).toBeVisible();

    const itemNav = screen.getByRole('navigation', { name: 'Previous and next item' });
    expect(within(itemNav).getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/learn/course-1/item-1',
    );
    expect(within(itemNav).getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/learn/course-1/item-3',
    );
  });

  it('opens the outline from the bottom on small screens', async () => {
    mockPlayer();
    const { user } = await renderRoute('/learn/course-1/item-3');
    await user.click(await screen.findByRole('button', { name: 'Course content (0/3)' }));
    const drawer = await screen.findByRole('navigation', { name: 'Course content' });
    expect(within(drawer).getAllByRole('link')).toHaveLength(3);
  });

  it('shows the calm "course completed" state once everything is done', async () => {
    mockPlayer({ completedItemIds: ['item-1', 'item-2', 'item-3'] });
    await renderRoute('/learn/course-1/item-3');
    expect(await screen.findByRole('heading', { name: 'Course completed' })).toBeVisible();
    expect(screen.getAllByRole('link', { name: 'Back to course' })[0]).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
  });

  it('asks learners who are not enrolled to enroll first', async () => {
    mockPlayer({ enrolled: false });
    await renderRoute('/learn/course-1/item-1');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Enroll to start this course' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to the course' })).toHaveAttribute(
      'href',
      '/courses/course-1',
    );
  });

  it('says so when the item is not in the course', async () => {
    mockPlayer();
    await renderRoute('/learn/course-1/elsewhere');
    expect(
      await screen.findByRole('heading', { level: 1, name: "This item isn't available" }),
    ).toBeVisible();
  });
});

describe('video item', () => {
  it('resumes at the saved position and saves progress on pause, end and page hide', async () => {
    const saves = mockPlayer();
    const { player, state } = fakeYouTube();
    await renderRoute('/learn/course-1/item-1');

    await waitFor(() => {
      expect(player.options?.videoId).toBe('abcdefghijk');
    });
    expect(player.options).toMatchObject({
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, playsinline: 1, start: 125 },
    });
    await waitFor(() => {
      expect(player.iframe.title).toBe('Video: Welcome');
    });

    player.time = 200;
    state(2); // paused
    await waitFor(() => {
      expect(saves).toEqual([{ itemId: 'item-1', lastPositionSeconds: 200 }]);
    });

    player.time = 300;
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await waitFor(() => {
      expect(saves.at(-1)).toEqual({ itemId: 'item-1', lastPositionSeconds: 300 });
    });

    player.time = 600;
    state(0); // ended
    await waitFor(() => {
      expect(saves.at(-1)).toEqual({ itemId: 'item-1', lastPositionSeconds: 600, completed: true });
    });
    // The outline checks the item off without waiting for a refetch.
    expect(await screen.findAllByTitle('Completed')).not.toHaveLength(0);
  });

  it('shows "video unavailable" instead of a broken player', async () => {
    mockPlayer();
    server.use(
      http.get(api('/items/item-1/video'), () =>
        HttpResponse.json({
          youtubeVideoId: 'abcdefghijk',
          youtubeTitle: null,
          isAvailable: false,
          lastPositionSeconds: 0,
          completed: false,
        }),
      ),
    );
    await renderRoute('/learn/course-1/item-1');
    expect(await screen.findByRole('heading', { name: 'This video is unavailable' })).toBeVisible();
  });

  it('treats a YouTube "removed or not embeddable" error the same way', async () => {
    mockPlayer();
    const { player } = fakeYouTube();
    await renderRoute('/learn/course-1/item-1');
    await waitFor(() => {
      expect(player.options).not.toBeNull();
    });
    act(() => {
      player.options?.events.onError?.({ data: 150 });
    });
    expect(await screen.findByRole('heading', { name: 'This video is unavailable' })).toBeVisible();
  });
});

describe('PDF item', () => {
  it('pages through the document and completes on the last page', async () => {
    const saves = mockPlayer();
    const { user } = await renderRoute('/learn/course-1/item-2');

    expect(await screen.findByText('Page 1 of 3')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'download',
      'Safety handbook.pdf',
    );
    const next = screen.getByRole('button', { name: 'Next page' });
    await user.click(next);
    expect(screen.getByText('Page 2 of 3')).toBeVisible();
    expect(saves).toEqual([]);

    await user.click(next);
    expect(screen.getByText('Page 3 of 3')).toBeVisible();
    await waitFor(() => {
      expect(saves).toEqual([{ itemId: 'item-2', completed: true }]);
    });
    expect(next).toBeDisabled();
  });

  it('"Mark as complete" completes it without reading to the end', async () => {
    const saves = mockPlayer();
    const { user } = await renderRoute('/learn/course-1/item-2');
    await user.click(await screen.findByRole('button', { name: 'Mark as complete' }));
    await waitFor(() => {
      expect(saves).toEqual([{ itemId: 'item-2', completed: true }]);
    });
    expect(await screen.findByText('Completed', { selector: '.MuiChip-label' })).toBeVisible();
  });

  it('zooms in and out within limits', async () => {
    mockPlayer();
    const { user } = await renderRoute('/learn/course-1/item-2');
    expect(await screen.findByText('100%')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('125%')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    expect(screen.getByText('50%')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
  });
});
