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

`index.html` is ~1600 lines in three blocks. Line numbers drift — the
`/* ---------- name ---------- */` comment banners are the stable anchors.

| Region | Contents |
|---|---|
| `@font-face` | Space Grotesk + IBM Plex Mono as base64 woff2. ~88KB, latin subset. Do not hand-edit; regenerate. |
| `<style>` | All CSS. Tokens on `:root`, then the block kit. **See `docs/STYLE_GUIDE.md` before touching any of it.** |
| `#titlebar` | Window chrome: traffic lights, document title, `⌘K`. |
| `<aside id="rail">` | Tabs (Adjust / Presets / History) + every control, as `.blk` blocks. Restyles into a floating glass panel in focus mode. |
| `<main id="stage">` | Mode tabs, preview canvas `#out`, empty state `#empty`, ASCII text panel `#textwrap`, status bar, focus-mode `#dock`. |
| `#cmdscrim` / `#expscrim` | Command palette and export dialog overlays. |
| `algorithms` | `ED` (error-diffusion kernels) and `ORD` (ordered matrices). |
| `blue noise` | `blueNoiseTile()` — void-and-cluster. Hangs off a lazy getter on `ORD.blue.m`. |
| `algorithm copy` | `ALGO_INFO` — blurb / pro / con / "best for" per algorithm, for the info card. |
| `palettes` | `PALETTES` map, `PAL_QUICK` (the five surfaced swatches). |
| `charsets` | `CHARSETS` map. |
| `font catalogue` | `FONTS` + `FONT_CLASSES` for the filterable font picker. |
| `looks (presets)` | `LOOKS` — named partial configs applied by the Presets tab. |
| `state` | Module-level `img`, `mode`, `colormode`, offscreen canvases `work`/`samp`, output `out`. |
| `helpers` | `v()` / `num()` read control values by id. `toast()`. `syncOuts()` updates slider readouts. |
| `palette resolution` | `currentPalette()` → array of `[r,g,b]`. |
| `image adjustments` | `adjust(imageData)` — gamma, contrast, brightness, saturation, grain, invert, mono collapse. Mutates in place. |
| `effects` | `convolve()`, `effects()` — blur/sharpen/edge/posterize/bloom/scanlines, between `adjust()` and `ditherPixels()`. |
| `quantize` | `nearest()`, `stepGuess()`, `ditherPixels()` — the core. |
| `median cut extraction` | `extractPalette(n)`. |
| `render: dither` | `renderDither()`. |
| `render: ascii` | `charsetChars()`, `denseOnBright()`, `renderAscii()`. |
| `status bar` | `setStatus()` — cells, algorithm, colours; render time is measured in `render()`. |
| `algorithm info card` | `algoThumb()` renders the *real* algorithm at 26×20; `renderAlgoCard()` fills the copy. |
| `driver` | `render()`, `schedule()` (rAF-debounced), `updateVisibility()`. |
| `config transport` | `readCfg()` / `applyCfg()` / `CFG_IDS` / `DEFAULTS`. Shared by presets, history, reset and the clipboard. |
| `history` | `pushHistory()` (debounced 800ms), `renderHistory()`. Parameter snapshots, never bitmaps. |
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
- `render()` is the only entry point. It's idempotent and cheap enough to run on
  every input event via `schedule()`.
- Adding a control that should survive a preset round-trip means adding its id to
  the `CFG_IDS` array. Easy to forget. It also governs history snapshots and reset.
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
```

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
- **Font availability can't be measured at boot.** `document.fonts.ready` has not
  settled, so the embedded faces measure as missing. The font picker recomputes
  once it resolves.

## Current state

Working and complete for the original ask, on the Design handoff's visual system
(see `docs/STYLE_GUIDE.md`). See `docs/ROADMAP.md` for what was deliberately left
out (video, stacked effects, true blue noise, SVG export).

Known rough edges:
- Very large grids (800+ cells) with a 12-tap kernel like Jarvis are noticeably
  slow on every keystroke — no worker, no throttle beyond rAF.
- `#textout` is `readonly` and re-rendered wholesale; there's no virtualization,
  so 400-column braille output makes the text panel sluggish.
- The `stepGuess()` heuristic for ordered-dither spread on arbitrary colour
  palettes is approximate. It looks fine but isn't principled.
- History is in memory only — no storage constraint means it dies on reload. It
  is capped at 40 snapshots and debounced 800ms, so a slider drag records once.
- The export dialog's file-size figure is an estimate (~0.35 bytes/px), not a real
  encode. It is a hint, not a promise.
- 22 of the 26 `ALGO_INFO` blurbs were written during implementation, not by
  Design. Flagged in `docs/STYLE_GUIDE.md` for review.
- Clip encoding runs the full pipeline per frame on the main thread. A long clip
  at a high frame rate takes real time; there's a progress bar and a cancel, but
  no worker.
- The GIF encoder uses one colour table for the whole clip, taken from the active
  palette. Correct for dithered output, which is already quantized; it would band
  on un-dithered source.
- The ZIP writer is stored-mode only. Fine for PNGs, which are already deflated.
