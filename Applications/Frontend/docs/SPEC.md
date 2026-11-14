# Build the frontend for a learning platform (React, TanStack, MUI, English + Amharic)

You are building the complete web frontend for a learning platform whose REST backend already exists (or is being built in parallel). The product: any signed-in user can create courses and enroll in courses; an admin approves courses, manages users and roles, and sees analytics. This document is the full spec. Work through it end to end, verify as you go, and do not stop at a skeleton.

## 0. How to work

1. **Read first.** If a `reference/` folder exists it contains: `theme.ts` (the finished MUI theme: light and dark, brand-derived, accessibility-checked), `brand/` (logo and mark PNGs, light and dark variants), `openapi.yaml` (the backend contract, the **source of truth** for endpoints and types), and possibly the backend prompt. Adopt `theme.ts` and `brand/` as given (fix compile issues, don't redesign). If `openapi.yaml` is missing, hand-write the types from section 6 and tell me.
2. **Build in this order, committing after each step:** (1) project setup, tooling, lint and boundary rules; (2) theme, providers, app shell, BrandLogo; (3) i18n (English + Amharic) and fonts; (4) Firebase auth + `/me` + route guards; (5) API client + data layer; (6) catalog and course detail + enroll; (7) learning (player: video, PDF, exam); (8) my courses + editor (draft flow, then published working-copy flow); (9) account settings; (10) admin; (11) accessibility/performance pass; (12) tests; (13) Docker/nginx/README.
3. **Verify continuously.** Run `typecheck`, `lint`, `i18n:check`, `check:deps` and the tests so far after each step. Finish only when everything in section 14 passes.
4. **Ask before deviating** from sections 2, 3 or 8. They were decided deliberately.
5. Where the backend behaves differently from this document, **trust `openapi.yaml`**, and tell me about the difference.
6. At the end, give me a summary: what you built, what you changed from `reference/`, differences found, and anything left open.

## 1. Stack and tooling

- **Vite + React + TypeScript (strict).** Latest stable React.
- **TanStack Router** (file-based, with the Vite plugin and automatic code-splitting) and **TanStack Query v5** for all server state.
- **MUI** (keep the version you install; `reference/theme.ts` must compile against it) with `@mui/icons-material` (**Outlined** icons only, for the minimal look) and `@mui/x-charts` for analytics.
- **Firebase JS SDK (modular)** for sign-in only.
- Forms: **react-hook-form + zod** (`@hookform/resolvers`). Reordering: **dnd-kit** (with the keyboard sensor). Editor working copy: **zustand** (only there). PDF viewing: **react-pdf** (lazy-loaded). Types: **openapi-typescript** (+ `openapi-fetch` or a thin typed client).
- i18n: **i18next + react-i18next** (+ browser language detector). Fonts: `@fontsource-variable/inter` and `@fontsource/noto-sans-ethiopic`.
- Dev: `vitest`, `@testing-library/react`, `msw`, `vitest-axe` (or `jest-axe`), `@playwright/test` + `@axe-core/playwright`, `eslint` (+ `eslint-plugin-i18next`, `jsx-a11y`), `prettier`, **`dependency-cruiser`**.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `i18n:check`, `check:deps`, `gen:api` (types from `openapi.yaml`), `test`, `e2e`.
- Plain relative imports (no path aliases) so Vite, Vitest and Playwright behave identically.

### Environment variables (validate at startup with zod)

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_API_BASE` (default `/api`), `VITE_FIREBASE_EMULATOR` (optional host:port for the Auth emulator). Dev server proxies `/api` to the backend (`VITE_DEV_API_TARGET`).

## 2. Architecture: feature modules (mirrors the backend)

```
src/
  main.tsx
  app/                       # providers (Theme, Query, I18n, Auth, Router), router setup, error boundary
  routes/                    # TanStack file routes: THIN, only wire a screen from a feature
  features/
    auth/  catalog/  courses/  learning/  my-courses/  editor/  account/
    admin/ { dashboard/ moderation/ users/ courses/ videos/ }
  shared/
    api/        client.ts  errors.ts  query-keys.ts  generated/ (openapi types)
    ui/         StatusChip, EmptyState, ConfirmDialog, PageHeader, BrandLogo, LanguageSwitcher, ...
    i18n/       setup.ts, format-date.ts, error-messages.ts
    theme/      theme.ts (from reference), fonts.ts
    lib/        small pure helpers
  locales/
    en/*.json   am/*.json    # one namespace per feature + common + errors
```

Anatomy of a feature: `api/` (query options, mutations, keys), `components/`, `screens/`, `schemas/` (zod), `index.ts` (the **public API**: only screens and the few hooks other features may use).

Rules (enforce with `dependency-cruiser`, run as `npm run check:deps`):
- Routes import only from a feature's `index.ts`. **A feature imports another feature only through its `index.ts`.** No cycles.
- `shared/` imports no feature. Features may import `shared/`.
- Server state lives in TanStack Query. Components never call `fetch` directly; they use feature `api/` hooks.
- Query keys come from one factory per feature (`['courses', 'list', filters]`, `['courses', id]`, `['me']`, `['enrollments']`, `['admin', 'users', filters]`, ...). Mutations invalidate by key, never by ad-hoc refetch.

## 3. Design system

> **Design refresh (2026-11-14):** the screens follow the design in `docs/DESIGN.md`. Where it differs
> from this section or section 7 (split-screen sign-in instead of a centered card, header search and
> Explore button, full-width green hero bands, a dark footer, a slim own top bar for the player, exam
> and editor), the design wins. The tokens and rules below still apply.

**Direction: minimalistic, clean and calm.** Lots of whitespace, one accent, thin borders instead of shadows, quiet type, restrained motion. Both a **light and a dark theme**, following the system setting with a manual switch (system / light / dark).

### Tokens (already implemented in `reference/theme.ts`; summary for context)

Brand colors measured from the Midroc logo: deep green `#135339`, bright green `#5AA142`, gold `#CA942F`, brown `#47300D`.

| Token | Light | Dark |
|---|---|---|
| page / paper | `#F7F8F6` / `#FFFFFF` | `#0E1311` / `#151B18` |
| text primary / secondary | `#17211C` / `#55635B` | `#E7EDE9` / `#9FADA6` |
| primary (buttons, links, selected) | `#135339` (text on it `#FFFFFF`) | `#5AA142` (text on it `#0A1A0C`) |
| divider | `#E2E7E3` | `#29322E` |
| input border (≥3:1) | `#7A8780` | `#6B7872` |
| gold accent | `#CA942F`, text on it `#2B1D06`, used rarely (e.g. a "Featured" chip) | same |

Status tones (`theme.palette.status.{draft,pending,published,rejected,archived}` = `{ fg, bg }`) and diff tones (`theme.palette.diff.{added,removed,changed}`) exist in both schemes. **Never use bright green or gold as text on a light background** (they fail contrast); never hard-code hex values in components, always use theme tokens (`theme.vars.palette…`).

### Design rules

- **Layout:** 8px grid; app container max width 1200px; **reading width ≤ 720px** for descriptions and exam text; corner radius 10px (cards 14px); cards are outlined (`variant="outlined"`), not shadowed.
- **Three densities:** learner screens spacious and mobile-first; the editor is a workspace (tree + detail panel); admin is dense and desktop-first (tables, filters, charts).
- **One primary button per view.** Everything else is outlined or text. Don't use disabled buttons where clicking can instead explain the problem (show an inline message); disable only while a request is running.
- **Status is always shown with `StatusChip`** (one component, tone from the status tokens, label from i18n, never color alone: include the text).
- **Typography:** no uppercase, no letter-spacing, **no italics** (Ethiopic has no true italic); emphasis by weight. Icons: outlined only. Icon-only buttons need an `aria-label` and a 44px touch target.
- **Motion:** short fades and slides only; the theme already honors `prefers-reduced-motion`.
- **Loading and empty states:** skeletons (not spinners) for content; every list has a designed empty state with a one-line invitation and one action; every query has an error state with a retry.
- **Microcopy (English):** sentence case; buttons are verb first ("Create course", "Submit for review"); no "please", no "successfully", no exclamation marks; errors say what happened and what to do, never raw server text; contractions are fine. Amharic copy is natural, polite and concise, following common Amharic UI conventions (never transliterated English).
- **Brand:** `BrandLogo` component (`variant="full" | "mark"`) picks the light or dark PNG from `reference/brand/` using the *resolved* color scheme (`useColorScheme()`: when `mode === 'system'` use `systemMode`). Keep its API stable: the PNGs will be replaced by an SVG later. Use the mark in the mobile header and as the favicon. The dark logo files are an approximation, so structure the code so swapping files needs no other change.

## 4. Internationalization: English and Amharic

- **No hard-coded UI strings anywhere.** Everything goes through `t()`. Enforce with `eslint-plugin-i18next` (`no-literal-string`) and an **`npm run i18n:check`** script that fails when `en` and `am` don't have identical key sets, when a key is unused, or when a placeholder (`{{name}}`) differs between languages.
- Typed keys: derive resource types from the English JSON (declaration merging) so a wrong key is a compile error.
- Namespaces per feature + `common` + `errors` + `validation`. Use ICU-style pluralization through i18next (`_one` / `_other`; Amharic uses the browser's plural rules).
- **Language detection order:** saved choice (`localStorage`) → browser language (`am*` → Amharic) → English. Set `<html lang>` and update `document.title` on change. Switcher in the header and the account page.
- **Fonts:** Inter (variable) always; **Noto Sans Ethiopic loaded by dynamic import only when the language is Amharic** (weights 400/500/600, `font-display: swap`). The theme's font stack falls back to it per glyph. With `lang="am"` the theme already enlarges the base font and line height. Visually check long Amharic strings in buttons, tabs and table headers (they can wrap differently); components must tolerate text length changes (no fixed widths on labeled controls).
- **Dates:** default follows the interface language: **Ethiopian calendar when the UI is Amharic, Gregorian when English**, with an account setting to override (`follow language` / `Gregorian` / `Ethiopian`). Implement `formatDate` / `formatDateTime` / `formatRelative` in `shared/i18n/format-date.ts` using `Intl.DateTimeFormat` with the `ethiopic` calendar (`am-ET-u-ca-ethiopic`); detect lack of runtime support and fall back to Gregorian. Numbers use Arabic (Latin) digits.
- **User-generated content is not translated** (course titles, descriptions, exam text). Courses carry a `language` (`en` | `am`) set by the owner, shown as a chip and usable as a catalog filter.
- **Translations:** write complete, natural Amharic for every key. List in the README that the Amharic strings need native-speaker review before launch.
- **Backend errors are translated by `code`** (section 6), never shown as the server's English text.
- Firebase: set `auth.languageCode` to the UI language.

## 5. Authentication and the app shell

- Firebase Auth: **email + password** (with sign-up and password reset) and **Google sign-in** (`signInWithPopup`, falling back to redirect when the popup is blocked or on mobile Safari). Persistence: local.
- **Password accounts must verify their email:** after sign-up send the verification email; show `/verify-email` (resend with a cooldown, "I've verified" reloads the user) until verified. Google accounts are treated as verified.
- `AuthProvider` wraps `onAuthStateChanged` and exposes `{ status: 'loading' | 'signedOut' | 'signedIn', user }`. **Nothing renders guarded content or redirects until `status !== 'loading'`** (no redirect flash).
- After sign-in call **`GET /me`** (cache under `['me']`): its `role` and `status` (from the database) are authoritative for UI guards, not the token claim. The backend creates the user record on the first call.
- **Token refresh:** when any API response carries header `X-Token-Refresh: true`, call `getIdToken(true)` and invalidate `['me']`.
- Suspended account (`ACCOUNT_SUSPENDED`, HTTP 403): sign out and show a clear message on the login page.
- **Route guards (TanStack Router `beforeLoad`):**
  - `_public` layout: login, signup, forgot password, verify email. Signed-in users are redirected away.
  - `_authenticated` layout: requires sign-in (redirect to `/login?redirect=<original>`), verified email for password accounts, and a loaded `/me`.
  - `admin` layout (inside `_authenticated`): requires `me.role === 'admin'`, otherwise a friendly "not allowed" screen.
  The backend remains the real security boundary. These guards are UX only.
- **App shell:** slim top bar (logo/mark, primary nav, language switcher, theme switch, user menu), mobile navigation as a drawer, skip-to-content link, route-level error boundary, global toast area (MUI Snackbar), `NotFound` screen.
- On sign-out: `queryClient.clear()` and clear any per-user local data.

## 6. API client and data layer

- All calls go through `shared/api/client.ts`: base `VITE_API_BASE`, JSON, `Authorization: Bearer <await user.getIdToken()>` per request (the SDK caches and refreshes). On **401**: force-refresh the token and retry once; if it still fails, sign out. Handle `X-Token-Refresh`. Network failures raise a typed `NetworkError` (toast with retry).
- **Error contract:** non-2xx bodies are `{ error: string, code: string, params?: object, issues?: [{ path, code, params }] }`. Build `ApiError` from it. `shared/i18n/error-messages.ts` maps `code` → `errors.<code>` (with `params`) and validation issue `code` → `validation.<code>`; unknown codes fall back to a generic message. Map `issues[].path` to form fields (`setError`). Expected codes include: `LOCKED`, `REVISION_REQUIRED`, `STALE_REVISION`, `NOT_PUBLISHED`, `ATTEMPTS_EXHAUSTED`, `EXAM_TIME_EXCEEDED`, `COURSE_INCOMPLETE` (with `problems`), `VIDEO_INVALID_LINK`, `VIDEO_UNAVAILABLE`, `YOUTUBE_UNREACHABLE`, `PDF_INVALID`, `SELF_CHANGE_FORBIDDEN`, `LAST_ADMIN`, `ACCOUNT_SUSPENDED`, `RATE_LIMITED`.
- Defaults: `staleTime` 30 s for lists, 0 for authoring/exam queries; `refetchOnWindowFocus: false` for anything holding unsaved edits; `gcTime` short for authoring views (they contain exam answers) and cleared on sign-out.
- **Key response shapes** (confirm against `openapi.yaml`):
  - Pagination: `{ page, pageSize, total, items }`.
  - Course (catalog item / detail): `id, ownerId, title, description, category, language, thumbnailUrl, tags[], estimatedDurationMinutes, status, publishedAt, ownerName, moduleCount, enrollmentCount, enrolled`. Detail adds `modules: [{ id, title, description, items: [{ id, type: 'video'|'pdf'|'exam', title }] }]`, `completedItemIds[]`, and for the owner/admin `rejectionReason` and `pendingRevision`. **Learner responses never contain video ids, file keys or correct answers.**
  - Authoring view (owner/admin only): full tree with `youtubeVideoId`, `fileKey`, exam settings and questions **including `isCorrect`**.
  - Exam start: `{ attemptId, resumed, startedAt, expiresAt|null, questions: [{ id, prompt, isMultiple, points, choices: [{ id, text }] }] }`. Submit: `{ scorePercent, passed, attemptsUsed, attemptsRemaining, results: [{ questionId, isCorrect, correctChoiceIds? }] }`.
  - Revision save: `{ saved, unchanged?, changes: [{ kind, title, fields? }] }`.
- The thumbnail is just a URL field (`http(s)` only). Show a branded fallback (the mark on a muted surface) when it's missing or fails to load.

## 7. Screens and routes

| Area | Route | Notes |
|---|---|---|
| Public | `/login`, `/signup`, `/forgot-password`, `/verify-email` | calm centered card with the full logo |
| Catalog | `/courses` | search (debounced), category, language, pagination; all filters live in URL search params (`validateSearch` with zod) |
| Course | `/courses/$courseId` | header, description, outline (accordion with item type icons), enroll / continue / unenroll, owner and admin see status banners |
| Learning | `/learn` | my enrollments with progress |
| Player | `/learn/$courseId/$itemId` | video, PDF or exam by item type |
| Authoring | `/my-courses`, `/my-courses/new`, `/my-courses/$courseId/edit` | list with status chips; editor (section 8) |
| Account | `/account` | language, theme (system/light/dark), date format, sign out |
| Admin | `/admin`, `/admin/moderation`, `/admin/moderation/courses/$courseId`, `/admin/moderation/revisions/$revisionId`, `/admin/courses`, `/admin/courses/$courseId`, `/admin/users`, `/admin/users/$userId`, `/admin/videos` | admin only |

Each screen has loading, empty, error and success states. Mobile first for Catalog, Course, Learning, Player; desktop first for Editor and Admin (usable on a tablet).

**Catalog / course detail behavior:** the main button is a state machine: not enrolled → "Enroll"; enrolled → "Continue" (opens the first incomplete item); owner → "Edit course"; unenroll is a quiet text action with a confirmation that says progress is kept. Show a `StatusChip` and rejection reason to owners.

## 8. The editor

### Draft and rejected courses (direct editing)

Three tabs: **Details** (title, description as plain text with a counter, category, language, tags, duration, thumbnail URL), **Content**, **Review**.
- Saves as you go through the granular endpoints (debounced for text fields, immediate for structural changes) with a visible "Saved" / "Saving…" / "Couldn't save" indicator. Optimistic updates where safe.
- **Content:** module list with drag handles (dnd-kit, keyboard accessible); each module has items (video, PDF, exam). Reordering calls the `order` endpoints with the complete id list.
- **Video item:** paste a link; the backend verifies it. Show the verified video title afterwards. Map `VIDEO_INVALID_LINK`, `VIDEO_UNAVAILABLE` and `YOUTUBE_UNREACHABLE` to the item.
- **PDF item:** drag-and-drop or file picker, client checks (type, ≤ 50 MB), **upload progress** (use `XMLHttpRequest` or equivalent, since `fetch` has no upload progress), then attach the returned `fileKey` to the item.
- **Exam item:** settings (instructions, passing score %, max attempts, time limit) and a question builder: add/remove/reorder questions, 2–10 choices, single-answer (radio) or multi-answer (checkbox) with "mark correct", points. Validate on the client with the same rules as the backend (≥1 correct; exactly one if single-answer). Questions save through the "replace questions" endpoint (debounced).
- **Review tab:** the readiness checklist, **Submit for review** (the one primary button). On `422 COURSE_INCOMPLETE` render the `problems` list. While `pending_review` the editor is read-only with a clear banner; after rejection show the reason and allow editing and resubmitting.

### Published courses (local working copy, explicit submit): decided

**No autosave for published courses.**
1. Load the live tree (authoring view). If a pending revision already exists, start from its proposed tree and show a banner: "You have changes waiting for review".
2. All edits happen in a **zustand working copy**, persisted to `localStorage` per course (keyed with a hash of the live tree so a changed live course discards stale drafts with a notice).
3. Existing modules/items/questions/choices keep their `id`; new ones get a temporary client key and **no id** (the backend applies revisions by id: this is critical). Moving an item to another module keeps its id.
4. Field labels show their effect: **"Applies right away"** (thumbnail, tags, duration, level, skills, module/item titles and module descriptions) or **"Needs admin review"** (everything else, including "What you'll learn"). Read the minor/major lists from one constant. Minor edits are saved immediately through `PATCH`; the rest stays in the working copy.
5. A bar shows "N changes" with a **client-side summary** (added, removed, moved, edited) and the primary action **Submit changes for review**. Submitting sends major course fields with `PATCH /courses/:id` (merged into the revision) and the whole tree with `PUT /courses/:courseId/revision/content`, then shows the server's returned `changes`.
6. **Withdraw** calls `DELETE /courses/:courseId/revision` (confirm first). Saving an unchanged tree returns `unchanged: true`: show "Nothing to review".
7. PDFs upload immediately and attach on submit. YouTube links are verified on submit: map errors back to the item. `409 STALE_REVISION` (or `STALE`) → "This course changed while you were editing" with a button to reload the live tree (keep the old working copy until the owner confirms). `409 NOT_PUBLISHED` → switch to the draft flow.

## 9. Learning

- **Shell:** desktop: content on the right, module/item list as a side panel with completion checks; mobile: the content sits on top and the list becomes a bottom drawer. Previous/next buttons and a progress bar. When all items are done show a calm "Course completed" state.
- **Video:** `GET /items/:id/video` → `youtubeVideoId`. Use the **YouTube IFrame Player API** with `youtube-nocookie.com`, `rel=0`, `playsinline`, lazy-loaded. **Resume** from the saved position. Save progress every ~15 s while playing and on pause/end/page hide (`fetch` with `keepalive`). Mark complete at ≥ 90% watched or on end (`PUT /items/:id/progress`). If `isAvailable` is false show a clear "This video is unavailable" state.
- **PDF:** fetch `GET /items/:id/pdf` as a **blob with the auth header** (a plain link can't carry the token), render with `react-pdf` (lazy), page navigation, zoom, a download button; on iOS-like environments where inline rendering is poor, offer "Open" via the blob URL. Mark complete when the last page has been viewed or the learner taps "Mark as complete".
- **Exam:** a clean taking flow.
  - Overview before starting (instructions, passing score, attempts left, time limit), then one question at a time with a question navigator (numbered chips: answered / unanswered), a review step, and a confirmation if questions are unanswered.
  - **Timer:** show remaining time from `expiresAt`, correcting for clock skew using the `Date` response header of the start call. Announce remaining time to screen readers politely only at set points (e.g. 5 min, 1 min), not every second. At zero, auto-submit what is answered (the server enforces the limit with a grace period and may answer `EXAM_TIME_EXCEEDED`: show a clear result).
  - Persist selected answers in `sessionStorage` per attempt so a refresh doesn't lose them; when `start` returns `resumed: true`, restore them.
  - **Result:** score, passed/failed (text plus tone), attempts remaining, per-question right/wrong, and correct choices only if the server returns them. Offer "Try again" when attempts remain, and an attempt history.
  - Multi-answer questions: checkboxes with a hint "Select all that apply". Single-answer: radios. Touch-friendly choices (≥ 44px).

## 10. Admin

All admin screens use the dense layout; tables have sticky headers, search, filters in the URL, and pagination.
- **Dashboard:** metric cards (users, active learners, enrollments 30d, exam pass rate, pending revisions, courses by status), an enrollment time-series chart (day/week/month, range picker; dates in the user's calendar setting), and top courses with completion rates.
- **Moderation:** two tabs: courses awaiting review and pending revisions, oldest first.
  - Course review page (`/admin/moderation/courses/$courseId`): read-only render of the authoring view (including exam answers), **Approve** (primary) and **Reject** (dialog with required reason).
  - Revision page: course field changes as from → to with the diff colors, the content changes list (added, removed, moved, edited, reordered) with expandable detail, a preview of the proposed module tree, **Approve** / **Reject** (reason required). Handle `STALE_REVISION` (tell the admin to reject it) and `ALREADY_DECIDED`.
- **Courses:** all courses with status filter; row opens enrollments + analytics (progress distribution, per-item completion, exam pass rates and averages). Enrollments table with a remove action (confirm; says progress is kept).
- **Users:** search, role and status filters; user detail; **change role** and **suspend/reactivate** with confirmation dialogs. Surface `SELF_CHANGE_FORBIDDEN` and `LAST_ADMIN` as friendly messages. If the response says `claimSynced: false`, show a small non-blocking note.
- **Videos:** list of unavailable videos (course, owner, last checked) and a **Run check now** action that shows the returned summary (and handles "already running").

## 11. Accessibility, performance, security

- **WCAG 2.2 AA** target: semantic landmarks, one `h1` per page, visible focus (theme provides it), forms with associated labels and error text (`aria-describedby`), `aria-live` for async results and toasts, keyboard alternatives for drag-and-drop (dnd-kit keyboard sensor with announcements), focus management on route change and dialogs, color is never the only signal, `lang` attributes (set `lang` on user content when its course language differs from the UI).
- **Performance:** route-level code splitting; lazy-load `react-pdf`, charts, dnd-kit and the editor; images use `loading="lazy"` with fixed aspect ratios (no layout shift); font subsetting as above; skeletons. **Budget: initial JS ≤ ~200 KB gzipped for the catalog route** (report the actual number and what's inside it).
- **Security:** never store tokens yourself (the Firebase SDK owns them); no `dangerouslySetInnerHTML`; render user content as plain text (`white-space: pre-wrap`); only render `http(s)` thumbnail URLs; external links use `rel="noopener noreferrer"`; keep authoring/answer data out of long-lived caches; never log tokens or answers. Provide a CSP starting point in the deploy notes (allow `youtube-nocookie.com` frames, Firebase/Google sign-in origins, same-origin API) and verify it against real network traffic.

## 12. Testing (required; this defines "done")

- **Unit/component (Vitest + Testing Library + MSW):** API client (401 retry, `X-Token-Refresh`, error mapping), `formatDate` (Gregorian and Ethiopian, with fallback), error-code translation, route guards (loading, signed out, unverified, non-admin), `StatusChip`, language switch (updates `lang`, loads the Ethiopic font only for Amharic), catalog filters in the URL, enroll state machine, exam taking (navigator, review, timer with skew, autosubmit, restore after refresh, result rendering with and without `correctChoiceIds`), editor working copy (ids preserved, new items without ids, minor vs major labeling, stale handling, unchanged), PDF upload progress and validation.
- **Accessibility:** `vitest-axe` on key components; Playwright + `@axe-core/playwright` on key pages **in both themes and both languages**.
- **E2E (Playwright), against a mocked API by default** (`page.route`), with documented instructions for running against the real backend + the Firebase Auth emulator: (1) sign up, verify, browse, enroll, watch a video (progress saved), (2) take an exam (pass) and see the result, (3) create a course, add content, submit, (4) as admin approve it, (5) edit a published course, submit changes, approve the revision as admin, (6) switch to Amharic and dark mode and confirm layout and fonts.
- `check:deps` and `i18n:check` run in CI with the tests.

## 13. Deployment

- `npm run build` outputs static files. **Dockerfile** (multi-stage: build, then nginx) and `deploy/nginx.conf.example`: serve the SPA with `try_files … /index.html`, proxy `/api` to the backend (same domain, so no CORS), hashed assets cached `immutable`, `index.html` `no-cache`, gzip/brotli, security headers (including the CSP starting point).
- README: setup, env vars, Firebase project setup (enable Email/Password and Google, authorized domains), running with the Auth emulator, regenerating API types (`gen:api`), how to add a feature module, how to add a translation key, and the Amharic-review note.

## 14. Definition of done

- `npm run typecheck`, `lint`, `i18n:check`, `check:deps`, `test` and `e2e` are green; `npm run build` works; the Docker image serves the app.
- Every route in section 7 exists with loading, empty and error states; guards behave as in section 5.
- Light and dark themes work everywhere and follow the system by default; Amharic and English are complete; no hard-coded strings; dates follow the calendar rules.
- The editor follows section 8 exactly (granular + autosave for drafts; local working copy + explicit submit for published courses, ids preserved).
- No video ids, file keys or answers are ever shown or cached outside the places the spec allows.
- README is present, and your final summary lists differences from the backend contract and anything left open.
