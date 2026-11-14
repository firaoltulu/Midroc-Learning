import { z } from 'zod';

/**
 * zod's fast path compiles validators with `new Function`. Under the production CSP (no
 * 'unsafe-eval') that is blocked, and zod's own feature test reports a CSP violation on every
 * page load before falling back. Opt out up front: validation behaves the same.
 */
z.config({ jitless: true });
