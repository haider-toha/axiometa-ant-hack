# Firmware Output Reason Telemetry Design

## Goal

Make the `/output` demo understandable without reading Serial logs. The monitor must explain why the board selected its current output, show when a local condition is deliberately silent, and continue to display the literal P1/P3 hardware frequencies.

The ESP32 remains the source of truth. The web app must not infer a reason from a relay command, a frequency, or a pattern timeline because local siren and ToF arbitration can preempt cloud output after reception.

## Approaches Considered

1. **Extend the existing `TACTA_OUTPUT` record with atomic board-owned semantics (chosen).** One versioned record carries the actual hardware frequencies and the board's current arbitration result. This keeps the monitor synchronized and works without the cloud relay.
2. **Add a separate `TACTA_REASON` Serial record.** This is superficially smaller, but frequency and reason lines can arrive separately or be dropped independently, leaving the demo with a temporarily incorrect explanation.
3. **Infer the reason from relay state in the web app.** This cannot explain local ToF or siren output reliably, becomes stale during network trouble, and can mislabel a command that the board suppressed or preempted.

## Source-of-Truth Boundary

Firmware `main.cpp` owns semantic arbitration and therefore determines the current state, source, pattern, reason, activity, and ToF context. The haptic layer owns the physical LEDC drive and exposes the actual P1/P3 frequencies after `AUDIBLE`/`NIGHT` mode is applied.

Telemetry publishing runs after `serviceOutput()` so every record describes one coherent post-arbitration snapshot. It emits immediately when either the semantic snapshot or physical drive changes, plus a one-second heartbeat when unchanged. No relay or browser round trip is involved.

## Serial Contract

Firmware emits newline-delimited version 2 records alongside existing human-readable logs:

```text
TACTA_OUTPUT {"v":2,"leftHz":2350,"rightHz":0,"upMs":123456,"state":"ACTIVE","source":"LOCAL_TOF","pattern":"PROXIMITY","activity":"MOVING","reason":"PLAYING","tofMm":444,"outputMode":"AUDIBLE"}
```

Fields are fixed, closed vocabularies:

- `leftHz`, `rightHz`: frequencies physically requested from LEDC after output mode is applied. `0` means that physical channel is off.
- `upMs`: ESP uptime from `millis()`.
- `state`: `ACTIVE`, `SUPPRESSED`, `MUTED`, `STOPPED`, or `IDLE`.
- `source`: `LOCAL_SIREN`, `LOCAL_TOF`, `RELAY`, `SERVICE`, `SYSTEM`, or `NONE`.
- `pattern`: the canonical board pattern name such as `PROXIMITY`, `SIREN`, `RIGHT`, `BUS`, `NUMBER`, `READY`, or `NONE`.
- `activity`: `MOVING`, `STILL`, or `UNKNOWN`.
- `reason`: `PLAYING`, `STILL_GATE`, `NIGHT_MODE`, `OUTPUT_STOPPED`, or `NO_OUTPUT`.
- `tofMm`: the latest valid ToF distance, or `null` before a valid sample.
- `outputMode`: `AUDIBLE` or `NIGHT`.

The semantic states mean:

| State | Meaning |
|---|---|
| `ACTIVE` | A winning logical pattern exists. Frequencies can momentarily be zero between its pulses. |
| `SUPPRESSED` | A persistent local condition exists but policy intentionally keeps it silent. For this prototype that means proximity detected while `STILL`. |
| `MUTED` | A winning logical pattern exists, but `NIGHT` mode forces the physical frequencies to zero. |
| `STOPPED` | The emergency output latch is off. Sensing continues. |
| `IDLE` | No logical output is currently requested. |

`pattern` identifies the winner, not every pending or preempted condition. Transient rejected relay commands remain visible in the Relay trace and existing human-readable Serial logs; version 2 does not add an event-history protocol.

## Compatibility

The web decoder accepts both versions:

