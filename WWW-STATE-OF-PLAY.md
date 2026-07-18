# Web app — state of play

Status of the `www/` web app and what it still needs to be demo-ready. As of 2026-07-18.

Related docs: [`MODAL-FOR-WWW.md`](MODAL-FOR-WWW.md) (the Modal contract) · [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md) (the build) · [`www/src/lib/contract.ts`](www/src/lib/contract.ts) (shared types).

---

## Done

- Relay backend: `contract.ts` (types + `detectorToEvent()` translator), `redis.ts` (Upstash; `mset` payload before `incr seq`), `cors.ts`, `coerce.ts`.
- API routes: `/api/pull` (device poll + telemetry), `/api/event` (translated command), `/api/detector` (per-frame detector state), `/api/state` (debug blob).
- Monitor page (`/`) — polls `/api/state`, shows command + detector + telemetry.
- Camera page (`/capture`) — `getUserMedia` → 2Hz frames → Modal → translate → `/api/event` on change.
- Design system: design-studio taste tokens; controls use the house `Button`.
- `tsc`, `eslint`, `next build` all pass.

---

## A. Web-app work still to do (our side, in `www/`)

1. **Env wiring** — `www/.env.local` has the Upstash *token* but is missing `UPSTASH_REDIS_REST_URL` (both required by `Redis.fromEnv()`), plus `NEXT_PUBLIC_MODAL_URL` once Modal exists. Until the URL is set the relay 500s and the `curl /api/pull` smoke can't run.
2. **Deploy `www` to Vercel** — the fresh app isn't deployed. Needs Upstash env at Production scope. Vercel HTTPS is also what makes `getUserMedia` work on the demo phone.
3. **Tests (vitest, per george-stack)** — not written. Highest ROI: `detectorToEvent()` (BUS→WAIT→NUMBER→UNKNOWN mapping + route regex) and the relay `mset`-before-`incr seq` ordering.
4. **End-to-end smoke** — once env + deploy land: `curl` a locked-demo `/api/event` payload, confirm `/api/pull` returns the incremented command, then drive the capture page against a real Modal URL.
5. **Real-phone rehearsal** — iOS Safari camera permission grant on the actual demo device (the plan flags this as the thing that still bites on stage).
6. **L/R navigation (conditional)** — if the buzzer wear test keeps it: `CloudPattern` needs `LEFT`/`RIGHT`/`AHEAD`, `detectorToEvent()` must handle a detector-supplied left/centre/right, and the detector must emit bus-box horizontal position. Currently **not** wired — deliberately, pending the test.

---

## B. Dependencies from the main plan (blocking us / we block them)

| Dependency | Direction | Status / risk |
| --- | --- | --- |
| **Modal vision endpoint** (`vision/bus_vision.py`) | Blocks our capture→detection flow | Doesn't exist yet. Must match `MODAL-FOR-WWW.md` (response shape + CORS). Provides `NEXT_PUBLIC_MODAL_URL`. |
| **Firmware polling host** | We block firmware | Board hardcodes `app-eight-lyart-98.vercel.app/api/pull` (Global Constraint 9) — the **old `app/`**. `www` is a new deploy. Either deploy `www` to that alias/project or update the firmware host. **Decision needed.** |
| **`DeviceCommand` struct mirrors `contract.ts`** | We block firmware | Firmware `net.h` must match our `CloudPattern` strings, `route` (`char[8]`), and `conf` values (`"high"`/`"low"`/`""` → `CONF_*`). Keep the two in lockstep. |
| **Upstash Redis instance** | We depend on it | Plan says `UPSTASH_*` already provisioned at Production scope (old `app`). Confirm `www` uses the same instance; our key schema is new, so no collision. |
| **Buzzer discrimination wear test** (merged PR #4) | Gates item A6 | Its result decides whether L/R nav survives, or whether the device falls to the audio-proxy fallback. |
| **Anthropic structured outputs** | Not our dependency | Claude runs inside Modal, server-side. `www` never calls it — no key needed in the app. |

---

## C. Decisions to lock before deploy

1. **Vercel target for `www`** — reuse the old project/alias the firmware expects, or new project + update the firmware host constant? One-line firmware change either way, but someone must own it. *(Biggest one.)*
2. **Same Upstash instance as old `app/`?** — if yes, confirm old speech-era keys won't confuse the debug screen (our reads default cleanly, so low risk).
3. **Is L/R nav in scope for the web app?** — driven by the wear-test outcome.

---

## Suggested next moves

- **Unblocked now:** write the vitest tests (needs nothing external); prep the Vercel deploy config.
- **Needs a teammate:** the Modal endpoint (`MODAL-FOR-WWW.md` handoff) and the firmware-host decision.
