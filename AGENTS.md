# Repository Guidelines

## Project Structure
- `src/` React + TypeScript app (components, hooks, services, styles, utils).
- `public/` static assets and PWA icons.
- `tests/` Vitest tests; `tests/unit/`, `tests/integration/`, plus root `*.test.ts`.
- `docs/` VitePress docs and design notes; `.storybook/` Storybook config.
- `api/` serverless OpenRouter proxy endpoint.
- `android/` Capacitor native project; `supabase/` for database artifacts.
- `dist/` build output (generated), `scripts/` repo utilities.

## Build, Test, and Development Commands
- `npm run dev` start Vite dev server at `http://localhost:5173`.
- `npm run build` production build to `dist/`; `npm run preview` serve it.
- `npm test` run Vitest once; `npm run test:watch` watch mode.
- `npm run test:coverage` run coverage; `npm run test:docs` validate docs tests.
- `npm run lint` run ESLint; `npm run format` apply Prettier.
- `npm run storybook` run Storybook; `npm run docs:dev` run VitePress docs.

## Coding Style and Naming Conventions
- TypeScript strict mode is enabled; prefer typed APIs and avoid `any` unless justified.
- Formatting via Prettier: 2-space indentation, single quotes, semicolons, trailing commas, print width 100.
- ESLint rules include React Hooks and React Refresh.
- Path alias `@/` maps to `src/`.
- File naming in `src/` uses `PascalCase` for React components and `camelCase` for hooks/util files (follow existing patterns).

## Testing Guidelines
- Use Vitest with Testing Library (`@testing-library/react`).
- Name test files `*.test.ts` or `*.test.tsx`; place in `tests/unit`, `tests/integration`, or `tests/` root as needed.
- Keep new features covered by unit tests where feasible; add integration tests for cross-module flows.

## Commit and Pull Request Guidelines
- Git history mostly uses Conventional Commit style: `type: short summary`.
- Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`; avoid long subjects.
- PRs must include: clear description, linked issue (or rationale), and tests run with results.
- Require screenshots or screen recordings for UI changes; attach before/after when visual changes are subtle.
- Call out breaking changes, migrations, or data shape changes in the PR body.
- Note any config/env updates and whether docs need updating.

## Configuration and Secrets
- Copy `.env.example` to `.env`; do not commit secrets.
- OpenRouter proxy expects `OPENROUTER_API_KEY` (server-side) and optional `OPENROUTER_ALLOWED_ORIGIN`.
