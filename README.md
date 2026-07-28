# GRIT

Browser-based image dithering and ASCII art. One HTML file, no dependencies, no
network, no install. Everything runs locally in the browser.

## Use

Open `index.html`. Drag in an image, paste from the clipboard, or click
**Load test card** to generate one.

## Dither mode

- **12 error-diffusion algorithms** — Floyd–Steinberg, Jarvis–Judice–Ninke,
  Stucki, Atkinson, Burkes, three Sierras, Stevenson–Arce, and two degenerate
  smear kernels — with adjustable diffusion strength and serpentine scanning
- **13 ordered patterns** — Bayer 2/4/8/16, clustered dot, halftone, line and
  diagonal screens, interleaved gradient noise, white noise, plain threshold —
  with an adjustable pattern spread
- **Decoupled grid and cell size**, so you can dither at low resolution and
  export chunky at any scale with hard pixel edges
- **Palettes** — custom two-tone, N-level grayscale, Game Boy DMG and Pocket,
  CGA, C64, PICO-8, Sweetie 16, NES, amber and green CRT, newsprint, riso duo,
  Solarized, plus median-cut extraction from your own image
- Mono or colour quantization; brightness, contrast, gamma, saturation, grain, invert

## ASCII mode

- **17 character sets** including braille (packs a 2×4 dither grid into every
  glyph — highest detail per cell, still copyable as text), block shades,
  katakana, hex, geometric, cards, plus a custom ramp field
- The character ramp is itself dithered with whichever algorithm is selected, so
  you get texture instead of banding
- **A filterable font picker** — 34 monospace families, searchable and faceted by
  classification (system, typewriter, terminal, humanist, geometric) and by what
  actually works on your machine: whether the family is installed, and whether its
  block and braille glyphs hold the monospace grid
- Size, line height; flat, image-sampled, or palette-quantized ink; solid or
  transparent paper
- Ramp direction follows ink/paper contrast automatically

## Interface

- **Workbench** — a left control rail with Adjust / Presets / History tabs
- **Focus mode** — the rail detaches into a floating panel over a full-bleed
  canvas, with a dock at the bottom
- **⌘K command palette** — every algorithm, palette, ramp, font and action
- **Algorithm info card** — a live thumbnail rendered with the real algorithm,
  plus what each one is good and bad at
- **History** — parameter snapshots you can jump back to (in memory; no storage)

## Export

PNG at 1–8× scale, image to clipboard, `.txt` for ASCII output, and the live
text panel is selectable.

Settings copy in and out as JSON from the **Presets** tab — paste a look into a
notes file to keep it. Nothing is written to browser storage.

## Keyboard

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `d` | Dither mode |
| `a` | ASCII mode |
| `e` | Export dialog |
| `s` | Save PNG |
| `f` | Focus mode |
| `c` | Compare with source |
| `esc` | Close dialog / leave focus mode |
| `⌘V` / `Ctrl+V` | Paste image from clipboard |

## Development

See [`CLAUDE.md`](CLAUDE.md) for architecture and constraints,
[`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) for the visual system, and `docs/`
for detail on the algorithms, design decisions, and backlog.
