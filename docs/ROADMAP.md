# Roadmap

Nothing here is committed — it's the list of things considered and parked.
Ordered roughly by value-to-effort.

See `docs/FEATURE_PLAN.md` for the phased plan that mirrors Dither Boy's feature
set — it supersedes several entries below (effect stack reordering, more
palettes, batch export) with concrete implementation sketches.

## Small

- [x] **Before/after toggle.** Shipped as a toggle (`c`, or the toolbar / dock button).
- [x] **Batch export.** Shipped. Drop several files, current settings applied to
      each, one stored-mode ZIP out. Mixed sizes work — the grid is in cells.
- [x] **More palettes.** Shipped — 39, grouped by kind, with a credits note.
- [x] **Preset buttons.** Shipped as the Presets tab — 41 named looks, grouped by
      use, on the existing `CFG_IDS` serialization.
- [x] **Copy as HTML.** Shipped. ASCII exports a `<pre>` with per-run colour spans;
      dither mode exports the inline SVG.
- [x] **Palette editor.** Shipped in part — extracted swatches are recolourable in
      place. Add/remove/reorder is still open.
- [x] **Preset packs.** Shipped. Save named looks and move several at once
      through the clipboard as one JSON pack.

## Medium

- [x] **Effects stack.** Shipped, then made reorderable. `effects()` walks the
      `FX` table in the order held by `#fxorder`; twelve passes including
      chromatic aberration, JPEG glitch, waveform, pixel sort, slice shift and
      vignette. All the random ones are seeded.
- [x] **True blue noise.** Shipped. Void-and-cluster into 16², 32² and 64² tiles,
      each generated lazily behind a getter (~25ms for the 64²).
- [ ] **Web Worker for the dither pass.** Still open, but less urgent: dragging
      now previews at a reduced grid and an over-budget render coalesces input,
      which covers the felt lag. The settled render is still the full cost
      (~265ms at 1200 cells with Jarvis). Needs transferable ImageData and a
      cancellation token so stale renders get dropped.
- [x] **SVG export with run-length merging.** Shipped. One `<path>` per colour with
      a subpath per horizontal run; ASCII mode emits `<text>` rows merged by colour.
- [ ] **Region masking.** Different algorithms or palettes in different areas of
      the image. The one substantial Dither Boy-adjacent idea still unbuilt.
- [ ] **Ostromoukhov.** Variable-coefficient error diffusion, the best tone
      reproduction available. Left out because its 256-row table could not be
      verified from a reliable source — add it from one.
- [ ] **Text panel virtualization.** 400-column braille output currently makes
      `#textout` sluggish.
- [x] **Image mode.** Shipped. A third mode tab running the shared pipeline with
      the quantizer taken off — tone and all twelve effect passes against a
      continuous-tone image. Working size is a ceiling on the long edge; pixel
      size divides it into blocks and doubles as the cost lever. SVG, TXT and
      HTML are withheld there because nothing writes a grid for them.
- [ ] **Pipeline-ordered rail.** *Parked deliberately — the next UI step.* The
      Adjust pane is currently ordered by history rather than by the pipeline, so
      Effects sits above Dither while Tone sits above both. Restructure it into
      the stages the pipeline actually has — **Source → Tone → Effects → Quantize
      → Output** — with most stages collapsed by default and the Basic/All toggle
      on top of that.

      The groundwork is in: blocks already declare their modes with `data-modes`,
      `.blk` already collapses, and `data-adv` already thins each block out. What
      is left is genuinely a reorganization — moving Dither, Halftone and Palette
      under one Quantize stage, moving the export scale controls out of the dialog
      and into an Output stage, and deciding which stages open on boot. Bigger
      diff, no new mechanism.

      Two things to be careful of: the blocks must be *moved*, not rebuilt, or the
      boot-time auto-binding on every control is lost (the same trap `syncFxStack()`
      documents); and focus mode restyles this same `#rail`, so the stages have to
      survive at 246px wide.

## Large

- [x] **Video and animation.** Shipped. `<video>` is a valid `drawImage` source, so
      the pipeline runs per frame unchanged. Exports as animated GIF (own GIF89a +
      LZW encoder), WebM (`MediaRecorder`), or a PNG sequence in a ZIP (own
      stored-mode ZIP writer). No dependencies were added.
- [ ] **WebGL path.** Real-time preview at full resolution. Ordered dithering
      maps cleanly to a fragment shader; error diffusion is inherently sequential
      and doesn't, so it would mean two implementations.

## Known issues

| Issue | Notes |
|---|---|
| Input lag on large grids | Drag previews at a reduced grid and over-budget renders coalesce input; the settled render is still single-threaded. The preview gate reads `lastFullCost`, never `lastCost` — see the gotcha in CLAUDE.md, it oscillated badly |
| Text panel slow at high column counts | No virtualization |
| `stepGuess()` is a heuristic | Ordered spread on arbitrary colour palettes is approximate, not principled |
| Non-monospace fonts break alignment | Font list is monospace-only, but a custom family could be forced in |
| Clipboard image copy fails in some browsers | Falls back to a toast telling the user to use Save PNG |
| Clip encoding is single-threaded | Every frame runs the full pipeline on the main thread; long clips take a while. Progress bar + cancel cover it, a worker would fix it |
| GIF uses one palette for the whole clip | Taken from the active palette, so per-frame optimal tables aren't attempted. Fine for dithered output, which is already quantized. Image mode has no palette, so it median-cuts 64 colours from the source instead — one table for the clip either way |
| Image mode at source resolution is slow | Every effect pass is per-pixel and single-threaded, so a large source with pixel sort or edge detect takes real time. The working-size ceiling and pixel size are the levers; a worker would be the fix |
| Image mode inherits the app-wide Mono default | `colormode` is one setting shared by all three modes, so a fresh Image render is greyscale until you flip it. Changing it on a mode switch would break preset determinism, so the Mono/Colour control was moved to the top of Tone where Image mode can see it instead |
| WebM export depends on `MediaRecorder` | Falls back to a toast where unsupported. Frame pacing is wall-clock, not exact |
| Blue noise tile is regenerated per session | ~25ms, cached in memory, now three tile sizes. No storage means no persistence |
| CMYK separation is not colour-managed | Plain GCR with a slider. It is a look, not a proof |
| Exotic charsets shear on the embedded fonts | The ramp block warns; it does not stop you |
