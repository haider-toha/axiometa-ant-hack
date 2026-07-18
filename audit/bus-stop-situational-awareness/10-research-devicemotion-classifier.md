# DeviceMotion Permission Model and Step-Cadence Classifier Research

Date: 2026-07-18

## Scope

Desk research grounding the STILL/MOVING classifier proposed in issue #5 for
`www/src/app/capture/page.tsx`. Six questions were investigated against primary
sources: the iOS/Android permission model, whether the camera and motion
permissions can share one user gesture, which `DeviceMotionEvent` fields are
reliably populated, the delivered sample rate, whether an existing library is
worth a dependency, and whether the previously proposed thresholds survive
contact with the gait literature.

No code was changed. No phone was tested. Every threshold below is either
traced to a citation or marked ASSUMED. The prior session's five thresholds
were treated as hypotheses: two are supported, one is refined, one is
substantially rewritten, and one could not be grounded at all.

## Verdicts

| Question | Verdict |
|---|---|
| 1. Permission model | CONFIRMED — transient activation + secure context |
| 2. One dialog or two | TWO, and the naive ordering **fails on iOS** |
| 3. Field availability | Both null modes are real; use magnitude, not axes |
| 4. Sample rate | Adequate; iOS exact rate UNVERIFIED, must be measured |
| 5. Existing libraries | Nothing usable. Write it ourselves |
| 6. Thresholds | Cadence GROUNDED; amplitude UNGROUNDED, needs bench |

### 1. Permission model

The W3C Device Orientation and Motion specification (Candidate Recommendation
Draft, 12 February 2025) defines a static `DeviceMotionEvent.requestPermission()`
returning a `Promise` that resolves to a `PermissionState`. It requests both the
`accelerometer` and `gyroscope` policy-controlled features, and it "requires
transient activation to proceed without a prior permission state; otherwise,
rejects with `NotAllowedError`".

MDN states the promise resolves with the string `"granted"` or `"denied"`, and
rejects with `NotAllowedError` when "the permission state is `"prompt"` and the
calling function does not have transient activation".

All interfaces in the spec are marked `[SecureContext]` — "Interfaces are now
only available in secure contexts." Practically, iOS auto-declines the
`requestPermission` call if the page is not loaded over HTTPS. The Vercel
deployment satisfies this; a bare-IP LAN dev server does not.

On Android/Chrome the method does not exist: "On Android devices,
`DeviceMotionEvent.requestPermission` is undefined and you may register a
`devicemotion` listener right away." Feature-detect with a `typeof` check
rather than a UA sniff.

Two implementation traps that the citations imply but do not state plainly:

- On a desktop browser lacking the interface entirely, a bare `DeviceMotionEvent`
  identifier is a `ReferenceError`, not `undefined`. Guard the identifier before
  reaching for `.requestPermission`.
- Extracting the method into a variable loses its `this`. Invoke it as
  `request.call(DeviceMotionEvent)`.

Also relevant: WebKit does not treat `touchstart` as an activation-triggering
event, though `touchend` is fine. A React `onClick` resolves to `click`, which
is on the spec's activation-triggering list, so the existing button is fine.

The old iOS Settings toggle for Motion & Orientation Access was removed in
iOS 13 in favour of the per-site JavaScript prompt. Do not write UI copy that
tells the user to go and find that switch — it no longer exists.

### 2. One dialog or two — the load-bearing finding

**Two prompts.** Camera and motion are distinct permissions with distinct
native dialogs. There is no combined prompt.

**More importantly, the obvious implementation is broken on iOS.** The current
`start` handler awaits `getUserMedia` first. Appending a motion request after
that await will usually reject with `NotAllowedError`.

The evidence is WebKit bug 198040, which is exactly this shape:
`getDisplayMedia()` called after `await navigator.mediaDevices.enumerateDevices()`
inside a click handler fails in Safari while working in Chrome and Firefox.
WebKit engineer Youenn Fablet's explanation is direct: **"We currently bound the
user gesture duration to 1s."** The bug is still open (NEW), and the suggested
workaround is to start both promises without awaiting in between.

