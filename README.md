# GRIT

Browser-based image dithering, ASCII art and effects. One HTML file, no
dependencies, no network, no install. Everything runs locally in the browser.

## Get it

Download **[`grit.html` from the latest release](../../releases/latest)** — that
one file is the whole application. You do not need the rest of this repository.

Save it anywhere and open it in a browser. It runs offline from `file://`.

## Use

Drag in an image, paste from the clipboard, or click **Load test card** to
generate one.

## Dither mode

- **22 error-diffusion algorithms** — Floyd–Steinberg, Jarvis–Judice–Ninke,
  Stucki, Atkinson, Burkes, three Sierras, Stevenson–Arce, Fan, two Shiau–Fans,
  Pigeon, and five degenerate glitch kernels — with adjustable diffusion
  strength and serpentine scanning
- **Riemersma** — error diffusion along a Hilbert curve rather than in scan
  order, so there is no scan direction to leave an artefact: no worms, no
  streaks, no serpentine seam
- **30 ordered patterns** — Bayer 2–32, clustered dot 4/6/16, spiral,
  cross-hatch, mezzotint, magic square, line and diagonal screens, interleaved
  gradient noise, true blue noise (void-and-cluster) at three tile sizes, white
  noise, plain threshold, and six *modulation* fields (sine, rings, spiral
  sweep, plasma, weave, moiré) whose threshold is a function of position rather
  than a tile
- **An adjustable halftone screen** — dot shape (round, square, diamond,
  elliptical, line, cross), screen angle, ruling, black ink and mid-tone gain.
  Plus **CMYK separation**, which screens each channel at its own classic angle
  and multiplies the plates back together
- **Decoupled grid and cell size**, so you can dither at low resolution and
  export chunky at any scale with hard pixel edges — with named scale stops
  from Micro to Brutal
- **39 palettes** grouped by kind — hardware (Game Boy, CGA/EGA, C64, ZX
  Spectrum, MSX, Apple II, Teletext, PICO-8, NES, Virtual Boy, Nokia 3310,
  Macintosh 1-bit), screen, print (newsprint, riso, CMYK plates, duotones,
  cyanotype), photographic tone scales (sepia, selenium, platinum, warm and
  cool gray) — plus custom two-tone, N-level grayscale, and median-cut
  extraction from your own image
- **Colour depth** resamples *any* palette to 2–32 tonal stops. Undersample a
  16-colour palette for a deliberate mismatch; oversample and it interpolates
  between neighbouring stops for smoother gradients
- **Tonal mapping** dithers on luminance and maps the result onto the palette by
  luminance rank, so colour goes *into* the dither rather than around it — plus
  a tone curve (linear, gamma, S-curve, film) deciding where the stops land, and
  optional perceptual (Oklab) colour distance
- Mono or colour quantization; brightness, contrast, gamma, saturation, grain, invert
- **A reorderable effect stack** applied before dithering — blur, sharpen, edge
  detect, posterize, glow, chromatic aberration, JPEG glitch, waveform, pixel
  sort, slice shift, scanlines, vignette. Move any pass up or down; the random
  passes are seeded, so the preview holds still while you work

## ASCII mode

- **34 character sets** in seven categories — classic, blocks, braille (packs a
  2×4 dither grid into every glyph — highest detail per cell, still copyable as
  text), technical, geometric, language (katakana, runic, Greek, Cyrillic,
  hanzi), games — plus a custom ramp field
- **Character depth** narrows the ramp to its first N steps, and **character
  offset** slides the whole luminance-to-glyph mapping
- The character ramp is itself dithered with whichever algorithm is selected, so
  you get texture instead of banding
- **A filterable font picker** — 34 monospace families, searchable and faceted by
  classification (system, typewriter, terminal, humanist, geometric) and by what
  actually works on your machine: whether the family is installed, and whether its
  block and braille glyphs hold the monospace grid. Only IBM Plex Mono is embedded
  in the file — the rest are the fonts *you* already have, so the list is a survey
  of your machine, not a bundle. Families that resolve sort to the top and the
  count reads "N of 34 here"; the rest are labelled and fall back to a system mono
- Size, line height; flat, image-sampled, or palette-quantized ink; solid or
  transparent paper
- Ramp direction follows ink/paper contrast automatically
- Warns when the chosen font has no glyph for the chosen set — a substituted
  glyph is a different width and shears the grid

