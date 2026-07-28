# CLAUDE.md

Context for Claude Code working in this repo.

## What this is

**GRIT** — a browser-based image dithering and ASCII art tool. Built as a free
replacement for [Dither Boy](https://studioaaa.com/product/dither-boy/) (~$60,
desktop, closed source), which has a great feature concept but isn't worth the
price for occasional use.

The entire application is **one self-contained HTML file**: `index.html`.
No build step, no dependencies, no network calls. Open it in a browser and it
works. Everything runs client-side on canvas.

## Non-negotiable constraints

These are design decisions, not accidents. Don't "improve" past them without asking:

1. **Single file.** HTML + CSS + JS all in `index.html`. No bundler, no npm, no
   framework, no CDN imports. If a change requires a build step, it's the wrong change.
2. **No network.** The file must work offline, from `file://`, forever. No
   analytics, no remote palettes, and **no font *requests*** — the Design system's
   two families are embedded as base64 woff2 inside the `<style>` block. That is
   the only sanctioned way to add a typeface: never a `<link>` to a font CDN.
3. **No browser storage.** `localStorage` / `sessionStorage` are avoided
   deliberately (they fail in some sandboxed embeds). Presets travel as JSON via
   the clipboard instead — see "Presets" below.
4. **Zero-state usable.** "Load test card" generates a procedural image so the
   tool is testable without a file on disk. Keep that working.
5. **Nearest-neighbour on export.** Dithered output must never be resampled with
   smoothing. `imageSmoothingEnabled = false` on every upscale path.

## Running and testing

Open `index.html` in a browser. That's it. There is no dev server, no test runner.

For headless verification of the pixel math (works well in Claude Code):

```bash
# extract the <script> block and syntax check it
python3 -c "import re;h=open('index.html',encoding='utf-8').read();print(re.search(r'<script>(.*?)</script>',h,re.S).group(1))" > /tmp/app.js
node --check /tmp/app.js
```

The pure functions (`bayer`, `normMat`, `nearest`, `stepGuess`, `ditherPixels`)
have no DOM dependency and can be sliced out of the script and unit-tested in
node against a fake `{data: Uint8ClampedArray}` ImageData stand-in. `docs/ARCHITECTURE.md`
has a worked example of this harness. Use it when touching algorithm code — the
standard check is that a horizontal luminance ramp dithers to a monotonically
increasing dot density, and that every output pixel lands exactly on a palette
entry.

Use a ramp at least 64 cells wide and bin the density into 8 columns. At 8 cells
wide the check fails for most kernels on unmodified code — a single kernel's local
error is the same order as the bin — so it reports noise, not regressions.

Both of those are now written down and runnable:

```bash
node tools/harness.js          # pixel maths, zero dependencies
node tools/smoke.js            # boots the real file in Chromium (needs playwright)
```

See `tools/README.md`. Neither is a dependency of the application — there is
deliberately no `package.json`, so `index.html` stays buildless and standalone.

Useful sanity greps after edits:

```bash
grep -c $'\ufffd' index.html                      # should be 0 — no mojibake in charsets
python3 - <<'EOF'                                  # every $('#id') has a matching element
import re
h=open('index.html',encoding='utf-8').read()
js=re.search(r'<script>(.*?)</script>',h,re.S).group(1)
print(sorted(set(re.findall(r"\$\('#([\w-]+)'\)",js)) - set(re.findall(r'id="([^"]+)"',h))))
EOF
```

## Code map

`index.html` is ~3400 lines in three blocks. Line numbers drift — the
`/* ---------- name ---------- */` comment banners are the stable anchors.

