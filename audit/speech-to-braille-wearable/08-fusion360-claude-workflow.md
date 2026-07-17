# 08 — Fusion 360 × Claude Workflow: Can Claude Drive Fusion, and How to Get to Printable Files

**Type:** Research memo (RESEARCH ONLY — no CAD authored here). Answers the builder's question: "Can I connect Claude / Claude Code to my Fusion? Can it take over the modelling, or at least give me drawings / cut files?"
**Date:** 2026-07-17
**Scope inputs:** builder wants Autodesk **Fusion 360** (stated explicitly); enclosure is **wrist-worn, 3D-printed on Bambu Lab (PLA)**; 2-day hackathon. Local repo has a `cad` skill that is **build123d/STEP-based Python, NOT Fusion** (`.claude/skills/cad/SKILL.md`).
**Grounding mandate:** every existence/capability claim below carries a current (2025–2026) source URL. Where a source is a search-result excerpt (Autodesk.com blocked my direct fetch with HTTP 403), that is flagged in *Grounding notes*.

---

## Scope

Determine, from current web sources, whether Claude / Claude Code can drive Autodesk Fusion 360, and map the realistic path from the locked design spec (file `05`) to a Fusion model to printable enclosure files. Five questions: (1) do Fusion MCP servers exist and are they usable; (2) can Claude generate a Fusion Python script; (3) does the local `cad` skill's STEP import cleanly into Fusion; (4) how do drawings and print files come out; (5) the single recommended pipeline for THIS builder with an honest division of labor.

