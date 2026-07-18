# AGENTS.md

Guidance for AI agents and contributors working in this repository.

## ⚠️ Ignore `app/` — it is stale

`app/` is the stale legacy Next.js app from the old braille idea — do not use, edit, or reference it. The active web app lives in `www/`.

It is kept only as a historical record (parts of its Vercel + Upstash relay informed the design) and will eventually be removed. Do not extend it, copy from it, or point new work at it.

## The active web app is `www/`

`www/` is the current Next.js app, scaffolded with the `design-studio` taste system. It is the deploy target and the home for all new frontend, API routes, and the device relay going forward. **George owns the web app.**

## The plan is authoritative

`plan/2026-07-18-bus-stop-situational-awareness.md` is the single source of truth for what is being built. If anything here conflicts with the plan, the plan wins.
