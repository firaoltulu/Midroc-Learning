# Design refresh ("Midroc Learning, Coursera-style")

The screens follow the design file *Midroc Learning Coursera-style design* (nine screens). Where the design
differs from SPEC.md, **the design wins** (decided 2026-11-14); the rest of SPEC.md still applies: theme
tokens only, light and dark themes, English and Amharic for every string, accessibility, one primary
button per view. Content the backend lacked (ratings, reviews, discussions, notes, skills, learning
outcomes, level, category counts) is **added to the backend**, not faked.

## The screens

| # | Screen | Route | Key parts |
|---|---|---|---|
| 1 | Home | `/` | header (logo, Explore, search, My learning, EN · አማ, avatar); deep-green hero with "Continue learning" card; "New and popular" with Most popular / New / Amharic tabs and course cards (category, title, owner, rating, level and language chips); "Explore categories" with course counts; dark footer |
| 2 | Course | `/courses/$courseId` | green hero (breadcrumb, title, description, rating, owner, updated date) with an enroll card (enrolled count, item counts, level, duration, language); What you'll learn; Skills you'll gain; syllabus accordion; learner reviews (average, distribution bars, review list) |
| 3 | Player | `/learn/$courseId/$itemId` | own slim top bar (mark, course title, % complete, Back to course); outline side panel with checks; content; title row with Mark as complete / Next; Overview / Discussions / Notes tabs |
| 4 | Sign in | `/login` (and sign-up, reset) | split screen: green brand panel (logo, headline, copyright) and the form |
| 5 | Editor | `/my-courses/$courseId/edit` | own top bar (breadcrumb, status chip, save state, Submit for review); Details / Content / Review tabs; module cards with drag handles, type chips, item meta and Edit; readiness card on the side |
| 6 | Exam | exam item | own slim top bar (exam title, time left chip, Save and exit); numbered navigator; one question with large choice rows; Previous / Review answers / Next |
| 7 | Admin dashboard | `/admin` | admin top bar (logo, Admin chip); side navigation; metric cards; enrollments bar chart (Day / Week / Month); top courses table |
| 8 | Admin users | `/admin/users` | search, role and status filter chips, table with role and status chips and Manage |
| 9 | Admin revision | `/admin/moderation/revisions/$revisionId` | breadcrumb, Reject / Approve, field diff (− old / + new), content changes with kind chips, reason box |

## Footer pages

The footer links to `/about`, `/help`, `/privacy` and `/terms` (feature `site`, open to everyone,
signed in or not). The privacy notice and the terms are drafts pending legal review (see README).

## Shell layouts

Routes pick a frame with `staticData: { layout }` (`src/app/shell/shell-layout.ts`):
`page` (header, footer, centered container: the default), `fullBleed` (header and footer; the screen
draws its own full-width bands), `focus` (no header or footer; the screen has its own top bar).

## Tokens added to the theme

- `palette.hero` `{ bg, fg, fgMuted }`: the deep-green band (light `#135339`; dark a darker green).
- `palette.inverse` `{ bg, fg, fgMuted }`: the dark footer band.

All pairs are WCAG AA (see the comments in `src/shared/theme/theme.ts`). Focus rings inside a hero
use `hero.fg`, since the primary color would vanish on the green band.

## Delivery steps (one commit each)

1. Shell: header, footer, layouts, tokens. (done; footer pages added too)
2. Sign in, sign up, password reset, verify email: split screen, labels above the fields. (done)
3. Backend: course level, outcomes, skills, category counts, sort, enrollment progress. Then Home. (done)
4. Backend: ratings and reviews. Then Course. (done)
5. Backend: discussions and notes. Then Player. (done)
6. Exam. (done)
7. Editor.
8. Admin: dashboard, users, revision.
