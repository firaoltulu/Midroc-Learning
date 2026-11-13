import { createVideoProgress, startPosition, type SaveProgress } from './video-progress';

function setup(initialPositionSeconds = 0, alreadyCompleted = false) {
  const save = vi.fn<SaveProgress>();
  const progress = createVideoProgress({ initialPositionSeconds, alreadyCompleted, save });
  return { save, progress };
}

describe('video progress', () => {
  it('saves the position on the 15 s tick only when it moved', () => {
    const { save, progress } = setup(30);
    progress.tick();
    expect(save).not.toHaveBeenCalled();

    progress.update(44.8, 600);
    progress.tick();
    expect(save).toHaveBeenLastCalledWith({ lastPositionSeconds: 44 }, { keepalive: false });

    progress.tick();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flushes on pause, and with keepalive when the page is hidden', () => {
    const { save, progress } = setup();
    progress.update(12, 600);
    progress.flush();
    expect(save).toHaveBeenLastCalledWith({ lastPositionSeconds: 12 }, { keepalive: false });

    progress.update(20, 600);
    progress.flush({ keepalive: true });
    expect(save).toHaveBeenLastCalledWith({ lastPositionSeconds: 20 }, { keepalive: true });

    progress.flush({ keepalive: true });
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('completes at 90 % and sends completion once, right away', () => {
    const { save, progress } = setup();
    progress.update(539, 600);
    expect(progress.completed).toBe(false);
    expect(save).not.toHaveBeenCalled();

    progress.update(540, 600);
    expect(progress.completed).toBe(true);
    expect(save).toHaveBeenLastCalledWith(
      { lastPositionSeconds: 540, completed: true },
      { keepalive: false },
    );

    progress.update(570, 600);
    progress.tick();
    expect(save).toHaveBeenLastCalledWith({ lastPositionSeconds: 570 }, { keepalive: false });
  });

  it('completes when the video ends, even if it was skipped through', () => {
    const { save, progress } = setup();
    progress.update(10, 600);
    progress.ended(600);
    expect(save).toHaveBeenLastCalledWith(
      { lastPositionSeconds: 600, completed: true },
      { keepalive: false },
    );
  });

  it('never re-sends completion for an item that was already complete', () => {
    const { save, progress } = setup(100, true);
    progress.update(590, 600);
    progress.ended(600);
    for (const [payload] of save.mock.calls) expect(payload).not.toHaveProperty('completed');
  });

  it('waits for a known duration before judging completion', () => {
    const { save, progress } = setup();
    progress.update(5, 0);
    expect(progress.completed).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('startPosition (resume)', () => {
  it('resumes where the learner left off', () => {
    expect(startPosition(125, 600)).toBe(125);
  });

  it('starts over from the beginning near the end, or without a saved position', () => {
    expect(startPosition(595, 600)).toBe(0);
    expect(startPosition(0, 600)).toBe(0);
  });
});
