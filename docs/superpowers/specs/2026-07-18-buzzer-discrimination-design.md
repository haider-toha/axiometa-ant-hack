# Buzzer Discrimination Experiment Design

## Goal

The original goal was to test tactile viability. That test failed: the buzzers were audible but produced virtually no felt movement. The retained runner now uses them as explicit audio proxies for two future vibration channels and validates only routing, timing, and pattern semantics.

## Scope

This is a buzzer-only firmware target. It does not initialize Wi-Fi, Redis, the display, encoder, microphone, ToF sensor, or legacy braille behavior. It must not change the existing firmware target.

The two buzzers snap into:

- Port 1: buzzer A / left, Signal through module IO1 to ESP32 GPIO3.
- Port 3: buzzer B / right, Signal through module IO1 to ESP32 GPIO16.

The AX22-0018 schematic confirms that the buzzer driver uses IO1. The Genesis Mini schematic confirms Port 1 IO1 is GPIO3 and Port 3 IO1 is GPIO16. The module and board silk must still be checked before power-on.

An AX22-0050 tactile LED button temporarily occupies Port 2 for this experiment. Its active-low switch uses IO1 / GPIO6 and its active-high LED uses IO2 / GPIO5. Port 4 remains empty. Port 2 must be returned to the ToF sensor when the full prototype is assembled.

## Approaches Considered

1. **Dedicated PlatformIO environment and source file (chosen).** This is reproducible, cannot accidentally boot the legacy speech-to-braille application, and can be built and uploaded independently.
2. **Replace the current firmware temporarily.** This is faster to type but risks mixing stale LCD, encoder, and network behavior into the test.
3. **Use an untracked Arduino IDE sketch.** This avoids PlatformIO setup but leaves no reviewable or repeatable test artifact.

## Experiment Protocol

### Audio Proxy Check

Play P1 / LEFT at 700 Hz and P3 / RIGHT at 1400 Hz with labels visible in Serial. This confirms that both proxy channels are audible and correctly routed.

### Navigation Test

Run 12 randomized, balanced blind trials:

- LEFT: Port 1 at 700 Hz, `200 ms on / 200 ms off` twice.
- RIGHT: Port 3 at 1400 Hz, `200 ms on / 200 ms off` twice.

The operator enters the wearer's guess over Serial. The firmware reveals the answer, tracks the score, and advances. Passing is at least 10 correct out of 12. This threshold has less than a 2% probability of occurring by chance in a balanced binary test.

### Stationary Situational Test

Run 12 randomized, balanced blind trials using patterns from the current vocabulary:

- EVENT: both proxy tones together, `250 ms on / 250 ms off` three times, representing BUS ARRIVING.
- WAIT: 700 Hz Port 1 then 1400 Hz Port 3, `300 ms on / 200 ms off`, repeated twice.

The operator enters EVENT or WAIT over Serial. Passing is at least 10 correct out of 12.

## Controls

- P2 button: press once to arm output; press again to stop and discard the active run.
- P2 LED: on while output is armed; off while safe/disarmed and after completion.
- `v`: run the labelled audio proxy check.
- `n`: start a navigation session.
- `s`: start a stationary situational session.
- `l` / `r`: submit a navigation guess.
- `e` / `w`: submit a situational guess.
- `p`: replay the current blind trial without revealing it.
- `x`: stop and disarm from Serial.
- `h`: print help.

Each session contains exactly six trials of each class, shuffled on-device. The current trial remains replayable until a valid guess is entered.
The button is serviced during pulse timing so a stop silences both buzzers without waiting for a complete pattern.

## Safety And Interpretation

- Keep the audible modules away from ears.
- A score supports only the clarity of the audio simulation and software routing.
- Do not claim tactile output, spatial localization, DeafBlind accessibility, or motor-vocabulary validation from this runner.
- Future ERM/LRA hardware must be retuned and tested independently with representative users.

## Verification

- Native tests prove the four pattern tables use the intended side, frequency, pulse count, and duration.
- The dedicated ESP32 target must compile with Arduino-ESP32 3.x.
- Hardware upload and perceptual results require the physical Genesis Mini and cannot be claimed from compilation alone.
