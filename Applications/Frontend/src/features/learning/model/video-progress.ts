/**
 * Video progress rules (spec section 9), free of React and YouTube so they can be unit tested.
 *
 * - The position is saved about every 15 s while playing, and on pause, end and page hide
 *   (with `keepalive` so the request survives the page going away). Unchanged positions are not
 *   re-sent.
 * - The video counts as complete at 90 % of its duration or when it ends; completion is sent
 *   once, right away (the outline's check mark shouldn't wait 15 s).
 */

export const SAVE_INTERVAL_MS = 15_000;
export const COMPLETION_RATIO = 0.9;

export interface ProgressPayload {
  /** Videos only: where to resume. */
  lastPositionSeconds?: number;
  completed?: true;
}

export type SaveProgress = (payload: ProgressPayload, options: { keepalive: boolean }) => void;

export interface VideoProgress {
  /** Report the playhead (called about once a second while playing). */
  update: (positionSeconds: number, durationSeconds: number) => void;
  /** The 15-second timer while playing: saves when the position moved. */
  tick: () => void;
  /** Pause, page hide, leaving the item: saves when anything is unsaved. */
  flush: (options?: { keepalive?: boolean }) => void;
  /** The video ended. */
  ended: (durationSeconds: number) => void;
  readonly completed: boolean;
}

export function createVideoProgress(options: {
  initialPositionSeconds: number;
  alreadyCompleted: boolean;
  save: SaveProgress;
}): VideoProgress {
  let position = Math.floor(options.initialPositionSeconds);
  let savedPosition = position;
  let completed = options.alreadyCompleted;
  let completionSent = options.alreadyCompleted;

  const send = (keepalive: boolean) => {
    const payload: { lastPositionSeconds: number; completed?: true } = {
      lastPositionSeconds: position,
    };
    if (completed && !completionSent) {
      payload.completed = true;
      completionSent = true;
    }
    savedPosition = position;
    options.save(payload, { keepalive });
  };

  const hasUnsaved = () => position !== savedPosition || (completed && !completionSent);

  const markCompleteAt = (positionSeconds: number, durationSeconds: number) => {
    if (
      !completed &&
      durationSeconds > 0 &&
      positionSeconds >= durationSeconds * COMPLETION_RATIO
    ) {
      completed = true;
    }
  };

  return {
    update(positionSeconds, durationSeconds) {
      position = Math.max(0, Math.floor(positionSeconds));
      markCompleteAt(positionSeconds, durationSeconds);
      // Completion is saved at once.
      if (completed && !completionSent) send(false);
    },
    tick() {
      if (position !== savedPosition) send(false);
    },
    flush({ keepalive = false } = {}) {
      if (hasUnsaved()) send(keepalive);
    },
    ended(durationSeconds) {
      position = Math.floor(durationSeconds);
      completed = true;
      if (hasUnsaved()) send(false);
    },
    get completed() {
      return completed;
    },
  };
}

/**
 * Where playback starts: the saved position, unless it's at the very end (a finished video
 * starts over).
 */
export function startPosition(lastPositionSeconds: number, durationSeconds: number): number {
  if (lastPositionSeconds <= 0) return 0;
  if (durationSeconds > 0 && lastPositionSeconds >= durationSeconds - 10) return 0;
  return lastPositionSeconds;
}
