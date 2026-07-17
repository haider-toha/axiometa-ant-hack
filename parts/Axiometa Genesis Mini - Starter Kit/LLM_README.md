# LLM guide — Axiometa scrape corpus

How to use this `data/` folder for CAD, firmware, and hackathon work with the Genesis Mini ecosystem.

Do **not** invent product facts. Prefer scraped text in each part’s `CONTENT.md` / `part.json`. Reorganize navigation freely; do not drop hardware facts.

## Start here

1. **[`INDEX.md`](INDEX.md)** — human/LLM overview: kit contents list + part index with STEP/GLB/SCH badges.
2. **[`manifest.json`](manifest.json)** — machine inventory: kit URL, kit-contents discovery list, per-part paths and downloaded file lists, `has_step` / `has_glb` / `has_schematic`.
3. **[`catalog.json`](catalog.json)** (optional compact index) — slug, title, sku, role, path, asset flags, and a short description (~first 280 chars of each `part.json` description). Derived from existing `part.json` files only.

Then open the relevant part folder under `parts/<slug>/`.

## Per-part layout

Each scraped part lives in:

```text
parts/<slug>/
  part.json      # canonical machine record
  CONTENT.md     # LLM-friendly facts (same content, structured)
  files/         # CAD, schematics, datasheets (when present)
  images/        # pinout/, pcb/, gallery/, other/
  guides/        # optional markdown guides (e.g. Genesis Mini getting started)
```

### Where CAD and schematics live

| Asset | Typical location | Notes |
|-------|------------------|--------|
| STEP / STP ZIP | `parts/<slug>/files/*.step` or `*.zip` | Genesis Mini uses `STP_MTX0013.zip` |
| GLB preview | `parts/<slug>/files/*.glb` | Web/3D preview mesh |
| Schematic PDF | `parts/<slug>/files/SCH_*.pdf` | Circuit schematic |
| Component datasheet | `parts/<slug>/files/*-datasheet.pdf` | When download succeeded |
| Pinout / PCB images | `parts/<slug>/images/pinout/`, `.../pcb/` | Use for wiring and mechanical fit |

Software entry `genesis-studio` has **no** CAD/schematic files.

## Kit contents vs extra module

### Kit bundle (`role: kit_bundle`)

- `axiometa-genesis-mini-starter-kit` — storefront bundle page (SKU `AXMT-BUN0001`).

### In-kit modules and software (`role: kit_module` / `kit_software`)

Discovered from the starter kit “what’s inside” **Learn More** links (see `manifest.json` → `kit_contents` and `INDEX.md`):

| Slug | Role | Notes |
|------|------|--------|
| `axiometa-genesis-mini` | `kit_module` | ESP32-S3 board; STEP ZIP + GLB + SCH |
| `dht11` | `kit_module` | Temperature & humidity |
| `ips-lcd-0-96` | `kit_module` | 0.96" IPS LCD |
| `tactile-led-button` | `kit_module` | LED button |
| `rotary-encoder` | `kit_module` | Rotary encoder |
| `neopixel-matrix-5x5` | `kit_module` | 5×5 NeoPixel matrix |
| `passive-buzzer` | `kit_module` | Passive buzzer |
| `light-dependent-resistor` | `kit_module` | Light sensor |
| `ir-transceiver` | `kit_module` | IR transceiver |
| `genesis-studio` | `kit_software` | Prompt-to-firmware IDE included with the kit |

### Extra module (not listed as kit contents)

| Slug | Role | Notes |
|------|------|--------|
| `vibration-motor-erm` | `extra_module` | Scraped separately; AX22 haptic/ERM motor. Treat as optional add-on, not part of the starter kit BOM unless the user says otherwise. |

## What was intentionally NOT scraped

The scraper follows only starter-kit “what’s inside” Learn More links (plus explicitly passed extras). It skips storefront noise:

- Related-products / “There is more” style recommendations
- Site nav and footer product dumps
- Community project catalogs and long Studio community project galleries (Studio overview is kept; gallery catalogs are not)

Do not assume those omitted SKUs exist in this corpus. If a task needs another AX22 module, fetch it from the live store or re-run the scraper with an extra URL — do not invent specs.

## Known download gap — DHT11 Mouser datasheet

For `dht11` (`AX22-0011`):

- The **Material Datasheet** URL (Mouser) is retained in `part.json` → `links` / `files[].source_url`.
- Local download **failed** (`files[].download_failed: true`, `local_path: null`).
- Schematic, STEP, and GLB **did** download successfully under `parts/dht11/files/`.

Prefer the retained URL if a datasheet is required; do not claim a local PDF exists for that datasheet.

## Suggested workflow for CAD / hackathon tasks

1. Read `INDEX.md` or `catalog.json` to pick slugs by role and asset flags.
2. Load `parts/<slug>/CONTENT.md` for description, technical details, Arduino examples, and notes.
3. For mechanical work: use STEP (or STP ZIP) + pinout/PCB images; use GLB only as a lightweight preview unless STEP is missing.
4. For electrical work: use schematic PDF + technical_details + Arduino examples in `part.json`.
5. For prompt-to-firmware / kit software context: use `parts/genesis-studio/` — do not invent Studio features beyond that entry.
6. Keep kit modules and `vibration-motor-erm` distinct unless the user includes the extra module.

## Roles cheat sheet

| Role | Meaning |
|------|---------|
| `kit_bundle` | Starter kit product page |
| `kit_module` | Hardware module listed in kit contents |
| `kit_software` | Studio IDE included with the kit |
| `extra_module` | Hardware scraped on purpose but not in kit contents |