For comparison, Chrome's transient activation window is five seconds. WebKit's
is roughly one, and WebKit deliberately does not expose the exact figure —
their own blog says the timer "runs for a short time (a few seconds, maybe)"
and is "deliberately not observable by JavaScript". The same post concedes the
async problem outright: for a promise that outlives the window, "we don't yet
have a solution."

A camera permission prompt is answered by a *human*. It will essentially never
resolve inside one second on a first grant. So the ordering is not a
micro-optimisation — it is the difference between motion permission working and
never working on stage.

**The fix is to reverse the order.** `getUserMedia()` does *not* require
transient activation: MDN's page documents a secure-context and permission
requirement but no user-activation requirement, and the existence of the open
proposal w3c/mediacapture-extensions#11, *"Enforcing user gesture for
getUserMedia"*, confirms that a gesture is not currently mandated. Motion is
the only one of the two that needs the gesture, so motion must go first and
camera second.

Note the subtlety that makes this work: `await requestMotionPermission()` is
safe *provided the function invokes `requestPermission()` synchronously before
its own first await*. The API call then lands in the same task as the click
handler, while the awaiting happens afterwards. Grabbing the gesture is what
must be synchronous, not the whole flow.

UNVERIFIED: whether iOS serialises two simultaneously-issued permission prompts
cleanly, or drops one. The WebKit-recommended "fire both, await both" pattern
was not tested for this specific camera+motion pair. The recommended
motion-then-camera sequence avoids needing an answer, which is why it is
preferred over the workaround in bug 198040.

### 3. Field availability

The spec makes `acceleration`, `accelerationIncludingGravity` and `rotationRate`
all nullable and initialised to null, populated "only when the implementation
can provide this data". Critically, **the x/y/z and alpha/beta/gamma components
inside those objects are independently nullable too.**

There are therefore two distinct null failure modes, and issue #5's requirement
to "handle null sensor fields" is satisfied only if both are handled:

1. The whole object is null — the per-spec behaviour.
2. The object exists but its components are individually null — what Chromium
   does, and non-standard.

`acceleration` is gravity-removed, which requires sensor fusion and hence a
gyroscope. A device without one can return null `acceleration` while still
returning usable `accelerationIncludingGravity`, so the fallback is mandatory,
not defensive padding.

UNVERIFIED: no primary source was found stating that iPhone Safari *always*
populates `acceleration` non-null. WebKit is built on Core Motion, which does
supply user acceleration, so it is very likely fine — but the fallback path
must exist and should be exercised, not assumed dead code.

**One quirk drives a design decision.** iOS Safari and Android Chrome disagree
on the sign convention for `accelerationIncludingGravity` (inverted X/Y on
Android). Any classifier reading individual signed axes inherits that bug.
Computing the vector **magnitude** `sqrt(x² + y² + z²)` is invariant to axis
sign and to how the phone is being held, and it sidesteps the quirk entirely.
This is also what the step-detection literature does. Use magnitude; never
trust an individual axis.

`rotationRate` is worth reading for diagnostics but should not gate the state.
Issue #5 already warns against equating a gyro spike with MOVING, and the
literature agrees that periodicity, not instantaneous magnitude, separates
walking from everything else.

### 4. Sample rate

Chromium caps sensor sampling at 60 Hz for most sensor types for security
reasons, and the Generic Sensor API replacements keep that cap.

The W3C spec sets no mandatory cap — firing is at "an implementation-defined
interval" — and explicitly notes that "further implementation experience is
being gathered to inform the limit for the maximum sampling frequency cap."

UNVERIFIED: **no primary source was found for iOS Safari's exact delivered
rate.** The best available datum is w3c/sensors issue #98, which reports
browsers delivering "varying 67 Hz (drops down to 1 Hz sometimes)". That issue
is open and unresolved.

