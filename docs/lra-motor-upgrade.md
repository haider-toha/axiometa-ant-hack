# LRA Motor Upgrade Note

## Status

This is the high-level migration path from the current AX22-0018 passive-buzzer
proxies to two AX22-0039 LRA motor modules. It assumes the modules physically fit
the same P1 and P3 sockets. It does **not** assume that the current direct-GPIO
firmware can drive them, or that left/right tactile discrimination is already
validated.

Treat replacement as a powered-off module swap, not live hot-plugging.

## Part identity must be confirmed first

Axiometa calls the product **LRA Motor (DA7820)** and says it combines an
LD0825BC LRA with a DA7820 haptic driver. However, the Arduino example on the
same product page includes `Haptic_Driver.h` and identifies it as the SparkFun
DA7280 driver. Renesas publishes a DA7280 haptic driver, while a matching DA7820
primary datasheet has not been identified.

Before writing the production driver, check the IC marking or Axiometa schematic
and confirm whether the module actually uses DA7280. The requirements below use
the DA7280 interface as the likely implementation, not as a verified module fact.

References:

- [Axiometa AX22-0039 product page](https://www.axiometa.io/products/lra-motor-da7820)
- [Renesas DA7280 product page](https://www.renesas.com/en/products/da7280)
- [Renesas DA7280 datasheet](https://www.renesas.com/en/document/dst/da7280-datasheet)

## Hardware migration

Keep the conceptual and visible mapping unchanged:

| Port | Meaning | Current module | Target module |
|---|---|---|---|
| P1 | LEFT | AX22-0018 buzzer | AX22-0039 LRA |
| P3 | RIGHT | AX22-0018 buzzer | AX22-0039 LRA |

The LRA module includes its own motor driver. Firmware must control that driver;
it must not drive the motor directly with the buzzer GPIO tone signal. Axiometa
lists a 240 Hz rated LRA, 3.3 V/5 V support, up to 90 mA drive, and I2C plus
hardware trigger pins.

Before installing two modules:

1. Confirm P1 and P3 expose the module's `SDA`, `SCL`, power, ground, interrupt,
   `GPIO0`, and `GPIO1` pins as expected.
2. Confirm the Genesis Mini rail can supply both modules concurrently, including
   startup and braking transients, while Wi-Fi and the remaining sensors run.
3. Confirm the enclosure couples each LRA firmly to the wearer without blocking
   the motor's moving mass or letting the PCB resonate loosely.
4. Confirm the P1/P3 control topology. DA7280 has a fixed 7-bit I2C address of
   `0x4A`; two devices at that address cannot be controlled independently on one
   shared bus.

The preferred dual-module options, in order, are:

1. Use separate I2C controllers/buses if P1 and P3 route `SDA`/`SCL` separately.
2. Add an I2C multiplexer or switch if both sockets share one bus.
3. Investigate preconfigured DA7280 waveform sequences triggered through each
   socket's independent `GPIO0`/`GPIO1` lines. This still needs a way to configure
   each same-address device independently at startup, so it is not automatically
   a mux-free solution.

Do not implement a two-device driver until one of these topologies is verified on
the Genesis Mini schematic or bench.

## Firmware migration

The existing `hapticWrite(leftHz, rightHz)` implementation uses ESP32 LEDC tone
output. Preserve the pattern scheduler and channel semantics, but put the
actuator-specific work behind a driver boundary.

Recommended target behavior:

- `hapticBegin()` initializes both drivers, applies the verified motor profile,
  enables resonance tracking, clears stale interrupts, and fails safely with both
  channels off if either required device cannot be initialized.
- Replace frequency arguments with actuator-neutral channel levels, for example
  `hapticWrite(leftLevel, rightLevel)`, where `0` is off and `1..127` is drive
  strength. Keep conversion to percentages at the UI boundary.
- Preserve non-blocking pattern timing. The Axiometa example uses `delay()`, but
  the integrated firmware must not block ToF, microphone, relay, or safety work.
- `hapticStop()` must stop both channels immediately, including after an I2C
  error, mode change, reset, or higher-priority alert.
- Read interrupt/fault state where available and degrade to off rather than leave
  an actuator latched on.
- Keep local ToF and siren paths independent of Wi-Fi.
- Do not translate 2350 Hz and 3050 Hz into LRA frequencies. Those values are
  audible-buzzer proxies. Design a new tactile vocabulary using channel,
  amplitude, pulse duration, rhythm, and possibly stored waveforms.

Add native tests for pattern-to-channel/level mapping and hardware tests for
left-only, right-only, both, off, stop latency, initialization failure, and bus
failure. The ESP32 target build remains a required check.

## Serial protocol migration

Keep protocol v1 working while buzzer firmware is in use:

```text
TACTA_OUTPUT {"v":1,"leftHz":2350,"rightHz":0,"upMs":123456}
```

Add an actuator-neutral v2 record when LRA firmware lands:

```text
TACTA_OUTPUT {"v":2,"kind":"lra","leftLevel":127,"rightLevel":0,"upMs":123456}
```

V2 rules:

- `kind` is `"lra"` for this module family.
- `leftLevel` and `rightLevel` are integers from `0` through `127`; `0` means off.
- `upMs` keeps its v1 reset/order/heartbeat meaning.
- Emit immediately on state change and at most once per second while unchanged,
  matching v1 behavior.
- Report the state actually written to the drivers, not the requested relay
  command and not an inferred semantic such as `BUS` or `SIREN`.
- If diagnostics are later needed, add explicit optional fault fields in another
  reviewed protocol revision rather than overloading level values.

Deploy browser support for both v1 and v2 before flashing v2-only firmware. This
keeps the laptop useful during a mixed buzzer/LRA transition.

## Laptop UI migration

The `/output` route remains the correct crowd display. Its physical layout and
serial lifecycle do not need to change:

- Keep `LEFT / P1` and `RIGHT / P3` in fixed positions.
- Keep active motion, color-independent state, pulse history, stale detection,
  disconnect handling, and reconnect behavior.
- Parse telemetry as a versioned union instead of assuming every record contains
  hertz.
- For v1, continue showing frequency in hertz and identify the output as a
  buzzer/audio proxy.
- For v2, show `LRA` and strength as a percentage derived from `level / 127`.
  The active animation is driven by `level > 0`.
- Preserve the rule that the UI visualizes physical output only. It must not
  invent navigation or hazard meaning from a motor pulse.

No desktop daemon or phone-to-laptop link is required. The phone continues to use
the web/relay path, while the laptop reads physical-output telemetry over USB
serial.

## Physical acceptance gate

The upgrade is ready only after all of these pass on the assembled device:

- Both modules enumerate or initialize independently with no I2C-address
  collision.
- Left-only, right-only, both, and off commands actuate exactly the intended
  channels with no crosstalk.
- Emergency stop and fault paths turn both motors off promptly.
- ToF, microphone, Wi-Fi relay, and serial heartbeat remain responsive during
  sustained and alternating vibration.
- The laptop display starts and stops in sync with each physical channel and
  recovers after USB disconnect/reconnect.
- Current draw, temperature, mechanical retention, noise, and comfort are
  acceptable for the demo duty cycle.
- A wear test establishes whether the chosen left/right patterns are actually
  distinguishable. Physical separation remains 33.941 mm, so no spatial
  localization claim should be made without evidence.

## Recommended implementation order

1. Confirm the actual driver IC and P1/P3 bus/pin topology.
2. Bring up one LRA module and verify start, level control, stop, and fault state.
3. Prove independent control of two modules before changing the pattern engine.
4. Add protocol v2 and dual-version UI support.
5. Integrate the LRA driver behind the existing haptic/pattern boundary.
6. Run the complete physical acceptance gate and document measured results in
   `audit/bus-stop-situational-awareness/`.