## Image mode

The same pipeline with the dithering taken off — tone and every effect pass
against a continuous-tone image, no palette and no glyphs.

- **All twelve effect passes**, in any order, with nothing quantized behind them
- **Working size** caps the long edge — source resolution, or 2048 / 1440 / 1080
  / 720 / 480px. It is a ceiling, not a target: a smaller image is left alone
  rather than blown up
- **Pixel size** divides the working size into blocks and prints them back
  nearest-neighbour, so it both pixelates and controls what the effects cost —
  every pass is per-pixel, so at 8 there are 64× fewer of them
- Exports as PNG, or as GIF / WebM / a PNG sequence from a clip. SVG and text
  aren't offered here — there is no grid of flat colours or glyphs to build them from

## Clips

Drop in a video and every frame runs the full pipeline.

- Transport with scrubbing, playback and a frame-rate control
- **Temporal variation** — nine ways to move the dither between frames (drift,
  roll, diagonal, spin, jitter, pulse, flicker, sweep, reseeded noise) so a
  static pattern does not sit in front of a moving picture like a screen door.
  Every mode is a pure function of the frame index, so an export matches what
  playback showed
- Export as an **animated GIF**, **WebM**, or a **PNG frame sequence in a ZIP**
- Progress and cancel on every encode

No dependencies were added for any of it — the GIF and ZIP encoders are written
into the file.

## Batch

Drop several images at once and export the lot as one ZIP with the current
settings applied to each. Sizes can differ — the grid is expressed in cells
relative to each source, not in pixels.

## Interface

- **Workbench** — a left control rail with Adjust / Presets / History tabs
- **Basic or All** — the panel shows the everyday controls by default and reveals
  the refinements on request. It only ever hides controls, never changes them, so
  both levels render exactly the same picture. Each block also only appears in the
  modes it applies to, so switching to Image puts the algorithm, dither and palette
  controls away
- **Focus mode** — the rail detaches into a floating panel over a full-bleed
  canvas, with a dock at the bottom
- **47 presets** grouped by use — print and repro, console and retro, screen,
  photographic, glitch, ASCII, image — each applied over the defaults, so the same look
  always gives the same picture. Save your own into a shareable pack
- **⌘K command palette** — 250-odd entries: every algorithm, palette, ramp,
  font, scale, export size and action
- **Randomize**, with locks to keep the palette, algorithm or scale where it is,
  and a separate shuffle that moves only the adjustment sliders
- **An algorithm picker that previews** — every one of the 52 rows carries a
  thumbnail rendered with the real algorithm against your image, filterable by
  name and by family, so you pick by eye rather than by name. Rows draw only as
  they scroll into view
- **Algorithm info card** — a larger live thumbnail of the selected or hovered
  algorithm, plus what each one is good and bad at
- **History** — parameter snapshots you can jump back to, with ⌘Z / ⇧⌘Z undo and
  redo (in memory; no storage)
- **Zoom** from 25% to 800%, or fit
- **Palette editor** — recolour any extracted swatch in place
- Drop a settings `.json` onto the window to apply it

## Export

**PNG**, **SVG** (horizontal runs merged into one path per colour — for plotters
and screen printing), **TXT**, and standalone **HTML**. Anything can go to the
clipboard instead of a file, and the live text panel is selectable.

Size the PNG three ways: a plain multiplier up to 16×, a target long edge, or one
of eight standard sizes (square/portrait/story, HD, 4K, A4, A3 and Letter at
300dpi). The multiplier is always a whole number — nearest-neighbour output at a
fractional scale gives cells of uneven width — so a target picks the largest
integer scale that fits *inside* it and tells you what actually came out.

Settings copy in and out as JSON from the **Presets** tab, and a *pack* carries
several named looks at once — paste one into a notes file to keep it. Nothing is
written to browser storage.

## Keyboard

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `d` | Dither mode |
| `a` | ASCII mode |
| `i` | Image mode |
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

Tests live in [`tools/`](tools/) — a zero-dependency node harness for the pixel
maths, and an opt-in Playwright smoke test that boots the real file and drives
every control. Neither is a dependency of the application.

See [`CLAUDE.md`](CLAUDE.md) for architecture and constraints,
[`docs/STYLE_GUIDE.md`](docs/STYLE_GUIDE.md) for the visual system, and `docs/`
for detail on the algorithms, design decisions, and backlog.
