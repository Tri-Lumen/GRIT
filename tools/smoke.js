// Boots index.html in a real browser and drives it. The node harness covers the
// pixel maths; this covers everything the DOM touches — boot, every algorithm,
// every preset, every palette, mode switches and the config round-trip.
const { chromium } = require('playwright');
const path = process.argv.find(a=>a.endsWith('.html')) || require('path').join(__dirname, '..', 'index.html');

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file://' + path);
  await page.waitForTimeout(400);

  const fail = (msg) => { errors.push(msg); };
  // #algo is hidden behind the thumbnail picker, so selectOption cannot reach it.
  // Setting .value fires no change event, which is why schedule() is explicit.
  page.setAlgo = a => page.evaluate(k => { document.querySelector('#algo').value = k; schedule(); }, a);
  const shot = process.argv.includes('--shots');

  // 1. boots clean, into the empty state
  if (await page.locator('#empty').count() === 0) fail('no empty state element');

  // 2. test card loads and renders
  await page.click('#sample');
  await page.waitForTimeout(500);
  let dims = await page.evaluate(() => ({ w: out.width, h: out.height }));
  if (!dims.w || !dims.h) fail(`test card produced a ${dims.w}x${dims.h} canvas`);

  // 3. every algorithm renders, in both modes, without throwing
  const algos = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#algo option')).map(o => o.value));
  for (const mode of ['dither', 'ascii']) {
    await page.click(`#mode button[data-mode="${mode}"]`);
    await page.waitForTimeout(120);
    for (const a of algos) {
      await page.setAlgo(a);
      await page.waitForTimeout(45);
      const st = await page.evaluate(() => ({
        w: out.width, h: out.height, t: document.querySelector('#st-time').textContent,
      }));
      if (!st.w || !st.h) fail(`${mode}/${a}: empty canvas`);
      if (/failed/i.test(st.t)) fail(`${mode}/${a}: render reported failure`);
    }
  }
  console.log(`  ${algos.length} algorithms rendered in both modes`);

  // 4. every palette resolves
  await page.click('#mode button[data-mode="dither"]');
  await page.setAlgo('ed:fs');
  const pals = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#palette option')).map(o => o.value));
  for (const p of pals) {
    await page.selectOption('#palette', p);
    await page.waitForTimeout(40);
    const n = await page.evaluate(() => currentPalette().length);
    if (!n) fail(`palette ${p} resolved to nothing`);
  }
  console.log(`  ${pals.length} palettes resolved`);

  // 5. every charset renders in ascii mode
  await page.click('#mode button[data-mode="ascii"]');
  const sets = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#charset option')).map(o => o.value));
  for (const c of sets) {
    await page.selectOption('#charset', c);
    await page.waitForTimeout(50);
    const len = await page.evaluate(() => document.querySelector('#textout').value.length);
    if (!len) fail(`charset ${c} produced no text`);
  }
  console.log(`  ${sets.length} charsets produced text`);

  // 6. every preset applies
  await page.click('.tabs button[data-tab="presets"]').catch(async () => {
    await page.click('[data-tab="presets"]');
  });
  await page.waitForTimeout(150);
  const looks = await page.evaluate(() => Object.keys(LOOKS));
  for (const k of looks) {
    await page.evaluate(key => applyLook(LOOKS[key]), k);
    await page.waitForTimeout(70);
    const st = await page.evaluate(() => ({
      w: out.width, t: document.querySelector('#st-time').textContent,
    }));
    if (!st.w) fail(`preset ${k}: empty canvas`);
    if (/failed/i.test(st.t)) fail(`preset ${k}: render reported failure`);
  }
  console.log(`  ${looks.length} presets applied`);

  // 6b. the new controls, each exercised where it actually does something
  await page.click('#mode button[data-mode="dither"]');
  await page.waitForTimeout(100);
  const featureCases = [
    ['depth 4 on a 16-colour palette', { palette: 'pico8', algo: 'ed:fs', depth: '4' }],
    ['depth 32 oversampling a 4-colour palette', { palette: 'gameboy', depth: '32' }],
    ['tonal mapping', { palette: 'c64', palmap: 'luma', depth: '0' }],
    ['tonal mapping + depth', { palette: 'sweetie', palmap: 'luma', depth: '6' }],
    ['perceptual distance', { palette: 'solar', palmap: 'rgb', dist: 'perceptual' }],
    ['s-curve on a duo ramp', { palette: 'duo', levels: '8', rampcurve: 'scurve', dist: 'fast' }],
    ['film curve on grayscale', { palette: 'gray', levels: '6', rampcurve: 'film' }],
    ['halftone screen', { algo: 'ord:screen', palette: 'duo', rampcurve: 'linear', htshape: 'round' }],
    ['halftone, line shape at 15deg', { algo: 'ord:screen', htshape: 'line', htangle: '15' }],
    ['halftone, heavy ink and gain', { algo: 'ord:screen', htink: '180', htgain: '60' }],
    ['CMYK separation', { algo: 'ord:screen', cmyk: true, htshape: 'round', htangle: '45' }],
    ['CMYK with low black generation', { algo: 'ord:screen', cmyk: true, ucr: '10' }],
    ['Riemersma', { algo: 'ed:riemersma', cmyk: false, palette: 'gray', levels: '4' }],
  ];
  for (const [label, set] of featureCases) {
    await page.evaluate(s => {
      for (const id in s) {
        const e = document.querySelector('#' + id);
        if (!e) throw new Error('no control #' + id);
        if (e.type === 'checkbox') e.checked = s[id]; else e.value = s[id];
      }
      schedule();
    }, set);
    await page.waitForTimeout(160);
    const st = await page.evaluate(() => ({
      w: out.width, h: out.height,
      t: document.querySelector('#st-time').textContent,
      n: document.querySelector('#st-colors').textContent,
      // is anything actually drawn? a uniform canvas means the pass did nothing
      uniq: (() => {
        const g = out.getContext('2d').getImageData(0, 0, Math.min(out.width, 160), Math.min(out.height, 160)).data;
        const s = new Set();
        for (let i = 0; i < g.length; i += 4) s.add(g[i] + ',' + g[i + 1] + ',' + g[i + 2]);
        return s.size;
      })(),
    }));
    if (!st.w || !st.h) fail(`${label}: empty canvas`);
    if (/failed/i.test(st.t)) fail(`${label}: render reported failure`);
    if (st.uniq < 2) fail(`${label}: output is a single flat colour`);
  }
  // depth must actually change the palette size
  const depthCheck = await page.evaluate(() => {
    document.querySelector('#palette').value = 'pico8';
    document.querySelector('#palmap').value = 'rgb';
    document.querySelector('#depth').value = '5';
    const withDepth = currentPalette().length;
    document.querySelector('#depth').value = '0';
    const without = currentPalette().length;
    return { withDepth, without };
  });
  if (depthCheck.withDepth !== 5) fail(`depth 5 gave a ${depthCheck.withDepth}-entry palette`);
  if (depthCheck.without !== 16) fail(`depth off gave a ${depthCheck.without}-entry palette, expected 16`);
  console.log(`  ${featureCases.length} feature cases rendered; depth resamples correctly`);

  // 6c. every effect pass runs, alone, and actually changes the output
  await page.evaluate(() => { applyCfg(DEFAULTS); });
  await page.waitForTimeout(150);
  const passes = await page.evaluate(() => Object.keys(FX));
  const baseline = await page.evaluate(() => {
    const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
    let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;   // position-sensitive: for a 2-colour dither a plain sum only counts lit pixels, not where they are
    return s;
  });
  for (const k of passes) {
    const sig = await page.evaluate(key => {
      applyCfg(DEFAULTS);
      const ctrl = document.querySelector('#' + FX[key].ctrl);
      ctrl.value = ctrl.max;              // full strength, so the pass has to show
      render();
      const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
      let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;   // position-sensitive: for a 2-colour dither a plain sum only counts lit pixels, not where they are
      return s;
    }, k);
    if (sig === baseline) fail(`effect pass ${k} at full strength changed nothing`);
  }
  console.log(`  ${passes.length} effect passes each changed the output`);

  // reordering must actually reorder, survive a round-trip, and be visible
  const reorder = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    const before = fxOrder().join(',');
    moveFx('scan', -1);
    const after = fxOrder().join(',');
    const dom = Array.from(document.querySelectorAll('#fxstack .fxrow')).map(r => r.dataset.fx).join(',');
    // a saved order with an unknown key and a missing key must still resolve
    document.querySelector('#fxorder').value = 'vig,bogus,blur';
    const healed = fxOrder();
    return { before, after, dom, healed, n: healed.length, uniq: new Set(healed).size };
  });
  if (reorder.before === reorder.after) fail('moveFx did not change the order');
  if (reorder.dom !== reorder.after) fail(`DOM order ${reorder.dom} does not match fxOrder ${reorder.after}`);
  if (reorder.healed[0] !== 'vig' || reorder.healed[1] !== 'blur') fail('fxOrder dropped a valid saved key');
  if (reorder.n !== passes.length || reorder.uniq !== passes.length) fail('fxOrder did not heal to the full pass set');
  console.log('  effect order reorders, persists to the DOM, and heals bad input');

  // 6d. grain and the glitch passes must be stable across renders at a fixed seed
  const stable = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    document.querySelector('#noise').value = '60';
    document.querySelector('#fxslice').value = '50';
    const sig = () => {
      render();
      const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
      let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;   // position-sensitive: for a 2-colour dither a plain sum only counts lit pixels, not where they are
      return s;
    };
    const a = sig(), b = sig();
    document.querySelector('#fxseed').value = '99';
    const c = sig();
    return { a, b, c };
  });
  if (stable.a !== stable.b) fail('grain/glitch output changed between renders at the same seed');
  if (stable.a === stable.c) fail('changing the seed did not change the output');
  console.log('  seeded passes are stable across renders and respond to the seed');

  // 6e. temporal variation: every mode must move the dither between frames,
  //     and an exported frame must match what playback showed at that index
  const tv = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    isVideo = true;                      // temporal() is gated on a clip
    document.querySelector('#algo').value = 'ord:bayer8';
    document.querySelector('#tvamt').value = '80';
    // "noise" mode only advances the seed, so something seeded has to be on for
    // it to have anything to move — grain is the cheapest.
    document.querySelector('#noise').value = '40';
    const modes = Array.from(document.querySelectorAll('#tvar option')).map(o => o.value);
    const sig = () => {
      render();
      const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
      let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;   // position-sensitive: for a 2-colour dither a plain sum only counts lit pixels, not where they are
      return s;
    };
    const res = {};
    for (const m of modes) {
      document.querySelector('#tvar').value = m;
      // sample a spread of frames: any single index can alias with a mode's
      // period (flicker's is ~9 frames, so frame 9 lands back on frame 0)
      frameIndex = 0; const a = sig();
      const others = [1, 2, 3, 5, 7, 11, 13].map(f => { frameIndex = f; return sig(); });
      frameIndex = 0; const c = sig();
      res[m] = { moves: others.some(s => s !== a), repeatable: a === c };
    }
    isVideo = false; frameIndex = 0;
    return res;
  });
  for (const [m, r] of Object.entries(tv)) {
    if (m === 'off') { if (r.moves) fail('temporal "off" still moved the dither'); continue; }
    if (!r.moves) fail(`temporal mode ${m} did not change between frames`);
    if (!r.repeatable) fail(`temporal mode ${m} is not a pure function of the frame index`);
  }
  console.log(`  ${Object.keys(tv).length} temporal modes: all move per frame and are frame-repeatable`);

  // 6f. ASCII character depth and offset
  await page.click('#mode button[data-mode="ascii"]');
  await page.waitForTimeout(120);
  const ramp = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    mode = 'ascii';
    document.querySelector('#charset').value = 'dense';
    render();
    const full = new Set(document.querySelector('#textout').value.replace(/\n/g, '')).size;
    document.querySelector('#cdepth').value = '4';
    render();
    const shallow = new Set(document.querySelector('#textout').value.replace(/\n/g, '')).size;
    document.querySelector('#cdepth').value = '0';
    document.querySelector('#choff').value = '60';
    render();
    const shifted = document.querySelector('#textout').value;
    document.querySelector('#choff').value = '0';
    render();
    const base = document.querySelector('#textout').value;
    return { full, shallow, shifted: shifted !== base };
  });
  if (!(ramp.shallow < ramp.full)) fail(`character depth 4 used ${ramp.shallow} glyphs, full ramp used ${ramp.full}`);
  if (ramp.shallow > 4) fail(`character depth 4 produced ${ramp.shallow} distinct glyphs`);
  if (!ramp.shifted) fail('character offset changed nothing');
  console.log(`  character depth narrows ${ramp.full} glyphs to ${ramp.shallow}; offset shifts the mapping`);

  // 6g. preset packs round-trip
  const pack = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    document.querySelector('#contrast').value = '42';
    userLooks = [captureLook('Test look')];
    const json = packJson();
    userLooks = [];
    const n = loadPack(json);
    const rows = document.querySelectorAll('#presetlist .row').length;
    applyLook(userLooks[0]);
    return { n, rows, contrast: document.querySelector('#contrast').value, json };
  });
  if (pack.n !== 1) fail(`preset pack round-tripped ${pack.n} looks, expected 1`);
  if (pack.contrast !== '42') fail(`pack look restored contrast ${pack.contrast}, expected 42`);
  const badPack = await page.evaluate(() => {
    try { loadPack('{"looks":[]}'); return 'accepted empty'; } catch (e) { /* expected */ }
    try { loadPack('not json'); return 'accepted garbage'; } catch (e) { /* expected */ }
    return 'ok';
  });
  if (badPack !== 'ok') fail('loadPack ' + badPack);
  console.log('  preset packs round-trip and reject bad input');

  // 6h. output size modes. The guarantee is that the scale is always a whole
  //     number and the result fits inside the target — never resampled onto it.
  const sizes = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    document.querySelector('#cols').value = '160';
    document.querySelector('#cell').value = '3';
    const res = [];
    const run = (label, set) => {
      for (const id in set) document.querySelector('#' + id).value = set[id];
      render();
      res.push({ label, scale: exportScale(), w: out.width, h: out.height });
    };
    run('multiplier 4', { sizemode: 'multiplier', oscale: '4' });
    run('multiplier 16', { sizemode: 'multiplier', oscale: '16' });
    run('long edge 2048', { sizemode: 'longedge', targetpx: '2048' });
    run('long edge 999', { sizemode: 'longedge', targetpx: '999' });
    for (const P of SIZE_PRESETS) {
      run('preset ' + P.k, { sizemode: 'preset', sizepreset: P.k });
      res[res.length - 1].target = { w: P.w, h: P.h };
    }
    return res;
  });
  for (const r of sizes) {
    if (!Number.isInteger(r.scale) || r.scale < 1) fail(`${r.label}: scale ${r.scale} is not a positive integer`);
    if (r.w > 8192 || r.h > 8192) fail(`${r.label}: ${r.w}x${r.h} exceeds the 8192 canvas limit`);
    if (r.target && (r.w > r.target.w || r.h > r.target.h))
      fail(`${r.label}: ${r.w}x${r.h} overflows its ${r.target.w}x${r.target.h} target`);
  }
  const le = sizes.find(r => r.label === 'long edge 2048');
  if (Math.max(le.w, le.h) > 2048) fail(`long edge 2048 produced ${le.w}x${le.h}`);
  console.log(`  ${sizes.length} size modes: every scale a whole number, every result inside its target`);

  // 6i. throttling must never change what a finished render looks like
  const perf = await page.evaluate(() => {
    applyCfg(DEFAULTS);
    document.querySelector('#cols').value = '600';
    document.querySelector('#algo').value = 'ed:jjn';
    const sig = () => {
      render();
      const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
      let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;
      return { s, w: out.width };
    };
    dragging = false; const settled = sig();
    // force the preview path: pretend a full render was expensive
    dragging = true; lastFullCost = 999; const preview = sig();
    dragging = false; lastFullCost = 0; const after = sig();

    // A real drag, unforced. Every frame of it has to stay a preview. Gating on
    // the previous render's cost rather than a full render's made this alternate
    // coarse/fine every frame — a cheap preview pulled the measurement under the
    // threshold, the next frame went full, and back — which is the bug that read
    // as the picture not tracking the slider.
    dragging = false; render();          // settle first, so a full cost is on record
    dragging = true;
    const run = [];
    for (let i = 0; i < 6; i++) {
      document.querySelector('#contrast').value = String(i * 5);
      render();
      run.push(out.width);
    }
    dragging = false;
    document.querySelector('#contrast').value = '0';
    return { settled, preview, after, run };
  });
  if (perf.settled.s !== perf.after.s) fail('a settled render differs before and after a drag');
  if (perf.preview.w >= perf.settled.w) fail('preview render was not smaller than the settled one');
  if (new Set(perf.run).size !== 1)
    fail('the preview grid oscillated during a drag: ' + perf.run.join(', '));
  if (perf.run[0] >= perf.settled.w)
    fail(`a drag rendered at the full ${perf.run[0]}px instead of previewing`);
  console.log(`  drag preview renders at ${perf.preview.w}px vs ${perf.settled.w}px settled, holds steady across a drag, and settles identically`);

  // 6j. image mode: the same pipeline with the quantizer taken off. It has to
  //     run every effect pass, keep continuous tone, treat the working size as
  //     a ceiling rather than a target, and leave nothing behind for the vector
  //     and text exporters to build a stale file out of.
  await page.click('#mode button[data-mode="image"]');
  await page.waitForTimeout(150);
  const imageMode = await page.evaluate(() => {
    const sig = () => {
      render();
      const w = Math.min(out.width, 400), h = Math.min(out.height, 300);
      const g = out.getContext('2d').getImageData(0, 0, w, h).data;
      let s = 0; const u = new Set();
      for (let i = 0; i < g.length; i += 4) {
        s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;   // position-sensitive, same as everywhere else here
        u.add(g[i] + ',' + g[i + 1] + ',' + g[i + 2]);
      }
      return { s, uniq: u.size, w: out.width, h: out.height };
    };
    const set = o => { for (const id in o) document.querySelector('#' + id).value = o[id]; };
    // DEFAULTS is mode:dither, colormode:mono — mono caps the output at 256
    // greys, which is adjust() doing its job, not the quantizer sneaking back in
    const reset = () => { applyCfg(DEFAULTS); mode = 'image'; colormode = 'color'; };

    reset();
    // the test card is 800x600: a 2048 ceiling must leave it alone, 480 shrinks it
    set({ imgres: 'src', imgpx: '1' });  const src = sig();
    set({ imgres: '2048' });             const ceil = sig();
    set({ imgres: '480' });              const small = sig();
    set({ imgres: 'src', imgpx: '8' });  const blocks = sig();

    // nothing wrote a palette grid or a glyph grid, so those exporters stay empty
    set({ imgpx: '1' }); render();
    const leftovers = { grid: !!lastGrid, text: !!lastText, svg: !!buildSvg(), html: !!buildHtml() };
    const fmts = ['png', 'svg', 'txt', 'html'].filter(f => fmtOk(f));

    reset();
    const base = sig().s;
    const dead = [];
    for (const k of Object.keys(FX)) {
      reset();
      const c = document.querySelector('#' + FX[k].ctrl);
      c.value = c.max;                  // full strength, so the pass has to show
      if (sig().s === base) dead.push(k);
    }
    reset(); render();
    return { src, ceil, small, blocks, leftovers, fmts, dead,
             colors: document.querySelector('#st-colors').textContent };
  });
  if (imageMode.src.w !== 800 || imageMode.src.h !== 600)
    fail(`image mode at source size gave ${imageMode.src.w}x${imageMode.src.h}, expected 800x600`);
  if (imageMode.ceil.w !== 800)
    fail(`a 2048px working size upscaled an 800px source to ${imageMode.ceil.w}px — it is a ceiling, not a target`);
  if (imageMode.small.w !== 480)
    fail(`a 480px working size gave ${imageMode.small.w}px`);
  if (imageMode.blocks.w !== 800)
    fail(`pixel size 8 changed the output size to ${imageMode.blocks.w}px`);
  if (imageMode.blocks.uniq >= imageMode.src.uniq)
    fail(`pixel size 8 did not reduce detail (${imageMode.blocks.uniq} vs ${imageMode.src.uniq} colours)`);
  if (imageMode.src.uniq < 500)
    fail(`image mode produced only ${imageMode.src.uniq} distinct colours — something is still quantizing`);
  if (imageMode.leftovers.grid || imageMode.leftovers.text)
    fail('image mode left a stale dither grid or glyph grid behind');
  if (imageMode.leftovers.svg || imageMode.leftovers.html)
    fail('image mode built vector/markup output out of nothing');
  if (imageMode.fmts.join(',') !== 'png')
    fail('image mode offers export formats it cannot fill: ' + imageMode.fmts.join(','));
  if (imageMode.dead.length)
    fail('effect passes that did nothing in image mode: ' + imageMode.dead.join(', '));
  if (!/continuous/.test(imageMode.colors))
    fail(`image mode status bar said "${imageMode.colors}"`);
  console.log(`  image mode: ${imageMode.src.uniq} colours undithered, all ${passes.length} passes apply, exporters stay empty`);

  // 6k. the panel itself. Mode gating is declared on the block rather than
  //     scattered through updateVisibility, and the disclosure level hides
  //     controls without touching a single value.
  const panel = await page.evaluate(() => {
    showTab('adjust');            // 6g left the Presets tab up; the rail controls live here
    const sig = () => {
      render();
      const g = out.getContext('2d').getImageData(0, 0, 200, 140).data;
      let s = 0; for (let i = 0; i < g.length; i += 4) s = (s * 31 + g[i] * 7 + g[i + 1] * 13 + g[i + 2] * 3) >>> 0;
      return s;
    };
    const gated = {}, bad = {};
    for (const m of ['dither', 'ascii', 'image']) {
      mode = m; updateVisibility();
      gated[m] = Array.from(document.querySelectorAll('#rail .blk[data-modes]'))
        .filter(b => !b.classList.contains('offmode')).map(b => b.id);
      bad[m] = gated[m].filter(id =>
        !document.querySelector('#' + id).dataset.modes.split(' ').includes(m));
    }
    mode = 'dither'; updateVisibility();
    const vis = () => Array.from(document.querySelectorAll('#rail [data-adv]'))
      .filter(e => e.offsetParent !== null).length;
    setUiLevel('all');   const all = sig(),   shown  = vis();
    setUiLevel('basic'); const basic = sig(), hidden = vis();
    // an advanced control away from its default must light the reveal button
    document.querySelector('#bias').value = '40';
    updateVisibility();
    const dot = document.querySelector('#uilevel .dot').classList.contains('on');
    applyCfg(DEFAULTS); updateVisibility();
    const dotClean = document.querySelector('#uilevel .dot').classList.contains('on');
    return { gated, bad, all, basic, shown, hidden, dot, dotClean,
             n: document.querySelectorAll('#rail [data-adv]').length };
  });
  for (const m of ['dither', 'ascii', 'image']) {
    if (!panel.gated[m].length) fail(`no mode-gated block is visible in ${m} mode`);
    if (panel.bad[m].length) fail(`blocks visible in ${m} that do not list it: ${panel.bad[m].join(', ')}`);
  }
  if (panel.gated.image.join(',') !== 'blk-image')
    fail('image mode still shows dither/ascii blocks: ' + panel.gated.image.join(', '));
  if (!panel.n) fail('nothing is marked data-adv');
  if (!panel.shown) fail('the All disclosure level showed no advanced controls');
  if (panel.hidden) fail(`${panel.hidden} advanced controls are still visible at Basic`);
  if (panel.all !== panel.basic) fail('the disclosure level changed the rendered output');
  if (!panel.dot) fail('an off-default advanced control did not mark the reveal button');
  if (panel.dotClean) fail('the reveal button stayed marked with everything at its default');
  console.log(`  mode gating covers 3 modes; ${panel.n} advanced controls hide at Basic without changing the picture`);

  // 6l. shortcut labels follow the platform. The bindings were always
  //     cross-platform — ⌘ and Ctrl arrive as metaKey and ctrlKey on the same
  //     event — so what this guards is the printed glyph: a Mac symbol shown to
  //     someone on Windows. The palette has to be open, since its hints are
  //     built by openCmd() rather than sitting in the markup.
  await page.evaluate(() => openCmd());
  await page.waitForTimeout(150);
  const keys = await page.evaluate(() => ({
    mac: ['MacIntel', 'iPhone', 'iPad', 'Mac OS X', 'macOS'].map(p => isMac(p)),
    other: ['Win32', 'Windows', 'Linux x86_64', 'Android', '', null].map(p => isMac(p)),
    here: MAC,
    macLabels: [kbd('k', false, true), kbd('z', true, true)].join(' '),
    winLabels: [kbd('k', false, false), kbd('z', true, false)].join(' '),
    // textContent, not innerText: half of this is deliberately hidden. Scoped to
    // the UI containers because <script> lives in <body> and is full of glyphs.
    ui: ['#titlebar', '#app', '#cmdcard', '#expcard']
      .map(s => document.querySelector(s).textContent).join(' '),
    labelled: document.querySelectorAll('[data-kbd]').length,
  }));
  await page.evaluate(() => closeCmd());
  if (keys.mac.some(v => !v)) fail('isMac rejected a macOS platform string');
  if (keys.other.some(v => v)) fail('isMac accepted a non-macOS platform string');
  if (keys.macLabels !== '⌘K ⇧⌘Z') fail(`mac labels came out as "${keys.macLabels}"`);
  if (keys.winLabels !== 'Ctrl+K Ctrl+Shift+Z') fail(`non-mac labels came out as "${keys.winLabels}"`);
  if (!keys.labelled) fail('nothing is marked data-kbd');
  if (!keys.here && /[⌘⇧]/.test(keys.ui)) fail('a Mac modifier glyph is printed on a non-Mac platform');
  if (keys.here && /Ctrl\+/.test(keys.ui)) fail('a Ctrl label is printed on a Mac');
  console.log(`  shortcut labels follow the platform (this one: ${keys.here ? 'mac' : 'ctrl'}), ${keys.labelled} declared`);

  // 6m. the font picker is a survey of the machine, not a bundle: 32 of the 34
  //     families are references to system faces. Installed ones must sort to the
  //     top so the list does not read as broken, and the rest must stay reachable.
  const fonts = await page.evaluate(() => {
    fontProps.clear(); fontClass = 'all';
    document.querySelector('#fontsearch').value = '';
    renderFontList();
    const meta = ensureFontMeta();
    const rows = Array.from(document.querySelectorAll('#fontlist .row'));
    const flags = rows.map(r => meta.get(r._f).installed);
    return {
      total: FONTS.length,
      listed: rows.length,
      installed: flags.filter(Boolean).length,
      // no installed family may appear after a missing one
      sorted: flags.every((v, i) => i === 0 || flags[i - 1] || !v),
      offClass: rows.filter(r => r.classList.contains('off')).length,
      count: document.querySelector('#fontcount').textContent,
      embedded: FONTS.filter(F => {
        const bare = F.v.split(',')[0].trim().replace(/^["']|["']$/g, '');
        return Array.from(document.fonts).some(f => f.family === bare);
      }).length,
    };
  });
  if (fonts.listed !== fonts.total) fail(`the unfiltered picker listed ${fonts.listed} of ${fonts.total} families`);
  if (!fonts.sorted) fail('an installed font sorted below a missing one');
  if (!fonts.installed) fail('no font in the catalogue resolved at all — the measurement is broken');
  if (fonts.offClass !== fonts.total - fonts.installed) fail('missing fonts are not all marked .off');
  if (!fonts.count.includes(String(fonts.installed))) fail(`#fontcount reads "${fonts.count}", not the installed count`);
  if (!fonts.embedded) fail('no catalogue family is actually embedded — IBM Plex Mono should be');
  console.log(`  font picker: ${fonts.installed}/${fonts.total} resolve here (${fonts.embedded} embedded), installed sort first`);

  // 6n. the algorithm picker. Every row previews the real algorithm, so the
  //     guard is that the thumbnails actually differ from one another — a
  //     placeholder, or a bug drawing the same key 52 times, would look fine.
  const picker = await page.evaluate(() => {
    const rows = () => Array.from(document.querySelectorAll('#algolist .row'));
    const reset = () => { algoFam = 'all'; document.querySelector('#algosearch').value = ''; renderAlgoList(); };
    reset();
    const all = rows().length;
    const sigOf = k => {
      const c = document.createElement('canvas'); c.width = 26; c.height = 20;
      algoThumbTo(k, c);
      const d = c.getContext('2d').getImageData(0, 0, 26, 20).data;
      let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] * 7) >>> 0;
      return s;
    };
    const distinct = new Set(ALGO_KEYS.map(sigOf)).size;
    algoFam = 'ed'; renderAlgoList(); const ed = rows().length;
    algoFam = 'ord'; renderAlgoList(); const ord = rows().length;
    reset();
    document.querySelector('#algosearch').value = 'atkinson'; renderAlgoList();
    const searched = rows().map(r => r.dataset.algo);
    document.querySelector('#algosearch').value = 'nothingmatchesthis'; renderAlgoList();
    const emptyRows = rows().length, emptyNote = document.querySelector('#algoempty').classList.contains('on');
    reset();
    // clicking a row must drive the same hidden select the rest of the file reads
    const before = document.querySelector('#algo').value;
    rows().find(r => r.dataset.algo === 'ord:bayer8').click();
    const picked = document.querySelector('#algo').value;
    document.querySelector('#algo').value = before; renderAlgoList();
    return { all, ed, ord, distinct, searched, emptyRows, emptyNote, picked,
             total: ALGO_KEYS.length, selHidden: document.querySelector('#algo').classList.contains('hidden') };
  });
  if (picker.all !== picker.total) fail(`picker listed ${picker.all} of ${picker.total} algorithms`);
  if (picker.ed + picker.ord !== picker.total) fail(`family facets cover ${picker.ed + picker.ord} of ${picker.total}`);
  if (!picker.ed || !picker.ord) fail('a family facet matched nothing');
  if (picker.distinct < picker.total * 0.6)
    fail(`only ${picker.distinct} of ${picker.total} thumbnails are distinct — they are not rendering per algorithm`);
  if (!picker.searched.includes('ed:atkinson')) fail('search for "atkinson" did not find it');
  if (picker.emptyRows || !picker.emptyNote) fail('an empty search did not show the empty note');
  if (picker.picked !== 'ord:bayer8') fail(`clicking a row set #algo to ${picker.picked}`);
  if (!picker.selHidden) fail('the raw #algo select is still visible beside the picker');
  console.log(`  algorithm picker: ${picker.all} rows, ${picker.distinct} distinct previews, facets and search filter`);

  // 6o. embedded fonts. The catalogue used to dangle families that cannot
  //     legally be embedded and mostly do not resolve; the guarantees now are
  //     that no proprietary name is left, that every family claiming to be
  //     embedded really is, and that coverage is only asserted where it can be
  //     known — a measured glyph describes the fallback, not the family.
  const fonts2 = await page.evaluate(() => {
    const meta = ensureFontMeta();
    const loaded = new Set(); document.fonts.forEach(f => loaded.add(f.family));
    const rows = FONTS.map(F => ({ n: F.n, v: F.v, e: !!F.e, ...meta.get(F.v) }));
    const bare = F => F.v.split(',')[0].trim().replace(/^["']|["']$/g, '');
    return {
      total: FONTS.length,
      proprietary: FONTS.filter(F => /Consolas|Menlo|Monaco|SF Mono|Andale|Lucida Console/.test(F.n)).map(F => F.n),
      // a family flagged embedded must actually have a face in the document
      unbacked: FONTS.filter(F => F.e && !loaded.has(bare(F))).map(F => F.n),
      // and must never measure as missing
      notInstalled: rows.filter(r => r.e && !r.installed).map(r => r.n),
      // coverage may only be claimed where FONT_COVER or an explicit cov says so
      overclaimed: rows.filter(r => !r.known && (r.braille || r.ogham || r.runic || r.missing.length)).map(r => r.n),
      braille: rows.filter(r => r.braille).map(r => r.n),
      ogham: rows.filter(r => r.ogham).map(r => r.n),
      runic: rows.filter(r => r.runic).map(r => r.n),
      coverKeys: Object.keys(FONT_COVER).length,
    };
  });
  if (fonts2.proprietary.length) fail('proprietary families still in the catalogue: ' + fonts2.proprietary.join(', '));
  if (fonts2.unbacked.length) fail('families flagged e:true with no @font-face: ' + fonts2.unbacked.join(', '));
  if (fonts2.notInstalled.length) fail('embedded families measuring as not installed: ' + fonts2.notInstalled.join(', '));
  if (fonts2.overclaimed.length) fail('coverage claimed for unverifiable families: ' + fonts2.overclaimed.join(', '));
  if (!fonts2.coverKeys) fail('FONT_COVER is empty — tools/fonts.py did not write the manifest');
  for (const [k, list] of [['braille', fonts2.braille], ['ogham', fonts2.ogham], ['runic', fonts2.runic]])
    if (!list.length) fail(`no embedded family carries ${k}`);
  console.log(`  embedded fonts: ${fonts2.coverKeys} in the manifest, braille in ${fonts2.braille.length}, ogham in ${fonts2.ogham.length}, runic in ${fonts2.runic.length}`);

  // 6p. the scripts the picker now promises. Both are only usable because the
  //     cell is sized from the ramp rather than from 'M': Ogham is uniformly
  //     double-width, and the flat-ink path draws a whole row as one string, so
  //     an 'M'-sized cell laid the row out at half the width it needed.
  const scripts = await page.evaluate(() => {
    const uni = FONTS.find(F => F.n === 'GNU Unifont').v;
    const run = (charset, font, acols) => {
      applyCfg(DEFAULTS); mode = 'ascii';
      document.querySelector('#charset').value = charset;
      document.querySelector('#font').value = font;
      document.querySelector('#acols').value = String(acols);
      render();
      const text = document.querySelector('#textout').value;
      const lines = text.split('\n').filter(Boolean);
      return {
        distinct: new Set(Array.from(text.replace(/\n/g, ''))).size,
        widths: [...new Set(lines.map(l => Array.from(l).length))],
        w: out.width,
      };
    };
    return { ogham: run('ogham', uni, 60), runic: run('runes', uni, 60), latin: run('classic', uni, 60) };
  });
  for (const k of ['ogham', 'runic']) {
    const s = scripts[k];
    if (s.distinct < 4) fail(`${k} produced only ${s.distinct} distinct glyphs — it is rendering tofu`);
    if (s.widths.length !== 1) fail(`${k} rows came out ragged: ${s.widths.join(', ')}`);
  }
  // the proof that cellWidth() is reading the ramp: same columns, double the canvas
  if (!(scripts.ogham.w > scripts.latin.w * 1.5))
    fail(`ogham laid out at ${scripts.ogham.w}px against latin ${scripts.latin.w}px — the cell is still sized from 'M'`);
  console.log(`  ogham & runic render evenly; ogham sizes its own cell (${scripts.ogham.w}px vs latin ${scripts.latin.w}px)`);

  // 7. config round-trip — the check that actually catches a missing CFG_IDS entry
  const rt = await page.evaluate(() => {
    const before = JSON.stringify(readCfg());
    applyCfg(JSON.parse(before));
    return { before, after: JSON.stringify(readCfg()) };
  });
  if (rt.before !== rt.after) fail('applyCfg(readCfg()) is not a no-op');

  // 8. every control declared in CFG_IDS exists, and every rail control is bound
  const cfg = await page.evaluate(() => CFG_IDS.filter(id => !document.querySelector('#' + id)));
  if (cfg.length) fail('CFG_IDS entries with no element: ' + cfg.join(', '));

  if (shot) {
    await page.evaluate(() => applyLook(LOOKS.newsprint));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-dither.png' });
    await page.evaluate(() => applyLook(LOOKS.matrix));
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'shot-ascii.png' });
  }

  await browser.close();
  if (errors.length) {
    console.log('\nFAILURES:');
    for (const e of [...new Set(errors)].slice(0, 40)) console.log('  ' + e);
    process.exit(1);
  }
  console.log('\nsmoke: clean — no page errors, no console errors');
})();
