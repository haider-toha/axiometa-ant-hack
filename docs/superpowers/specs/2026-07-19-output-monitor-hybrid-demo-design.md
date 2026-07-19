# Output Monitor Hybrid Demo View

**Date:** 2026-07-19
**Status:** Approved for implementation

## Goal

Make the USB output monitor immediately legible during the Tacta demo without weakening its truthfulness. A viewer must be able to see a very short left or right pulse, understand which physical channel fired, and read how long it lasted over the previous five seconds.

The page remains a diagnostic view of the two audible proxy channels. It must not imply that the buzzers provide validated haptic or spatial feedback.

## User experience

The page keeps the existing two-channel composition and Tacta visual language:

- P1 / Left remains teal.
- P3 / Right remains orange.
- The current state badge remains literal: `ACTIVE`, `IDLE`, `STALE`, `WAITING`, or `UNKNOWN`.
- The current frequency remains literal. When a pulse has ended, the channel reads `0 Hz`; the interface never holds the old frequency as though it were still active.

To make short pulses visible, each channel gains a 750 ms visual afterglow. The ring fades from its active channel colour after the physical output returns to idle, and the badge reads `RECENT` during that brief echo. The frequency remains `0 Hz`, so the visual echo cannot be mistaken for live output. Reduced-motion users receive the same state through a static tinted ring rather than an animated fade.

The existing equal-width transition barcode is replaced by a five-second rolling timeline:

- Two labelled lanes make the mapping explicit: `P1  LEFT` and `P3  RIGHT`.
- Coloured bars occupy their real duration within the five-second window.
- Empty lane space means the output was off; there are no grey blocks representing idle transitions.
- A restrained grid and labels at `-5 s` and `NOW` establish time direction.
- Simultaneous output appears as vertically aligned bars in both lanes.
- The timeline moves continuously while connected, including after the last transition, so old activity ages out naturally.
- When no pulse falls inside the window, the timeline shows a quiet `Waiting for a pulse` state.

The layout must remain presentation-friendly at laptop and projected widths, and collapse cleanly on small screens without losing lane labels or the five-second meaning.

## Data model and timing

`OutputMonitor` will keep a bounded sequence of telemetry transitions. Each transition contains:

- a stable local id;
- `leftHz` and `rightHz`;
- the ESP32 `upMs` timestamp;
- the browser `receivedAt` timestamp.

The board timestamp is authoritative for pulse duration because serial delivery latency should not change how long a bar appears. Browser receive time drives the 750 ms afterglow and the UI refresh clock.

For each channel, timeline segments are derived from adjacent transitions:

1. An active transition starts a segment at its `upMs` value.
2. The next transition for that channel closes the segment.
3. If the channel is currently active, the segment ends at the latest projected board time: the last `upMs` plus elapsed browser time since that record arrived.
4. Segments are clipped to the rolling `[now - 5000 ms, now]` window and converted to percentages for rendering.

Telemetry entries with unchanged frequencies are still useful clock samples. They update the latest board/browser time pair but are not added as transitions.

If `upMs` moves backwards, the board has restarted or its millisecond counter has wrapped. The monitor clears the trace before recording the new state; it never draws a negative or cross-reboot duration. The trace is also cleared on manual disconnect so a later device session cannot inherit old pulses.

History stays memory-bounded by retaining only transitions that could contribute to the five-second view plus one immediately preceding transition needed to determine the state at the window edge.

## Component boundaries

The implementation keeps responsibilities explicit:

- `OutputMonitor` owns serial lifecycle, transition capture, clock projection, reboot detection, and recent-pulse timestamps.
- `OutputDashboard` renders connection truth, live channel truth, afterglow presentation, and the timeline.
- Pure timeline helpers convert transitions into clipped left/right segments. They contain no React or serial behavior and can be tested directly.
- `PulseTimeline` renders the labelled lanes from already-derived segments and exposes an accessible text summary.

The firmware telemetry format, Web Serial protocol, relay, and board behavior do not change.

## Visual treatment

The implementation reuses the existing Tacta tokens, typography, card radii, teal/orange category colours, and restrained mono labels. The timeline should read as an instrument panel rather than a charting-library widget:

- thin neutral rules instead of boxed cells;
- channel-coloured solid bars with modest rounding;
- generous whitespace and a compact five-second scale;
- no gradients, novelty icons, or extra controls;
- no artificial minimum bar duration. A 120 ms pulse occupies 2.4% of the lane, which is visible at the intended demo widths while remaining honest.

The circular channel visual remains the primary immediate cue; the timeline is the durable evidence of what just happened.

## Accessibility

- Channel state and frequency remain available as text.
- The afterglow has a textual `RECENT` state and does not rely on colour alone.
- The timeline has named lanes and a concise screen-reader summary of recent pulse count and duration per channel.
- Decorative grid lines and pulse bars are hidden from assistive technology.
- Existing live output announcements remain literal and do not announce afterglow as active output.
- `prefers-reduced-motion` disables pulse and fade animation without removing state information.

## Verification

Tests will cover:

- a short pulse creates a duration-proportional segment at the correct position;
- a pulse crossing the five-second boundary is clipped correctly;
- simultaneous left/right output produces aligned segments;
- a board timestamp regression clears the old trace;
- a completed pulse shows `RECENT` with `0 Hz`, then returns to `IDLE` after 750 ms;
- stale and disconnected data never appear live;
- lane labels and accessible timeline summary are present;
- manual disconnect clears telemetry and the timeline.

Required web verification remains:

```bash
cd www
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Focused Vitest coverage for the output monitor will run before the full checks. Browser verification will confirm the five-second scaling, afterglow, mobile layout, and reduced-motion behavior using simulated telemetry. No board reset or flash is required for this UI change.

## Non-goals

- Changing pulse frequencies, firmware patterns, ToF, microphone, or relay behavior.
- Holding or replaying output from the UI.
- Adding direction inference beyond the board-provided P1/P3 states.
- Claiming tactile effectiveness or left/right bodily localization from the passive buzzers.
- Expanding the timeline beyond the fixed five-second demo window.
