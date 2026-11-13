/**
 * Loads the YouTube IFrame Player API on demand (only when a video item opens) and exposes the
 * small part of it we use. Players are created on youtube-nocookie.com.
 */

export interface YouTubePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  /** Loads a video without playing it. */
  cueVideoById: (options: { videoId: string; startSeconds?: number }) => void;
  getIframe: () => HTMLIFrameElement;
  destroy: () => void;
}

export interface YouTubePlayerOptions {
  host: string;
  videoId: string;
  width?: string;
  height?: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady?: (event: { target: YouTubePlayer }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

export interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YOUTUBE_HOST = 'https://www.youtube-nocookie.com';
const API_SRC = 'https://www.youtube.com/iframe_api';

/**
 * YouTube error codes 100 (removed), 101/150 (embedding not allowed): show the "unavailable"
 * state. Others (2: bad id, 5: HTML5 problem) are treated the same; there is nothing to play.
 */
export const isUnavailableError = (code: number) => [2, 5, 100, 101, 150].includes(code);

let loading: Promise<YouTubeNamespace> | null = null;

export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  loading ??= new Promise<YouTubeNamespace>((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('The YouTube player could not be loaded'));
    };
    document.head.append(script);
  });
  return loading;
}
