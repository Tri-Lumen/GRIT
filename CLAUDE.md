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
2. **No network.** The file must work offline, from `file://`, forever. No web
   fonts, no analytics, no remote palettes.
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
standard check is that an 8×8 horizontal luminance ramp dithers to a
monotonically increasing dot density, and that every output pixel lands exactly
on a palette entry.

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

`index.html` is ~950 lines in three blocks. Line numbers drift — the
`/* ---------- name ---------- */` comment banners are the stable anchors.

| Region | Contents |
|---|---|
| `<style>` | All CSS. Dark UI, monospace, blue `#7aa2ff` + amber `#ffb347` accents. The `.dith-rule` class is the visual signature (checkerboard-dithered rules). |
| `<aside id="rail">` | Every control. Collapsible `<section class="grp">` blocks. |
| `<main id="stage">` | Preview canvas `#out`, toolbar, and the ASCII text panel `#textwrap`. |
| `algorithms` | `ED` (error-diffusion kernels) and `ORD` (ordered matrices). |
| `palettes` | `PALETTES` map. |
| `charsets` | `CHARSETS` map. |
| `state` | Module-level `img`, `mode`, `colormode`, offscreen canvases `work`/`samp`, output `out`. |
| `helpers` | `v()` / `num()` read control values by id. `toast()`. `syncOuts()` updates slider readouts. |
| `palette resolution` | `currentPalette()` → array of `[r,g,b]`. |
| `image adjustments` | `adjust(imageData)` — gamma, contrast, brightness, saturation, grain, invert, mono collapse. Mutates in place. |
| `quantize` | `nearest()`, `stepGuess()`, `ditherPixels()` — the core. |
| `median cut extraction` | `extractPalette(n)`. |
| `render: dither` | `renderDither()`. |
| `render: ascii` | `charsetChars()`, `denseOnBright()`, `renderAscii()`. |
| `driver` | `render()`, `schedule()` (rAF-debounced), `updateVisibility()`. |
| `input wiring` → end | Event listeners, file/drop/paste loading, exports, settings JSON, hotkeys. |

## Conventions

- Controls are declared in HTML with an `id`; JS reads them with `v('id')`
  (string or boolean) or `num('id')` (float). **There is no settings object** —
  the DOM is the state. Adding a control = add the element, then read it where
  it's used.
- A slider gets a live readout by adding `<b data-out="sliderId">` inside its
  `.lab` span. `syncOuts()` wires it automatically.
- Any new control inside `#rail` is auto-bound to `schedule()` — no listener needed.
- Show/hide of conditional controls lives in one place: `updateVisibility()`.
- `render()` is the only entry point. It's idempotent and cheap enough to run on
  every input event via `schedule()`.
- Adding a control that should survive a preset round-trip means adding its id to
  the `CFG_IDS` array. Easy to forget.

## The pipeline

```
source image
  → downscale to grid (smoothing ON, this is the only place blur is wanted)
  → adjust()          brightness/contrast/gamma/saturation/grain/invert
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

## Current state

Working and complete for the original ask. See `docs/ROADMAP.md` for what was
deliberately left out (video, stacked effects, true blue noise, SVG export).

Known rough edges:
- Very large grids (800+ cells) with a 12-tap kernel like Jarvis are noticeably
  slow on every keystroke — no worker, no throttle beyond rAF.
- `#textout` is `readonly` and re-rendered wholesale; there's no virtualization,
  so 400-column braille output makes the text panel sluggish.
- The `stepGuess()` heuristic for ordered-dither spread on arbitrary colour
  palettes is approximate. It looks fine but isn't principled.
