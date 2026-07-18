# Demo Flow Hardening Design

## Goal

Make tomorrow's two-phase demonstration rehearsable and observable without
claiming that components owned by other developers are complete.

The locked sequence is:

1. `MOVING`: local ToF detects a forward obstacle; the user chooses the bypass
   with their cane. Local siren detection then preempts the proximity output.
2. `STILL`: the phone camera sees the printed bus prop, reports arrival, waits
   for route reading, and delivers high-confidence route `88`.
3. The ESP32 remains outbound-only over the phone hotspot. The phone runs
   `/capture`; the MacBook powers the board over USB-C and shows `/output` from
   the deployed web app using Web Serial.

## Ownership Boundary

Haider owns the phone motion classifier and the relay activity producer. This
branch does not implement either. It treats these response fields as an external
contract:

```json
{
  "activity": "MOVING",
  "activitySeq": 4,
  "activityTs": 1784419199000
}
```

The firmware consumer is already fail-closed: missing, invalid, regressed, or
stale activity leaves the effective mode `MOVING`, so bus information cannot be
played accidentally.

## Hardening Approach

### 1. Read-only live readiness probe

Add a dependency-free Node script under `www/scripts/` that checks the public
deployment without mutating Redis:

- `/`, `/capture`, and `/output` return HTML with status 200;
- `/api/pull` returns the command fields plus independent activity fields;
- `/api/state` returns device, detector, and telemetry objects;
- route failures and contract failures are reported separately;
- exit status is non-zero until every required gate passes.

The probe performs GET requests only. It never calls `/api/event`, never changes
activity, and cannot trigger physical output.

### 2. Exact firmware demo regression

Add one narrative native test that runs the relay policy through the sequence
the team will demonstrate:

- establish a `MOVING` baseline;
- consume a camera BUS event while moving without output or replay;
- apply a fresh `STILL` transition;
- accept fresh BUS, WAIT, and high-confidence NUMBER `88` commands in order;
- return to `MOVING` and confirm a later bus command is suppressed.

This test remains pure C++ and does not access GPIO, microphones, ToF, Wi-Fi, or
the buzzers.

### 3. Pull-request CI

Add one GitHub Actions workflow with independent web and firmware jobs. The web
job runs install, tests, TypeScript, lint, and the production build. The firmware
job installs PlatformIO, runs the native suite, and builds `board_firmware`.

CI is verification only. Vercel production deployment remains a separate manual
or Git-integrated operation because this repository currently has no deployment
credentials or valid local Vercel session.

### 4. Morning runbook and evidence audit

Write a concise operator runbook that separates:

- silent overnight checks;
- daytime physical checks that may produce sound;
- exact topology and startup order;
- trigger and stop controls;
- expected observations at each stage;
- fallback actions and known blockers.

Record tonight's actual state in the audit folder. A merged commit is not marked
deployed until the public route returns the expected result.

## Quiet-Hours Safety

Tonight, do not:

- open the board serial port, because opening USB serial may reset the board and
  schedule the READY tone;
- upload firmware or press reset/boot;
- place an obstacle in the active ToF zone;
- play a siren recording;
- POST relay events or activity changes to the production Redis state;
- connect `/output` to the physical board.

Allowed overnight checks are builds, unit tests, pure firmware tests, read-only
HTTP probes, static browser rendering, and source/branch inspection.

## Acceptance Criteria

- The readiness script is unit tested and cannot issue non-GET requests.
- The exact demo-sequence firmware test passes without hardware.
- CI passes both jobs on the hardening PR.
- The runbook identifies Haider's activity producer and Vercel deployment as
  external gates rather than silently substituting local implementations.
- The live probe records `/output` and activity-contract failures accurately.
- The repository remains clean, and all work is pushed only to
  `feat/demo-flow-hardening` for morning review.