- Version 1 retains the existing `{v,leftHz,rightHz,upMs}` shape.
- Version 2 requires every semantic field and rejects unknown enum values, invalid frequencies, invalid uptime, and invalid `tofMm` values.
- A connected version 1 board continues to render channels and the five-second timeline. The explanation reads: `Reason unavailable — firmware telemetry v1.`
- Unsupported future versions and malformed lines remain ignored without breaking the Serial reader.

No firmware flash or board reboot is part of implementation or automated verification. Physical testing happens only after coordination with the other firmware workstream.

## Output Monitor Experience

The existing `Output channels` tab gains one prominent `Why this output?` panel above the P1/P3 cards. It uses the existing TACTA typography, restrained borders, status dot language, and dark/light tokens. The frequency cards, recent-pulse afterglow, proportional five-second timeline, and Relay trace remain intact.

The panel converts closed firmware enums into concise demo copy:

- `Local proximity` — `P1 is pulsing because an object is 444 mm away while moving.`
- `Proximity held` — `An object is 444 mm away, but proximity output stays silent while still.`
- `Cloud RIGHT` — `P3 is active because RIGHT was accepted while moving.`
- `Local siren` — `The siren safety pattern has priority over other outputs.`
- `Hardware muted` — `The pattern is running logically, but NIGHT mode keeps both buzzers silent.`
- `Output stopped` — `The emergency output latch is off; sensing is still active.`
- `Idle` — `No output is currently requested.`

The panel also shows compact board-derived badges for activity and source. Color is never the only signal. Its live-region announcement includes the explanation only when the semantic reason changes, avoiding repeated speech on every one-second heartbeat.

## Firmware Semantics

The semantic snapshot follows the existing arbitration order exactly:

1. Disabled output latch produces `STOPPED / NONE / NONE / OUTPUT_STOPPED`.
2. Active siren output produces `ACTIVE / LOCAL_SIREN / <siren pattern> / PLAYING`.
3. Renderable proximity produces `ACTIVE / LOCAL_TOF / PROXIMITY / PLAYING`.
4. An active cloud/service/system player produces `ACTIVE` with its recorded source and pattern.
5. Detected proximity that cannot render solely because activity is `STILL` produces `SUPPRESSED / LOCAL_TOF / PROXIMITY / STILL_GATE`.
6. Otherwise the snapshot is `IDLE / NONE / NONE / NO_OUTPUT`.

After selecting the logical state, `NIGHT` mode changes any `ACTIVE` state to `MUTED / NIGHT_MODE` and reports zero physical frequencies. It does not hide whether the winning source was siren, ToF, relay, service, or system.

The cloud player records its source when started:

- accepted relay commands use `RELAY`;
- Serial `l/r/a` simulation and other explicit Serial scenario inputs use `SERVICE`;
- the boot-ready pattern uses `SYSTEM`.

Local siren and ToF never depend on Wi-Fi, and telemetry does not alter output arbitration or timing.

## Verification

Firmware pure tests cover exact version 2 formatting, truncation, enum names, state precedence, STILL proximity suppression, NIGHT muting, source retention, and wrap-safe heartbeat timing. Run:

```bash
cd firmware/braille_wearable
pio test -e native
pio run -e board_firmware
```

Web tests cover strict version 1/version 2 parsing, mixed streaming records, every explanation state, version 1 fallback, stale/disconnected behavior, and unchanged channel/timeline rendering. Run:

```bash
cd www
pnpm test -- --run
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

The implementation is complete without a physical acceptance claim. A coordinated later board test should connect `/output`, trigger service direction, moving ToF, STILL ToF suppression, siren, NIGHT mode, and emergency stop, then confirm the visible reason matches the audible or intentionally silent board behavior.

## Non-Goals

- Do not change camera submission, Modal detection, relay routes, or activity production.
- Do not add a persistent event history or replay rejected commands.
- Do not infer left/right obstacle avoidance from the single ToF sensor.
- Do not rename the passive buzzers as vibration motors or claim tactile validation.
- Do not flash, reset, or reboot the connected board during this workstream.
