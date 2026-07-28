# GRIT

Browser-based image dithering and ASCII art. One HTML file, no dependencies, no
network, no install. Everything runs locally in the browser.

## Get it

Download **[`grit.html` from the latest release](../../releases/latest)** — that
one file is the whole application. You do not need the rest of this repository.

Save it anywhere and open it in a browser. It runs offline from `file://`.

## Use

Drag in an image, paste from the clipboard, or click **Load test card** to
generate one.

## Dither mode

- **12 error-diffusion algorithms** — Floyd–Steinberg, Jarvis–Judice–Ninke,
  Stucki, Atkinson, Burkes, three Sierras, Stevenson–Arce, and two degenerate
  smear kernels — with adjustable diffusion strength and serpentine scanning
- **14 ordered patterns** — Bayer 2/4/8/16, clustered dot, halftone, line and
  diagonal screens, interleaved gradient noise, true blue noise (void-and-cluster),
  white noise, plain threshold — with an adjustable pattern spread
- **Decoupled grid and cell size**, so you can dither at low resolution and
  export chunky at any scale with hard pixel edges
- **Palettes** — custom two-tone, N-level grayscale, Game Boy DMG and Pocket,
  CGA, C64, PICO-8, Sweetie 16, NES, amber and green CRT, newsprint, riso duo,
  Solarized, plus median-cut extraction from your own image
- Mono or colour quantization; brightness, contrast, gamma, saturation, grain, invert
- **Effects stack** applied before dithering — blur, sharpen, edge detect,
  posterize, bloom, scanlines

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

## Clips

Drop in a video and every frame runs the full pipeline.

- Transport with scrubbing, playback and a frame-rate control
- Export as an **animated GIF**, **WebM**, or a **PNG frame sequence in a ZIP**
- Progress and cancel on every encode

No dependencies were added for any of it — the GIF and ZIP encoders are written
into the file.

## Interface

- **Workbench** — a left control rail with Adjust / Presets / History tabs
- **Focus mode** — the rail detaches into a floating panel over a full-bleed
  canvas, with a dock at the bottom
- **⌘K command palette** — every algorithm, palette, ramp, font and action
- **Algorithm info card** — a live thumbnail rendered with the real algorithm,
  plus what each one is good and bad at
- **History** — parameter snapshots you can jump back to, with ⌘Z / ⇧⌘Z undo and
  redo (in memory; no storage)
- **Zoom** from 25% to 800%, or fit
- **Palette editor** — recolour any extracted swatch in place
- Drop a settings `.json` onto the window to apply it

## Export

**PNG** at 1–8× scale, **SVG** (horizontal runs merged into one path per colour —
for plotters and screen printing), **TXT**, and standalone **HTML**. Anything can
go to the clipboard instead of a file, and the live text panel is selectable.

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
| `r` | Randomize |
| `+` / `-` | Zoom |
| `space` | Play/pause a clip |
| `⌘Z` / `⇧⌘Z` | Undo / redo |
| `esc` | Close dialog / leave focus mode |
| `⌘V` / `Ctrl+V` | Paste image from clipboard |

## Development

See [`CLAUDE.md`](CLAUDE.md) for architecture and constraints,
[`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) for the visual system, and `docs/`
for detail on the algorithms, design decisions, and backlog.
