# LRA Motor Upgrade Note

## Status

Tacta delivers situational awareness through touch. Purpose-built vibration
motors are how the wearable will reach that goal. This is the migration path from
the current AX22-0018 passive-buzzer proxies to two AX22-0039 LRA motor modules. It assumes the modules physically fit the same
P1 and P3 sockets. It does **not** assume that the current direct-GPIO firmware
can drive them. It does **not** assume that left and right tactile discrimination
is already validated.

Treat replacement as a powered-off module swap, not a live hot-plug.

## Part identity must be confirmed first

Axiometa calls the product **LRA Motor (DA7820)**. Axiometa says it combines an
LD0825BC LRA with a DA7820 haptic driver. However, the Arduino example on the
same product page includes `Haptic_Driver.h` and identifies it as the SparkFun
DA7280 driver. Renesas publishes a DA7280 haptic driver. We have not found a
matching DA7820 primary datasheet.

Before you write the production driver, check the IC marking or the Axiometa
schematic. Confirm whether the module actually uses DA7280. The requirements
below use the DA7280 interface as the likely implementation, not as a verified
module fact.

See these references.

- [Axiometa AX22-0039 product page](https://www.axiometa.io/products/lra-motor-da7820)
- [Renesas DA7280 product page](https://www.renesas.com/en/products/da7280)
- [Renesas DA7280 datasheet](https://www.renesas.com/en/document/dst/da7280-datasheet)

## Hardware migration

Keep the conceptual and visible mapping unchanged.

| Port | Meaning | Current module | Target module |
|---|---|---|---|
| P1 | LEFT | AX22-0018 buzzer | AX22-0039 LRA |
| P3 | RIGHT | AX22-0018 buzzer | AX22-0039 LRA |

The LRA module includes its own motor driver. Firmware must control that driver.
It must not drive the motor directly with the buzzer GPIO tone signal. Axiometa
lists a 240 Hz rated LRA, 3.3 V and 5 V support, up to 90 mA drive, and I2C plus
hardware trigger pins.

Confirm the following before you install two modules.

1. Confirm P1 and P3 expose the module's `SDA`, `SCL`, power, ground, interrupt,
   `GPIO0`, and `GPIO1` pins as expected.
2. Confirm the Genesis Mini rail can supply both modules concurrently, including
   startup and braking transients, while Wi-Fi and the remaining sensors run.
3. Confirm the enclosure couples each LRA firmly to the wearer. It must not block
   the motor's moving mass or let the PCB resonate loosely.
4. Confirm the P1 and P3 control topology. DA7280 has a fixed 7-bit I2C address
   of `0x4A`. You cannot control two devices at that address independently on one
   shared I2C line.

The preferred dual-module options, in priority order, are the following.

1. Use separate I2C controllers or buses if P1 and P3 route `SDA` and `SCL`
   separately.
2. Add an I2C multiplexer or switch if both sockets share one line.
3. Investigate preconfigured DA7280 waveform sequences. Trigger them through each
   socket's independent `GPIO0` and `GPIO1` lines. This still needs a way to
   configure each same-address device independently at startup. So it is not
   automatically a mux-free solution.

Do not implement a two-device driver until you verify one of these topologies on
the Genesis Mini schematic or bench.

## Firmware migration

The existing `hapticWrite(leftHz, rightHz)` implementation uses ESP32 LEDC tone
output. Preserve the pattern scheduler and channel semantics, but put the
actuator-specific work behind a driver boundary.

The recommended target behavior is the following.

- `hapticBegin()` initializes both drivers, applies the verified motor profile,
  enables resonance tracking, and clears stale interrupts. It fails safely with
  both channels off if it cannot initialize either required device.
- Replace frequency arguments with actuator-neutral channel levels, for example
  `hapticWrite(leftLevel, rightLevel)`, where `0` is off and `1..127` is drive
  strength. Keep the conversion to percentages at the UI boundary.
- Preserve non-blocking pattern timing. The Axiometa example uses `delay()`, but
  the integrated firmware must not block ToF, microphone, relay, or safety work.
- `hapticStop()` must stop both channels immediately, including after an I2C
  error, mode change, reset, or higher-priority alert.
- Read interrupt and fault state where available. Degrade to off rather than
  leave an actuator latched on.
- Keep local ToF and siren paths independent of Wi-Fi.
- Do not translate 2350 Hz and 3050 Hz into LRA frequencies. Those values are
  audible-buzzer proxies. Design a new tactile vocabulary from channel,
  amplitude, pulse duration, rhythm, and possibly stored waveforms.

Add native tests for the pattern to channel and level mapping. Add hardware tests
for left-only, right-only, both, off, stop latency, initialization failure, and
I2C failure. The ESP32 target build remains a required check.

## Serial protocol migration

Keep protocol v1 in use while the buzzer firmware runs.

```text
TACTA_OUTPUT {"v":1,"leftHz":2350,"rightHz":0,"upMs":123456}
```

Add an actuator-neutral v2 record when the LRA firmware lands.

```text
TACTA_OUTPUT {"v":2,"kind":"lra","leftLevel":127,"rightLevel":0,"upMs":123456}
```

Follow these v2 rules.

- `kind` is `"lra"` for this module family.
- `leftLevel` and `rightLevel` are integers from `0` through `127`. `0` means
  off.
- `upMs` keeps its v1 reset, order, and heartbeat meaning.
- Emit immediately on state change, and at most once per second while unchanged.
  This matches v1 behavior.
- Report the state actually written to the drivers. Do not report the requested
  relay command. Do not report an inferred semantic such as `BUS` or `SIREN`.
- If you later need diagnostics, add explicit optional fault fields in another
  reviewed protocol revision. Do not overload level values.

Deploy browser support for both v1 and v2 before you flash v2-only firmware. This
keeps the laptop useful during a mixed buzzer and LRA transition.

## Laptop UI migration

The `/output` route remains the correct crowd display. Its physical layout and
serial lifecycle do not need to change. This route is one of the demo tools on
the live site tacta.space, next to `/capture`. That site serves
the pitch deck as its landing page.

- Keep `LEFT / P1` and `RIGHT / P3` in fixed positions.
- Keep active motion, color-independent state, pulse history, stale detection,
  disconnect handling, and reconnect behavior.
- Parse telemetry as a versioned union. Do not assume every record contains
  hertz.
- For v1, continue to show frequency in hertz. Identify the output as a buzzer or
  audio proxy.
- For v2, show `LRA` and strength as a percentage derived from `level / 127`.
  `level > 0` drives the active animation.
- Preserve the rule that the UI shows physical output only. It must not invent
  navigation or hazard meaning from a motor pulse.

No desktop daemon or phone-to-laptop link is required. The phone continues to use
the web and relay path. The laptop reads physical-output telemetry over USB
serial.

## Physical acceptance gate

The upgrade is ready only after all of these pass on the assembled device.

- Both modules enumerate or initialize independently with no I2C-address
  collision.
- Left-only, right-only, both, and off commands actuate exactly the intended
  channels with no crosstalk.
- Emergency stop and fault paths turn both motors off promptly.
- ToF, microphone, Wi-Fi relay, and serial heartbeat remain responsive during
  sustained and alternating vibration.
- The laptop display starts and stops in sync with each physical channel. It
  recovers after USB disconnect and reconnect.
- Current draw, temperature, mechanical retention, noise, and comfort are
  acceptable for the demo duty cycle.
- A wear test establishes whether the chosen left and right patterns are actually
  distinguishable. Physical separation remains 33.941 mm. So make no spatial
  localization claim without evidence.

## Recommended implementation order

1. Confirm the actual driver IC and the P1 and P3 I2C and pin topology.
2. Bring up one LRA module and verify start, level control, stop, and fault
   state.
3. Prove independent control of two modules before you change the pattern engine.
4. Add protocol v2 and dual-version UI support.
5. Integrate the LRA driver behind the existing haptic and pattern boundary.
6. Run the complete physical acceptance gate. Record the measured results in a
   bench-test note before you treat the upgrade as done.
