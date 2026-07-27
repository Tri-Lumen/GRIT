# Decisions

Why the tool is shaped this way. Read before proposing structural changes.

### Single HTML file, no build

The tool needs to survive being emailed, dropped on a USB stick, or opened from
`file://` in three years. A build step is a liability for something this size.
~950 lines is comfortably navigable.

If it ever outgrows one file, the split point is: `index.html`, `grit.css`,
`grit.js` — still no bundler, just `<link>` and `<script src>`. Do not reach for
a framework.

### No browser storage for presets

`localStorage` is unavailable or silently broken in several sandboxed embed
contexts. Settings are serialized to JSON and moved through the clipboard
instead, which works everywhere and doubles as a way to keep looks in a notes
file or share them.

The transport list is the `CFG_IDS` array. Adding a control means adding its id
there or it won't round-trip.

### Grid size and cell size are separate controls

This is the single most important behaviour, and the thing Dither Boy sells on.
Dithering at low resolution then scaling up with nearest-neighbour gives chunky
dots at any output size without resampling mush. One combined "resolution"
slider would collapse two independent axes.

### The DOM is the state

No settings object, no reactive layer. `v('id')` and `num('id')` read controls
directly at render time. For a tool with ~30 controls and one render function,
an abstraction layer would be more code and more places to desync.

Consequence: control ids are a public API. Renaming one breaks presets that
users have saved as JSON.

### Ramp direction is inferred, not toggled

`denseOnBright()` compares ink luminance to paper luminance and decides whether
dense glyphs mean light or dark. Users shouldn't have to reason about it —
ASCII art conventionally assumes dark ink on light paper, but this tool defaults
to a dark UI and light ink, and getting it backwards looks broken.

"Invert ramp" flips the inferred flag rather than reversing the charset, so the
two mechanisms can't cancel each other out. They did, once.

### ASCII reuses the dither engine

Rather than a separate "average luminance → glyph" path, ASCII mode dithers
against a synthetic N-level grayscale ramp where N is the charset length. Costs
nothing extra and means all 25 algorithms apply to text output, which is the
part that makes it look better than the average ASCII generator.

### Colour error diffusion in plain RGB

Perceptually uniform spaces (Oklab, CIELAB) would quantize better on colour
palettes. RGB with luma-weighted distance is used instead because it's fast
enough to run on every keystroke and the difference is small at these palette
sizes. Worth revisiting only if palette output starts looking wrong.

### Deliberately not built

- **Video / animation.** Dither Boy's timeline is a large surface area and the
  original need was stills.
- **Stacked effects** (chromatic aberration, JPEG glitch, glow). Would require
  reworking the render function into a pipeline of passes. Feasible, not needed yet.
- **SVG / vector export.** Real demand exists for plotter and print work, but
  emitting one `<rect>` per cell produces enormous files. Would need run-length
  merging to be usable.
- **True blue noise.** See `docs/ALGORITHMS.md`.
