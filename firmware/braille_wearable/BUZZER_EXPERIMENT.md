# Two-Buzzer Discrimination Test

This is the first-hour, buzzer-only experiment. It tests whether the wearer can distinguish the proposed navigation and stationary situational cues before the rest of the prototype is integrated.

## Configure The Board

1. Disconnect USB power before fitting or moving any module.
2. Fit one AX22-0018 passive buzzer in **P1**. Treat this as **LEFT**.
3. Fit the AX22-0050 tactile LED button in **P2**. It is the start/stop control.
4. Fit the second AX22-0018 passive buzzer in **P3**. Treat this as **RIGHT**.
5. Leave **P4 empty** for this test.
6. The 2x5 sockets are not keyed. On every module, align the `G` / GND pin-1 corner with the socket corner marked `G`. Check this twice; do not power a module inserted 180 degrees around.
7. Put the two buzzer modules in the intended wearable position and secure them consistently. Then reconnect the board by USB-C.

The verified signal mapping is P1 buzzer IO1 to GPIO3, P2 button IO1 to GPIO6, P2 LED IO2 to GPIO5, and P3 buzzer IO1 to GPIO16. The button is active-low and the LED is active-high. Disconnect power again before correcting any placement. Keep the buzzers on the wrist or bench and never near an ear.

P2 is used only by this isolated experiment. The full prototype later needs P2 for the ToF sensor, so remove the button before returning to the main hardware plan.

## Build, Upload, And Monitor

From the repository root:

```bash
cd firmware/braille_wearable
../../.venv/bin/pio run -e buzzer_experiment
../../.venv/bin/pio run -e buzzer_experiment -t upload
../../.venv/bin/pio device monitor -e buzzer_experiment
```

The serial monitor runs at 115200 baud. Press `h` to print the controls. If PlatformIO finds more than one upload port, add `--upload-port /dev/cu.usbmodem...` to the upload command and `-p /dev/cu.usbmodem...` to the monitor command.

## Start And Stop

The firmware boots disarmed with both buzzers silent and the P2 LED off.

1. Press the P2 LED button once. The LED turns on, which means buzzer output is armed.
2. In Serial, enter `v`, `n`, or `s` to choose the viability, navigation, or situational test.
3. Press the P2 button again at any time to stop immediately. Both buzzers and the LED turn off and the current session is discarded.

The LED also turns off automatically when a sweep or 12-trial session finishes. Entering `x` in Serial is the software stop equivalent. Serial remains part of the experiment because the operator uses it to select a test and record blind guesses.

## Remove Audible Cues

AX22-0018 modules are passive buzzers, so the frequencies can be heard as well as felt. The wearer must use well-sealed headphones with masking noise and must not see the serial console. Confirm during the viability sweep that the masking noise prevents identification by sound. Otherwise the result does not establish tactile discrimination.

Use two people where possible: the wearer reports the perceived class, while the operator enters it in the serial console. Keep placement, strap tension, sleeves, and masking noise unchanged across scored trials.

## Run The Test

### 1. Viability

Press the P2 button to arm, then enter `v`. The firmware plays 70, 100, 150, and 220 Hz on P1 and then P3, with labels in Serial. Record which outputs are clearly felt in the intended wearable position. If neither side is reliably felt, stop rather than running scored trials.

### 2. Navigation While Moving

Press the P2 button to arm, then enter `n` for 12 balanced, shuffled trials. The wearer should walk in a clear, supervised indoor area or step in place to approximate navigation conditions.

- Perceived LEFT: operator enters `l`.
- Perceived RIGHT: operator enters `r`.
- Replay without revealing the answer: `p`.

LEFT is P1 at 70 Hz. RIGHT is P3 at 220 Hz. A score of at least 10/12 supports retaining this learned frequency-coded navigation vocabulary. It does not establish spatial left/right localization.

### 3. Situational While Standing

Press the P2 button to arm, then enter `s` for 12 balanced, shuffled trials. The wearer should stand as they would while waiting at a bus stop.

- Perceived EVENT / bus arriving: operator enters `e`.
- Perceived WAIT: operator enters `w`.
- Replay without revealing the answer: `p`.

EVENT is three simultaneous pulses on both buzzers. WAIT alternates P1 then P3 twice. A score of at least 10/12 supports retaining this stationary rhythm vocabulary.

## Record The Result

```text
Date / wearer:
Placement and strap tension:
Sleeve or clothing:
Masking method:
Viability notes by frequency and side:
Navigation score (moving):    /12
Situational score (standing): /12
Replays used:
Confusions or discomfort:
Decision:
```

If navigation fails but situational passes, remove the frequency-coded left/right navigation scope while retaining the rhythm-based situational output. If either test passes only without audio masking, treat it as an audible-tone result rather than tactile evidence.