| Region | Contents |
|---|---|
| `@font-face` | Space Grotesk + IBM Plex Mono as base64 woff2. ~88KB, latin subset. Do not hand-edit; regenerate. |
| `<style>` | All CSS. Tokens on `:root`, then the block kit. **See `docs/STYLE_GUIDE.md` before touching any of it.** |
| `#titlebar` | Window chrome: traffic lights, document title, `⌘K`. |
| `<aside id="rail">` | Tabs (Adjust / Presets / History), the Basic/All disclosure toggle, and every control as `.blk` blocks. Restyles into a floating glass panel in focus mode. |
| `<main id="stage">` | Mode tabs (Dither / ASCII / Image), preview canvas `#out`, empty state `#empty`, ASCII text panel `#textwrap`, status bar, focus-mode `#dock`. |
| `#cmdscrim` / `#expscrim` | Command palette and export dialog overlays. |
| `algorithms` | `ED` (error-diffusion kernels) and `ORD` (ordered matrices, threshold functions, parametric screens). `rankMat(n, f)` generates most of the patterned matrices by ranking cells, which guarantees distinct thresholds. |
| `halftone screen` | `HT_SHAPES` + `ORD.screen.make()` — the adjustable rotatable screen. |
| `blue noise` | `blueNoiseTile()` — void-and-cluster. Hangs off lazy getters on `ORD.blue16/blue32/blue`. |
| `Hilbert curve` | `d2xy()`, `riemersmaDither()` — curve-order error diffusion, its own traversal. |
| `algorithm copy` | `ALGO_INFO` — blurb / pro / con / "best for" per algorithm, for the info card. |
| `palettes` | `PALETTES` map, `PAL_QUICK` (the five surfaced swatches). |
| `charsets` | `CHARSETS` map. |
| `font catalogue` | `FONTS` + `FONT_CLASSES` for the filterable font picker. |
| `looks (presets)` | `LOOKS` — named partial configs applied by the Presets tab. |
| `state` | Module-level `img`, `mode`, `colormode`, offscreen canvases `work`/`samp`, output `out`. |
| `helpers` | `v()` / `num()` read control values by id. `toast()`. `syncOuts()` updates slider readouts. |
| `palette resolution` | `CURVES`, `applyDepth()`, `currentPalette()` → array of `[r,g,b]`. |
| `image adjustments` | `mulberry()` seeded PRNG, `temporal()`, and `adjust(imageData)` — gamma, contrast, brightness, saturation, grain, invert, mono collapse. Mutates in place. |
| `effects` | `convolve()`, the `FX` pass table, `fxOrder()`, `effects()` — twelve reorderable passes between `adjust()` and `ditherPixels()`. |
| `quantize` | `nearest()`, `srgbToOklab()`, `stepGuess()`, `ditherPixels()`, `ditherByTone()` — the core. |
| `median cut extraction` | `extractPalette(n)`. |
| `CMYK halftone` | `cmykScreen()` — four rotated screens multiplied together. |
| `output scale` | `SIZE_PRESETS`, `baseOutSize()`, `exportScale()` — always a whole number. |
| `render: dither` | `renderDither()`. |
| `render: image` | `imageWorkSize()`, `imageGrid()`, `renderImage()` — the pipeline with the quantizer taken off. |
| `render: ascii` | `charsetChars()`, `denseOnBright()`, `renderAscii()`. |
| `status bar` | `setStatus()` — cells, algorithm, colours; render time is measured in `render()`. |
| `algorithm info card` | `algoThumbTo(key, canvas)` renders the *real* algorithm at 26×20; `algoThumb()` targets the card; `renderAlgoCard()` fills the copy. |
| `algorithm picker` | `ALGO_KEYS`, `renderAlgoList()`, `drawAlgoRow()`, `markAlgoSel()`, `syncAlgoThumbs()` — the thumbnail list. `#algo` is a hidden select the list drives, same shape as `#font` / `#fontpicker`. |
| `driver` | `render()`, `schedule()` (rAF + cost-based coalescing), `previewCols()`, `updateVisibility()`, `advDirty()`. |
| `config transport` | `readCfg()` / `applyCfg()` / `CFG_IDS` / `DEFAULTS`. Shared by presets, history, reset and the clipboard. |
| `history` | `pushHistory()` (debounced 800ms), `renderHistory()`. Parameter snapshots, never bitmaps. |
| `scale` | `GRID_STOPS` / `ASCII_STOPS` named stops, `setScale()`. |
| `randomize` | `randomize()`, `shuffleAdjustments()`, lock chips. |
| `presets` | `applyLook()` (layers over `DEFAULTS`), `renderPresets()`, `captureLook()`, `packJson()`, `loadPack()`. |
| `batch` | `setBatch()`, `exportBatch()` — several images through the current settings into one ZIP. |
| `font picker` | Measurement-based `isInstalled()` / `gridSafe()`, facets, `renderFontList()`. |
| `vector + markup export` | `svgDither()`, `svgAscii()`, `buildHtml()` — run-merged SVG and standalone HTML. |
| `animated GIF` | `lzwEncode()`, `gifEncoder()` — GIF89a written by hand. |
| `ZIP` | `crc32()`, `zipStore()` — stored-mode ZIP for PNG frame sequences. |
| `clip transport` | `seekTo()`, `vToggle()`, `eachFrame()` and the three clip exporters. |
| `command palette` | `buildCommands()` — every action reachable from `⌘K`. |
| `input wiring` → end | Event listeners, file/drop/paste loading, exports, settings JSON, hotkeys. |

