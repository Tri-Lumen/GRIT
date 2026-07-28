# Roadmap

Nothing here is committed — it's the list of things considered and parked.
Ordered roughly by value-to-effort.

See `docs/FEATURE_PLAN.md` for the phased plan that mirrors Dither Boy's feature
set — it supersedes several entries below (effect stack reordering, more
palettes, batch export) with concrete implementation sketches.

## Small

- [x] **Before/after toggle.** Shipped as a toggle (`c`, or the toolbar / dock button).
- [ ] **Batch export.** Drop several files, apply current settings, save all as PNGs.
- [ ] **More palettes.** Lospec hex lists paste straight into `PALETTES`.
- [x] **Preset buttons.** Shipped as the Presets tab — six named looks on the
      existing `CFG_IDS` serialization.
- [x] **Copy as HTML.** Shipped. ASCII exports a `<pre>` with per-run colour spans;
      dither mode exports the inline SVG.
- [x] **Palette editor.** Shipped in part — extracted swatches are recolourable in
      place. Add/remove/reorder is still open.

## Medium

- [x] **Effects stack.** Shipped as a fixed-order pre-dither pass (`effects()`):
      blur, sharpen, edge detect, posterize, bloom, scanlines. Reorderable passes
      and chromatic aberration / JPEG-artifact simulation are still open — a
      reorderable list is still the architectural change this list implies.
- [x] **True blue noise.** Shipped. Void-and-cluster into a 64×64 tile, generated
      lazily behind a getter on `ORD.blue.m` (~25ms).
- [ ] **Web Worker for the dither pass.** Fixes the input lag at 800+ cell grids
      with 12-tap kernels. Needs transferable ImageData and a cancellation token
      so stale renders get dropped.
- [x] **SVG export with run-length merging.** Shipped. One `<path>` per colour with
      a subpath per horizontal run; ASCII mode emits `<text>` rows merged by colour.
- [ ] **Region masking.** Different algorithms or palettes in different areas of
      the image.
- [ ] **Text panel virtualization.** 400-column braille output currently makes
      `#textout` sluggish.

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
| Input lag on large grids | No worker, no throttle beyond rAF |
| Text panel slow at high column counts | No virtualization |
| `stepGuess()` is a heuristic | Ordered spread on arbitrary colour palettes is approximate, not principled |
| Non-monospace fonts break alignment | Font list is monospace-only, but a custom family could be forced in |
| Clipboard image copy fails in some browsers | Falls back to a toast telling the user to use Save PNG |
| Clip encoding is single-threaded | Every frame runs the full pipeline on the main thread; long clips take a while. Progress bar + cancel cover it, a worker would fix it |
| GIF uses one palette for the whole clip | Taken from the active palette, so per-frame optimal tables aren't attempted. Fine for dithered output, which is already quantized |
| WebM export depends on `MediaRecorder` | Falls back to a toast where unsupported. Frame pacing is wall-clock, not exact |
| Blue noise tile is regenerated per session | ~25ms, cached in memory. No storage means no persistence |
