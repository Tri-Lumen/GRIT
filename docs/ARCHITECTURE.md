# Architecture

## Canvases

Three canvases, all in `index.html`:

| Name | Role |
|---|---|
| `work` (offscreen) | The processing grid. Sized to the cell grid, not to pixels. Everything expensive happens here. |
| `samp` (offscreen) | Colour sampling for ASCII ink and for median-cut palette extraction. |
| `out` (`#out`, visible) | Final render only. Never read back except for export. |

Offscreen contexts are created with `{willReadFrequently: true}`.

## Dither pipeline

```
img (full res)
 │
 ├─ drawImage → work at (cols × rows)          smoothing ON
 │     rows = round(cols × imgH / imgW)
 │
 ├─ getImageData
 ├─ adjust(d)                                   in-place, per-pixel
 ├─ ditherPixels(d, cols, rows, palette, algo, opts)
 ├─ putImageData
 │
 └─ drawImage(work → out) at cell × oscale      smoothing OFF
```

The downscale is the only step where interpolation is wanted. Once quantized,
every subsequent operation is nearest-neighbour, which is what keeps dot
patterns crisp at export scale.

## ASCII pipeline

```
measure glyph metrics from the chosen font
  cw = measureText('M').width
  chh = fontSize × lineHeight
  rows = round(cols × (imgH/imgW) × (cw/chh))     ← aspect correction

if charset is braille:
    work at (cols×2, rows×4) → adjust → 1-bit dither → pack U+2800 blocks
else:
    work at (cols, rows) → adjust → dither against an N-level gray ramp
    idx = round(t / 255 × (N-1)),  t = bright ? 255-lum : lum
    glyph = chars[idx]

if ink mode ≠ flat:
    samp at (cols, rows) → adjust (forced colour) → optional palette quantize
    → per-glyph fillStyle

draw glyphs into out, row by row
build lastText for the copy/save buttons
```

Rows are computed from the glyph aspect ratio, so output proportions hold across
fonts and line-height settings.

## `ditherPixels(d, w, h, pal, algoKey, opts)`

`algoKey` is `"ed:<name>"` or `"ord:<name>"`.

**Ordered branch.** For each pixel, look up a threshold `t ∈ [0,1)` from either a
matrix (`O.m[y % size][x % size]`) or a function (`O.fn(x,y)`), offset the pixel
by `(t - 0.5) × spread × stepGuess(pal) + bias`, then snap to the nearest palette
entry. `stepGuess()` estimates the tonal spacing of the palette so the spread
slider behaves the same on a 2-colour palette and a 16-colour one.

**Error-diffusion branch.** Copies into a `Float32Array` of RGB triples (needed —
error accumulates outside 0–255), walks the grid, quantizes, then distributes
`(old - new) × strength` to the neighbours listed in the kernel. Kernels are
`[dx, dy, weight]` triples with a shared divisor `d`. Serpentine scanning
reverses both the traversal and the sign of `dx`.

Both branches operate on RGB, so colour palettes get colour error diffusion for
free. Mono mode is handled earlier: `adjust()` collapses the channels to
luminance before dithering.

## `adjust(d)`

Order matters. Gamma is applied through a 256-entry LUT first, then linear
contrast around mid-grey, then brightness, then saturation (or mono collapse),
then grain, then invert. Changing the order changes the look of every preset.

## Median-cut extraction

`extractPalette(n)` samples the source at 96×96, then repeatedly splits the
largest bucket along its widest channel at the median, until `n` buckets exist.
Each bucket's mean colour becomes a palette entry. Fast and good enough; it is
not k-means and won't match a proper quantizer on hard images.

## Rendering cadence

Every input inside `#rail` calls `schedule()`, which coalesces to one `render()`
per animation frame. `render()` calls `syncOuts()` and `updateVisibility()`
before doing any work, so the UI stays consistent even with no image loaded.

## Headless test harness

The algorithm functions have no DOM dependency. To test them in node:

```bash
python3 - <<'EOF'
import re
h = open('index.html', encoding='utf-8').read()
js = re.search(r'<script>(.*?)</script>', h, re.S).group(1)
algos = js[js.index('/* ---------- algorithms'):js.index('/* ---------- palettes')]
quant = js[js.index('function nearest('):js.index('/* ---------- median cut')]
open('/tmp/test.js','w').write(algos + quant + '''
const W=8,H=8;
const data=new Uint8ClampedArray(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const i=(y*W+x)*4, g=Math.round(x/(W-1)*255);
  data[i]=data[i+1]=data[i+2]=g; data[i+3]=255;
}
const pal=[[0,0,0],[255,255,255]];
for(const key of ['ed:fs','ed:atkinson','ord:bayer4','ord:halftone8']){
  const d={data:new Uint8ClampedArray(data)};
  ditherPixels(d,W,H,pal,key,{strength:1,spread:1,bias:0,serp:true});
  let ok=true;
  for(let i=0;i<d.data.length;i+=4) if(d.data[i]!==0 && d.data[i]!==255) ok=false;
  let art='';
  for(let y=0;y<H;y++){ for(let x=0;x<W;x++) art += d.data[(y*W+x)*4]>127?'#':'.'; art+='\\n'; }
  console.log(key, ok?'OK':'BAD', '\\n'+art);
}
''')
EOF
node /tmp/test.js
```

Expected: every algorithm reports `OK` (all output pixels land on palette
entries) and prints a left-to-right density gradient.
