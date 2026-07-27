# Algorithms, palettes and charsets

Everything here is data-driven. Adding an entry to one of the three maps is
enough — the `<select>` elements are populated from them at load.

## Error diffusion — `ED`

```js
fs: {n:"Floyd–Steinberg", m:[[1,0,7],[-1,1,3],[0,1,5],[1,1,1]], d:16},
```

- `n` — label shown in the dropdown
- `m` — kernel as `[dx, dy, weight]`; `dx` is relative to the current pixel,
  `dy ≥ 0` (never diffuse upward), weights are integers
- `d` — divisor. For most kernels `d = Σ weights`. **Atkinson is the exception**:
  weights sum to 6 but `d: 8`, which is what throws away 25% of the error and
  gives it the blown-out classic Mac look. Don't "fix" it.

Currently implemented: Floyd–Steinberg, False Floyd–Steinberg, Jarvis–Judice–Ninke,
Stucki, Atkinson, Burkes, Sierra 3-row, Sierra 2-row, Sierra Lite,
Stevenson–Arce, Smear (all error right), Fall (all error down).

The last two are degenerate on purpose — they produce streaking artefacts that
are useful as an effect.

## Ordered — `ORD`

Two shapes are accepted:

```js
bayer8:  {n:"Bayer 8×8", m: normMat(bayer(8))},         // matrix of 0..1
ign:     {n:"Interleaved gradient", fn:(x,y)=> ...},    // function → 0..1
```

`bayer(n)` builds a recursive Bayer matrix for n = 2, 4, 8, 16. `normMat()`
converts raw integer matrices to the `(v + 0.5) / count` range so no threshold
ever lands exactly on 0 or 1.

Currently implemented: Bayer 2/4/8/16, clustered dot 4×4, halftone 8×8,
horizontal lines, vertical lines, 45° diagonal, checkerboard, interleaved
gradient noise, white noise, plain threshold.

**Not implemented: true blue noise.** Proper void-and-cluster generation is
expensive to do at load. Interleaved gradient noise is the cheap stand-in and
looks close for most images. If this gets built, generate a 64×64 tile once,
lazily, on first use of that mode.

### Adding an ordered pattern

```js
myPattern: {n:"My pattern", m: normMat([[0,2],[3,1]])},
```

That's the whole change. It appears in the dropdown, respects the spread slider,
and works in both dither and ASCII modes.

## Palettes — `PALETTES`

```js
gameboy: {n:"Game Boy DMG", c: hexes("0f380f 306230 8bac0f 9bbc0f")},
```

`hexes()` parses a whitespace-separated hex string into `[[r,g,b], ...]`.

Three entries are special-cased in `currentPalette()`:

- `duo` — `{duo:true}`, built from the two colour pickers plus the levels slider
  (interpolates a ramp between them)
- `gray` — `{ramp:true}`, N evenly spaced greys
- `custom` — `{extracted:true}`, filled by the median-cut button

Everything else is a literal colour list.

Currently: two-tone, grayscale, Game Boy DMG, Game Boy Pocket, CGA mode 4,
CGA 16, Commodore 64, PICO-8, Sweetie 16, NES-ish, amber CRT, green CRT,
newsprint, riso duo, Solarized, extracted.

Lospec palettes paste in directly as hex lists — that's the easiest way to add more.

## Charsets — `CHARSETS`

```js
classic: {n:"Classic ASCII", s:"@%#*+=-:. "},
braille: {n:"Braille (2×4 dots)", braille:true},
custom:  {n:"Custom ramp…", custom:true},
```

**Rules for `s`:**

1. Ordered **densest glyph first**, lightest last.
2. End with a space. Without it the lightest tone still prints ink.
3. Stick to BMP characters. The renderer indexes with `Array.from()` so
   surrogate pairs won't corrupt, but per-glyph colouring assumes one glyph per cell.
4. Glyph width should be roughly uniform in a monospace font, or the texture
   goes lumpy. Partial-width block characters (`▉▊▋`) are an intentional
   exception in the "Ledger marks" set.

Currently: classic, dense 70-step, block shades, block mix, braille, numeric,
binary, hexadecimal, symbols, geometric, dots & circles, cards & pips, katakana,
arrows, hairline, runic, ledger marks, custom.

Braille and custom are flags, not ramps — see `renderAscii()` for the branches.

## Where the values feed in

| Control | Reaches |
|---|---|
| Diffusion strength | `opts.strength`, multiplies the error before distribution. >100% over-diffuses and smears. |
| Pattern spread | `opts.spread`, scales the ordered threshold offset. 0 collapses to plain threshold; >1 exaggerates the pattern. |
| Threshold bias | `opts.bias`, added to every pixel pre-quantize in both branches. Pushes the whole image lighter/darker without touching brightness. |
| Serpentine | `opts.serp`, error diffusion only. Off produces directional worm artefacts. |
