import { keepConnected } from './connection';

describe('keepConnected', () => {
  it('connects at once, and again after a cleanup (StrictMode mounts twice)', () => {
    const connect = vi.fn(() => vi.fn());
    const connection = keepConnected(connect);
    expect(connect).toHaveBeenCalledTimes(1);

    // Mount: already connected, nothing to do.
    connection.resume();
    expect(connect).toHaveBeenCalledTimes(1);

    // StrictMode's cleanup, then the second mount: connected again.
    const firstDisconnect = connect.mock.results[0]?.value as ReturnType<typeof vi.fn>;
    connection.stop();
    expect(firstDisconnect).toHaveBeenCalledTimes(1);
    connection.resume();
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('stops once, however often it is asked to', () => {
    const disconnect = vi.fn();
    const connection = keepConnected(() => disconnect);
    connection.stop();
    connection.stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
