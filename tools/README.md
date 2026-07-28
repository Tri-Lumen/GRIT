# tools

Development only. **Neither of these is a dependency of the application** —
`index.html` still has none, still needs no build step, and still opens straight
from `file://`. There is deliberately no `package.json` here so that stays true.

## `harness.js` — pixel maths

Zero dependencies. Slices the algorithm and quantiser regions out of
`index.html` and runs them against a fake `ImageData`, per the worked example in
`../docs/ARCHITECTURE.md`.

```bash
node tools/harness.js
```

Asserts, for every algorithm:

- every output pixel lands exactly on a palette entry
- a 128-cell luminance ramp dithers to monotonically increasing dot density,
  binned into 8 columns (the bin width matters — at 8 cells wide a single
  kernel's local error is the same order as the bin, so it reports noise)
- error-diffusion kernels conserve ink: mean output tracks mean input
- kernel weights sum to the stated divisor, except where a kernel deliberately
  discards error (Atkinson)
- ordered matrices are well-formed: thresholds in (0,1), no duplicates, not ragged
- `ALGO_INFO` has a complete entry — a missing one blanks the info card

Run it whenever you touch algorithm code.

## `smoke.js` — everything the DOM touches

Needs Playwright, which is why it is opt-in:

```bash
npm i playwright        # or: npx playwright
node tools/smoke.js
```

Set `CHROME_PATH` to use a browser you already have instead of a downloaded one.

Boots the real file in Chromium and drives it, failing on any page or console
error. Covers what the pure-function harness cannot: boot, every algorithm in
both modes, every palette, every charset, every preset, all twelve effect
passes, effect reordering, temporal variation, the size modes, preset packs, and
an `applyCfg(readCfg())` round-trip — which is what actually catches a missing
`CFG_IDS` entry, the single most repeated mistake in this codebase.

Pass `--shots` to write screenshots next to the script.

### Two traps worth knowing before you extend it

- **`window.x` does not reach the app's state.** Top-level `let` in a classic
  script lives in the global *lexical* environment, not on `window`. Read and
  write it as a bare identifier inside `page.evaluate` (`frameIndex = 9`), never
  as `window.frameIndex` — the latter silently creates an unrelated property and
  the test passes while testing nothing.
- **Do not compare canvases with a position-blind signature.** Summing channel
  values over a two-colour dither only counts how many pixels are lit, not where
  they are, so a completely reshuffled grain pattern measures as identical. Hash
  with position (`s = s*31 + …`).
