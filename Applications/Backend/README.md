# Learning platform API

This is a modular-monolith REST API built with Node.js 20+, TypeScript, Express 5, and PostgreSQL 14+. Each domain module owns its SQL and exposes a narrow `index.ts` public API. The browser-facing frontend is maintained separately.

## Local setup

1. Install Node.js 20 or newer and PostgreSQL 14 or newer.
2. From `Applications/Backend`, run `npm ci`.
3. Copy `.env.example` to `.env`, set `DATABASE_URL`, and configure Firebase credentials.
4. Run `npm run migrate`, then `npm run dev`.
5. Check `GET http://localhost:3000/api/health`.

The API requires a Firebase service-account JSON file for authentication. In the Google Cloud console, create a service account with Firebase Authentication administration access, generate a JSON key, store it outside version control, and set `GOOGLE_APPLICATION_CREDENTIALS` to its absolute path. Never commit the key.

### First administrator

Set `ADMIN_EMAILS` to one or more comma-separated email addresses before the first login. Only a verified Firebase email on a user's first account creation can receive the initial `admin` role. Changing `ADMIN_EMAILS` does not promote existing users; use the protected admin role endpoint for later changes.

### Environment variables

| Variable | Required | Default | Description |
|---|---:|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development`, `test`, or `production` |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | — | Firebase service-account JSON path |
| `ADMIN_EMAILS` | No | empty | Comma-separated first-admin email addresses |
| `PDF_ROOT` | No | `/var/lib/lms/pdfs` | Private PDF directory |
| `PDF_DELIVERY` | No | `x-accel` in production, `stream` otherwise | `x-accel`: nginx streams PDFs via `X-Accel-Redirect`; `stream`: the API sends them itself (local development without nginx) |
| `CORS_ORIGINS` | No | empty | Comma-separated allowed browser origins |
| `YOUTUBE_CHECK_INTERVAL_HOURS` | No | `6` | YouTube availability-check interval; `0` disables |
| `PDF_CLEANUP_DRY_RUN` | No | `false` | Report, but do not delete, orphaned PDFs |
| `LOG_LEVEL` | No | `info` | Pino log level |

## Development and verification

```powershell
npm run typecheck
npm run lint
npm run check:deps
npm test
npm run build
```

Tests use PGlite to apply the checked-in PostgreSQL migrations with PostgreSQL semantics; no external database is needed for the test suite. For local API development, `npm run migrate` applies each numbered migration in its own transaction and tracks it in `schema_migrations`.

## Adding a module

Use the module anatomy: routes wire methods to controllers; controllers parse strict Zod inputs and map HTTP to service arguments; services own business rules and transactions; repositories contain SQL only; schemas and types stay beside the module. Export routers and inter-module functions from the module's `index.ts` only. Add allowed edges to `.dependency-cruiser.cjs` only when the ownership/dependency table authorizes them. Never import another module's repository or controller, and never make `core/` or `integrations/` depend on a feature module.

Tables have a single owning module. Other modules may read across tables for access checks and read models, but must request writes through the owning module's service API.

## Local containers

Set `ADMIN_EMAILS`, `CORS_ORIGINS`, and `GOOGLE_APPLICATION_CREDENTIALS` in the environment, then run `docker compose up --build`. The API applies migrations before listening. Nginx is exposed at `http://localhost:8080`; it and the API share the private PDF volume. For deployments using an external nginx, adapt `deploy/nginx.conf.example` and mount the same `PDF_ROOT` volume read-only into nginx.

## API surface

The current OpenAPI document is [openapi.yaml](./openapi.yaml). All routes except `/api/health` and the read-only `/api/public/courses` and `/api/public/courses/categories` (published courses for the guest home page, no personal data) require a Firebase bearer token. Role decisions use the PostgreSQL user row; token role claims are synchronized for client-side route guards only.
