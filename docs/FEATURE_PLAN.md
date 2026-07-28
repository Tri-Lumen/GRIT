# Feature plan — mirroring Dither Boy

Status: **all five phases shipped.** This document is kept as the record of what
was researched, what was decided, and why — the gap analysis and the reasoning
behind each design choice are still the useful part. Where the build diverged
from the plan it is noted inline below.

Two items in the plan were deliberately **not** built:

- **Ostromoukhov** (§0.1) — needs a published 256-row coefficient table that
  could not be verified from here. Inventing the numbers would be worse than the
  gap. Still the best available tone reproduction; worth adding from a real source.
- **Dot diffusion** (§0.1) — deferred as the plan recommended. Riemersma covers
  the "organic, no directional artefact" need more distinctively, and shipped.

Two things came out differently from the sketch:

- The **parametric halftone screen** (§2.1) landed in Phase 0 rather than Phase 2,
  because `ORD.screen` needs its `make()` closure to exist the moment the entry
  is in the table.
- The **fixed angled line screens** (§0.2) were dropped, as the plan itself
  recommended: the parametric screen with an angle control supersedes all of them.

What shipped: 52 algorithms, 39 palettes, 34 charsets, 41 presets, 12
reorderable effect passes, colour depth and tonal mapping, an adjustable
halftone screen with CMYK separation, temporal variation, batch export, preset
packs, three output size modes and cost-based render throttling.

Scope of this document:

1. What Dither Boy actually ships (researched, sourced below)
2. Gap table against GRIT as it stands
3. Feature proposals, phased, each with a real implementation sketch
4. New presets (the "several more looks" ask)
5. Scales — output scale, grid scale, and tonal scale
6. New palettes and charsets
7. Sequencing, size budget, and how to test each phase

## Sourcing caveat

`studioaaa.com` and most of the review sites return **403 to this environment**,
so none of the primary pages could be read directly — everything below comes
from search-result summaries of those pages plus third-party coverage. Feature
*names* are quoted where the sources quoted them; exact control ranges and UI
layout are inferred. Treat the Dither Boy column as "what it advertises," not
"what was measured." Anything marked ⚠ is an inference worth confirming against
a real copy before building to it.

