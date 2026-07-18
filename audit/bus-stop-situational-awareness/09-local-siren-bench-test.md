# Local Siren Classifier Bench Test

Date: 2026-07-18

## Scope

This test exercised the integrated ESP32-S3 path: P4 PDM capture on I2S0,
512-sample Hann FFT frames at 16 kHz, temporal classification, local output
arbitration, and both P1/P3 buzzer proxies. Output could be stopped with service
Serial `x` while sensing and decision telemetry remained active.

This is a synthetic bench calibration. It does not validate emergency-vehicle
recall, distance performance, or false-positive rates in streets or transit
environments.

## Failed First Calibration

The initial coarse gate required three consecutive frames with +12 dB band
energy and a strongest-bin energy ratio of at least 0.45. In ordinary room
noise it produced five false `ATTENTION` decisions in about 30 seconds.

Two causes were corrected:

1. The adaptive floor incorrectly moved toward in-band energy. It now tracks
   the trimmed out-of-band reference estimate.
2. A short tonal burst was not enough evidence for a siren. `ATTENTION` now
   requires 16 consecutive tonal/elevated frames and a directional peak sweep
   of at least two FFT bins over that window.

Confirmed classification separately counts sustained +12 dB band energy, so
ordinary Hann-window leakage into adjacent bins cannot reset the one-second
timer. It still requires a yelp-like modulation or a wider monotonic peak sweep.

## Passing Physical Checks

Ambient negative, revised firmware:

- 60 seconds in the current room
- 32 full frames per second
- 0 partial reads, 0 read errors, 0 dropped decisions
- 0 `ATTENTION`, `SIREN_WARNING`, or `DANGER` decisions

Controlled positive:

- nearby computer speaker
- 1.5-second rising sinusoid, approximately 500 to 1700 Hz
- generated with `ffmpeg` as a continuous chirp
- emitted `ATTENTION`, followed by `SIREN_WARNING`
- with service output enabled, both decisions were accepted by local output

Environmental negatives:

- macOS `Sosumi.aiff` system sound: no siren decision
- spoken bus-arrival sentence from macOS speech synthesis: no siren decision
- ordinary room activity during the ambient run: no siren decision

The ToF path continued entering and exiting proximity while the audio worker
maintained 32 frames per second, showing both local sensors remained live.

Runtime hardening checks:

- READY is deferred nonblockingly; ToF and audio servicing begin immediately.
- An event-queue send failure restores producer state so the same decision can
  retry instead of silently consuming the onset and warning rate limit.
- A continuously overwritten classifier-state queue lets service `o` restore a
  still-detected siren after `x`; a sustained modulated-tone run restarted
  `DANGER` immediately on resume without requiring a new acoustic onset.
- Repeated `DANGER` decisions while its 11.25-second pattern is active are
  idempotent. A physical modulated-tone run showed later decisions dropped for
  priority instead of repeatedly restarting the clearing gap.

## Verdict

**PASS for the hack prototype's synthetic local-siren demo path.** Capture,
classification, output priority, emergency stop, and output resume all worked on
the physical board. The early false-positive configuration was rejected and the
revised configuration passed the limited bench negatives.

**Not field validated.** Before any safety or product claim, run labelled real
siren recordings at multiple levels and distances, then test traffic, speech,
music, alarms, horns, machinery, and crowd noise for substantially longer than
one minute. The current implementation is demo logic, not a certified warning
device.