## Conventions

- Controls are declared in HTML with an `id`; JS reads them with `v('id')`
  (string or boolean) or `num('id')` (float). **There is no settings object** —
  the DOM is the state. Adding a control = add the element, then read it where
  it's used.
- A slider gets a live readout by adding `<b data-out="sliderId">` inside its
  `.lab` span. `syncOuts()` wires it automatically.
- Any new control inside `#rail` (or `#expcard`) is auto-bound to `schedule()` — no
  listener needed. Opt a field out with `data-nobind` (search boxes, filters).
- Show/hide of conditional controls lives in one place: `updateVisibility()`.
- **Mode gating is declared, not coded.** A `.blk` lists the modes it belongs to in
  `data-modes="dither ascii"`; a block with no attribute is universal.
  `updateVisibility()` toggles `.offmode` from that in one line. Don't add a
  per-mode `classList.toggle('hidden', ...)` — `.offmode` is a separate class
  precisely so a block can be gated by mode *and* by its own condition at once.
- **Advanced controls are marked, not moved.** `data-adv` on a control's *wrapper*
  hides it unless the panel is at **All** (`body.basic` is the default). It never
  changes a value, so both levels render identically. `advDirty()` marks the All
  button when a currently-relevant advanced control sits away from its default,
  so a preset can't hide a surprise. The level is deliberately **not** in
  `CFG_IDS` — presets and history must not move it.
- `render()` is the only entry point. It's idempotent and cheap enough to run on
  every input event via `schedule()`. It dispatches on `mode` to one of three
  render functions; all three are expected to leave `lastGrid` / `lastLines` /
  `lastText` in a state the exporters can trust.
- Adding a control that should survive a preset round-trip means adding its id to
  the `CFG_IDS` array. Easy to forget. It also governs history snapshots and reset.
  `readCfg`/`applyCfg` skip ids with no element rather than throwing, so a stale
  entry degrades quietly — `tools/smoke.js` asserts the list matches the DOM and
  that `applyCfg(readCfg())` is a no-op, which is what actually catches this.
- **Visual work goes through `docs/STYLE_GUIDE.md`.** Tokens, the block kit, and
  the rules for adding a control are there. Don't introduce a new colour, radius
  or type size without checking it first.
- Focus mode is the same `#rail` element restyled, not a second layout. Never
  duplicate a control to build a second view — the DOM is the state, and two
  elements can't share one id.

## The pipeline

```
source image or video frame
  → downscale to grid (smoothing ON, this is the only place blur is wanted)
  → adjust()          brightness/contrast/gamma/saturation/grain/invert
  → effects()         blur → sharpen → edge → posterize → bloom → scanlines
  → ditherPixels()    error diffusion or ordered, against a palette
  → upscale (smoothing OFF) into #out        [dither mode]
  → or map levels to glyphs and draw text    [ascii mode]
  → or skip the quantizer entirely           [image mode]
```

Image mode branches out after `effects()`: nothing is quantized, so the grid goes
straight to `#out`. Its two controls say the same thing the other modes' grid and
cell do, in the units that make sense without cells — `#imgres` is a *ceiling* on
the working long edge (a smaller source is never blown up) and `#imgpx` divides
that into blocks. Every pass is per-pixel, so `#imgpx` is also the cost lever.

Grid size and cell size are deliberately decoupled — that's the "dither at any
scale without losing quality" behaviour. The grid controls detail; the cell
controls output resolution.

ASCII mode reuses the same dither functions against a synthetic N-level
grayscale ramp, where N is the charset length. That's why the character output
has dither texture instead of banding.

## Gotchas hit while building this

- **Ramp direction.** `denseOnBright()` decides whether dense glyphs represent
  light or dark regions by comparing ink luminance to paper luminance. The
  "Invert ramp" checkbox flips that flag — it does **not** reverse the charset
  array. Reversing in both places cancels out; that bug was fixed once already.
- **Charsets are ordered densest-first.** `CHARSETS[k].s[0]` is the heaviest
  glyph. Every ramp string must end with a space.
- **Braille** (`CHARSETS.braille`) is a separate code path: it dithers at
  `cols*2 × rows*4` to 1-bit, then packs each 2×4 block into `U+2800 + bits`.
  Dot bit order is `[[0x01,0x02,0x04,0x40],[0x08,0x10,0x20,0x80]]` indexed
  `[dx][dy]` — the 7/8 dots are out of sequence, which is easy to get wrong.
