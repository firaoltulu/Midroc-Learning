import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { Me } from '../features/auth';
import { meFixture } from './fixtures';

/**
 * Mock API for component and unit tests. Default handlers cover what every signed-in screen
 * needs; a test adds its own with `server.use(...)` (reset after each test). Requests without
 * a handler fail the test, so nothing reaches a real network.
 *
 *   server.use(http.get(api('/courses'), () => HttpResponse.json(page([course()]))));
 */

/** Matches an API path under any origin and base, e.g. api('/courses/:id'). */
export const api = (path: string) => `*/api${path}`;

/** The profile GET /me returns; set by the render helpers (signed in as user or admin). */
let currentMe: Me = meFixture();

export function setMe(me: Me) {
  currentMe = me;
}

export const defaultHandlers = [http.get(api('/me'), () => HttpResponse.json(currentMe))];

export const server = setupServer(...defaultHandlers);

/** Standard error body, as the backend sends it. */
export const apiError = (
  status: number,
  body: { error?: string; code?: string; params?: object; issues?: unknown[] } = {},
) => HttpResponse.json({ error: 'Request failed', ...body }, { status });

export function resetMockApi() {
  server.resetHandlers();
  currentMe = meFixture();
}
