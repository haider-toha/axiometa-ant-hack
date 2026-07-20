---
name: cli-craft
description: House patterns for building Node CLIs – command surface design, commander structure, clack interaction, exit codes, non-interactive flags, per-project config and migrations, and publishing to GitHub Packages. Use when building, restructuring, or publishing any CLI, when adding commands or flags to an existing one, or when deciding how a CLI should store state or distribute itself.
---

# cli-craft

Patterns extracted from the `design-studio` CLI and the work `vui-run` CLI. The stack is fixed by [george-stack](../george-stack/SKILL.md): commander, @clack/prompts, picocolors, tsup, ESM, Node 20+, strict TypeScript. This skill is how to use it.

## Structure

- A `createCli(): Command` factory in `cli.ts`; the bin entry (`index.ts`) stays under 25 lines: shebang, an `uncaughtException` guard, `createCli().parseAsync().catch(...)`.
- The guard turns prompt-cancellation errors (`ExitPromptError`) into a clean `process.exit(130)`; everything else prints one red line to stderr and exits 1. Never dump a stack trace at a user.
- One module per command in `commands/<name>.ts`, exporting a plain function `(ctx, args, options)`. The factory only wires commander to those functions – no logic in `.action()` bodies beyond the call.
- Shared runtime state (repo root, content store, version) lives in a `CliContext` built by one `createContext()` function, resolved lazily inside each action so global options like `--root` are respected.
- Read the version from `package.json` via `createRequire(import.meta.url)` – never hardcode it.
- Cross-cutting behaviour (update banners, notices, telemetry) goes in a commander `postAction` hook – and it must skip any long-lived command whose stdout is a protocol channel (an MCP server, a watch mode).

## Command surface

- Nouns group, verbs act: `skills list`, `skills validate`, `tokens export`. Top-level verbs only for whole-project actions (`sync`, `new`, `doctor`, `status`, `review`).
- A command says what it means. `doctor` checks source integrity; `status` reports installed state; `sync --check` is the CI gate. Do not overload one verb with modes that change its meaning.
- Every interactive prompt has a flag equivalent so everything runs non-interactively: `--yes` for confirmations, explicit arguments for selections. CI uses flags, humans get prompts.
- Standard flags, same meaning everywhere: `--check` (report and exit non-zero, write nothing), `--yes` (skip confirmations), `--force` (overwrite), `--project <dir>` / `--global` (targeting), `--format json` (machine output), `-o/--out` (write to file instead of stdout).
- Exit codes: 0 success, 1 failure or findings (a linter with findings fails), 130 user cancelled. Set `process.exitCode`, do not call `process.exit()` mid-command.
- Data to stdout, feedback to stderr-adjacent colour: findings tables and exports are stdout (pipeable); status lines use picocolors – green ok, yellow warning, red error, dim hints.

## Interaction

- @clack/prompts only, and only when a flag has not already answered the question: `confirm` + `isCancel`, treat cancel as a no-op with a dim "Cancelled." – never as an error.
- Print what will happen before asking to do it (the sync plan prints per-file status lines, then asks about overwrites).
- After acting, say what happened in one line with a count: `Synced 12 file(s) → <target>`. List kept or skipped files explicitly.

## State, config, migrations

- Per-project install state in a dotfile at the project root (`.george.json`): zod schema in core (`config/schema.ts` + `io.ts`), written on every install with the CLI version, timestamp, and what was installed. `parse`, never cast.
- A home-directory registry (`~/.george/registry.json`) of every project the CLI installed into, auto-populated on install, pruned when directories disappear – this is what makes `sync --all-targets` possible.
- Migrations: an ordered list keyed by version, each a transform over an installed project. `update-skills` runs entries newer than the project's recorded version, then stamps the new version even when nothing else changed. A release that changes installed artifacts must ship a migration.

## Publishing (GitHub Packages)

- Scope must match the repo owner (`@georgedrury/design-studio` from `georgedrury/design-studio`); the bin name is the brand and need not match the package name.
- The package carries code only. Bundle unpublishable workspace deps into `dist/` with tsup `noExternal: [/^@scope\//]` and promote their runtime deps into `dependencies`. Content resolves at runtime (env var → cwd walk-up → known fallback paths, old and new names both).
- `publishConfig: { registry: https://npm.pkg.github.com, access: restricted }`, `repository` with `directory`, `files: ["dist"]`, `engines`.
- Publish from a tag-driven GitHub Actions workflow using the auto-provided `GITHUB_TOKEN` (`permissions: packages: write`) – no PAT in CI. Guard it three ways: the tag must equal the package version, build and tests must pass, and the built binary's `--version` must report the tagged version.
- Before the first publish, verify installability offline: `npm pack`, install the tarball globally into a scratch prefix, run the full command surface.
- Consumers need a one-time `read:packages` PAT and a scope-registry line in `~/.npmrc`.

## Verification habits

- Drive every command end to end in a temp directory after building – including the failure paths (missing config, drifted files, wrong flag).
- Sandbox anything that touches the home directory by running the test with `HOME=$(mktemp -d)`.
- The repo's own CI runs the CLI against the repo (`skills validate`, `doctor`, `review --static`) so the toolchain dogfoods itself on every push.