**Terminology clarification (required):** this enclosure is **3D-printed**, so "cut files" here means **slicer files — STL / 3MF for Bambu Studio — not laser or CNC cut files.** There is no CNC/laser step. "2D drawings" (PDF/DXF from Fusion's Drawing workspace) are **documentation/reference**, not cutting paths. Wherever the builder said "cut files," read **STL/3MF for the Bambu slicer**.

---

## Verdicts & evidence (1–5, cited)

### 1. Fusion 360 MCP servers — YES, and there is now an OFFICIAL one

**Headline verdict: a first-party Autodesk Fusion MCP integration for Claude shipped on 2026-04-28** as one of nine connectors in Anthropic's "Claude for Creative Work" launch (alongside Blender, Adobe, Ableton, SketchUp, etc.). This is not a hobby project — it is an Autodesk × Anthropic partnership.
- Anthropic announcement: https://www.anthropic.com/news/claude-for-creative-work
- Autodesk Platform Services blog, "Bringing Fusion onto Claude for Creative Work": https://aps.autodesk.com/blog/bringing-fusion-claude-creative-work
- Autodesk campaign page "Claude for Autodesk Fusion": https://www.autodesk.com/campaigns/fusion-360/claude-fusion
- Autodesk Fusion blog, "How to Improve Your Fusion Workflow with the Claude Desktop Connector": https://www.autodesk.com/products/fusion-360/blog/how-to-improve-your-fusion-workflow-with-the-claude-desktop-connector/
- Independent reporting: engineering.com https://www.engineering.com/autodesk-announces-fusion-mcp-servers-and-more-ai-updates/ · DEVELOP3D (Apr 29 2026) https://develop3d.com/ai/claude-for-cad-blender-autodesk-fusion/ · Manufactur3D https://manufactur3dmag.com/anthropic-claude-for-cad-fusion-blender/ · 9to5Mac https://9to5mac.com/2026/04/28/anthropic-releases-9-new-claude-connectors-for-creative-tools-including-blender-and-adobe/
- Autodesk Fusion's own announcement (X/Twitter): https://x.com/adskFusion/status/2049278655462089198

**There are two official servers** (engineering.com; Autodesk campaign page):
| Server | Runs | Needs Fusion open? | Does | Clients |
|---|---|---|---|---|
| **Autodesk Fusion MCP** | locally | **Yes** | executes modeling tasks + Fusion commands (text-to-CAD, sketches, extrudes, fillets, edits, exports) | Claude Desktop, Cursor, any MCP-capable HTTP client |
| **Autodesk Fusion Data MCP** | remotely (Autodesk cloud) | **No** | queries/manages design data across projects | Claude Desktop, VS Code |

For live modelling of this enclosure, the relevant one is the **local Autodesk Fusion MCP** server.

**Requirements & install** (Autodesk blog; engineering.com; hands-on test below):
- A **paid Fusion subscription** is required; Fusion must be **running** for the local server.
- Install via **Claude Desktop → Customize → Connectors → "+" → search "Fusion" → Autodesk Fusion → Install**; enable the connector on the Fusion side (a checkbox) and grant the tool permissions.

**Real-world maturity — an independent hands-on test (2026-05-03, tokyomakers/note.com):** https://note.com/tokyomakers/n/n35aae26aa835?hl=en
- **Worked well** for word-describable geometry: generated a pyramid from a text description in seconds; applied fillets to all 24 edges of a shape (3 mm outer / 1 mm inner) on command; designed a 3×3 keypad with multiple layers and **asked clarifying questions about dimensions** before proceeding; created reference keycaps/switches. It could also edit *existing* models, not just build from scratch.
- **Failed:** image-to-3D ("dog badge" from a reference image was "a complete failure"); direct rendering prompts.
- **Author's rule of thumb:** Claude excels when "the shape can be explained in words step-by-step" and struggles to reproduce "forms from images." Tips: **always state units (mm/cm)**, give **specific dimensions**, and add "ask me to clarify uncertainties."

**Autodesk's own framing is deliberately bounded** (APS blog): they call it "an early step," and stress that "generating an idea is not the same as producing something real" — manufacturing-grade rigor, precision, and tolerancing "remain within Fusion itself, not delegated to Claude." Treat it as a capable but young co-pilot, not an autonomous CAD engineer.

**Community/pre-official MCP servers also exist** (predate and parallel the official one; still useful if you want **Claude Code** specifically driving Fusion, or no subscription-gated connector):
- **faust-machines/fusion360-mcp-server** — the most capable community option. **84 tools** (sketch, extrude/revolve/loft, body ops, parametric control, surfaces, sheet metal, assembly, CAM, primitives). Explicitly **tested with Claude Code**; also Cursor/OpenCode/Codex. Architecture: MCP server (stdio) → TCP **port 9876** → Fusion add-in executing on the main thread. ~55 stars, ~11 commits, **beta**. Caveats: **30 s timeout per op, one operation per tool call (batching crashes the add-in), all units in centimeters, Fusion must be running with the add-in active.** https://github.com/faust-machines/fusion360-mcp-server
- **ndoo/fusion360-mcp-bridge** — "Connect **Claude Code** to Fusion 360 via MCP — read/create/update/delete CAD geometry through natural language." https://github.com/ndoo/fusion360-mcp-bridge
- **Joe-Spencer/fusion-mcp-server** — smaller surface (message box, sketch-on-plane, parameter creation), Claude/Cursor, HTTP-SSE **port 3000**, ~47 stars, ~7 commits. https://github.com/Joe-Spencer/fusion-mcp-server
- **frankhommers/autodesk-fusion-mcp** — 11 focused tools, HTTP-streamable, Claude Desktop/Cursor. https://github.com/frankhommers/autodesk-fusion-mcp
- Others (lower maturity / varied): jaskirat1616/fusion360-mcp (multi-backend incl. Claude) https://github.com/jaskirat1616/fusion360-mcp · JustusBraitinger/FusionMCP https://github.com/JustusBraitinger/FusionMCP · AuraFriday/Fusion-360-MCP-Server https://github.com/AuraFriday/Fusion-360-MCP-Server · Misterbra/fusion360-claude-ultimate https://github.com/Misterbra/fusion360-claude-ultimate · rahayesj/ClaudeFusion360MCP (Claude "skill files") https://github.com/rahayesj/ClaudeFusion360MCP · Joelalbon/Fusion-MCP-Server https://github.com/Joelalbon/Fusion-MCP-Server

**All Fusion MCP servers — official and community — share the same architecture and constraints:** they run **locally**, drive a **live Fusion session that must be open**, and act through a **Fusion add-in/bridge**. None is a cloud service that models without your machine. The official one is the most trustworthy; the community ones are beta, single-maintainer, low-commit projects.

### 2. Fusion Python API path — YES, Claude can write a script you paste into Fusion

Fusion 360 ships a **Python scripting API** (also TypeScript/JS and C++). Claude can generate a script from the locked spec; you paste it into **Utilities → ADD-INS → Scripts and Add-Ins** (`Shift+S`) → *Scripts* → **+** (create) → open in the editor → paste → **Run**. The result is a **native, fully editable parametric model** with a timeline and user parameters — often *better* for later refinement than an imported STEP body (see §3).
- Getting Started with Fusion's API: https://help.autodesk.com/cloudhelp/ENU/Fusion-360-API/files/BasicConcepts_UM.htm
- Extrude Feature API Sample: https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-CB1A2357-C8CD-474D-921E-992CA3621D04

**Short illustrative snippet** (entry points verified against the Extrude sample — a circular boss, the same pattern extends to the enclosure's pockets/bosses/lid):
```python
import adsk.core, adsk.fusion, traceback

def run(context):
    app = adsk.core.Application.get()
    ui  = app.userInterface
    try:
        design   = adsk.fusion.Design.cast(app.activeProduct)
        rootComp = design.rootComponent

        # Sketch on a construction plane
        sketch = rootComp.sketches.add(rootComp.xYConstructionPlane)
        circles = sketch.sketchCurves.sketchCircles
        circles.addByCenterRadius(adsk.core.Point3D.create(0, 0, 0), 2.75)  # 27.5 mm dia

        # Take the closed profile and extrude it into a new body
        prof = sketch.profiles.item(0)
        extrudes = rootComp.features.extrudeFeatures
        dist = adsk.core.ValueInput.createByReal(0.5)  # NOTE: API units are CENTIMETERS -> 5 mm
        extrudes.addSimple(prof, dist, adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    except:
        if ui: ui.messageBox('Failed:\n{}'.format(traceback.format_exc()))
```
Key objects: `adsk.core.Application.get()` → `adsk.fusion.Design.cast(app.activeProduct)` → `rootComponent` → `sketches.add(plane)` → `sketchCurves.sketchCircles.addByCenterRadius` → `sketch.profiles.item(0)` → `extrudeFeatures.addSimple(profile, ValueInput, FeatureOperations.…)`.
**Load-bearing gotcha: the Fusion API's internal length unit is CENTIMETERS.** `ValueInput.createByReal(0.5)` = 5 mm. A script that pastes mm values as reals produces a part **10× too large**. Have Claude either convert (`mm/10`) or set/read user parameters explicitly.

### 3. STEP round-trip (local `cad` skill → Fusion) — YES, imports cleanly

The local `cad` skill emits STEP as its primary artifact (`.claude/skills/cad/SKILL.md`, "Treat STEP as the primary CAD artifact"). Fusion imports **.step/.stp** natively and converts to a Fusion body for editing.
- Autodesk Fusion blog, "How to Import a STEP File into Fusion [Update 2025]": https://www.autodesk.com/products/fusion-360/blog/import-step-file-into-fusion-360/
- Fictiv, "How to Modify and Import STEP Files": https://www.fictiv.com/articles/how-to-modify-and-import-step-files

Path: **Upload** via the Data Panel (or **drag-and-drop** the file into the workspace) → Fusion auto-converts to native format → drag it into the design to move/join/edit it like any part.
**The one setting that matters — 3D Interconnect:** with it **ON**, the import stays *associatively linked* to the source file and is only lightly editable. To edit the geometry as fully native Fusion geometry, **turn 3D Interconnect OFF** (Preferences), then re-import. Caveat: an imported STEP arrives as a **solid body with no feature timeline** — you get direct-edit/push-pull, not the parametric history you'd get from the Python-script route (§2). This is exactly the "**Claude generates the geometry, you refine in Fusion**" path, and it works — but for *parametric* refinement, §2 (script) is stronger.

### 4. Drawings and print files out of Fusion — both are first-class

**(a) 2D engineering drawings** (documentation/reference):
- From the model: **Design workspace → Drawing → From Design** → pick sheet size/scale → drag to place Front/Top/Side/Iso views → dimension/annotate.
- Export: **Drawing workspace → Export → Export PDF** (also **DWG / DXF / CSV**). Autodesk help "Export to PDF": https://help.autodesk.com/view/fusion360/ENU/?guid=DWG-EXPORT-PDF · Autodesk support "How to export Fusion Drawings in PDF, DWG, CSV, or DXF": https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-export-Fusion-360-Drawings.html
- Quick alternative for a single sketch/profile: right-click a sketch in the browser → **Save As DXF**.

**(b) Print files for Bambu (the actual "cut files"):**
- Right-click the body/component in the browser → **Save As Mesh** → choose format. Options: **3MF, STL (ASCII), STL (BINARY), OBJ.** Autodesk support "How to export an STL file from Autodesk Fusion": https://www.autodesk.com/support/technical/article/caas/sfdcarticles/sfdcarticles/How-to-export-an-STL-file-from-Fusion-360.html
- Or use the **3D Print / Make** command to hand the mesh straight to a slicer (Fusion can be set to send to Bambu Studio).
- **Bambu-specific advice from the community:** Fusion's **direct 3MF translation is sometimes imperfect**; several users prefer exporting **ASCII STL**, which Bambu Studio ingests cleanly, and using Bambu Studio's **"Fix Model"** if a mesh comes in broken. https://forum.bambulab.com/t/fusion-360-stl-vs-obj-vs-3mf-in-3d-print-option/87111
- Note: the local `cad` skill can *also* emit **STL/3MF directly** (secondary exports) and **DXF** (via the `$dxf` skill) — so printable files do not strictly require Fusion at all (see Recommended pipeline, Path B).

### 5. Recommended pipeline for THIS builder — see next section.

---

## Recommended pipeline

Constraints that drive the ranking: **2-day hackathon** (reliability > elegance), **must end in Fusion** (builder's stated tool), **Claude should do as much as possible**, output is **Bambu PLA prints**. The wrist-cuff enclosure from spec `05` is essentially **prismatic + parametric** (55×55 mm PCB pocket, lid, screw bosses, band-slot features, two underside motor pads) — which is the *sweet spot* for scripted/described geometry and the *worst case* for image-derived organic modelling (the one thing the tests show Claude fails at).

### THE single recommended spine (ranked options; do #1, keep #2 as accelerator, #3 as safety net)

**#1 — Claude writes a Fusion 360 Python script; you paste-and-run in Fusion. (Most reliable end-to-end.)**
Give Claude the dimensioned spec from `05`; it emits a parametric Python script (user parameters for wall thickness, PCB pocket, band width, boss positions). You paste it into **Scripts and Add-Ins → Run**. You get a **native parametric model with a timeline** you refine directly in Fusion, then **Save As Mesh → ASCII STL → Bambu Studio**, plus an optional **Drawing → PDF**. Why #1: works with **plain Claude / Claude Code — no subscription-gated connector, no live-session flakiness**; deterministic and re-runnable; produces *editable feature history* (beats STEP import); and it is genuinely "Claude did the modelling." Only real risk is the **cm-unit gotcha** (§2) — have Claude parameterize in mm and convert.

**#2 — Add the official Autodesk Fusion MCP connector for live, conversational tweaks. (Best "Claude takes over" experience — use it ON TOP of #1.)**
If the builder has a **Fusion subscription + Claude Desktop**, install the connector (§1) and drive edits by chat: "shell the body to 2 mm," "fillet all outer edges 3 mm," "add four M3 bosses at the pocket corners." The hands-on test shows exactly these operations succeed. Use it as an **iteration accelerator on the scripted base**, not as the from-scratch generator, and never for image-to-shape. Caveats: young ("an early step"), needs Fusion open + paid seat, live-integration variability.

**#3 — Local `cad` skill (build123d → STEP/STL/3MF) as the guaranteed-printable safety net.**
The `cad` skill is **already installed in this repo** and is validated (inspect + mandatory snapshot). It can produce a **printable STL/3MF today with zero Fusion dependency**, and a **STEP** you import into Fusion (3D Interconnect OFF) to refine (§3). This is the **lowest-risk path to a physical print** if Fusion cooperation or the connector eats hackathon time. Trade-off: STEP imports as a body without feature history, so Fusion refinement is direct-edit rather than parametric.

**#4 — Community MCP (faust-machines) + Claude Code, only if** you specifically want **Claude Code** (not Desktop) driving Fusion live and can't/won't use the official connector. Capable (84 tools) but beta; mind the 30 s timeout, one-op-per-call, cm units.

**Reliability ranking for a 2-day build:** #1 (script) ≈ #3 (local skill → STEP) > #2 (official connector) > #4 (community MCP). Recommended combo: **#1 as the spine, #2 to iterate if available, #3 kept warm as the fallback that guarantees a printed part.**

### Honest division of labor

**Claude realistically CAN:**
- Convert the `05` spec into **geometry** three ways: a **Fusion Python script** (native parametric, #1), **build123d → STEP/STL/3MF** (local skill, #3), or **live via the official/community MCP** (#2/#4).
- Apply prismatic features: pockets, bosses, shells, fillets, chamfers, patterns; and **edit existing** models (verified: fillet-all-edges, multi-layer keypad).
- **Export** STEP / STL / 3MF / DXF and scaffold a **2D drawing**.
- Produce a **dimensioned parameter table / engineering spec** (it already did, in `05`).

**Claude realistically CANNOT (do not rely on):**
- Derive an **organic/freeform shape from a photo** (documented failure — keep the enclosure describable in words + dimensions).
- Guarantee **tolerances, fit, or manufacturability**, or replace **engineering review** — Autodesk explicitly keeps this in Fusion, not delegated to Claude.
- Make **print-orientation, support, and slicing** decisions — that is **Bambu Studio + you**. (These are the real "cut file" decisions, and they are human/slicer calls.)
- Produce **laser/CNC "cut files"** — irrelevant here; this part is 3D-printed, so the deliverables are **STL/3MF** (print) and optional **PDF/DXF** (documentation).

---

## Grounding notes (which docs, date-sensitivity)

**Directly fetched and read:** Autodesk APS blog (Claude/Fusion) ✓; engineering.com (two-server breakdown) ✓; DEVELOP3D (Apr 29 2026) ✓; note.com hands-on test (May 3 2026) ✓; Extrude Feature API Sample (Python snippet) ✓; GitHub READMEs for faust-machines/fusion360-mcp-server and Joe-Spencer/fusion-mcp-server ✓. Local `.claude/skills/cad/SKILL.md` read in full ✓.

**Cited from search-result excerpts because Autodesk.com returned HTTP 403 to direct fetch** (URLs are the authoritative source; content corroborated across multiple result snippets): Autodesk campaign page `claude-fusion`; Autodesk Fusion blog "…Claude Desktop Connector"; Autodesk STEP-import blog; Autodesk support articles for STL export and Drawings export; Autodesk help "Export to PDF." Treat exact click-paths as "as reported 2026"; confirm against the live UI at build time.

**Date-sensitivity (high):** the entire official-connector story is **~11 weeks old** as of 2026-07-17 (announced 2026-04-28). Install path, connector name, capabilities, and pricing/subscription gating **can change without notice**. The community MCP repos are low-commit and may drift or break against Fusion updates. **Re-verify §1 the day you build.** The Fusion Python API (§2), STEP import (§3), and export flows (§4) are long-stable and low-risk.

---

## Residual risk

- **R1 — Official connector is young + paywalled.** "An early step" (Autodesk's words), needs a **paid Fusion subscription** and Fusion running; live behavior varies. Mitigation: use it only as the #2 accelerator; don't put the demo's critical path on it.
- **R2 — cm-unit trap in the Python path.** Fusion API reals are **centimeters**; an unconverted mm script yields a **10× part**. Mitigation: parameterize in mm, convert on the way in, and eyeball the bounding box after Run.
- **R3 — STEP import loses feature history.** Imported STEP is a body, not a timeline; heavy re-parameterization in Fusion is awkward. Mitigation: prefer the **script path (#1)** when you expect to tweak dimensions; import STEP (#3) when you mainly need to print or lightly direct-edit. Remember **3D Interconnect OFF** to edit.
- **R4 — 3MF translation quirks into Bambu.** Fusion's direct 3MF can import imperfectly. Mitigation: export **ASCII STL**; use Bambu Studio **Fix Model** if needed.
- **R5 — Image-to-shape is a known failure mode.** Don't ask any Claude/Fusion route to reproduce the enclosure from a render or photo. Mitigation: drive everything from the **worded, dimensioned spec** in `05`.
- **R6 — Community MCP fragility.** Beta, single-maintainer, 30 s timeouts, one-op-per-call. Mitigation: only reach for #4 if Claude Code must drive live and the official connector is unavailable.
- **R7 — Local `cad` skill is not Fusion.** It is build123d/STEP Python; its outputs are handed to Fusion via STEP/STL/3MF/DXF, not by "opening the skill in Fusion." Keep the mental model straight so the builder doesn't look for a Fusion plugin that isn't there.
