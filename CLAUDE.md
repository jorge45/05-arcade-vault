# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — a platform to play games online and compete for the highest scores (see README.md). The codebase is currently a fresh Next.js starter (App Router) with no custom features implemented yet.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)

There is no test runner configured yet.

## Architecture

- Next.js 16 App Router, TypeScript, Tailwind CSS v4 (via `@tailwindcss/postcss`), React 19.
- Routes live under `app/`; `app/layout.tsx` is the root layout (loads Geist fonts, sets global metadata), `app/page.tsx` is the home route.
- Path alias `@/*` resolves to the repo root (see `tsconfig.json`).
- **This is Next.js 16, which has breaking changes vs. older Next.js versions you may know from training data.** Before writing routing, data-fetching, or config code, check the relevant guide under `node_modules/next/dist/docs/` (organized into `01-app`, `02-pages`, `03-architecture`) and heed any deprecation notices there.
- The `# This is NOT the Next.js you know` block in `AGENTS.md` is auto-generated/re-added by `next dev` (see `node_modules/next/dist/server/lib/generate-agent-files.js`). Leave it committed rather than stripping it out.

## Spec-driven design

The project intends to follow spec-driven design using the `/spec` and `/spec-impl` skills from https://github.com/Klerith/fernando-skills, installable via:

```bash
npx skills@latest add Klerith/fernando-skills
```

No `/spec` documents exist in the repo yet.
