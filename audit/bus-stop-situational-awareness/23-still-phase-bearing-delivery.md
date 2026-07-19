# 23 — STILL-phase bearing delivery: directions while scanning for the bus

2026-07-19, straight after audit 22 shipped. Supersedes the MOVING-only
bearing rule from audits 19/20 (and the "board drops bearings in STILL"
statements in audit 22 §Defect 2). Plan and AGENTS.md amended in the same
commit — this is a deliberate contract change, not drift.

## The requirement, in the user's words

> "when i look for the bus I WILL BE STANDING STILL … i point the camera at a
> bus then it tells me where to go and then i start walking and it tells me
> real time … directions"

Obvious in hindsight: a person scanning for their bus is stationary. Under the
audit-19/20 contract the first direction could not reach the board until the
walk classifier latched MOVING (~4 s *after* they started walking blind). The
phone screen showed the bearing; the wearable said nothing.

## Change

**Firmware** (`relay_pure.h`): `acceptsRelayCommand` now accepts
LEFT/RIGHT/AHEAD in **both** `MOVING` and `STILL`. `UNKNOWN` still refuses —
no directions without a fresh activity claim. Local safety precedence
(`evaluateCommandGate`) is untouched: ToF proximity (which can render only in
MOVING) and siren output still outrank any bearing. Truth tables in
`test_relay.cpp` and `test_navigation.cpp` re-pinned; 110/110 native tests.

**Phone** (`www/src/lib/contract.ts` → `chooseEvent`, used by
`capture/page.tsx`): the two halves share one seq channel, so precedence is
now an explicit, tested, pure function:

| phase | bus half says | channel goes to |
| --- | --- | --- |
| MOVING | anything | **bearing** (board drops bus info in MOVING anyway) |
| STILL | NONE / WAIT | **bearing** — this is the first-direction-while-scanning case |
| STILL | BUS / NUMBER / UNKNOWN | **bus info** — arrival + route-88 output still land |
| any | anything, Force send on | **bearing** |

Deliberate cost: the WAIT "request in flight" tone is never heard while a
bearing is held — a direction is worth more than a progress noise. And because
`vision/service.py` keeps `reading_ready` latched for the whole arrival
(`reading_for == arrival_id`), after the route is announced the bearing stays
held behind NUMBER **while standing still with the bus in view**; it resumes
the moment the user starts walking (MOVING → bearing wins), the arrival
unlatches, or Force send is on. That matches the demo arc: scan → direction →
bus pulls in → BUS + route 88 → walk → live directions.

Edge-trigger safety, pinned in `contract.test.ts`: `navEvent` carries
`arrivalId: 0` and stable empty fields, so a held bearing compares
`sameEvent`-equal across detector arrival re-latches AND across the
STILL→MOVING flip — the activity change itself never restarts the board's
800 ms pattern mid-play.

**UI**: the Direction card now reads "sending · scanning" / "sending ·
walking", and a held bearing says exactly what it is behind
(`LEFT · held (NUMBER)`). "Force send" is re-scoped: it no longer bypasses a
phone-side activity gate (there isn't one any more) — it makes the bearing
outrank bus announcements on the shared channel.

## What did NOT change

- ToF still never derives a direction; bearings are camera-only, advisory.
- Local siren/proximity paths still outrank every cloud command.
- BUS/NUMBER/WAIT/UNKNOWN are still STILL-only on the board.
- Activity still travels its own channel; nothing here touches `activitySeq`.

## Timings the user will experience (bench math, not measured)

- Stand still, bus enters frame: ~2–3.5 s to first buzzed direction
  (3-frame confirm at 2 Hz + POST + ≤300 ms board poll).
- Direction change while walking: ~2–2.5 s behind reality (same confirm).
- Start walking with a direction already held behind NUMBER: next capture
  tick (≤500 ms) after the classifier flips (~2.5–4.5 s of walking at the
  audit-22 band) hands the channel back to the bearing.

Verification: `www` — tsc, lint, 277/277 vitest, build. Firmware — 110/110
native, `board_firmware` builds.
