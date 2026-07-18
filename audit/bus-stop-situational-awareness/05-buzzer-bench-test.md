# Track 5: AX22-0018 Bench Test And Audio-Proxy Decision

**Date:** 2026-07-18

**Status:** Measured qualitative bench result; binding for the current prototype

## Setup

- Genesis Mini with AX22-0018 passive buzzers in P1 and P3.
- Buzzer-only firmware drove 70, 100, 150, and 220 Hz during the labelled `v` sweep.
- Modules were evaluated for felt movement as the intended wrist-output mechanism.

## Observation

The tones were audible, but there was virtually no tactile movement. The output was not viable as wrist haptic feedback.

This is a qualitative first-person bench result, not an instrumented acceleration measurement and not a DeafBlind-user study. It is nevertheless sufficient to reject these parts as tactile actuators for the hack prototype.

## Decision

1. The AX22-0018 modules are **audio proxies only** in the current demo.
2. P1 / LEFT plays a fixed 700 Hz proxy tone. P3 / RIGHT plays a fixed 1400 Hz proxy tone.
3. Patterns still exercise side/channel routing, simultaneous-versus-alternating output, count, rhythm, and duration. They do not validate tactile perception, spatial localization, or accessibility.
4. The intended product direction assumes purpose-built vibration actuators, such as ERM or LRA motors, would replace the buzzers and render an adapted version of the same semantic vocabulary.
5. That product assumption remains unvalidated until the vocabulary is retuned and tested on real vibration hardware with representative users.

## Claim Boundary

Acceptable demo language:

> These two tones simulate the two vibration channels the product would use. The current buzzer modules could be heard but not felt, so this prototype demonstrates sensing, routing, and pattern semantics rather than tactile efficacy.

Do not say that the current prototype delivers haptic output, that LEFT/RIGHT has been tactilely distinguished, or that the output has been validated for DeafBlind users.
