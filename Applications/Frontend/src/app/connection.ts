/**
 * Keeps a connection (e.g. auth wired into the API client) open for as long as the app is
 * mounted. It connects at once (synchronously: the router's first load needs it), `stop`
 * disconnects and `resume` connects again if needed.
 *
 * Why resume: React's StrictMode (development) mounts, cleans up and mounts again. A cleanup
 * that only disconnects would leave the app without its connection after that second mount:
 * every API request would go out without the user's token.
 */
export function keepConnected(connect: () => () => void) {
  let disconnect: (() => void) | null = connect();
  return {
    resume() {
      disconnect ??= connect();
    },
    stop() {
      disconnect?.();
      disconnect = null;
    },
  };
}
