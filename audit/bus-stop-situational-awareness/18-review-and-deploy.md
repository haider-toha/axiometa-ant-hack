# 18 — Review, Deploy, and Smoke

**Date:** 2026-07-18
**Branch:** `feat/relay-activity-contract` (merged `origin/main` @ `353706b`)
**Deployment:** `dpl_Bws7Qw7vxh9DARdwrfiiEVUdcffz` → `bus-stop-awareness.vercel.app`

## Scope

Phase 4 of the activity-state workstream: review the Phase 3 output, run the full
verification gate, deploy to production, and prove the wire contract on the live
relay. Also records two scope reductions forced by a colleague's work landing
mid-flight, and the state the relay was left in.

## Scope changes from the original brief

Two parts of the original objective were **not built**, deliberately.

| Dropped | Why |
|---|---|
| Firmware relay parser (Track C) | Superseded in full by Sebastian's PR #13 (merged `353706b`): `relay_pure.h`, `net.cpp`, `net.h`, `main.cpp`, `test/test_relay/`. Building it would have been a parallel implementation of shipped code [14]. |
| `LEFT` / `RIGHT` / `AHEAD` relay commands | His `CloudCommand` enum on main is `{NONE, BUS, NUMBER, WAIT, UNKNOWN, ERROR, INVALID}` — no nav members. `AGENTS.md:33` now states outright: *"`LEFT`, `RIGHT`, and `AHEAD` are not relay commands or automatic navigation claims."* Emitting them would parse as `INVALID` on the board. |

The original brief asked for both. The governing instruction was to shape our work
around his so he changes nothing, so the evidence won over the brief. Verification
criteria 5 and 6 in the original brief (LEFT+MOVING round-trip, LEFT+STILL guard)
are therefore **not applicable** and are recorded as such rather than as passes.

## One instruction that was correctly overridden

Track A was told *"activity missing or invalid must default to STILL — never guess."*
It defaulted to **MOVING** instead and cited firmware source. Verified against
`origin/main:firmware/braille_wearable/src/relay_pure.h`:

```cpp
enum class UserActivity : uint8_t { UNKNOWN = 0, MOVING, STILL };

inline UserActivity effectiveActivity(...) {
    if (state.serviceOverride) return state.serviceActivity;
    if (state.cloudActivity != UserActivity::UNKNOWN &&
        static_cast<uint32_t>(nowMs - state.cloudUpdatedMs) <= leaseMs) {
        return state.cloudActivity;
    }
    return UserActivity::MOVING;              // ← fail-safe
}

inline bool acceptsRelayCommand(UserActivity activity, CloudCommand command) {
    if (command == CloudCommand::NONE || command == CloudCommand::ERROR) return true;
    if (activity != UserActivity::STILL) return false;   // ← anything but STILL suppresses
    ...
}
```

The STILL-default rule came from issue #5, which [14] flagged as stale in five
clauses; this is one of them. The fail-safe **inverted** when the enum moved out of
`navigation_pure.h`. Had the relay defaulted to STILL, it would assert the user is
stationary when no phone has ever said so, and the two sides would disagree about
what silence means. Defaulting to MOVING makes the relay fail in the same direction
as the board. **Verdict: the override was correct.**

## Verification gate

Run from `www/`, redirected to file — never piped into `tail`, after [12] found a
build reporting exit 0 while actually failing because the pipeline owned the status.

| Command | Exit | Result |
|---|---|---|
| `pnpm exec tsc --noEmit` | **0** | clean |
| `pnpm run lint` | **0** | clean |
| `pnpm run test` | **0** | 6 files / 163 tests |
| `pnpm run build` | **0** | `ƒ /api/activity` in route table |
| `pio test -e native` | **0** | 11 suites, all PASSED |

