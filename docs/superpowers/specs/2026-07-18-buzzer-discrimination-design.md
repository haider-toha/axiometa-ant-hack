# Buzzer Discrimination Experiment Design

## Goal

Determine whether two AX22-0018 passive buzzers can provide usable tactile signals for both experimental left/right navigation and stationary situational-awareness patterns before integrating the rest of the product.

## Scope

This is a buzzer-only firmware target. It does not initialize Wi-Fi, Redis, the display, encoder, microphone, ToF sensor, or legacy braille behavior. It must not change the existing firmware target.

The two buzzers snap into:

- Port 1: buzzer A / left, Signal through module IO1 to ESP32 GPIO3.
- Port 3: buzzer B / right, Signal through module IO1 to ESP32 GPIO16.

The AX22-0018 schematic confirms that the buzzer driver uses IO1. The Genesis Mini schematic confirms Port 1 IO1 is GPIO3 and Port 3 IO1 is GPIO16. The module and board silk must still be checked before power-on.

## Approaches Considered

1. **Dedicated PlatformIO environment and source file (chosen).** This is reproducible, cannot accidentally boot the legacy speech-to-braille application, and can be built and uploaded independently.
2. **Replace the current firmware temporarily.** This is faster to type but risks mixing stale LCD, encoder, and network behavior into the test.
3. **Use an untracked Arduino IDE sketch.** This avoids PlatformIO setup but leaves no reviewable or repeatable test artifact.

## Experiment Protocol

### Viability Sweep

Play 70, 100, 150, and 220 Hz on each buzzer with labels visible in Serial. This establishes which frequencies are felt through the intended strap and sleeve. It is calibration, not a scored test.

### Navigation Test

Run 12 randomized, balanced blind trials:

- LEFT: Port 1 at 70 Hz, `200 ms on / 200 ms off` twice.
- RIGHT: Port 3 at 220 Hz, `200 ms on / 200 ms off` twice.

The operator enters the wearer's guess over Serial. The firmware reveals the answer, tracks the score, and advances. Passing is at least 10 correct out of 12. This threshold has less than a 2% probability of occurring by chance in a balanced binary test.

### Stationary Situational Test

Run 12 randomized, balanced blind trials using patterns from the current vocabulary:

- EVENT: both buzzers at 100 Hz, `250 ms on / 250 ms off` three times, representing BUS ARRIVING.
- WAIT: Port 1 then Port 3 at 100 Hz, `300 ms on / 200 ms off`, repeated twice.

The operator enters EVENT or WAIT over Serial. Passing is at least 10 correct out of 12.

## Controls

- `v`: run the labelled viability sweep.
- `n`: start a navigation session.
- `s`: start a stationary situational session.
- `l` / `r`: submit a navigation guess.
- `e` / `w`: submit a situational guess.
- `p`: replay the current blind trial without revealing it.
- `h`: print help.

Each session contains exactly six trials of each class, shuffled on-device. The current trial remains replayable until a valid guess is entered.

## Safety And Interpretation

- Keep the modules on the wrist or bench, never near an ear; they are audible buzzers being used off-label.
- Start at the low frequencies in this design and do not use the 2.7 kHz resonant frequency for the tactile test.
- A navigation pass supports a learned frequency-coded distinction, not a claim of spatial localization.
- If the viability sweep is not felt, stop the scored tests and record tactile output as failed.
- If navigation fails but situational patterns pass, cut P11-P13 while retaining rhythm-based situational output.

## Verification

- Native tests prove the four pattern tables use the intended side, frequency, pulse count, and duration.
- The dedicated ESP32 target must compile with Arduino-ESP32 3.x.
- Hardware upload and perceptual results require the physical Genesis Mini and cannot be claimed from compilation alone.