- **Canvas size limits.** Both render paths clamp output to 8192px per side by
  walking the scale factor down. Browsers silently produce a blank canvas past
  their limit rather than throwing.
- **Serpentine + error diffusion.** On reversed rows the kernel's `dx` must be
  negated, not just the traversal order.
- **`getImageData` needs `willReadFrequently: true`** on the offscreen contexts
  or Chrome warns and slows down.
- Canvas state (font, fillStyle, transform) resets whenever `width`/`height` is
  assigned. `renderAscii()` measures the font, then resizes, then re-sets it.
- **Embedded fonts are latin-only.** They have no block shades or braille. Art
  surfaces (`#textout`, the default `#font` option) must use `--art`, not `--mono`,
  or per-glyph fallback shears the ASCII grid. See `docs/STYLE_GUIDE.md`.
- **A `<video>` is a valid `drawImage` source**, so clips need no separate pipeline —
  `img` just holds the video element and `isVideo` gates the transport UI. Anything
  that swaps the source must reset `isVideo` and call `vStop()`, or the Clip block
  is left behind (that bug shipped once already, from `loadTestCard`).
- **Frame stepping must await `seeked`.** Setting `currentTime` is async; drawing
  before the event fires silently re-encodes the previous frame.
- **History debouncing loses discrete states.** `pushHistory()` debounces 800ms so a
  slider drag records once, but a discrete action (load, preset, algorithm pick)
  must pass `pushHistory(true)` — otherwise the next edit clears the pending timer
  and undo can never step back into that state.
- **Script-level `let` is not on `window`.** Top-level `let`/`const` in a classic
  script live in the global *lexical* environment. From a devtools console or a
  Playwright `evaluate`, read and write them as bare identifiers (`frameIndex = 9`),
  never as `window.frameIndex` — the latter silently creates an unrelated
  property, which made a smoke test pass while testing nothing.
- **Comparing two dithered canvases needs a position-sensitive signature.**
  Summing channel values over a two-colour dither only counts how many pixels
  are lit, not where — a completely reshuffled grain pattern measures as
  identical. Hash with position.
- **Effect order lives in `#fxorder`, not in any pass.** It is a hidden input
  holding a comma-joined key list, because `readCfg()` has to be able to see it.
  `fxOrder()` drops unknown keys and appends missing ones, so presets saved
  before a pass existed still load. Reordering *moves* the existing rows with
  `appendChild` — rebuilding them would drop the boot-time auto-binding.
- **Throttling must be gated on the cost of a *full* render, not the last one.**
  `previewCols()` reads `lastFullCost`, which only non-preview renders write. It
  used to read `lastCost`, and that oscillated: a cheap 18ms preview pulled the
  measurement under the 40ms threshold, so the next frame rendered full at 400ms,
  which pushed it back over, so the frame after previewed again. Dragging
  alternated coarse/fine every frame and spent nearly all its wall time in the
  full renders — it reads as the picture not tracking the slider at all. Any
  future adaptive budget has the same trap: never feed a throttled measurement
  back into the throttle.
- **Thumbnails are not free.** Drawing all 52 algorithm previews is ~85ms, so
  `renderAlgoList()` draws a row only while it is on screen (an
  `IntersectionObserver` rooted on `#algolist`) and `syncAlgoThumbs()` debounces
  a redraw and skips entirely while `dragging`. Never draw the list from
  `render()` directly. Selection is marked in place by `markAlgoSel()` — a
  rebuild would drop the scroll position and every drawn thumbnail with it.
- **Anything random must go through `mulberry(fxSeed)`.** Raw `Math.random()` in
  the render path reshuffles on every render: the preview crawls while you drag
  an unrelated slider, and a clip's grain flickers frame to frame. Grain hit
  exactly this bug. `temporal()` advances the seed deliberately for motion.
- **`colormode` is shared by all three modes.** It defaults to mono, which is right
  for dithering and surprising in Image mode — a fresh image render is greyscale
  until you flip it. Changing it on a mode switch would mean a mode tab silently
  editing a setting that round-trips, which breaks preset determinism. The
  Mono/Colour control was moved to the top of **Tone** instead, where Image mode
  can see it; `adjust()` is what implements it, so that is where it belonged.
- **Image mode has nothing for the vector and text exporters.** `renderImage()`
  clears `lastGrid`/`lastLines`/`lastText` because it writes neither a palette grid
  nor a glyph grid. `FMT_MODES` is what withholds SVG/TXT/HTML in the export
  dialog — without it they'd silently produce empty files.
