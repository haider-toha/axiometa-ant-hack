# Two-Buzzer Audio Proxy

The first-hour tactile test failed: both AX22-0018 modules were audible but produced virtually no felt movement. They remain in the hack demo only as audible proxies for two future vibration-motor channels. This setup validates software routing and pattern timing, not tactile efficacy or accessibility.

## Configure The Board

1. Disconnect USB power before fitting or moving any module.
2. Fit one AX22-0018 passive buzzer in **P1**. Treat this as **LEFT**.
3. Fit the AX22-0050 tactile LED button in **P2**. It is the start/stop control.
4. Fit the second AX22-0018 passive buzzer in **P3**. Treat this as **RIGHT**.
5. Leave **P4 empty** for this test.
6. The 2x5 sockets are not keyed. On every module, align the `G` / GND pin-1 corner with the socket corner marked `G`. Check this twice; do not power a module inserted 180 degrees around.
7. Reconnect the board by USB-C. The buzzers no longer need to be strapped to the wrist.

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
2. In Serial, enter `v`, `n`, or `s` to choose the channel check, navigation simulation, or situational simulation.
3. Press the P2 button again at any time to stop immediately. Both buzzers and the LED turn off and the current session is discarded.

The LED also turns off automatically when a check or 12-trial session finishes. Entering `x` in Serial is the software stop equivalent. Serial remains part of the demo because the operator uses it to select a pattern and record guesses.

## Interpretation Boundary

P1 / LEFT always uses 2350 Hz. P3 / RIGHT always uses 3050 Hz. The exact 700 Hz separation is preserved while both tones sit closer to the MLT-8530's 2.7 kHz resonance. Simultaneous patterns play both proxy tones; alternating patterns alternate them.

These mappings simulate the two channels that future ERM or LRA vibration motors would provide. Hearing or scoring these patterns does not show that real motors will be felt, spatially localized, or distinguishable. That requires retuning and testing with actual vibration hardware and representative users.

## Run The Test

### 1. Audio Channel Check

Press the P2 button to arm, then enter `v`. The firmware plays P1 / LEFT at 2350 Hz and then P3 / RIGHT at 3050 Hz. This confirms audible output and channel routing only.

### 2. Navigation Simulation

Press the P2 button to arm, then enter `n` for 12 balanced, shuffled audio trials.

- Perceived LEFT: operator enters `l`.
- Perceived RIGHT: operator enters `r`.
- Replay without revealing the answer: `p`.

LEFT is P1 at 2350 Hz. RIGHT is P3 at 3050 Hz. The score checks whether the audio labels and software path are clear; it is not a tactile navigation result.

### 3. Situational Simulation

Press the P2 button to arm, then enter `s` for 12 balanced, shuffled audio trials.

- Perceived EVENT / bus arriving: operator enters `e`.
- Perceived WAIT: operator enters `w`.
- Replay without revealing the answer: `p`.

EVENT is three simultaneous two-tone pulses. WAIT alternates the 2350 Hz and 3050 Hz channels twice. The score checks semantic and timing clarity only.

## Record The Result

```text
Date / operator:
LEFT 2350 Hz audible and routed correctly:
RIGHT 3050 Hz audible and routed correctly:
Navigation simulation score:  /12
Situational simulation score: /12
Replays used:
Routing or timing problems:
```

The binding tactile result is already recorded in `audit/bus-stop-situational-awareness/05-buzzer-bench-test.md`: these buzzer modules are not viable haptic actuators.
