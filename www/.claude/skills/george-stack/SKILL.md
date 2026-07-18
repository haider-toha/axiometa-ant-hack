---
name: george-stack
description: George's engineering stack preferences – frameworks, backend, data fetching, icons, tooling, and commit conventions. Use when starting or scaffolding a project, choosing libraries or dependencies, doing backend or database work, wiring data fetching, picking icons, or writing commit messages in a project. Design and UI taste lives in the george-taste skill; this covers the engineering choices around it.
---

# George's stack

Default choices for how projects are built. Deviate only when the project genuinely demands it, and say so when deviating.

## Frameworks

| Shape | Stack |
| --- | --- |
| Web app | Next.js, latest – App Router, server components, TypeScript, Tailwind |
| API + SPA | bhvr – Bun, Hono, Vite, React (shadcn template) |

Scaffold either with `design-studio new <name> --stack next|bhvr`. Package manager follows the stack: pnpm on Node projects, bun on bhvr.

## Backend

- **Prisma** as the ORM, on **Neon** (serverless Postgres). Use the vendored prisma skills (`.agents/skills/prisma-*`) for mechanics – `prisma-postgres-setup`, `prisma-client-api`, and `prisma-driver-adapter-implementation` for the Neon adapter.
- Hono for standalone APIs (the bhvr server half); Next.js route handlers or server actions when the API belongs to the app.

## Data fetching

- **Next.js**: server components and server actions first; reach for client-side fetching only for genuinely live or interactive data.
- **Vite/SPA (including bhvr)**: TanStack Query for all server state – queries, mutations, optimistic updates (which the taste system expects – see george-taste `references/patterns.md`).

## UI layer

- shadcn/ui on **Base UI** (`shadcn init --base base`), restyled to the house system – composition rules in george-taste `references/react-components.md`. Base UI over Radix since its stable release: actively maintained (MUI/Floating UI lineage), `render` prop composition, and animation-ready state attributes (`data-starting-style`/`data-ending-style`) that pair with `motion` when JS animation is warranted.
- Components install from the house registry: `design-studio add <component>` (the full shadcn set restyled to the tokens, served from ds.georgedrury.co.uk and bundled with the CLI).
- Tables: shadcn TanStack table for low interaction, AG Grid Community for advanced interaction (same reference).
- TypeScript strict everywhere. Never `any`.

## Icons

- **[@design-studio/icons](../../packages/icons)** is the house set – a stroke-authored extension of Radix Icons on a 15px grid. Prefer it; fall back to **Radix Icons** directly for anything it does not yet cover, and to **Lucide** only outside the Radix register. Pick one fallback per project and stay consistent; match stroke width to the type weight.
- Authoring or extending the set follows the [icon-craft](../icon-craft/SKILL.md) skill – do not draw icons ad hoc.
- Decorative icon spam is a taste violation regardless of the set.

## Building CLIs and MCPs

House patterns, mirroring this repo's own toolbelt:

- CLIs: commander for the command surface, @clack/prompts for interaction, picocolors for output. Helpful `--help`, non-zero exit codes on failure, `--yes` flags so everything can run non-interactively.
- MCP servers: `@modelcontextprotocol/sdk`, transport-agnostic core with thin adapters (stdio locally, fetch for hosting), zod schemas for tool inputs.
- Build with tsup, test with vitest, ESM only, Node 20+.

## Commit conventions

Projects built with the stack use Conventional Commits, plus two house extensions – `ui:` for structural interface changes and `finesse:` for the deliberate polish pass over existing UI where nothing was broken. The full type set, the `ui`/`finesse`/`style`/`fix` boundaries, and examples live in `references/commit-conventions.md` – read it when writing commits or configuring commitlint in a project (not for commits in this repo, which stay sentence-case).
