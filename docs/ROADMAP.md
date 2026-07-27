# Roadmap

Nothing here is committed — it's the list of things considered and parked.
Ordered roughly by value-to-effort.

## Small

- [ ] **Before/after toggle.** Hold a key to show the source image in place of the render.
- [ ] **Batch export.** Drop several files, apply current settings, save all as PNGs.
- [ ] **More palettes.** Lospec hex lists paste straight into `PALETTES`.
- [ ] **Preset buttons.** A handful of named looks (`1-bit newsprint`, `Game Boy`,
      `braille terminal`) as one-click starting points, built on the existing
      `CFG_IDS` serialization.
- [ ] **Copy as HTML.** ASCII output with per-glyph colour spans, for pasting into
      a page. `renderAscii()` already computes the colours.
- [ ] **Palette editor.** Add/remove/reorder swatches on the extracted palette
      rather than re-extracting.

## Medium

- [ ] **Effects stack.** Chromatic aberration, scanlines, bloom, JPEG-artifact
      simulation, applied pre- or post-dither in a reorderable list. Requires
      restructuring `render()` into a pass pipeline — the main architectural
      change on this list.
- [ ] **True blue noise.** Void-and-cluster generated once into a 64×64 tile,
      lazily on first use.
- [ ] **Web Worker for the dither pass.** Fixes the input lag at 800+ cell grids
      with 12-tap kernels. Needs transferable ImageData and a cancellation token
      so stale renders get dropped.
- [ ] **SVG export with run-length merging.** Merge horizontal runs of identical
      cells into single rects; otherwise files are unusable. For plotters and
      screen printing.
- [ ] **Region masking.** Different algorithms or palettes in different areas of
      the image.
- [ ] **Text panel virtualization.** 400-column braille output currently makes
      `#textout` sluggish.

## Large

- [ ] **Video and animation.** Frame extraction via `<video>` + canvas, per-frame
      dithering, GIF/WebM assembly. The single biggest gap versus Dither Boy, and
      the thing most likely to break the no-dependencies rule (encoders are
      hard to write from scratch).
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
