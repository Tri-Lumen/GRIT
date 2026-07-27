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
- Font, size, line height; flat, image-sampled, or palette-quantized ink;
  solid or transparent paper
- Ramp direction follows ink/paper contrast automatically

## Export

PNG at 1–8× scale, image to clipboard, `.txt` for ASCII output, and the live
text panel is selectable.

Settings copy in and out as JSON from the **Presets** section — paste a look
into a notes file to keep it.

## Keyboard

| Key | Action |
|---|---|
| `d` | Dither mode |
| `a` | ASCII mode |
| `s` | Save PNG |
| `⌘V` / `Ctrl+V` | Paste image from clipboard |

## Development

See [`CLAUDE.md`](CLAUDE.md) for architecture and constraints, and `docs/` for
detail on the algorithms, design decisions, and backlog.
