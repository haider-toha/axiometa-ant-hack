# ToF Proximity Experiment

This isolated firmware validates the AX22-0015 VL53L0CX and a device-local
proximity response. It does not require Wi-Fi, the web app, or Modal.

## Module Placement

Disconnect USB-C before moving modules. The four sockets are not keyed, so
align each module's `G` / `GND` corner with the socket's ground corner.

| Port | Module | Signals |
| --- | --- | --- |
| P1 | AX22-0018 passive buzzer | IO1 / GPIO3, 700 Hz LEFT proxy |
| P2 | AX22-0015 VL53L0CX | SDA / GPIO10, SCL / GPIO11, XSHUT / GPIO6 |
| P3 | AX22-0018 passive buzzer | IO1 / GPIO16, 1400 Hz RIGHT proxy |
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
- `h`: print controls.

Raw range diagnostics continue regardless of reflex state. The proxy is off at
boot so a sensor or firmware reset cannot start an unexpected tone.

## Bench Gate

1. Leave the sensor open-air and check that no target produces no false active
   state.
2. Hold a flat, light-coloured target near 1200 mm, 600 mm, and 300 mm. Record
   the reported distance and status at each position.
3. Enter `r`. Move the target closer and confirm the P1 700 Hz pulse gap gets
   shorter.
4. Enter `x` during a pulse and confirm it stops immediately.
5. Unplug the network or run without credentials. The response must be
   unchanged because this path is entirely local.

The audible response is a simulation of future motor channel A. It validates
sensor-to-output behavior, not tactile perception.