Sources: [Dither Boy product page](https://studioaaa.com/product/dither-boy/),
[v2.0](https://studioaaa.com/dither-boy-v2-0-is-here/),
[v3.0 Glitch Art Update](https://studioaaa.com/dither-boy-v3-0/),
[v4.0 Retro Shaded Dithering](https://studioaaa.com/dither-boy-v4-0-5/),
[80.lv on 4.0](https://80.lv/articles/dither-boy-4-0-brings-full-color-dithering-to-over-50-effects),
[80.lv on 6.0](https://80.lv/articles/dither-boy-6-0-adds-animation-features-better-video-support),
[Digital Production on 6.0](https://digitalproduction.com/2026/03/18/dither-boy-6-0-brings-animation-and-video-polish/),
[Script Slayer](https://studioaaa.com/product/scriptslayer/).

---

## 1. What Dither Boy ships

**Core.** "63 unique dithering algorithms" spanning six advertised families:
*error diffusion, bitmap, halftone, modulation, pattern,* and *glitch*. v3.0
grew the effect library "from 20 to 53" and introduced the **Glitch Dither**
category; v6.0 is a full rewrite that keeps the 63.

**Colour (v4.0, the headline).** Colour is applied *inside* the dither, not
before or after it: the image is dithered on luminosity, then a palette is
mapped onto that tonal scale. A **depth slider** controls how many shades are
taken from the palette — "up to 32 depth iterations, regardless of the number of
colours." Deliberately mismatching depth against the palette size is a
documented look ("colour glitches within the dithering algorithm").

**Halftone (v6.0).** Customisable halftone with dedicated UI: **angle
control**, a **black-ink slider**, **mid-tone gain**, and **CMYK Halftone** with
per-channel screen angle / dot size / density.

**Post effects (v6.0).** "Fully stackable and reorderable" — named ones include
**Epsilon Glow, Chromatic Aberration, JPEG Glitch, Blur/Sharpen**. A
**waveform** glitch effect is mentioned separately.

**Animation (v6.0).** Animation timeline, live video playback and preview,
**Temporal Variation** — "one of nine controllable animated noise patterns"
applied to the input so a dither moves between frames.

**Workflow.** Batch dithering (same-size images), PNG sequence export, vector
export of black shapes for print/embroidery, presets that save/load/share,
downloadable preset packs, monthly free palette drops, full-screen mode,
randomise-effect-and-scale plus a slider shuffle, print-oriented export
settings.

**ASCII (Script Slayer, v6.1).** 48 character sets in 11 categories; live glyph
previews; adjustable **character depth** and cell size; **custom injection of up
to 10 characters**; **character offset** that shifts the luminance→glyph
mapping; palette-mapped or single-colour glyphs; transparent or custom
background; animatable depth and offset; true character-grid **TXT** export;
composes with all of Dither Boy's other effects.

---

## 2. Gap table

| Dither Boy | GRIT today | Gap |
|---|---|---|
| 63 algorithms, 6 families | 26 (12 ED + 14 ordered), 2 families | **Large** — biggest headline gap |
| Colour dithered on a tonal scale + depth slider | Nearest-RGB against palette; `levels` only for duo/gray | **Large** — changes how every palette looks |
| Parametric halftone (angle, ink, gain) | Two fixed matrices (`cluster4`, `halftone8`) | **Large** |
| CMYK halftone | none | **Large** |
| Reorderable effect stack | `effects()`, six passes, fixed order | **Medium** (architectural) |
| Chromatic aberration / JPEG glitch / glow / waveform | bloom + scanlines only | **Medium** |
| Temporal variation (9 noise patterns) | none | **Medium** |
| Batch dithering | none | **Medium** — ZIP writer already exists |
| Script Slayer: 48 charsets / 11 categories | 18 charsets, flat list | **Medium** |
| Character offset + character depth | none | **Small** |
| Custom glyph injection | full custom ramp (`#custom`) — arguably better | none |
| Presets, save/load/share | Presets tab + clipboard JSON | **Small** — needs more looks + packs |
| Preset packs | none | **Small** |
| Randomise effect and scale, shuffle sliders | `randomize()` — no scale, no locks | **Small** |
| Full screen | focus mode | none |
| Vector export | SVG with run merging | none |
| Video + GIF/WebM/PNG-sequence | all present | none |
| Palette extraction / editing | median cut + in-place swatch edit | none |
| Live playback | present | none |
| Undo history, command palette, compare | present — **GRIT is ahead here** | — |

Two things GRIT has that Dither Boy does not advertise: a full command palette
(`⌘K`) and a parameter-snapshot history. Keep them; they're the reason the tool
feels quicker than a $60 desktop app.

---

## 3. Feature proposals

Ordered by phase. Each entry states the new control ids, where the code goes
(banner anchors, not line numbers), and what has to be added to `CFG_IDS` and
`updateVisibility()` — the two things that are always forgotten.

### Phase 0 — pure data (no architecture change)

Everything here is a literal added to an existing map. No new render paths, no
new controls, no risk to the pipeline. This alone takes the algorithm count from
26 to ~60 and roughly doubles palettes, charsets and presets.

#### 0.1 More error-diffusion kernels → `ED`

Straight data rows in the existing `[dx, dy, weight]` / divisor form:

| Key | Name | Kernel | Note |
|---|---|---|---|
| `fan` | Fan | `[1,0,7][-2,1,1][-1,1,3][0,1,5]` /16 | tighter FS, less worming |
| `shiaufan1` | Shiau–Fan | `[1,0,4][-2,1,1][-1,1,1][0,1,2]` /8 | designed against FS worms |
| `shiaufan2` | Shiau–Fan 2 | `[1,0,8][-3,1,1][-2,1,1][-1,1,2][0,1,4]` /16 | wider variant |
| `atkinson75` | Atkinson (full error) | Atkinson taps, `d:6` | the "what if it didn't lose ¼" version |
| `burkeslite` | Burkes Lite | `[1,0,4][-1,1,2][0,1,2]` /8 | cheap |
| `stevensonlite` | Stevenson Lite | first 6 Stevenson taps, `d:118` | |
| `pigeon` | Pigeon | `[1,0,2][2,0,1][-1,1,2][0,1,2][1,1,2][-2,2,1][0,2,1][2,2,1]` /14 | |
| `diag` | Diagonal drift | `[1,0,1][1,1,1]` /2 | glitch family |
| `updown` | Vertical smear (up) | `[0,1,3][0,2,1]` /4 | glitch family |
| `split` | Split (left+right) | `[1,0,1][-1,1,1]` /2 | glitch family |

Two kernels that need a *different* code path — worth doing, flag the cost:

- **Ostromoukhov** — coefficients vary per input level, needs a 256-row table
  and a `variable:true` branch in `ditherPixels()`. ~40 lines of table. Best
  tone reproduction of anything in the list; a genuine quality win, not a look.
- **Riemersma** — error diffusion along a **Hilbert curve** rather than in scan
  order. Completely different traversal (no serpentine, no `dx/dy` kernel;
  instead a decaying error queue of length ~16). Produces organic grain with
  *no* directional artefact at all. This is the single most distinctive
  algorithm missing, and the one Dither Boy's "modulation"/organic looks can't
  match. ~60 lines. **Recommended.**
- **Dot diffusion (Knuth)** — class-matrix ordering, a third family alongside
  ED and ordered. Gives the "bitmap" character Dither Boy advertises. ~50 lines
  plus an 8×8 class matrix. Optional; Riemersma is the better first pick.

#### 0.2 More ordered matrices and threshold functions → `ORD`

Matrices are data. Anything expressible as `fn(x,y)` is three lines — the
existing `ign` / `white` entries already prove the hook.

*Pattern:* clustered dot 6×6 and 16×16, spiral 8×8, magic square 3×3,
cross-hatch 8×8, mezzotint (rank-shuffled cluster), Bayer 32×32, void-and-cluster
tiles at 16 and 32 (`blueNoiseTile(16)`, `(32)` — the generator is already
parametric, only the getter is hard-coded to 64).

*Line screens:* 15°, 30°, 60°, 75° — but see 2.1; a parametric line screen with
an angle slider supersedes all of these and should land instead if Phase 2 is
close.

*Modulation* — this is Dither Boy's fifth family and it is nearly free here,
because `ORD[k].fn(x,y)` already exists:

```js
sine:   {n:"Sine wave",   fn:(x,y)=>0.5+0.5*Math.sin(x*0.35+Math.sin(y*0.12)*3)},
rings:  {n:"Concentric",  fn:(x,y)=>{const d=Math.hypot(x-160,y-120); return (d*0.35)%1;}},
spiral: {n:"Spiral",      fn:(x,y)=>{const a=Math.atan2(y-120,x-160), d=Math.hypot(x-160,y-120); return ((a*3+d*0.25)/(Math.PI*2))%1;}},
plasma: {n:"Plasma",      fn:(x,y)=>0.5+0.25*(Math.sin(x*0.2)+Math.sin(y*0.17))},
weave:  {n:"Weave",       fn:(x,y)=>((x>>2)+(y>>2))%2 ? (x%8)/8 : (y%8)/8},
```

⚠ The radial ones hard-code a centre. They should read grid dimensions instead —
`ditherPixels()` already has `w, h` in scope, so `fn` should be called as
`fn(x, y, w, h)`. That is a one-word signature change plus updating `ign`/`white`
to ignore the extra args. Do it in the same commit as the first radial entry.

#### 0.3 `ALGO_INFO` copy for every new key

Non-optional — `renderAlgoCard()` reads it, and a missing entry blanks the card.
Same shape: `{b, p, c, f}`. These join the 22 already flagged as pending design
review in `STYLE_GUIDE.md`; write them, mark them, don't pretend they're
Design's.

#### 0.4 New palettes, charsets, presets

See §4, §5, §6.

**Phase 0 total:** ~34 new algorithms, ~24 palettes, ~16 charsets, ~22 presets.
No new controls, no `CFG_IDS` change, no `updateVisibility()` change. Roughly
+18KB of `index.html`.

---

### Phase 1 — colour depth and tonal mapping

The v4.0 headline, and the change that makes every existing palette look
different (better) without adding a single algorithm.

#### 1.1 Depth slider

New control `#depth`, range 2–32, default 0 = "off / use palette as-is".
`currentPalette()` gains a final resampling step that applies to **all** palette
kinds, not just `duo` and `ramp`:

```js
function applyDepth(pal){
  const D = Math.round(num('depth'));
  if(!D || D === pal.length) return pal;
  // rank the palette by luminance, then resample that ordering to D stops
  const sorted = pal.slice().sort((a,b)=>lum(a)-lum(b));
  const out = [];
  for(let i=0;i<D;i++) out.push(sorted[Math.round(i*(sorted.length-1)/(D-1))]);
  return out;
}
```

Undersampling a 16-colour palette to 4 stops is exactly the "intentional
mismatch" glitch Dither Boy sells. Oversampling (D > palette length) should
*interpolate* between adjacent luminance-sorted stops rather than repeat —
that's the "smoother gradients and richer tonality" claim.

- `CFG_IDS` += `depth`
- `updateVisibility()`: always visible in the Palette block; the existing
  `#wrap-levels` (duo/ramp only) stays as-is and `depth` composes on top of it.

#### 1.2 Palette mapping mode

New control `#palmap`, a select: `rgb` (current behaviour, default) /
`luma` (Dither Boy's model).

In `luma` mode `ditherPixels()` dithers against a synthetic N-level grayscale
ramp — **exactly what ASCII mode already does** — and then maps the resulting
level index onto the palette by tonal rank. That means the code already exists;
it needs lifting out of `renderAscii()` into a shared helper so both callers use
it. Consequence worth stating up front: in `luma` mode the palette's *hues* stop
influencing which colour a pixel lands on, only its ordering does. That is the
point, and it's why Dither Boy's colour output has the retro character it does.

- `CFG_IDS` += `palmap`
- `updateVisibility()`: hide `#wrap-palmap` when the palette is `gray` (no-op there).

#### 1.3 Perceptual distance (optional, quality)

`nearest()` currently uses luma-weighted squared RGB. An Oklab option behind a
`#dist` select (`fast` / `perceptual`) would visibly improve 16-colour palettes.
`DECISIONS.md` explicitly parked this as "revisit only if palette output starts
looking wrong" — depth mapping makes palette output far more prominent, so this
is the moment to revisit. Cost: an sRGB→Oklab conversion per palette entry
(cached once per render) plus per-pixel conversion — measurable. Gate it behind
the select and default to `fast`.

#### 1.4 Grid-scale presets, randomiser, locks

- **Scale chips** — see §5.1.
- `randomize()` gains scale (see §5.1) and **lock chips**: `#lockpal`,
  `#lockalgo`, `#lockscale` toggles that the randomiser respects. Dither Boy's
  "shuffle sliders" becomes a second command, `Shuffle adjustments`, that moves
  only `bright/contrast/gamma/sat/noise/bias` and leaves structure alone. Both
  go in `buildCommands()`.
- `CFG_IDS` += the three lock ids (they should survive a preset round-trip).

---

### Phase 2 — halftone

#### 2.1 Parametric halftone screen

Replaces `cluster4` / `halftone8` / the four fixed line screens with one
generator plus controls. New algorithm key `ord:screen`, with:

| Control | id | Range | Notes |
|---|---|---|---|
| Dot shape | `htshape` | round / square / diamond / ellipse / line / cross | |
| Screen angle | `htangle` | 0–90° | classic values 15/45/75 |
| Frequency | `htfreq` | 2–32 cells | screen ruling in grid cells |
| Black ink | `htink` | 0–200% | scales dot area — DB's "black ink slider" |
| Mid-tone gain | `htgain` | -100–100 | an S-curve on the threshold, i.e. dot gain |

Implementation: `ORD.screen` gets an `fn(x,y,w,h)` that rotates `(x,y)` by
`htangle`, tiles at `htfreq`, and evaluates a shape function to a 0–1 threshold.
Because it is a `fn` entry, it drops into the existing ordered path with no
change to `ditherPixels()` beyond the signature widening from 0.2.

The one wrinkle: `fn` entries currently take no parameters, so the halftone
`fn` has to read `num('htangle')` etc. per pixel — unacceptable. Build a
**closure per render** instead: `ORD.screen.make()` returns a specialised `fn`
with the parameters baked in, and `ditherPixels()` calls `O.make ? O.make() : O.fn`
once before the loop. Clean, and it opens the same door for any future
parametric pattern.

- `CFG_IDS` += all five ids
- `updateVisibility()`: one `#blk-halftone` block, shown only when
  `v('algo') === 'ord:screen'`

#### 2.2 CMYK halftone

A separate render path in `renderDither()`, gated on a `#cmyk` toggle (or a
palette key `cmyk`). Converts the grid to CMYK, screens each channel with its
own angle (C 15°, M 75°, Y 0°, K 45° — exposed as four number inputs), then
composites multiply-style back to RGB. Per-channel dot size and density sliders
mirror Dither Boy.

This is the largest single visual feature in the plan and the one most likely to
be wanted for print work. It is also self-contained — it does not touch
`ditherPixels()`. ~120 lines. ⚠ Colour separation accuracy is not the goal here;
the look is. A naive `K = 1 - max(r,g,b)` separation with a UCR slider is right
for this tool.

---

### Phase 3 — the effect stack

The architectural item. `ROADMAP.md` already names it: "a reorderable list is
still the architectural change this list implies."

#### 3.1 Reorderable passes

Turn `effects()` from a fixed sequence into a list walk:

```js
const FX = {
  blur:   {n:"Blur",       ctrl:'fxblur',  run:(d,w,h,v)=>{...}},
  sharp:  {n:"Sharpen",    ctrl:'fxsharp', run:...},
  edge:   {n:"Edge",       ctrl:'fxedge',  run:...},
  post:   {n:"Posterize",  ctrl:'fxpost',  run:...},
  bloom:  {n:"Glow",       ctrl:'fxbloom', run:...},
  scan:   {n:"Scanlines",  ctrl:'fxscan',  run:...},
  // new, phase 3.2
  chroma: {n:"Chromatic aberration", ctrl:'fxchroma', run:...},
  jpeg:   {n:"JPEG glitch",          ctrl:'fxjpeg',   run:...},
  wave:   {n:"Waveform",             ctrl:'fxwave',   run:...},
  sort:   {n:"Pixel sort",           ctrl:'fxsort',   run:...},
  slice:  {n:"Slice shift",          ctrl:'fxslice',  run:...},
  vig:    {n:"Vignette",             ctrl:'fxvig',    run:...},
};
function effects(d,w,h){
  for(const k of fxOrder()) { const amt = num(FX[k].ctrl); if(amt) FX[k].run(d,w,h,amt); }
}
```

**Order and the DOM-is-state rule.** Order is a property of the list, not of any
one control, so it needs somewhere to live that `readCfg()` can see. Use a
hidden `<input id="fxorder">` holding a comma-joined key list; the UI reorders
`.fxrow` elements and writes the new order into it. `fxOrder()` reads and
validates it against `FX`, appending any key the string is missing (so old
presets and new passes both survive). Add `fxorder` to `CFG_IDS`. This keeps
one source of truth and costs no state layer.

Each row is a `.blk`-kit row: drag handle (or ▲▼ buttons — simpler, works on
touch, no drag library, and this repo takes no dependencies), name, amount
slider, enable toggle. Enable is just "amount = 0", so no extra id per pass.

#### 3.2 New passes

- **Chromatic aberration** — offset R and B channels radially by `fxchroma` px.
  ~15 lines.
- **JPEG glitch** — quantise 8×8 blocks in a crude DCT, or (cheaper and more
  convincing at grid resolution) block-average + ringing on block edges.
- **Waveform** — per-row horizontal displacement by a sine of `y`; the amplitude
  and frequency are the controls. This is the effect DB has a whole tutorial on.
- **Pixel sort** — sort runs of pixels within a luminance threshold band along
  rows. The classic glitch primitive, and genuinely absent from the tool.
- **Slice shift** — random horizontal band offsets, seeded so it's stable across
  renders (`Math.random()` per render would make the preview flicker on every
  keystroke — use a seeded PRNG keyed on a `#fxseed` value).
- **Vignette / halation** — cheap, and useful for photo looks.
- **Epsilon Glow** — DB's name for what `fxbloom` already does. Not worth
  duplicating; rename is not worth breaking `CFG_IDS` over.

⚠ Seeded randomness matters for *all* of these. `adjust()`'s existing `grain`
uses raw `Math.random()`, which means the grain reshuffles on every render. That
is already mildly wrong and becomes obviously wrong once glitch passes stack.
Add a shared seeded PRNG in the same phase and switch grain onto it.

- `CFG_IDS` += `fxorder`, `fxchroma`, `fxjpeg`, `fxwave`, `fxsort`, `fxslice`,
  `fxvig`, `fxseed`

---

### Phase 4 — motion and batch

#### 4.1 Temporal variation

DB's "nine controllable animated noise patterns." GRIT's version: a `#tvar`
select (off / white / blue-shift / rolling bayer / scanline drift / wave / grain
pulse / threshold jitter / hue cycle / phase spin) plus `#tvamt`, applied as a
per-frame offset into the threshold field.

Mechanically this is a `frame` value threaded into `ditherPixels()`'s `opts` and
consumed by the ordered path (offset the matrix lookup by `frame`) and by the
grain pass (advance the PRNG seed by `frame`). The clip exporter already walks
frames in `eachFrame()`, so the plumbing point is single.

Stills get it too: with a clip loaded it animates; without one, `tvamt` just
shifts the pattern phase, which is a useful control on its own.

- `CFG_IDS` += `tvar`, `tvamt`

#### 4.2 Batch export

Drop N images → apply the current config to each → one ZIP. `zipStore()` and
`crc32()` already exist for the PNG-sequence exporter, and the render path is
already parameterised on `img`, so this is mostly a loop plus reusing the
existing progress bar and cancel token from clip export.

Dither Boy restricts batch to same-size images; GRIT has no reason to — `cols`
is relative to the source aspect, so mixed sizes work. Say so in the UI.

New format button `Batch` in the export dialog, visible when >1 file was
dropped. ~70 lines.

#### 4.3 Preset packs

Presets already serialise through the clipboard as `CFG_IDS` JSON. A *pack* is
`{name, looks:[{n, d, cfg, cm, mode}, ...]}`. Two commands — `Copy preset pack`
and `Paste preset pack` — plus an in-memory `userLooks` array rendered under the
built-in list in the Presets tab. No storage constraint is violated: packs live
in the clipboard or a text file, same as single presets do today.

---

### Phase 5 — performance

Not a feature, but Phases 0–4 make it load-bearing. `ROADMAP.md` already lists
the Web Worker; the case gets stronger with 60 algorithms, a stack of glitch
passes, and per-frame temporal variation.

Order of attack, cheapest first:

1. **Throttle by cost, not by frame.** `schedule()` is rAF-debounced but does
   not skip. Measure the last render; if it exceeded ~40ms, coalesce input for
   the next 100ms and render once. Two lines, fixes most of the felt lag.
2. **Preview at reduced grid while dragging**, full grid on `change`. The
   pipeline is already resolution-independent, so this is a `cols` override.
3. **Worker** with transferable `ImageData` and a cancellation token, as
   already specified in the roadmap.

Text panel virtualization (also on the roadmap) becomes more urgent once the
charset count doubles and braille output stays common.

---

## 4. Presets

Current: six looks (`xerox`, `newsprint`, `gameboy`, `crt`, `terminal`,
`braille`). Proposed: **28 total**, grouped into sections in the Presets tab.
`LOOKS` gains a `g` (group) field and `renderPresets()` inserts a `.sec` header
when the group changes — the block kit already has that header style.

Configs below are written against **today's** control ids so they work before
any other phase lands; ones needing a later phase are marked.

### Print & repro

| Key | Name | Description | Config |
|---|---|---|---|
| `newsprint` | Newsprint | *(existing)* | — |
| `newsfine` | Newsprint fine | tight screen | `palette:paper, algo:ord:halftone8, cols:340, cell:2, contrast:12, spread:1.05` |
| `riso` | Riso duo | blue & amber | `palette:riso, algo:ord:cluster4, cols:200, cell:3, contrast:22, sat:120` |
| `xerox` | Xerox | *(existing)* | — |
| `thermal` | Thermal receipt | 384-col paper roll | `palette:duo, c0:#1a1a1a, c1:#f6f4ec, algo:ed:atkinson, cols:384, cell:1, contrast:45, bright:6` |
| `fax` | Fax | 1-bit, over-contrasted | `palette:duo, c0:#111, c1:#fff, algo:ord:bayer2, cols:220, cell:2, contrast:65, gamma:0.9` |
| `etching` | Etching | 45° hatch | `palette:duo, c0:#17150f, c1:#efe7d3, algo:ord:diag, cols:320, cell:2, contrast:35` |
| `silkscreen` | Silkscreen | fat clustered dots | `palette:duo, algo:ord:cluster4, cols:120, cell:6, contrast:30` |
| `blueprint` | Blueprint | white on cyanotype | `palette:duo, c0:#0b2545, c1:#e8eef6, algo:ord:bayer8, cols:260, cell:2, invert:true` |
| `cmyk` | CMYK plates | four-colour screen | **Phase 2.2** |

### Console & retro

| Key | Name | Description | Config |
|---|---|---|---|
| `gameboy` | Game Boy | *(existing)* | — |
| `gbpocket` | Game Boy Pocket | colder four greens | `palette:gbpocket, algo:ord:bayer4, cols:160, cell:4, sat:0` |
| `c64` | Commodore 64 | 16 colours, chunky | `palette:c64, algo:ed:fs, cols:160, cell:4, sat:115` |
| `pico8` | PICO-8 | sprite palette | `palette:pico8, algo:ed:burkes, cols:128, cell:5, contrast:15` |
| `nes` | NES | console-ish | `palette:nes, algo:ed:stucki, cols:170, cell:4` |
| `cga` | CGA mode 4 | cyan / magenta | `palette:cga, algo:ed:fs, cols:180, cell:3, sat:140, contrast:20` |
| `spectrum` | ZX Spectrum | attribute clash | `palette:spectrum, algo:ord:bayer4, cols:128, cell:5, sat:130` **(new palette)** |
| `mac1bit` | Macintosh | 512×342, 1-bit | `palette:duo, c0:#000, c1:#fff, algo:ed:atkinson, cols:256, cell:2, contrast:25` |
| `sweetie` | Sweetie pop | modern 16 | `palette:sweetie, algo:ord:bayer4, cols:180, cell:4, sat:120` |

### Screen & CRT

| Key | Name | Description | Config |
|---|---|---|---|
| `crt` | CRT green | *(existing)* | — |
| `amber` | Amber CRT | monitor phosphor | `palette:amber, algo:ord:hline, cols:240, cell:3, contrast:28, gamma:0.85, fxbloom:35` |
| `vhs` | VHS | soft, bloomed, torn | `palette:custom→extracted, algo:ed:sierra2, cols:200, cell:3, fxblur:1, fxbloom:45, fxscan:35` |
| `vapor` | Vaporwave | pink & teal | `palette:vapor, algo:ord:bayer8, cols:200, cell:3, sat:150` **(new palette)** |

### Photographic

| Key | Name | Description | Config |
|---|---|---|---|
| `filmgrain` | Film grain | 8-step blue noise | `palette:gray, levels:8, algo:ord:blue, cols:420, cell:1, noise:10, contrast:12` |
| `platinum` | Platinum print | warm 16-step | `palette:gray, levels:16, algo:ord:blue, cols:400, cell:1, gamma:1.15` + a warm duo when depth lands |
| `mezzo` | Mezzotint | organic clumps | `palette:duo, algo:ord:mezzo, cols:300, cell:2, contrast:20` **(Phase 0.2)** |
| `hilbert` | Hilbert grain | no directional artefact | `algo:ed:riemersma, palette:gray, levels:4, cols:360, cell:1` **(Phase 0.1)** |

### Glitch

| Key | Name | Description | Config |
|---|---|---|---|
| `smear` | Smear | horizontal bleed | `algo:ed:smear, cols:240, cell:3, contrast:30` |
| `rain` | Rain | vertical bleed | `algo:ed:fall, cols:240, cell:3, contrast:25` |
| `wave` | Waveform | modulated threshold | `algo:ord:sine, cols:260, cell:3` **(Phase 0.2)** |
| `datablock` | Datablock | JPEG + chroma tear | **Phase 3.2** |

### ASCII

| Key | Name | Description | Config |
|---|---|---|---|
| `terminal` | Terminal | *(existing)* | — |
| `braille` | Braille micro | *(existing)* | — |
| `matrix` | Matrix rain | katakana, green ink | `charset:katakana, acols:150, algo:ord:bayer4, afg:#39ff6a, abg:#04120a, fsize:11, lh:0.95` |
| `typewriter` | Typewriter | Courier on paper | `charset:classic, acols:110, algo:ed:atkinson, font:"Courier New", afg:#20201c, abg:#f3efe3, fsize:13, lh:1.05` |
| `shaded` | Block shaded | ▓▒░ | `charset:blocks, acols:120, algo:ed:fs, fsize:12, lh:1` |
| `ledger` | Ledger bars | eighth blocks | `charset:ledger, acols:160, algo:ord:bayer8, fsize:11, lh:1` |
| `runic` | Runic | carved | `charset:runes, acols:100, algo:ed:atkinson, afg:#d8c9a3, abg:#141210` |
| `numeric` | Numeric | printout | `charset:numeric, acols:140, algo:ord:bayer4, afg:#c9d1c9, abg:#101410` |

**Note on `LOOKS` and forward compatibility.** Preset configs are sparse partial
configs applied over whatever is currently set, which means a preset written
today will behave differently once `depth`, `palmap` or `fxorder` exist and
carry a stale value from the previous look. Presets should therefore be widened
to reset the fields they care about, or — cleaner — `applyLook()` should start
from `DEFAULTS` and layer the look on top. **Recommend the latter**, and it is a
four-line change worth making *before* adding 22 presets rather than after.

---

## 5. Scales

"Scales" covers three distinct axes in this tool. All three are worth work.

### 5.1 Grid scale (detail)

`cols` (16–900) and `cell` (1–24) are the two most-used controls and there is no
fast way to move between the useful combinations. Add a **Scale chip row** at the
top of the Dither block — the same `.chips` kit used by `#palquick` and
`#scalequick`:

| Chip | cols | cell | Reads as |
|---|---|---|---|
| Micro | 480 | 1 | near-continuous, photographic |
| Fine | 320 | 2 | detail preserved |
| Normal | 200 | 3 | the default look |
| Chunky | 128 | 5 | sprite-scale |
| Blocky | 80 | 8 | poster / logo |
| Brutal | 48 | 14 | 1-bit iconography |

Chips set both sliders and call `schedule()`. `updateVisibility()` marks the
active chip by matching both values, the same way `#scalequick` and `#ncolquick`
already do. In ASCII mode the row drives `acols` instead (10–400) with its own
six stops — `updateVisibility()` already swaps the section label between
"Dither" and "Ramp dither," so it swaps the chip set the same way.

Extend `randomize()` to pick a scale chip when `#lockscale` is off — Dither Boy's
"randomize your dither effect and scale."

Also raise the ceilings: `cols` to 1200 and `cell` to 48. Both are already
clamped safely by the 8192px walk-down in `renderDither()`, so the only cost is
render time — which Phase 5.1's cost-based throttle covers.

### 5.2 Output scale (export size)

`#oscale` is 1–8× with 1/2/4/8 chips. Extend to:

- **Range 1–16×**, chips `1 2 4 8 16`.
- **Target size mode.** A `#sizemode` select: `multiplier` (current) /
  `longedge` / `preset`. In `longedge`, a `#targetpx` number input sets the long
  edge and the multiplier is derived and rounded *down to an integer* — never
  fractional, or nearest-neighbour output gets uneven cell widths. Show the
  resulting integer scale and the rounding in the existing `#expdims` summary.
- **Size presets** for the `preset` mode:

  | Preset | Pixels | For |
  |---|---|---|
  | Square 1080 | 1080×1080 | social |
  | Portrait 1350 | 1080×1350 | social |
  | Story 1920 | 1080×1920 | social |
  | HD | 1920×1080 | screen |
  | 4K | 3840×2160 | screen |
  | A4 @300dpi | 2480×3508 | print |
  | A3 @300dpi | 3508×4961 | print |
  | Letter @300dpi | 2550×3300 | print |

  These pick the largest integer multiplier that fits inside the target and
  report the actual output — honest, and it keeps the nearest-neighbour
  guarantee from `CLAUDE.md` intact. ⚠ Do **not** letterbox or resample to hit
  the target exactly; that would violate constraint 5.

- **DPI note in the summary.** For the print presets, show `2480×3508 · A4 at
  300dpi` so the number means something. No metadata is written into the PNG —
  that would need a custom pHYs chunk, which is possible with the existing
  encoder work but is not worth it in this phase.

`CFG_IDS` += `sizemode`, `targetpx`, `sizepreset`.

### 5.3 Tonal scale (levels / depth)

`levels` (2–16) applies only to `duo` and `gray`. Phase 1.1's `depth` (2–32)
generalises it to every palette. On top of that, a **ramp curve** select
`#rampcurve`: `linear` / `gamma` / `s-curve` / `film`, applied when generating
the `gray` and `duo` ramps and when resampling for depth. Four stops on a
gradient behave very differently from four stops spaced perceptually, and this
is the control that makes 4-level output look intentional rather than crushed.

`CFG_IDS` += `rampcurve`.

---

## 6. Palettes and charsets

### 6.1 Palettes — 24 proposed additions

Pure data into `PALETTES`; every one is a hex list through the existing `hexes()`
helper. Grouped for an `optgroup` in `#palette` (the select is getting long
enough to need one).

*Hardware:* ZX Spectrum, Apple II (hi-res), MSX1, EGA 16, Windows 16, Teletext 8,
Atari 2600-ish, Virtual Boy (4 reds), Nokia 3310 (2 greens), Macintosh 1-bit,
Obra Dinn (1-bit, blue-white).

*Print & photographic:* CMYK plates, Riso fluorescent (pink/blue/yellow/green),
duotone blue-orange, duotone pink-teal, sepia 6, selenium 6, cyanotype 5,
warm gray 8, cool gray 8.

*Looks:* Vaporwave, Cyberpunk neon, Rust & ash, Ice.

Constraint check: these are ~1.5KB of text total. No network, no build step —
palettes stay literals in the file, as `ROADMAP.md` already assumed ("Lospec hex
lists paste straight into `PALETTES`").

⚠ Attribution: several community palettes (Sweetie 16 already in the file, plus
any Lospec-sourced additions) have named authors. Add a short credits comment
above the `PALETTES` block naming sources. That is a one-line-per-palette cost
and the right thing to do before shipping two dozen more.

### 6.2 Charsets — 16 proposed additions, plus categories

Current 18 → 34, and Script Slayer's 11 categories become an `optgroup` grouping
plus a `c` field on each `CHARSETS` entry:

*Classic:* existing classic / dense / symbols; add **Minimal** `#+-. `,
**Contrast** `@. `, **Typewriter** `WM#*+=-. `.

*Blocks:* existing blocks / half / ledger; add **Quadrants** `█▛▜▙▟▖▗▘▝ `,
**Shade fine** `█▓▒░⠿⠶⠆ `, **Box drawing** `╬╫╪┼┽┾╁╀│─ `.

*Language:* existing katakana / runes; add **Greek** `ΩΨΦΞΠΣΘΔΛΓ `,
**Cyrillic** `ЖШЩФБДЦЛГ `, **Hanzi density** `豳鸞麤龗鑿龍鳥丶一 `.

*Games & symbols:* existing cards / circles / geometric / arrows; add
**Chess** `♛♜♝♞♟♙♘♗♖♕ `, **Dice** `⚅⚄⚃⚂⚁⚀ `, **Dominoes**, **Mahjong**,
**Stars** `✦✧★☆✩✫· `, **Music** `♬♫♪♩· `.

*Technical:* existing numeric / binary / hex / thin; add **Seven-segment**
`8069453217 `, **Tally** `𝍫𝍪𝍩𝍨𝍧 `, **Currency** `₩₦₮฿₹€¥$¢. `.

⚠ Every one of these has to be checked against the **latin-only embedded fonts**
warning in `CLAUDE.md` and `STYLE_GUIDE.md`. Chess, dice, dominoes, mahjong and
tally will fall back per-glyph in the embedded faces and shear the ASCII grid.
Two required guards: mark those sets with a `needs:'unicode'` flag, and have the
existing font-picker `gridSafe()` measurement surface a warning when the active
font can't render the active charset at a uniform advance. The font picker
already measures for `blocks` and `braille` facets — this is the same mechanism,
widened. **Do not ship the exotic sets without that guard.**

Script Slayer's remaining two ASCII controls are cheap and should land with the
charsets:

- **Character offset** `#choff` (−1…+1, default 0) — shifts the luminance→glyph
  index mapping. One term added in `renderAscii()`'s level lookup.
- **Character depth** `#cdepth` (2…charset length, default = full) — uses only
  the first N glyphs of the ramp. Because ASCII mode dithers against an N-level
  ramp where N is the charset length, this is literally changing that N, so it
  is a one-line change with a large visual effect.

`CFG_IDS` += `choff`, `cdepth`.

---

## 7. Sequencing, budget, testing

### Suggested order

| Phase | Content | Effort | Risk | Ships something visible |
|---|---|---|---|---|
| 0 | Algorithms, palettes, charsets, presets as data | 2–3 sessions | very low | yes — headline count triples |
| 1 | Depth, palette mapping, scale chips, randomiser locks | 2 sessions | low | yes — every palette looks better |
| 2 | Parametric halftone, then CMYK | 2–3 sessions | medium | yes |
| 3 | Effect stack reorder + glitch passes | 3 sessions | **medium-high** (architectural) | yes |
| 4 | Temporal variation, batch, preset packs | 2 sessions | medium | yes |
| 5 | Throttle, drag-preview, worker | 2 sessions | medium | felt, not seen |

Phases 0–2 are independent of each other and of 3–5. Phase 3 should not start
until 0–1 have settled, because the `FX` table wants to be written once against
a stable control set.

Two changes are worth doing **first**, out of phase order, because they get more
expensive with every item added on top:

1. `applyLook()` layering over `DEFAULTS` (§4 note) — before 22 presets land.
2. Widening `ORD` `fn` to `(x,y,w,h)` and adding the `make()` closure hook
   (§0.2, §2.1) — before the modulation entries land.

### Size budget

`index.html` is 220KB today, ~88KB of which is embedded woff2. The plan adds
roughly: Phase 0 ~18KB, Phase 1 ~4KB, Phase 2 ~8KB, Phase 3 ~14KB, Phase 4 ~10KB.
Landing everything puts the file near **275KB**, still one file, still no build
step, still openable from `file://`. Constraint 1 holds comfortably; there is no
point at which a bundler becomes necessary. If it ever passes ~400KB, the split
named in `DECISIONS.md` (`index.html` / `grit.css` / `grit.js`, still no bundler)
is the move — not a framework.

### Testing each phase

Per `CLAUDE.md`, use the node harness in `docs/ARCHITECTURE.md`:

- **Every new ED kernel:** a ≥64-cell horizontal luminance ramp, binned into 8
  columns, must dither to monotonically increasing dot density; every output
  pixel must land exactly on a palette entry. Both properties are cheap to
  assert and catch a mistyped weight or divisor immediately.
- **Every new ordered matrix:** `normMat` output must span (0,1) exclusive and
  contain no duplicates, or the matrix has a transcription error.
- **Riemersma / Ostromoukhov / dot diffusion:** same ramp test, plus a check that
  total ink (mean output luminance) tracks total input luminance within a few
  percent — the property variable-coefficient kernels exist to get right.
- **Halftone:** at 0° the screen must be identical to the equivalent fixed
  matrix; at 90° it must equal the 0° screen transposed. Good rotation-maths
  regression test.
- **Depth / palette mapping:** output palette size must equal `depth` exactly,
  and every output pixel must still be a palette member.
- **After any control is added:** the `$('#id')` ↔ `id="..."` grep from
  `CLAUDE.md`, plus a round-trip assertion that `applyCfg(readCfg())` is a no-op
  — which is what actually catches a missing `CFG_IDS` entry, the single most
  repeated mistake in this codebase.

### Open questions

1. **`palmap: luma` as the default?** It is what makes Dither Boy's colour
   output look the way it does, but flipping the default changes every existing
   saved preset's appearance. Recommendation: ship as opt-in, revisit after use.
2. **Dot diffusion — worth a third family?** Riemersma covers the "organic, no
   directional artefact" need more distinctively. Recommendation: defer.
3. **Algorithm count as a goal.** Dither Boy advertises 63. Phase 0 + 2 puts
   GRIT around 60 honestly-distinct entries without padding the list with
   near-duplicate line screens. Recommendation: do not chase the number past
   that; a parametric halftone is worth more than eight fixed screens.
4. **Exotic charsets vs embedded fonts** — see the ⚠ in §6.2. Needs a decision
   on whether to ship them behind a font warning or to hold them until a
   symbol-capable face is embedded (which would cost real KB and is the only
   item in this plan that pushes against the size budget).
