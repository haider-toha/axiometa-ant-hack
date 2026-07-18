# Serial Output Monitor Design

## Goal

Provide a crowd-visible laptop display of the ESP32's two physical output channels while the phone runs the camera experience. The laptop display must reflect the tones or future vibration motors that the firmware actually drives, rather than guessing from relay commands.

The demo topology is:

- Phone browser: the deployed `/capture` experience and phone hotspot.
- ESP32-S3: Wi-Fi client on the phone hotspot and USB serial device connected to the MacBook.
- MacBook Chrome: the deployed `/output` experience, reading the ESP over Web Serial.

The phone and laptop can use the same deployment concurrently because they are independent browser clients on different routes. Serial telemetry remains local between the ESP and MacBook.

## Approaches Considered

1. **Web Serial in the existing `www` app (chosen).** This reuses the current design system, adds no local daemon, and keeps deployment and UI maintenance in one codebase. Desktop Chrome requires an explicit port grant on first use and can reconnect to a previously granted port later.
2. **Node serial bridge plus browser UI.** This could auto-discover the ESP without a browser permission prompt, but adds a native serial dependency, a second local process, and another connection that can fail during the demo.
3. **Electron or Tauri desktop application.** This could be packaged as a standalone executable, but duplicates web-app concerns and adds packaging overhead without improving the prototype's core behavior.

The chosen approach treats `/output` as a standalone demo surface in use, while sharing implementation and visual tokens with the phone web app.

## Firmware Contract

The low-level `hapticWrite` function is the source of truth for both output channels. Whenever either channel changes, firmware emits one newline-delimited record:

```text
TACTA_OUTPUT {"v":1,"leftHz":2350,"rightHz":0,"upMs":123456}
```

Contract rules:

- `leftHz` is the actual P1 frequency after the write.
- `rightHz` is the actual P3 frequency after the write.
- `0` means that channel is inactive.
- `upMs` is the ESP uptime from `millis()` and helps detect resets, order pulses, and verify the heartbeat.
- Changes emit immediately. Unchanged writes emit at most one state heartbeat per second, preventing loop-frequency serial traffic while allowing the browser to detect stale firmware data.
- Other human-readable firmware logs may remain on the same serial stream. The browser ignores lines without the `TACTA_OUTPUT ` prefix.
- Version `1` is intentionally small and independent of relay command names. Future motors may retain the two-channel state shape while replacing frequency with additional fields in a later protocol version.

JSON is used after a fixed prefix so the browser can parse a structured record without depending on spacing or free-form logs.

## Laptop Experience

Add a dedicated `/output` route to `www` using the existing TACTA wordmark, typography, tokens, dark mode, and restrained operational styling.

The route contains:

- A compact header with connection state and Connect/Disconnect controls.
- Two fixed, equal output regions: `LEFT / P1` and `RIGHT / P3`.
- A large actuator visualization on each side that changes fill, outline, status text, and motion while active. Color is not the only active-state signal.
- The current frequency in hertz for each channel.
- A short pulse-history strip so an audience can see recent timing even when pulses are brief.
- A clear disconnected or stale state that does not imply the outputs are inactive with certainty.

The display reports physical output state only. It does not label a pulse as `BUS`, `SIREN`, or `NAVIGATION` unless a future protocol explicitly supplies that semantic event.

## Serial Lifecycle

- The first connection calls `navigator.serial.requestPort()` from the Connect button.
- Later visits use `navigator.serial.getPorts()` to reconnect to a previously granted port.
- The port opens at the firmware's existing baud rate.
- A line buffer handles arbitrary serial stream chunking and CRLF/LF endings.
- Malformed or unsupported telemetry is ignored without stopping the reader.
- Disconnect immediately changes the UI to `DISCONNECTED`; stale data is visually marked and never presented as live.
- PlatformIO Serial Monitor must be closed while the browser owns the port. A busy-port error is presented clearly.
- The page is read-only and sends no serial commands to the ESP.

## Concurrency And Failure Boundaries

Wi-Fi relay traffic and USB serial telemetry use separate ESP32 interfaces. A failure in the phone hotspot or cloud relay must not stop local USB visualization of ToF, siren, or other locally generated outputs. A laptop/browser disconnect must not affect firmware output behavior.

Opening the USB serial port may reset some board configurations. The physical acceptance test must verify the Genesis Mini's behavior and ensure the UI returns to a known state after a reset or reconnect.

## Verification

Automated checks:

- Parser tests cover chunk boundaries, mixed human-readable logs, malformed JSON, protocol versions, CRLF, and multiple records per chunk.
- UI tests cover left-only, right-only, both-active, idle, disconnected, stale, and unsupported-browser states.
- Existing `www` lint and production build pass.
- Native firmware tests cover telemetry formatting if formatting is extracted into a pure helper.
- The Genesis Mini firmware target compiles.

Physical acceptance test:

1. Connect the ESP to the phone hotspot and confirm relay polling continues.
2. Connect the ESP to the MacBook over USB-C and close other serial monitors.
3. Open `/output` in desktop Chrome and grant the ESP serial port.
4. Trigger left-only, right-only, both-channel, ToF, and siren outputs that are available in the firmware.
5. Confirm each visual transition starts and stops with the audible output and pulse history preserves brief events.
6. Disconnect and reconnect USB, then confirm the page shows the interruption and recovers.
7. Keep `/capture` open on the phone throughout to confirm both browser surfaces coexist.

The feature is not considered physically proven until this concurrent test passes on the actual board.
