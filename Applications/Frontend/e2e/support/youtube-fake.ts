import type { Page } from '@playwright/test';

/**
 * Stands in for the YouTube IFrame Player API (https://www.youtube.com/iframe_api), so video
 * flows run without the network. The fake player renders an empty iframe and is driven from
 * the test: `await youtube(page).play(30)`, `.pause(42)`, `.end()`.
 */
const FAKE_API = `
(() => {
  const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 };
  class Player {
    constructor(element, options) {
      this.time = options.playerVars?.start ?? 0;
      this.duration = 120;
      this.events = options.events ?? {};
      this.frame = document.createElement('iframe');
      this.frame.src = 'about:blank';
      this.frame.style.width = '100%';
      this.frame.style.height = '100%';
      element.replaceWith(this.frame);
      window.__youtubeFake = this;
      setTimeout(() => this.events.onReady?.({ target: this }), 0);
    }
    getCurrentTime() { return this.time; }
    getDuration() { return this.duration; }
    cueVideoById(options) { this.time = options.startSeconds ?? 0; }
    getIframe() { return this.frame; }
    destroy() { this.frame.remove(); }
    emit(state) { this.events.onStateChange?.({ data: state, target: this }); }
  }
  window.YT = { Player, PlayerState };
  window.onYouTubeIframeAPIReady?.();
})();
`;

export async function fakeYouTube(page: Page) {
  await page.route('https://www.youtube.com/iframe_api', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: FAKE_API }),
  );
}

interface FakePlayer {
  time: number;
  duration: number;
  emit: (state: number) => void;
}

/** Drives the fake player on the page (after the video item has created it). */
export function youtube(page: Page) {
  const drive = (action: 'play' | 'pause' | 'end', seconds?: number) =>
    page.evaluate(
      ({ action, seconds }) => {
        const player = (window as unknown as { __youtubeFake?: FakePlayer }).__youtubeFake;
        if (!player) throw new Error('The video player was not created');
        if (action === 'end') player.time = player.duration;
        else if (seconds !== undefined) player.time = seconds;
        player.emit(action === 'play' ? 1 : action === 'pause' ? 2 : 0);
      },
      { action, seconds },
    );
  return {
    play: (seconds?: number) => drive('play', seconds),
    pause: (seconds: number) => drive('pause', seconds),
    end: () => drive('end'),
  };
}