**The conclusion is that rate is not a blocker, but it must be observed rather
than assumed.** Walking peaks arrive at roughly 2 Hz, so Nyquist needs only
>4 Hz, and prominence estimation realistically wants ≥10 Hz. Even a pessimistic
20 Hz yields ~50 samples in a 2.5 s window. But the reported "drops to 1 Hz"
case would destroy detection silently, so:

- Derive timing from `event.timeStamp`, never from a sample count.
- Read `event.interval`, compute the measured Hz, and show it in the diagnostics
  panel that issue #5 already requires.
- Below ~10 Hz measured, declare the sensor degraded and fall back to manual
  rather than emitting a state derived from unusable data.

One further behaviour, observed rather than specified: on Android, motion events
do not fire while the page lacks focus. Backgrounding the browser stops the
stream, so the last-known activity must age out via the existing staleness rule
rather than persisting as truth.

### 5. Existing libraries

**Nothing worth depending on exists.** This was checked, not assumed.

| Package | Stars | Licence | State | Usable here |
|---|---|---|---|---|
| `pedometer` (MaximilianBuegler/node-pedometer) | 7 | MIT | Inactive, 1 open issue | **No** |
| `@dongminyu/react-native-step-counter` | — | — | React Native only | **No** |
| `@uguratakan/react-native-step-counter-improved` | — | — | React Native only | **No** |

`node-pedometer` is the only serious npm candidate for the algorithm itself. It
uses a windowed average peak-counting algorithm and ships 12 test cases, which
is more rigour than most. It is disqualified on three independent grounds: it is
a **Node.js module, not a browser one**; it **requires attitude data** (pitch,
roll, yaw in radians) alongside acceleration, which `devicemotion` does not
provide and which would have to be derived from a second `deviceorientation`
stream; and it is **tested at 100 Hz**, well above what a browser delivers.

The React Native packages wrap the native Android `StepCounter` sensor and iOS
Core Motion. They cannot run in a browser page at all.

**Recommendation: write it.** Roughly 80 lines. Beyond the absence of a viable
dependency, the framing matters: we do not need step-*counting* accuracy. We
need a debounced binary state with hysteresis, which is a strictly easier
problem than the one these libraries solve, and one where a miscount of one step
is harmless while a mistimed transition is not.

Note a tooling gap: `www/package.json` lists `vitest ^4.1.10` as a devDependency
but defines **no `test` script**. Issue #5 requires unit tests, so a `test`
script needs adding as part of that work.

### 6. Threshold evidence

Cadence is well documented and the numbers converge across independent sources:

- Real-world pedestrian cadence, weighted mean across observational studies:
  **115.2 steps/min** (1.92 steps/s).
- Normal walking cadence across the lifespan: **96–138 steps/min** for women,
  **81–135 steps/min** for men.
- 100 steps/min is the accepted heuristic for moderate-intensity walking in
  adults; ~130 steps/min for vigorous.
- Controlled smartphone step-detection trials had participants walking at
  **1.6–2.1 steps/s** (96–126 steps/min) and running at 2.2–3.5 steps/s.
- Predominant step frequency **1.7–2.2 Hz**, wider span 1.4–2.3 Hz, with mean
  normal walking at **1.98 Hz (SD 0.13 Hz)**; step peaks spaced **0.3–0.8 s**
  apart.
- A separate smartphone study uses **0.6–2 Hz** as the human walking band;
  teaching material uses 0.5–3 Hz and filters out everything above 5 Hz.

Acceleration amplitude is much weaker ground. Waist-mounted walking at typical
gait speeds is bounded by "for waist measurement of walking at average gait
speeds (1–2 m/s) of the general population, a ±2 g activity monitor would
suffice", with hip peaks that can exceed ±4 g in walking. That establishes the
order of magnitude — walking dynamics are **several m/s², not tenths** — but it
is waist-mounted, and nothing was found for a phone **held up in camera-aiming
posture**, which is the posture this feature actually runs in.

Assessment of the five proposed thresholds:

| Proposed | Verdict |
|---|---|
| Peak prominence ≥ 1.9 m/s² | **UNGROUNDED.** Not refuted, but no source. Lower it and bench-tune |
| Peak cooldown 300 ms | **GROUNDED. Keep unchanged** |
| ≥ 3 steps in 2.2 s | **Marginal at the slow end.** Widen to 2.5 s |
| Entry debounce 1.5 s | Redundant with the cadence gate. Reduce to 1.2 s |
| Exit debounce 2.0 s | **ASSUMED but well-reasoned. Keep** |

The cooldown survives cleanly. 300 ms permits up to 3.33 steps/s, far above the
fastest normal walking (2.3 Hz ⇒ 435 ms spacing), so it cannot suppress a
genuine step, while still rejecting the second peak of the heel-strike/push-off
pair within one step.

The cadence band is the one number that needed correcting. Three steps in 2.2 s
demands 1.36 steps/s, i.e. **81.8 steps/min** — which lands exactly on the
documented slowest-normal male cadence of 81 steps/min. There is no margin at
all. Widening to 2.5 s demands 1.2 steps/s (72 steps/min), which sits clearly
below every documented normal-walking cadence while still requiring genuine
periodicity. This matters more than it looks: a visually impaired user
approaching a bus walks *cautiously*, and cautious is slower than lab-normal.

Entry debounce is partly redundant. The cadence gate cannot become true until
three peaks have accumulated, which is itself ~1.0–1.5 s of evidence. Stacking
1.5 s on top makes entry take ~3 s. Reducing to 1.2 s keeps total entry at
~2.5 s, which is defensible without being sluggish on stage.

Exit debounce has no published basis and is a hysteresis judgement, but a sound
one: at 2.0 s it tolerates two consecutive missed steps (longest normal step
interval ~0.85 s), so a kerb pause or a stumble does not drop the state. The
asymmetry — harder to leave MOVING than to enter it — is justified by evidence
asymmetry rather than taste: entering requires positive proof of periodicity,
while leaving is triggered by mere absence of peaks, and absence is the weaker
signal.

**The most important design conclusion is not a threshold at all.** Because the
phone is held up and aimed at a bus, the dominant false-positive source is
deliberate camera panning and hand tremor while standing still. No amplitude
threshold can separate panning from walking, because panning can be large. Only
**periodicity** separates them. That validates the cadence-window design over a
simpler variance-threshold design — but it also means a bare peak *count* is too
weak, since random hand jitter can produce three peaks in 2.5 s. The count
should be paired with an inter-peak interval consistency test, which is directly
grounded in the cadence figures above and costs about six lines.

## Recommended classifier spec

Each parameter is marked GROUNDED (traced to a source above) or ASSUMED (needs
bench tuning).

| Parameter | Value | Status |
|---|---|---|
| Signal | magnitude `sqrt(x²+y²+z²)` of `acceleration` | GROUNDED — sign-quirk immune |
| Fallback signal | `accelerationIncludingGravity` magnitude, EMA-subtracted | GROUNDED — null mode is real |
| Smoothing | moving average ≈100 ms | GROUNDED — walking <5 Hz |
| Peak prominence | **1.2 m/s²** starting point | ASSUMED — bench-tune |
| Peak cooldown | **300 ms** | GROUNDED |
| Step interval band | **0.35–0.85 s** | GROUNDED — 1.4–2.3 Hz widened ~15% |
| Cadence gate | **≥3 peaks in 2.5 s**, ≥2 consecutive in-band intervals | GROUNDED |
| Entry debounce | **1.2 s** | ASSUMED |
| Exit debounce | **2.0 s** | ASSUMED |
| Min usable rate | **10 Hz** measured, else manual | GROUNDED — Nyquist + prominence |

On the amplitude threshold specifically: 1.2 m/s² is a deliberately permissive
starting point, chosen because the periodicity gate carries the false-positive
rejection and a too-high amplitude bar silently loses smooth or cautious
walkers. The proper way to set it is a 60-second bench run — walk with the phone
in capture posture, log the peak prominence distribution, and set the threshold
near 40% of the median walking peak. Until that run happens, both 1.2 and the
originally proposed 1.9 are guesses; 1.2 simply fails in the recoverable
direction.