- **A preset is applied over `DEFAULTS`, not over current state.** `applyLook()`
  layers a sparse look onto the defaults so the same look always renders the
  same picture. Only `extracted` survives, because it belongs to the image.
- **Export scale is always an integer.** `exportScale()` picks the largest whole
  multiplier that fits inside a target size. A fractional scale would give cells
  of uneven width under nearest-neighbour, which is the resampling mush
  constraint 5 exists to prevent. Never letterbox or resample to hit a number.
- **Charsets marked `u:true` need glyphs the embedded faces don't have.** The two
  embedded families are latin-only; a substituted glyph has a different advance
  width and shears the grid. `updateVisibility()` measures via `gridSafe()` and
  warns. Don't add an exotic set without the flag.
- **Font availability can't be measured at boot.** `document.fonts.ready` has not
  settled, so the embedded faces measure as missing. The font picker recomputes
  once it resolves.
- **Only two of the 34 catalogue fonts are embedded.** Space Grotesk and IBM Plex
  Mono ship as base64 woff2; the other 32 `FONTS` entries are references to
  system faces, and on a typical machine most of them will not resolve. This
  reliably reads as "the fonts are missing from the file" — it isn't, and it
  can't be fixed by embedding more. The two embedded faces are a *latin subset*
  and still cost ~88KB; ASCII art needs block and braille coverage, which can't
  be subset that way, so 32 more families is tens of megabytes. Several
  (Consolas, Menlo, Monaco, SF Mono, Andale Mono, Lucida Console) are also
  proprietary and can't legally be redistributed embedded. The picker measures
  instead: installed families sort to the top, the rest are labelled "not
  installed", and `#fontcount` reads "N of M here".

## Current state

Working and complete for the original ask, plus the Dither Boy parity work in
`docs/FEATURE_PLAN.md` (all five phases landed). Three modes — Dither, ASCII and
Image — over 52 algorithms, 39 palettes, 34 charsets, 47 presets and 12
reorderable effect passes.

Known rough edges:
- Very large grids with a 12-tap kernel are still slow on a *settled* render —
  1200 cells with Jarvis is ~265ms. Dragging previews at a reduced grid (~13ms)
  and renders overrunning a frame coalesce input, but there is still no worker,
  so the render that lands on pointer release is the full cost.
- `#textout` is `readonly` and re-rendered wholesale; there's no virtualization,
  so 400-column braille output makes the text panel sluggish.
- The `stepGuess()` heuristic for ordered-dither spread on arbitrary colour
  palettes is approximate. It looks fine but isn't principled.
- History is in memory only — no storage constraint means it dies on reload. It
  is capped at 40 snapshots and debounced 800ms, so a slider drag records once.
- The export dialog's file-size figure is an estimate (~0.35 bytes/px), not a real
  encode. It is a hint, not a promise.
- 49 of the 52 `ALGO_INFO` blurbs were written during implementation, not by
  Design. Flagged in `docs/STYLE_GUIDE.md` for review.
- Image mode at source resolution is single-threaded and per-pixel, so a large
  photo with pixel sort or edge detect takes real time. The working-size ceiling
  and pixel size are the levers; a worker is still the real fix.
- The Adjust pane is ordered by the history of the build, not by the pipeline —
  Effects sits above Dither, Tone above both. Reorganizing it into pipeline stages
  is parked in `docs/ROADMAP.md` as the next UI step; the mechanisms it needs
  (`data-modes`, `data-adv`, collapsible `.blk`) are already in.
- **Ostromoukhov is deliberately absent.** It needs a published 256-row
  variable-coefficient table that could not be verified; inventing the numbers
  would be worse than the gap. It remains the best available tone reproduction
  and is worth adding from a real source.
- CMYK separation is a *look*, not colour management. Plain GCR with a slider,
  no profile, no ink limit.
- `stepGuess()` still governs ordered spread, and the parametric halftone screen
  leans on it too, so the approximation now shows up in more places.
- The exotic charsets (chess, dice, dominoes, tally) will shear the grid on the
  embedded fonts. The warning tells you; nothing stops you.
- Clip encoding runs the full pipeline per frame on the main thread. A long clip
  at a high frame rate takes real time; there's a progress bar and a cancel, but
  no worker.
- The GIF encoder uses one colour table for the whole clip, taken from the active
  palette. Correct for dithered output, which is already quantized; it would band
  on un-dithered source.
- The ZIP writer is stored-mode only. Fine for PNGs, which are already deflated.
