# Midroc Learning: web frontend

The browser app for the Midroc learning platform: a course catalog, learning (video, PDF and
exams), course authoring with review, and an admin area. English and Amharic, light and dark.

React 19 + TypeScript, Vite, TanStack Router and Query, MUI, Firebase Authentication (sign-in
only), react-hook-form + zod, i18next. The REST API is `Applications/Backend`; its
`openapi.yaml` is the contract. The full specification is [docs/SPEC.md](docs/SPEC.md).

> **Amharic translations need a native-speaker review before launch.** Every Amharic string in
> `src/locales/am/` was written by an AI assistant (Claude). They are complete and consistent,
> but have not been checked by a native speaker for tone, terminology and naturalness. Plan
> that review (and a look at long strings in buttons, tabs and table headers) before going live.

## Contents

- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Firebase project setup](#firebase-project-setup)
- [Running with the Auth emulator](#running-with-the-auth-emulator)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Adding a feature module](#adding-a-feature-module)
- [Adding a translation key](#adding-a-translation-key)
- [API types (`gen:api`)](#api-types-genapi)
- [Testing](#testing)
- [Deployment](#deployment)

## Getting started

Requirements: Node.js 20.19+ (22 recommended) and npm. For the emulator: Java 11+.

```sh
cd Applications/Frontend
npm ci
cp .env.example .env      # then fill in the Firebase values (next sections)
npm run dev               # http://localhost:5173
```

The dev server proxies `/api` to the backend (`VITE_DEV_API_TARGET`, default
`http://localhost:3000`). Start the backend first (see `Applications/Backend/README.md`).

## Environment variables

Read at build time (Vite inlines `VITE_*` values into the bundle) and validated with zod when
the app starts: a missing or malformed value shows a clear error instead of a broken app.

| Variable                    | Required | Description                                                                             |
| --------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`     | yes      | Firebase web app config (console → Project settings → Your apps)                        |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes      | Usually `<project-id>.firebaseapp.com` (see [Deployment](#sign-in-and-the-auth-domain)) |
| `VITE_FIREBASE_PROJECT_ID`  | yes      | Firebase project id                                                                     |
| `VITE_FIREBASE_APP_ID`      | yes      | Firebase web app id                                                                     |
| `VITE_API_BASE`             | no       | Base of the REST API as the browser sees it. Default `/api` (same domain)               |
| `VITE_FIREBASE_EMULATOR`    | no       | `host:port` of the Auth emulator, e.g. `127.0.0.1:9099`. Leave empty in production      |
| `VITE_DEV_API_TARGET`       | dev only | Where `npm run dev` proxies `/api`                                                      |

The Firebase web config is not a secret (it identifies the project; access is controlled by
Firebase Auth and the backend). Never put the backend's service-account key in this app.

## Firebase project setup

1. Create a project in the [Firebase console](https://console.firebase.google.com) (the same
   project the backend verifies tokens for) and add a **Web app**. Copy its config into `.env`.
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google** (set the
   public-facing name and support email the consent screen shows).
3. **Authentication → Settings → Authorized domains:** add every host the app is served from
   (`localhost` is there by default; add the production domain and any staging domains).
4. **Authentication → Templates:** optionally adjust the verification and password-reset email
   templates. The app sets the email language from the UI language (`auth.languageCode`).
5. Backend: give it the same project's service account (see the backend README) and list the
   first administrators in `ADMIN_EMAILS`.

Password accounts must verify their email before they can use the app; Google accounts count
as verified.

## Running with the Auth emulator

No Firebase project needed: the [Auth emulator](https://firebase.google.com/docs/emulator-suite)
runs locally (project `demo-midroc`, configured in `firebase.json`).

```sh
npm run emulator          # terminal 1: Auth emulator on 127.0.0.1:9099
```

In `.env` set `VITE_FIREBASE_EMULATOR=127.0.0.1:9099` and `VITE_FIREBASE_PROJECT_ID=demo-midroc`
(the other Firebase values can be any non-empty text), then `npm run dev`. Verification and
password-reset emails are not sent; their links are printed in the emulator's log and listed at
`http://127.0.0.1:9099/emulator/v1/projects/demo-midroc/oobCodes`.

For the backend to accept emulator tokens, start it with `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`
and `GCLOUD_PROJECT=demo-midroc` (details in [docs/e2e.md](docs/e2e.md)).

## Scripts

| Script                            | What it does                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                     | Dev server with hot reload                                              |
| `npm run build`                   | Type-check, then build static files into `dist/`                        |
| `npm run preview`                 | Serve `dist/` locally                                                   |
| `npm run typecheck`               | Regenerate the route tree and run `tsc` (app and tooling)               |
| `npm run lint`                    | ESLint, zero warnings (includes no hard-coded strings and jsx-a11y)     |
| `npm run format` / `format:check` | Prettier                                                                |
| `npm run i18n:check`              | English and Amharic have the same keys and placeholders; no unused keys |
| `npm run check:deps`              | Architecture boundaries (dependency-cruiser)                            |
| `npm run check:bundle`            | Reports the JS the catalog route loads up front (after a build)         |
| `npm run gen:api`                 | Regenerate the API types from `reference/openapi.yaml`                  |
| `npm test`                        | Unit and component tests (Vitest)                                       |
| `npm run e2e`                     | Browser tests of the signed-out pages (Playwright)                      |
| `npm run e2e:emulator`            | Signed-in browser tests and the six user flows, with the Auth emulator  |

CI should run `typecheck`, `lint`, `format:check`, `i18n:check`, `check:deps`, `test`, `e2e`
and `e2e:emulator`.

## Project structure

```
src/
  main.tsx              entry: env validation, fonts, i18n, then the app
  app/                  providers, router, app shell, error boundary
  routes/               TanStack file routes: thin, they only wire a screen from a feature
  features/             one folder per feature (mirrors the backend modules)
    auth/ catalog/ courses/ learning/ my-courses/ editor/ account/
    admin/{dashboard,moderation,users,courses,videos}/   each is a feature of its own
  shared/
    api/                client.ts (auth, retries, errors), query keys, generated/ OpenAPI types
    ui/                 shared components (StatusChip, EmptyState, ConfirmDialog, BrandLogo, ...)
    i18n/               setup, language detection, formatDate, error-code messages
    theme/              theme.ts (from reference/), fonts
    lib/                small pure helpers
  locales/{en,am}/*.json  one namespace per feature + common, errors, validation
reference/              theme.ts, brand/, openapi.yaml (copied from the backend)
deploy/                 nginx.conf.example
e2e/                    Playwright specs and their mocks (docs/e2e.md)
```

Rules (checked by `npm run check:deps`): routes and other features import a feature only
through its `index.ts`; `shared/` never imports a feature; no cycles. Server state lives in
TanStack Query; components never call `fetch` directly.

## Adding a feature module

Example: a `certificates` feature with a screen at `/certificates`.

1. Create the folder with the usual anatomy (only what you need):

   ```
   src/features/certificates/
     api/          certificates.ts    query options, mutations, a query-key factory
     components/   ...
     schemas/      zod schemas (forms, search params)
     screens/      certificates-screen.tsx (+ certificates-screen.test.tsx)
     index.ts      the public API: export the screen and the few hooks others may use
   ```

2. **API:** call the backend through `shared/api/client.ts` (typed by the generated OpenAPI
   types). Keys come from one factory, e.g. `['certificates', 'list', filters]`; mutations
   invalidate by key.
3. **Strings:** add `src/locales/en/certificates.json` and `src/locales/am/certificates.json`
   and register the English file in `src/shared/i18n/resources.ts` (next section).
4. **Route:** add a thin file route, e.g. `src/routes/_authenticated.certificates.tsx`, that
   imports the screen from `../features/certificates` (the index) and renders it. Put it under
   `_authenticated` (signed in) or `_authenticated.admin` (administrators). Search params are
   validated in the route file with zod (see `shared/lib/search-params.ts`). Don't import other
   values from the feature's index in a route file: that pulls the whole feature into the
   initial bundle. `npm run typecheck` regenerates `routeTree.gen.ts`.
5. **Navigation:** add the link to the app shell (`src/app/shell/`) if it belongs in the menu.
6. Run `typecheck`, `lint`, `i18n:check`, `check:deps` and `test`. dependency-cruiser treats
   the new folder as a feature automatically.

## Adding a translation key

1. Add the key to the English file of its namespace, e.g. `src/locales/en/catalog.json`:

   ```json
   { "filters": { "clear": "Clear filters" } }
   ```

2. Add the same key, in natural Amharic, to `src/locales/am/catalog.json`:

   ```json
   { "filters": { "clear": "ማጣሪያዎችን አጽዳ" } }
   ```

3. Use it: `const { t } = useTranslation('catalog'); t('filters.clear')`. Keys are typed from
   the English files, so a misspelled key fails `typecheck`.
4. **Placeholders** use `{{name}}` and must be identical in both languages. **Plurals** use
   `_one` / `_other` suffixes with a `count` option (`t('enrolled', { count })`); Amharic uses
   the browser's plural rules.
5. Run `npm run i18n:check`. It fails when the two languages have different keys, a value is
   empty, placeholders differ, a key is unused, or a namespace is not registered.

Conventions: English is sentence case, verb-first buttons, no "please" or exclamation marks;
backend errors are translated by their `code` in `errors.json`, never shown as server text.
User content (course titles, descriptions, exam text) is never translated.

## API types (`gen:api`)

`reference/openapi.yaml` is a copy of `Applications/Backend/openapi.yaml`, the source of truth
for endpoints and types. After the backend contract changes:

```sh
cp ../Backend/openapi.yaml reference/openapi.yaml
npm run gen:api            # writes src/shared/api/generated/schema.d.ts
npm run typecheck          # shows every place that needs updating
```

Don't edit `generated/` by hand.

## Testing

- **Unit and component tests:** `npm test` (Vitest, Testing Library, MSW, vitest-axe). On
  Windows run them from PowerShell or cmd; Git Bash's drive-letter casing breaks Vitest.
- **Browser tests:** `npm run e2e` and `npm run e2e:emulator` run against a production build,
  with the API mocked per test and real sign-in against the Auth emulator. Install the browser
  once with `npx playwright install chromium`. [docs/e2e.md](docs/e2e.md) explains the suites,
  the mocks, running against the real backend, and the CSP check against the Docker image.

## Deployment

`npm run build` produces static files in `dist/`. Serve them with any static server that
falls back to `index.html` for unknown paths and proxies `/api` to the backend on the same
domain. The included Docker image does exactly that with nginx.

### Docker

```sh
docker build -t midroc-frontend \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=my-project.firebaseapp.com \
  --build-arg VITE_FIREBASE_PROJECT_ID=my-project \
  --build-arg VITE_FIREBASE_APP_ID=... \
  .

docker run -p 8080:80 -e API_UPSTREAM=http://api:3000 midroc-frontend
```

- **Build stage** (`node:22-alpine`): `npm ci`, `npm run build` (type-check included), then
  pre-compresses text assets with gzip. Missing Firebase build arguments fail the build.
- **Serve stage** (`nginx:1.27-alpine`): `deploy/nginx.conf.example` is installed as an nginx
  template. Runtime settings:

  | Variable               | Default                                 | Meaning                                                        |
  | ---------------------- | --------------------------------------- | -------------------------------------------------------------- |
  | `API_UPSTREAM`         | `http://api:3000`                       | The backend, reached by nginx (must resolve when nginx starts) |
  | `FIREBASE_AUTH_DOMAIN` | the build's `VITE_FIREBASE_AUTH_DOMAIN` | Allowed in the CSP's `frame-src`                               |

- **With the backend's docker-compose:** this image replaces the backend's example nginx as the
  public entry point. Put it in the same compose network as the `api` service, publish its
  port 80, and either mount the backend's PDF volume read-only at `/var/lib/lms/pdfs` (the
  backend's production default `PDF_DELIVERY=x-accel` lets nginx stream PDFs from it) or run
  the backend with `PDF_DELIVERY=stream`.

### What nginx does (`deploy/nginx.conf.example`)

- **SPA fallback:** unknown paths serve `index.html`; a missing file under `/assets/` is a real
  404 (so an outdated tab never runs HTML as JavaScript).
- **API proxy:** `/api/` goes to `API_UPSTREAM` on the same domain (no CORS); PDF uploads allow
  50 MB; `/protected-pdfs/` is the internal location for the backend's `X-Accel-Redirect`.
- **Caching:** `/assets/*` (content-hashed names) `public, max-age=31536000, immutable`;
  `index.html` and everything else `no-cache` (revalidated, so deploys show up at once). API
  responses keep the backend's headers.
- **Compression:** gzip, with the pre-compressed `.gz` files served directly. Brotli needs an
  nginx with the ngx_brotli module (not in the official image) or a CDN in front.
- **Security headers:** Content-Security-Policy (below), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` (YouTube refuses
  embeds without a referrer), `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Google
  sign-in popup), and a `Permissions-Policy` that turns off camera, microphone, location,
  payment and USB. Enable HSTS (commented out) once the site is HTTPS-only.

### Content-Security-Policy

| Directive                                                  | Allows                                                                                   | Why                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`                                              | `'self'`                                                                                 | everything else same-origin only                                                                                                    |
| `script-src`                                               | `'self'`, one `sha256-…` hash, `https://www.youtube.com`, `https://apis.google.com`      | the inline color-mode script in `index.html`; the YouTube IFrame API; Google's loader that Firebase uses for popup/redirect sign-in |
| `style-src`                                                | `'self' 'unsafe-inline'`                                                                 | MUI (Emotion) injects style elements at run time                                                                                    |
| `img-src`                                                  | `'self' data: blob: https:`                                                              | course thumbnails are any https URL                                                                                                 |
| `font-src`                                                 | `'self'`                                                                                 | Inter and Noto Sans Ethiopic are bundled                                                                                            |
| `connect-src`                                              | `'self'`, `https://identitytoolkit.googleapis.com`, `https://securetoken.googleapis.com` | the API (same origin) and Firebase Auth                                                                                             |
| `frame-src`                                                | `https://www.youtube-nocookie.com`, `https://<FIREBASE_AUTH_DOMAIN>`                     | video players; Firebase's auth iframe                                                                                               |
| `worker-src`                                               | `'self' blob:`                                                                           | the pdf.js worker                                                                                                                   |
| `object-src`, `base-uri`, `form-action`, `frame-ancestors` | `'none'`, `'self'`, `'self'`, `'none'`                                                   | hardening                                                                                                                           |

**After editing the inline script in `index.html`,** update its hash in the CSP: `node
scripts/csp-hash.mjs` prints it, and `npm test` fails until the two match.
`.gitattributes` keeps `index.html` at LF line endings so the hash is the same on every OS.

**Verified against real traffic:** `e2e/csp.emulator.spec.ts` runs the Docker image (real
nginx headers) and loads the real YouTube IFrame API and player, a real external thumbnail and
the PDF viewer, and fails on any CSP violation; see [docs/e2e.md](docs/e2e.md#csp-against-the-docker-image).
Google sign-in was checked by hand against a real Firebase project (popup and its iframe).
Re-check the browser console after adding any third-party resource.

### Sign-in and the auth domain

With the default `authDomain` (`<project>.firebaseapp.com`) the Google sign-in **redirect**
(used on mobile Safari and when popups are blocked) depends on third-party storage, which Safari
and Firefox increasingly block. Firebase's recommended fix: serve the auth helper from your own
domain. Uncomment the `/__/auth/` location in `deploy/nginx.conf.example`, set
`VITE_FIREBASE_AUTH_DOMAIN` to the site's own host, and add
`https://<your-domain>/__/auth/handler` as an authorized redirect URI of the Google OAuth
client (Google Cloud console → APIs & Services → Credentials).