Recommended permission-request shape:

```ts
export type MotionPermission = "granted" | "denied" | "unsupported" | "error";

/**
 * MUST be invoked synchronously at the top of a real user-gesture handler,
 * before any `await`. WebKit bounds user-gesture validity to about one second
 * (WebKit bug 198040), and a camera prompt is answered by a human, so awaiting
 * getUserMedia first consumes the window and makes this reject with
 * NotAllowedError. Motion first, camera second — getUserMedia needs no gesture.
 */
export async function requestMotionPermission(): Promise<MotionPermission> {
  // A bare `DeviceMotionEvent` reference is a ReferenceError, not undefined,
  // on browsers without the interface. Guard the identifier itself.
  if (typeof DeviceMotionEvent === "undefined") return "unsupported";

  const request = (
    DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    }
  ).requestPermission;

  // Android/Chrome: method absent, no permission gate, listen immediately.
  if (typeof request !== "function") return "granted";

  try {
    // `.call` matters — extracting the method loses its `this`. This line runs
    // in the same task as the click, which is what holds the activation.
    const state = await request.call(DeviceMotionEvent);
    return state === "granted" ? "granted" : "denied";
  } catch {
    // NotAllowedError (activation gone) or a non-secure context.
    return "error";
  }
}
```

And the corrected call order inside the existing `start` handler:

```ts
const start = useCallback(async () => {
  setError("");

  // 1. Motion FIRST. It is the only one of the two that needs the gesture,
  //    and the request is issued before any await in this handler.
  const motion = await requestMotionPermission();
  setMotionPermission(motion);
  if (motion !== "granted") setManualFallbackVisible(true);

  // 2. Camera SECOND. getUserMedia requires a secure context and permission
  //    but not transient activation, so it is safe after the await above.
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    // ...existing stream wiring
  } catch (e) {
    // ...existing camera error path
  }
}, []);
```

Sample validation must reject both null modes before the value reaches the
classifier:

```ts
function readMagnitude(e: DeviceMotionEvent): number | null {
  // Mode 1: whole object null (per spec). Mode 2: components null (Chromium).
  const a = e.acceleration ?? e.accelerationIncludingGravity;
  if (!a) return null;
  const { x, y, z } = a;
  if (x == null || y == null || z == null) return null;
  return Math.sqrt(x * x + y * y + z * z);
}
```

Whether the reading came from `acceleration` or the gravity-inclusive fallback
must be tracked, because the fallback needs its ~9.81 m/s² bias removed by
subtracting a running mean before peak detection. Do not feed the two into the
same threshold untransformed.

## Grounding notes

Specification and reference:

- https://www.w3.org/TR/orientation-event/
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent
- https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static
- https://developer.mozilla.org/en-US/docs/Web/API/Window/devicemotion_event
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- https://developer.mozilla.org/en-US/docs/Glossary/Transient_activation
- https://developer.apple.com/documentation/webkitjs/devicemotionevent

User activation and the ordering problem:

- https://bugs.webkit.org/show_bug.cgi?id=198040 — "We currently bound the user
  gesture duration to 1s" (Youenn Fablet). Still open.
- https://webkit.org/blog/13862/the-user-activation-api/
- https://github.com/w3c/mediacapture-extensions/issues/11 — open proposal to
  *add* a gesture requirement to getUserMedia, i.e. none exists today.

Platform behaviour:

- https://yal.cc/js-device-motion/ — HTTPS auto-decline, `touchend` vs
  `touchstart`, the two null modes, Android has no `requestPermission`.
- https://chromium.googlesource.com/chromium/src/+/master/services/device/generic_sensor/README.md
  — 60 Hz cap.
- https://github.com/w3c/sensors/issues/98 — "varying 67Hz (drops down to 1Hz
  sometimes)". Open.
- https://www.raymondcamden.com/2017/04/25/using-device-motion-on-the-web —
  Android events stop without page focus; gyroscope-less fallback.
- https://discussions.apple.com/thread/250760626 — iOS 13 removed the Settings
  toggle in favour of the JS prompt.

