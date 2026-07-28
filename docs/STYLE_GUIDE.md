# Style guide

The visual system for GRIT. **This is the reference for all future work** — new
panels, new controls, and new screens are composed from what is described here,
not invented alongside it.

Source: the Design handoff `design_handoff_grit_editor` (README + `GRIT - Directions.dc.html`,
directions 1a–1e). That prototype is a reference, not code to port — it was authored in a
bespoke streaming-template runtime. Fidelity is **high**: colours, type, spacing, radii and
states are final.

---

## What was built

The handoff shipped three competing shells and asked for one to be chosen. GRIT
implements a **hybrid of 1a and 1c**, with the tab pattern from 1b:

| Piece | From | How it appears |
|---|---|---|
| Workbench shell — 286px left rail, main canvas | 1a | Default view |
| Focus mode — full-bleed canvas, floating glass panel, bottom dock | 1c | `focus` button / `f` / `⌘K` |
| Inspector tabs — Adjust / Presets / History | 1b | Top of the rail |
| Export dialog | 1d | Footer `Export` / `e` |
| Block kit | 1e | The classes below |

**Focus mode is not a second layout.** The same `#rail` element restyles itself
into 1c's floating glass panel — one DOM tree, one set of control ids. Never
duplicate a control to make a second view; the DOM is the state (see CLAUDE.md).

---

## Tokens

All defined as CSS custom properties on `:root`. Use the variable, never the literal.

### Surfaces
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#171717` | app/canvas background |
| `--panel` | `#1D211F` | rail, title bar, dialogs |
| `--glass` | `rgba(29,33,31,.82)` + `blur(20px)` | floating surfaces (focus panel, dock, ⌘K) |
| `--raised` | `rgba(255,255,255,.025)` | inner card fill |

### Ink
| Token | Value | Use |
|---|---|---|
| `--text` | `#D9DBD5` | primary text |
| `--t2` | `rgba(217,219,213,.8)` | secondary / control labels |
| `--t3` | `rgba(217,219,213,.7)` | tertiary / inactive controls |
| `--t4` | `rgba(217,219,213,.62)` | section labels, mono readouts — **the AA floor** |
| `--muted` | `#8A8F88` | disabled |
| `--deep` | `#0E210E` | text on solid accent fills |

### Accent — one per view. The green is a pointer, not decoration.
| Token | Value | Use |
|---|---|---|
| `--accent` | `#349E53` | accent text, icons, active borders |
| `--accent-solid` | `#3AA659` | solid buttons (label `--deep`) |
| `--accent-deep` | `#137D2D` | toggle "on" fill |
| `--tint` | `rgba(19,125,45,.14)` | selected-cell background |
| `--ring` | `rgba(19,125,45,.3)` | inset ring on selected cells |
| `--pos` / `--neg` | `#9FE870` / `#ff8a7a` | pros / cons markers only |

### Lines & states
`--line` `rgba(255,255,255,.07)` · `--line-soft` `.06` · `--line-card` `.08` ·
`--hover` `rgba(255,255,255,.06)` · `--fill` `.05` · `--fill-on` `.1` ·
`--track` `rgba(255,255,255,.14)` · `--track-off` `rgba(255,255,255,.12)`

**Contrast floor:** `#349E53` on `#1D211F` ≈ 4.9:1; `#0E210E` on `#3AA659` ≈ 5.4:1;
`--t4` on panel ≈ 4.5:1. Do not darken the accent further or lower those alphas.

---

## Type

Two families, both **embedded as base64 woff2** in the `<style>` block (latin subset).
This is deliberate: the no-network constraint is non-negotiable, and the design
specified Google Fonts. Space Grotesk is a variable face covering 300–700 in one
file; IBM Plex Mono ships as three static weights. Total ~88KB.

| Role | Spec |
|---|---|
| Wordmark | Space Grotesk 700 / 16px / `.14em` |
| Dialog title | Space Grotesk 600 / 14px |
| Control label | Space Grotesk 500 / 11px |
| Section label | IBM Plex Mono 600 / 9.5px / `.16em` / uppercase |
| Value readout | IBM Plex Mono 400–500 / 10–11px |
| Body note | Space Grotesk 400 / 10px / 1.4–1.45 |

**All numerics are IBM Plex Mono and right-aligned.**

### The one deviation: art surfaces stay on system mono
`--art` (not `--mono`) is used for `#textout` and is the default `#font` option.
The embedded Plex subset is latin-only — it has no block shades (`█▓▒░`) and no
braille (`U+2800…`). Per-glyph fallback would give those characters a different
advance width and **shear the ASCII art off its grid**. UI text uses `--mono`;
anything that renders art uses `--art`. Do not "fix" this by pointing art at Plex.

---

## Block kit

Every panel is a vertical stack of blocks. A block is position-independent — the
same markup must render correctly in the 286px rail and the 246px floating panel.
Build one component, not two.

