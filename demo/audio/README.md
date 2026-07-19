# Demo Audio

## Synthetic siren chirp

`synthetic-siren-chirp.wav` is the controlled positive fixture used for the 2026-07-19 local siren bench check.

- PCM WAV, mono, 16-bit, 16 kHz
- duration: 1.5 seconds
- SHA-256: `c2dbffd8fa50fc422bd6be86ad69f743d199a5733742582ced334b52b9676bdd`

It is a synthetic demo signal, not a recording of an emergency vehicle and not a representative classifier benchmark. Use it only to verify the known positive demo path. Start laptop volume low, play it once near the PDM microphone, and raise volume only if the board does not confirm the signal. Do not loop it in a shared or quiet environment.

On macOS:

```bash
afplay demo/audio/synthetic-siren-chirp.wav
```
