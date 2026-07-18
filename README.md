# Axiometa × Anthropic Hardware Hack — London, 17–19 July 2026

**Situational awareness for DeafBlind users.** A wrist-worn device that detects urgent sounds a
DeafBlind person cannot hear and answers a question they cannot otherwise answer — *which bus just
pulled in?* — delivering both as haptic patterns on the wrist.

---

## 🟢 START HERE — the one current plan

### [`plan/2026-07-18-bus-stop-situational-awareness.md`](plan/2026-07-18-bus-stop-situational-awareness.md)

That file is the single authoritative source for what is being built. If anything anywhere else in
this repo contradicts it, **the plan wins** — with one exception noted below.

**Its evidence base is [`audit/bus-stop-situational-awareness/`](audit/bus-stop-situational-awareness/)** —
four research tracks that measured the hardware, verified the APIs against live documentation, and
reconciled the design against the meeting transcript. Where the audit records a *measurement* and the
plan records a *number*, the audit is authoritative; the plan should be corrected to match.

---

## ⛔ What is NOT current

**The project pivoted on 2026-07-18.** Everything below is prior work, kept for provenance. It is
archived, not deleted — but **do not build from it.**

| Path | What it is |
|---|---|
| [`plan/archive/`](plan/archive/) | The superseded plans. Each carries a header explaining what replaced it and which of its specific claims were later disproved. |
| [`audit/speech-to-braille-wearable/`](audit/speech-to-braille-wearable/) | 48 research files for the abandoned braille idea. **Historical record — closed. Add nothing here.** Some findings remain true and were carried forward; the new audit folder cites them where it did. |
| `firmware/braille_wearable/` | Firmware for the old idea. The Wi-Fi/network layer is reusable; the braille encoding and the LCD/encoder drivers are not. |
| `app/` | Next.js app for the old idea. The Vercel + Upstash relay (`api/push`, `api/pull`) is reusable as the device transport; the speech routes are not. |
| `cad/` | Parametric enclosure, dimensioned for the old component set (LCD + rotary encoder). Being adapted, not rebuilt — see the plan. |

### The pivot in one line

The old idea encoded speech as **vibrotactile braille** on the wrist. That turned out to be
physically impossible — a braille cell needs 6 distinguishable points in ~6mm, but vibrotactile
two-point discrimination on the forearm is ~70mm, off by an order of magnitude. The new idea keeps
the wrist and the haptics, and changes what they carry.

---

## Repository map

| Path | Contents |
|---|---|
| `plan/` | The current plan, plus `archive/` and `transcripts/` |
| `audit/bus-stop-situational-awareness/` | 🟢 Current evidence base — 5 files |
| `audit/speech-to-braille-wearable/` | ⛔ Closed historical record — 48 files |
| `parts/` | Sourced hardware: Genesis Mini starter kit, VL53L0CX ToF, and AX22-0018 passive buzzers. **`parts/` mirrors the vendor catalogue, not the shelf** — a part being absent here does not mean it is absent from the room. The PDM microphone (AX22-0044) is in hand but has no folder, because it is too new to be catalogued. |
| `firmware/` | PlatformIO project (ESP32-S3) |
| `app/` | Next.js app, deploy target Vercel |
| `cad/` | Parametric CAD (build123d; builds headless — Fusion 360 is not required) |
| `renders/` | Generated images |

---

## The hardware, in one table

All four AX22 ports are occupied. Every module snaps in — **there is no soldering and no port
extension kit**, so component placement is fixed by the board.

| Port | Module | Notes |
|---|---|---|
| P1 | AX22-0018 passive buzzer A | Signal on **IO1 → GPIO3**, pending schematic/silk confirmation before first drive |
| P2 | VL53L0CX ToF distance sensor | I²C, shared bus |
| P3 | AX22-0018 passive buzzer B | Signal on **IO1 → GPIO16**, pending confirmation. `{1,3}` is the diagonal — 33.941mm from P1, the maximum separation the board allows |
| P4 | PDM microphone (AX22-0044) | Must bind to **I2S0** — the PDM-to-PCM converter exists on I2S0 only |

The first hardware experiment is to determine whether the two buzzers produce a usable felt output and whether distinct per-side low-frequency bands can be learned as left versus right. This is frequency discrimination, not spatial localization, and remains in scope until the wear test decides it.