| Class | What it is |
|---|---|
| `.blk` | A section: `button.sec` label + `.blkbody`. Padding `10px 16px 14px`, gap 10. Collapsible via `.closed`. |
| `.card` | Bordered inner card — `1px solid --line-card`, radius 8, `--raised` fill. For cards *inside* a block (algorithm info, extract). |
| `.sld` | Slider block: `.lab` (label + `<b data-out>` readout) over `input[type=range]`. |
| `.seg` | Segmented control: track `rgba(255,255,255,.045)`, radius 7, padding 3; pills radius 5, selected `--fill-on`. |
| `.chip` / `.chips` | Mono 10px pill, radius 5, padding 4×8. `.on` = selected, `.accent` = green action, `.tight` = denser row. |
| `.track` | Mini numeric segmented control (2 / 4 / 8 / 16). |
| `.cell` / `.grid2` | Selectable cell in a 2-up grid. Selected = `--tint` + `--accent` + inset `--ring`. |
| `.row` / `.rows` | List row: `.rl` label left, `.rr` mono value right. |
| `.line` | Label + control on one line (`.ll` label, control right). |
| `input.tgl` | 34×19 toggle, 14px knob, 180ms transition. A real checkbox — `v('id')` still works. |
| `.sw` / `.swrow` | 26px palette swatch, a 135° two-stop split of the palette's darkest/lightest pair. |
| `#swatches.editable` | The extracted-palette strip when its bands are click-to-recolour. |
| `.progtrack` | 3px progress bar, accent fill. Used by the clip encoders. |

### Rules
- 8px spacing grid. Spacing scale: 4 / 6 / 8 / 10 / 12 / 14 / 16 / 22 / 26.
- Radii: 4 (chips-in-track) · 5–7 (controls) · 8 (blocks/cards) · 10 (toggle) · 12–13 (floating/dialog).
- Shadows: blocks none · artboard `0 24px 60px rgba(0,0,0,.55)` · floating `0 20px 50px rgba(0,0,0,.5)` · dialog `0 26px 70px rgba(0,0,0,.6)`.
- Hover on any interactive row/cell lifts to `--hover`.
- `:focus-visible` is **required**: `box-shadow:0 0 0 2px var(--accent)`. The prototype
  omits it; the handoff explicitly calls that out as a defect. Do not remove it.
- Toggles and knobs animate 180ms. Everything is disabled under `prefers-reduced-motion`.

### `.dith-rule` — the signature
The checkerboard-dithered rule predates this redesign and is GRIT's visual
signature. It survives in exactly **one** place: under the rail wordmark. It is
not a general divider — hairlines are. Adding a second one dilutes it.
*(This is the one element in the UI not specified by the handoff; flagged for the designer.)*

---

## Adding a control

1. Add the element with an `id` inside `#rail` (or `#expcard`) using a block-kit class.
2. Read it with `v('id')` / `num('id')` where it is used. There is no settings object.
3. Add the id to `CFG_IDS` or it won't survive a preset round-trip, history snapshot, or reset.
4. If it is conditional, put the show/hide in `updateVisibility()` — nowhere else.
5. Sliders get a live readout from `<b data-out="sliderId">`; `syncOuts()` wires it.
6. Anything in `#rail` is auto-bound to `schedule()`. To opt out (search fields, filters),
   mark it `data-nobind`.
7. If it deserves a keyboard route, add it to `buildCommands()` for ⌘K.
8. Decide its **disclosure level**. A control the everyday path needs stays plain;
   one that is a refinement of another control gets `data-adv` on its wrapper, and
   it then only appears at **All**. Put `data-adv` on the wrapper (`.sld`, `.line`,
   `.chips`), never on the `<input>` itself — the label has to go with it.
9. Decide its **mode**. Controls live in a `.blk`, and the block declares the modes
   it belongs to with `data-modes="dither ascii"`. A block with no `data-modes` is
   universal. Never hand-roll a per-mode toggle in `updateVisibility()` again — the
   table is the whole point.

### Disclosure rules

- Hiding must never change the picture. Basic and All render identically, always.
- Never put the *only* way to do something behind **All**. Advanced means "a
  refinement of a control that is already visible", not "a feature you can't reach".
- Notes explaining an advanced-only control carry `data-adv` too, or Basic is left
  with prose about a slider that isn't there.
- Basic is the default. That is a decision about who the tool is for, not a hedge.

---

## Copy

Sentence case for UI labels; section labels are uppercased by CSS, not by the
string. British spelling for "colour" in user-facing text (matches the handoff).

The algorithm info card's copy lives in `ALGO_INFO`. **Only `ed:fs`, `ed:atkinson`
and `ord:bayer8` are the designer's verbatim strings** — the other 23 were written
during implementation and are pending design review.

The handoff's fourth featured algorithm, **Blue noise**, now exists (void-and-cluster,
`ORD.blue`) and its copy adapts the designer's line. The quick-pick grid still shows
**White noise**, because that is what the previous build shipped and changing a
default look silently is worse than a small divergence — say the word and it swaps.

---

## Deliberate gaps vs. the handoff

Things the comps show that GRIT does not implement, and why:

- **Camera source chip** — no webcam capture; the slot is used for *Test card* instead,
  which is the zero-state feature GRIT actually has.
- **Hybrid mode** — the comp's third mode was a dither/ASCII blend, which GRIT
  still does not do. The **Image** mode tab that now sits beside Dither and ASCII is
  a different thing: the shared pipeline with the quantizer removed, so tone and the
  twelve effect passes can be used on a continuous-tone image.
- **Animation formats** are a second, separately-labelled row under the comp's 4-up
  FORMAT grid, shown only when the source is a clip. The comps predate clip support.
  During an encode the dialog stays up and the scale/clipboard rows are swapped for
  a progress bar and Cancel, and the primary button reads **Encode** rather than **Save it**.
- **Traffic lights** are decorative. GRIT is a web page, not a Tauri window; they are
  drawn because the handoff's chrome is part of the look, but they do nothing.
- **`before ⇄ after`** is a toggle, not a drag-divider. Any control change returns to "after".