Baseline before this workstream was 4 test files / 29 tests (Sebastian's). Now 6 /
163. **All pre-existing suites still pass.**

`pio test -e native` after merging his firmware:

```
native  test_relay              PASSED   00:00:00.539
native  test_navigation         PASSED   00:00:00.612
native  test_siren_runtime      PASSED   00:00:00.659
native  test_output_telemetry   PASSED   00:00:00.970
... 11 suites total, PIO_TEST_EXIT=0
```

`test/test_relay/test_relay.cpp` carries 116 activity-related assertions, satisfying
the original criterion 7 (a native test asserting activity parsing) — via his suite
rather than one of ours.

## Deploy

Root Directory is `.` and the project link lives in `www/.vercel/`, so the repo-root
form would find no link [13]. Correct invocation:

```
vercel --cwd www --prod --yes      # DEPLOY_EXIT=0, readyState: READY
```

**No git integration is connected on this Vercel project** — every deployment is
CLI-created. Pushing to `main` does *not* deploy. Anyone assuming otherwise demos a
stale build.

## Smoke — live production relay

### 1. Field presence and JSON types

```
GET https://bus-stop-awareness.vercel.app/api/pull
{ "seq": 24, "pattern": "NONE", "route": "", "dest": "", "conf": "",
  "arrivalId": 3, "ts": 1784412639606,
  "activity": "MOVING", "activitySeq": 4, "activityTs": 1784413808070 }
```

| Check | Result |
|---|---|
| `activity` present | **PASS** |
| `activity` is JSON string, value in {STILL, MOVING} | **PASS** |
| `activitySeq` present | **PASS** |
| `activitySeq` is integer within `uint32_t` (0 ≤ n ≤ 4294967295) | **PASS** |

Both fields matter together: `net.cpp` guards on
`activity.is<const char*>() && activitySeq.is<uint32_t>()` and skips the entire
activity block, silently, if either is absent or mistyped.

### 2. Round-trip and command independence

```
POST /api/activity {"activity":"STILL"}
  → {"activity":"STILL","activitySeq":5,"activityTs":1784414216850}
GET /api/pull
  → {"seq":24,"ts":1784412639606,"activity":"STILL","activitySeq":6}
```

| Check | Result |
|---|---|
| Round-trip: posted STILL reads back as STILL | **PASS** |
| Command `seq` unchanged at 24 | **PASS** |
| Command `ts` unchanged at 1784412639606 | **PASS** |
| `activitySeq` advanced | **PASS** |

This is the executable proof of `AGENTS.md:35` — *"An activity heartbeat must not
increment command `seq` or refresh an old command timestamp."*

### 3. Heartbeat

```
activitySeq 5 → 6 on re-POST of the SAME value ("STILL")   PASS
```

Required: `CLOUD_ACTIVITY_LEASE_MS = 120000` and the lease refreshes only when the
counter advances, so an unchanged value must still bump the sequence or a steady
STILL decays to MOVING after two minutes.

### 4. Invalid input rejected, not defaulted

```
POST /api/activity {"activity":"WALKING"}
  → HTTP 400 {"error":"activity must be \"STILL\" or \"MOVING\""}      PASS
```

Asymmetric by design: the **write** path rejects because the phone is the only
client and a typo should be loud; the **read** path defaults because the board needs
a well-formed field even when Redis is empty.

## Deploy safety

The change cannot regress the live system. On main, `ActivityControlState.cloudActivity`
initialises to `UserActivity::UNKNOWN`, and the relay emitted no activity field at
all, so `effectiveActivity()` has been returning the `MOVING` fallback permanently
and `acceptsRelayCommand(MOVING, BUS)` is `false`. Bus commands were *already*
suppressed. This deployment is what makes `STILL` reachable for the first time.

## Relay state on exit

Left as found: `activity: "MOVING"`, `activitySeq: 7`. The smoke wrote to shared demo
Redis (unavoidable — proving the round-trip requires a write). Command state was not
touched: `seq` 24 and `ts` 1784412639606 are unchanged throughout, and `/api/event`
was never posted to.

## Open questions for Sebastian

1. **Lease decay vs. heartbeat wording (demo-critical).** `RELAY-FOR-FIRMWARE.md`
   says `activitySeq` "changes only on an activity transition". Taken literally, a
   user standing still for two minutes has their STILL lease expire and the board
   reverts to MOVING, suppressing exactly the bus information the demo exists to
   show. We implemented a ~30 s heartbeat that bumps the counter on an unchanged
   value, which his code accepts. His doc and his constant disagree — which did he
   mean?
2. **Redis flush is unrecoverable for activity.** Activity edges on strict `>`
   while commands edge on `!=`. Flushing Redis resets `activitySeq` to 0, below the
   board's `lastActivitySeq`, so activity dies silently and permanently while
   commands keep working. Recoverable only by a >10 s poll outage or a reboot.
   Plausible during bench work.
3. **Issue #5 is stale in five clauses** and is his issue, assigned to us. It still
   says activity rides on `/api/event`, that missing activity resolves to STILL, and
   that MOVING accepts LEFT/RIGHT/AHEAD. All three are now false.

## Residual risk

- **The classifier is bench-untuned.** Thresholds are labelled ASSUMED in [17].
  A one-sided magnitude's bias EMA makes the effective raw threshold ~2.9× the
  configured value, so the bench run must log steady-state peaks, not first steps.
- **Camera panning at ~0.8 Hz is mathematically indistinguishable from walking**
  (folds to 1.6 Hz, inside the gait band). Asserted as a *failing* case in
  `motion.test.ts` rather than hidden. This is why the manual control is primary,
  not a fallback.
- **Permission ordering is verified by code reading, not on hardware.** Motion is
  requested before `getUserMedia`, but the ~1 s WebKit transient-activation window
  is an inference from `getDisplayMedia`. One HTTPS test on the venue phone settles it.
- **No capture-page component test.** Permission ordering, POST serialisation and
  heartbeat re-arm are covered by tsc/lint and reading, not execution. A refactor
  could invert the ordering with nothing failing.
- **`activitySeq` monotonicity has a ceiling exception.** At `ACTIVITY_SEQ_MAX` the
  clamp maps every larger value to the ceiling and the board's edge stalls
  permanently. ~4,000 years at a 30 s heartbeat; recorded, not mitigated.

## Grounding notes

- `audit/bus-stop-situational-awareness/14-sebastian-integration-analysis.md` — conflict map, contract shape
- `audit/bus-stop-situational-awareness/15-implementation-plan.md` — the executed spec
- `audit/bus-stop-situational-awareness/16-track-a-web-contract.md`, `17-track-b-capture-motion.md`
- `origin/main:firmware/braille_wearable/src/relay_pure.h` — enum, `effectiveActivity`, `acceptsRelayCommand`, lease
- `origin/main:firmware/braille_wearable/src/net.cpp` — the `is<const char*>() && is<uint32_t>()` guard
- `AGENTS.md:31,33,35` — activity phases, nav-command prohibition, freshness independence
