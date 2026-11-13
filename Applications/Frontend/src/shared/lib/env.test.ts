import { EnvError, parseEnv } from './env';

const valid = {
  VITE_FIREBASE_API_KEY: 'key',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo',
  VITE_FIREBASE_APP_ID: 'app',
};

describe('parseEnv', () => {
  it('defaults VITE_API_BASE to /api and leaves the emulator unset', () => {
    const env = parseEnv({ ...valid, VITE_API_BASE: '', VITE_FIREBASE_EMULATOR: '' });
    expect(env.VITE_API_BASE).toBe('/api');
    expect(env.VITE_FIREBASE_EMULATOR).toBeUndefined();
  });

  it('strips a trailing slash from the API base', () => {
    const env = parseEnv({ ...valid, VITE_API_BASE: 'https://api.example.com/api/' });
    expect(env.VITE_API_BASE).toBe('https://api.example.com/api');
  });

  it('accepts an emulator host:port', () => {
    const env = parseEnv({ ...valid, VITE_FIREBASE_EMULATOR: '127.0.0.1:9099' });
    expect(env.VITE_FIREBASE_EMULATOR).toBe('127.0.0.1:9099');
  });

  it('reports every missing or malformed variable', () => {
    let error: unknown;
    try {
      parseEnv({ VITE_FIREBASE_API_KEY: 'key', VITE_FIREBASE_EMULATOR: 'not a host' });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(EnvError);
    const message = (error as EnvError).issues.join('\n');
    for (const name of [
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_FIREBASE_EMULATOR',
    ]) {
      expect(message).toContain(name);
    }
  });
});
