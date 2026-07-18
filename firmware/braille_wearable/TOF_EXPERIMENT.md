# ToF Proximity Experiment

This isolated firmware validates the AX22-0015 VL53L0CX and a device-local
proximity response. It does not require Wi-Fi, the web app, or Modal.

## Module Placement

Disconnect USB-C before moving modules. The four sockets are not keyed, so
align each module's `G` / `GND` corner with the socket's ground corner.

| Port | Module | Signals |
| --- | --- | --- |
| P1 | AX22-0018 passive buzzer | IO1 / GPIO3, 2350 Hz LEFT proxy |
| P2 | AX22-0015 VL53L0CX | SDA / GPIO10, SCL / GPIO11, XSHUT / GPIO6 |
| P3 | AX22-0018 passive buzzer | IO1 / GPIO16, 3050 Hz RIGHT proxy |
| P4 | Empty | Reserved for the PDM microphone |

Remove the AX22-0050 LED button from P2 before fitting the ToF module.

## Build And Upload

```bash
cd firmware/braille_wearable
../../.venv/bin/pio test -e native
../../.venv/bin/pio run -e tof_experiment
../../.venv/bin/pio run -e tof_experiment -t upload
../../.venv/bin/pio device monitor -e tof_experiment
```

The monitor uses 115200 baud. The board should print `READY component=tof`
followed by `TOF` records. `status=0 valid=1` is a usable sample.

## Controls

- `r`: toggle the local proximity audio proxy.
- `x`: immediately silence and disable the proxy.
- `1`..`6`: capture five seconds at an expected 300, 600, 1200, 2000,
  3000, or 4000 mm respectively.
- `h`: print controls.

Raw range diagnostics continue regardless of reflex state. During a five-second
benchmark window, per-sample lines are suppressed and replaced by one
`BENCH result` summary. The proxy is off at boot so a sensor or firmware reset
cannot start an unexpected tone.

## Controlled Range Gate

ST specifies an absolute maximum range of 2 m for the VL53L0X. Under a fully
covered 25-degree field of view, its published minimum detection distances are
1.2 m for a white indoor target, 0.7 m for a gray indoor target, 0.6 m for a
white outdoor target, and 0.4 m for a gray outdoor target. The Axiometa catalog
claims 4 m, so 3 m and 4 m are measured as exploratory points rather than
assumed capabilities. Source: [ST VL53L0X datasheet, Rev 6](https://www.st.com/resource/en/datasheet/vl53l0x.pdf),
sections 6.1 and 6.2.

1. Use a tape measure from the sensor face to a flat wall. Record wall colour,
   surface, lighting, and whether the sensor is hand-held or braced.
2. Keep the sensor perpendicular and motionless. A wall is preferred because
   the 25-degree field of view spans about 1.8 m at a 4 m distance.
3. At 300, 600, 1200, 2000, 3000, and 4000 mm, enter `1`, `2`, `3`, `4`, `5`,
   or `6`. Do not move anything until the `BENCH result` line appears.
4. Record sample count, valid percentage, minimum, mean, maximum, mean absolute
   error, and failure-status counts. Treat at least 94% valid returns as the
   detection-rate gate; do not infer a pass from isolated valid samples.
5. Repeat the useful range with a dark target and, separately, in outdoor
   ambient light before selecting a product threshold.
6. Enter `r`. Move the target closer and confirm the P1 2350 Hz pulse gap gets
   shorter.
7. Enter `x` during a pulse and confirm it stops immediately.
8. Unplug the network or run without credentials. The response must be
   unchanged because this path is entirely local.

The audible response is a simulation of future motor channel A. It validates
sensor-to-output behavior, not tactile perception.
