# Archived plans — superseded, kept for provenance

**Nothing in this directory is current.** The authoritative plan is
[`../2026-07-18-bus-stop-situational-awareness.md`](../2026-07-18-bus-stop-situational-awareness.md).

These files are kept because they record *why* decisions were made and because several of their
findings remain true and load-bearing. Each carries a header stating what superseded it and which of
its specific claims were later disproved. **Read those headers before lifting anything.**

| File | What it was | Superseded because |
|---|---|---|
| `2026-07-17-speech-to-braille-wearable.md` | The locked plan for the original idea: encode speech as vibrotactile braille on the wrist. | Vibrotactile braille on a forearm is physically impossible — a cell needs 6 points in ~6mm; two-point discrimination there is ~70mm. |
| `2026-07-18-PIVOT-v1-haptic-spatial-awareness.md` | First written statement of the pivot. Four vision applications, unranked; Modal as orchestration only. | Superseded within hours by v2, which locked a single application. |
| `2026-07-18-PIVOT-v2-application-locked.md` | The strongest pre-measurement statement of the bus-stop direction. | Much of its *reasoning* survives and was carried forward. Its *numbers* did not — it was written before anything was measured. Its header lists ten specific claims that four audit tracks disproved. |

## How the PIVOT file was split

`plan/PIVOT.md` originally contained both drafts concatenated in one 767-line file, which made it
ambiguous which half was current. It was split at the draft boundary into the two files above —
v1 from lines 1–349, v2 from lines 350–767. **The split was verified lossless**: concatenating the two
bodies reproduces the original file byte-for-byte. Only the `SUPERSEDED` headers were added.

## One thing that survived intact

The old braille plan's **Global Constraints** section is the origin of physical facts that still
govern the new build — the no-soldering / no-extension-kit rule, the power budget, the outbound-only
network architecture, and the `{1,3}`/`{2,4}` port-diagonal correction. It is cited by the current
plan rather than duplicated.

**But one "LOCKED" value in it is wrong:** the ERM motor data pin. It says IO0 (GPIO4/GPIO9); the
module actually drives from IO1 (GPIO3/GPIO16). See that file's header.