Libraries:

- https://github.com/MaximilianBuegler/node-pedometer — 7 stars, MIT, inactive,
  Node-only, requires attitude vectors, tested at 100 Hz.
- https://www.npmjs.com/package/pedometer
- https://www.npmjs.com/package/@dongminyu/react-native-step-counter
- https://www.npmjs.com/package/@uguratakan/react-native-step-counter-improved

Cadence and acceleration:

- https://pmc.ncbi.nlm.nih.gov/articles/PMC6029645/ — cadence narrative review;
  100 steps/min heuristic, 115.2 steps/min real-world mean, lifespan ranges.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4634483/ — Step Detection Robust
  against the Dynamics of Smartphones; 1.6–2.1 steps/s walking, seven device
  poses, adaptive thresholds, ≥90% accuracy down to 8 Hz.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC5796454/ — walking band 0.6–2 Hz.
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4180224/ — waist accelerations across
  gait velocities; ±2 g suffices for waist walking at 1–2 m/s.
- https://dganesan.github.io/mhealth-course/chapter2-steps/ch2-stepcounter.html
  — 0.5–3 Hz walking band, filter above 5 Hz.
- https://link.springer.com/article/10.1186/s12966-020-01045-z — CADENCE-Adults.

## Residual risk

**The permission ordering is unproven on a real iPhone.** The 1-second gesture
window is documented for `getDisplayMedia`, and the reasoning that it applies to
`DeviceMotionEvent.requestPermission` is inference from the shared transient
activation mechanism, not a direct observation of this API pair. It is a strong
inference and the recommended ordering is safe either way, but it is inference.
*Resolves with:* one HTTPS test on the venue phone — tap Start, confirm the
motion dialog appears before the camera dialog and that both grant cleanly. Ten
minutes. This is the single highest-value bench check in this document.

**The amplitude threshold is a guess.** No published peak-prominence figure
exists for a phone held up in camera-aiming posture. 1.2 m/s² is reasoned from
the waist literature's order of magnitude, not measured.
*Resolves with:* a 60-second logging run in capture posture — 30 s standing
still while panning the camera, 30 s walking — recording the peak prominence
distribution for each. Set the threshold between the two populations. Without
this, the state machine's sensitivity on stage is unknown.

**Cautious walking may sit below the cadence gate.** The widened 2.5 s window
admits 72 steps/min, below every documented normal cadence, but a visually
impaired user navigating unfamiliar ground could plausibly walk slower still,
and the whole premise of the product is that user. The demo presenter will walk
faster than that, so this is a product risk rather than a stage risk — but it
should not be recorded as solved.
*Resolves with:* a slow-deliberate-walk bench run, timed, before any claim about
real-world usability.

**iOS delivered sample rate is unknown.** If it drops toward the 1 Hz floor that
w3c/sensors#98 reports, peak detection fails silently and the state freezes at
whatever it last held.
*Resolves with:* the measured-Hz diagnostic readout, which issue #5's diagnostics
requirement already covers. Watch it during the walk test rather than trusting
it afterwards.

**Backgrounding stops the event stream on Android**, and probably on iOS. If the
presenter switches apps mid-demo the activity value goes stale rather than
wrong, which the existing staleness rule handles by resolving to STILL — but
STILL during a walk means LEFT/RIGHT commands are dropped and the navigation
demo dies quietly.
*Resolves with:* rehearsing without app-switching, and confirming the
diagnostics panel makes a frozen sensor visibly obvious rather than silent.

**Two prompts is a UX risk on stage regardless of ordering.** The rehearsal note
already in the plan — that the grant flow must be practised, and that a reload
may force a re-grant — applies with double force now that there are two dialogs.
Grant both before going on stage, and do not reload the page.

**The manual fallback is not optional.** Every failure above degrades to the
same place: the manual STILL/MOVING toggle that issue #5 requires. It should be
visible whenever permission is not `"granted"`, and reachable even when it is,
because a sensor that is permitted but delivering unusable data looks identical
to one that is working until someone checks the diagnostics.
