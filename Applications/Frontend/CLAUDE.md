# Frontend: working notes for Claude Code

The full frontend spec is imported below; read it before any work.
The phased build plan (one prompt per phase) is in docs/claude-code-frontend-phases.md.

@docs/SPEC.md

## Standing rules

- reference/ holds theme.ts, brand/ and openapi.yaml (copied from Applications/Backend/openapi.yaml),
  the source of truth for the API. Regenerate types with `npm run gen:api`.
- Work only on the phase you are given. Follow the spec's architecture (feature modules,
  boundaries), design rules and i18n rules exactly: no hard-coded UI strings, every string in
  English and Amharic, theme tokens only (never hex values).
- When a phase is done: run typecheck, lint, i18n:check, check:deps and the tests; fix failures;
  commit with a clear message; summarize what was built, differences from the spec or backend
  contract, and open questions. Do not start the next phase. Ask before deviating from the spec.
