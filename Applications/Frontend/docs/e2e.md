# End-to-end tests

Playwright runs against a **production build** (`vite build` + `vite preview` on port 4180),
in Chromium. There are two suites.

| Suite | Command | Sign-in | API |
|---|---|---|---|
| Signed-out pages (`e2e/*.spec.ts`) | `npm run e2e` | none | not needed |
| Signed-in flows (`e2e/*.emulator.spec.ts`) | `npm run e2e:emulator` | real, against the Firebase Auth emulator | mocked in memory with `page.route` |

`npm run e2e:emulator` starts the Auth emulator itself (`firebase emulators:exec`, project
`demo-midroc`, no Firebase account needed; Java 11+ must be installed) and builds the app so
the Firebase SDK talks to the emulator.

## The six flows (SPEC section 12)

`e2e/flows.emulator.spec.ts`, one test each:

1. Sign up, verify the email, browse, enroll and watch a video (the position is saved on
   pause, the item completes at the end).
2. Take an exam, pass and see the result.
3. Create a course, add content and submit it for review.
4. An administrator reviews the submitted course (exam answers included) and approves it.
5. The owner edits a published course in the working copy and submits the changes; an
   administrator reviews the revision (title from → to) and approves it; the course is live.
6. Switch to Amharic and dark mode from the header: the Ethiopic font is used and pages
   don't scroll sideways on a phone.

Accessibility: `e2e/a11y.spec.ts` (signed-out pages) and `e2e/a11y.emulator.spec.ts` (learner,
editor and admin pages) run axe (WCAG 2.2 A/AA) in light and dark and in English and Amharic;
serious and critical violations fail. Each page's full axe result is attached to the report.

## How the mocks work (`e2e/support`)

- `emulator.ts`: unique accounts per test, sign-up and email verification through the
  emulator's REST API.
- `mock-api.ts`: catalog, course detail, enrollment, player (video, PDF, exam grading),
  progress. Stateful per test.
- `mock-authoring.ts`: my courses, the draft editor's saves, submit, the published course's
  revision (save, withdraw), and moderation (queue, approve or reject a course or a
  revision). `seed` adds courses that exist from the start.
- `mock-admin.ts`: dashboard figures, admin course analytics and enrollments, users, videos.
- `mock-identity.ts`: answers `GET /me` per signed-in person (an owner and an administrator in
  one test), from the email in the emulator's ID token.
- `youtube-fake.ts`: replaces the YouTube IFrame API script, so videos play without network;
  the test drives play, pause and end.

Register order matters: later `page.route` handlers run first and fall back to earlier ones
(`mockApi`, then `mockAuthoring`, then `mockAdmin` / `mockIdentity`).

## Running against the real backend and the Auth emulator

The flows' assertions use the mocks' data, so they don't run unchanged against a real
database. To walk the same six flows by hand (or to point new tests at a real stack):

1. **Auth emulator** (terminal 1, from `Applications/Frontend`):

   ```sh
   npx -y firebase-tools@15 emulators:start --only auth --project demo-midroc
   ```

   Its UI (http://127.0.0.1:4000/auth) shows accounts and the verification links.

2. **Backend** (terminal 2, `Applications/Backend`), with PostgreSQL running and migrated
   (`npm run migrate`). The Admin SDK accepts emulator tokens when
   `FIREBASE_AUTH_EMULATOR_HOST` is set:

   ```sh
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
   GCLOUD_PROJECT=demo-midroc \
   ADMIN_EMAILS=admin@example.com \
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/learning \
   npm run dev
   ```

   `ADMIN_EMAILS` makes that (verified) address an administrator on first sign-in, for
   flows 4 and 5.

3. **Frontend** (terminal 3, `Applications/Frontend`), using the emulator and proxying `/api`
   to the backend:

   ```sh
   VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=localhost \
   VITE_FIREBASE_PROJECT_ID=demo-midroc VITE_FIREBASE_APP_ID=demo-app \
   VITE_FIREBASE_EMULATOR=127.0.0.1:9099 VITE_DEV_API_TARGET=http://localhost:3000 \
   npm run dev
   ```

4. Open http://localhost:5173, sign up (verify through the emulator UI's link), and follow
   the flows above. Sign up as `admin@example.com` for the administrator steps. Videos need
   real YouTube links and network access; PDFs are stored under the backend's `PDF_ROOT`.

On Windows (PowerShell), set the variables with `$env:NAME = 'value'` before each `npm run`.
