// Slices the pure quantiser functions out of index.html and exercises them
// against a fake ImageData. Per docs/ARCHITECTURE.md.
const fs = require('fs');
const path = process.argv[2] || require('path').join(__dirname, '..', 'index.html');
const h = fs.readFileSync(path, 'utf8');
const js = h.match(/<script>([\s\S]*?)<\/script>/)[1];

// pull just the algorithm + quantize regions, which have no DOM dependency
function region(from, to){
  const a = js.indexOf(from), b = js.indexOf(to);
  if(a < 0 || b < 0) throw new Error(`region not found: ${from} .. ${to}`);
  return js.slice(a, b);
}
const src = region('/* ---------- algorithms ----------', '/* ---------- palettes ----------')
          + region('/* ---------- quantize ----------', '/* ---------- median cut extraction ----------');

// Stub v()/num() off the real control defaults declared in the HTML, so the
// parametric screens are exercised at the settings the app actually boots with.
const DEF = {};
for(const m of h.matchAll(/<(?:input|select)\b[^>]*id="([\w-]+)"[^>]*>/g)){
  const val = /value="([^"]*)"/.exec(m[0]);
  const sel = /<option value="([^"]*)"[^>]*selected/.exec(m[0]);
  DEF[m[1]] = sel ? sel[1] : (val ? val[1] : '');
}
// selects declare their default as the first <option>; grab those too
for(const m of h.matchAll(/<select\b[^>]*id="([\w-]+)"[^>]*>([\s\S]*?)<\/select>/g)){
  const first = /<option value="([^"]*)"/.exec(m[2]);
  if(first && !DEF[m[1]]) DEF[m[1]] = first[1];
}
const vStub = id => DEF[id] ?? '';
const numStub = id => parseFloat(DEF[id]) || 0;

const fn = new Function('v', 'num',
  `${src}; return {ED, ORD, ALGO_INFO, ditherPixels, nearest, stepGuess, normMat, bayer, HT_SHAPES};`);
const M = fn(vStub, numStub);

const mk = (w,h) => ({ data: new Uint8ClampedArray(w*h*4).fill(255) });
function ramp(w,h){
  const d = mk(w,h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const g = Math.round(x/(w-1)*255), i=(y*w+x)*4;
    d.data[i]=d.data[i+1]=d.data[i+2]=g; d.data[i+3]=255;
  }
  return d;
}
const BW = [[0,0,0],[255,255,255]];
const OPTS = {strength:1, spread:1, bias:0, serp:true};

let fails = 0, checks = 0;
function ok(cond, msg){ checks++; if(!cond){ fails++; console.log('  FAIL ' + msg); } }

// --- 1. every algorithm: output pixels must land exactly on palette entries ---
// --- 2. a luminance ramp must dither to monotonically increasing density ---
const W = 128, H = 32, BINS = 8;
const keys = [...Object.keys(M.ED).map(k=>'ed:'+k), ...Object.keys(M.ORD).map(k=>'ord:'+k)];
// Kernels that deliberately throw the error away in one direction cannot
// reproduce tone — that is the point of them. Everything else must.
const skipMono = new Set(['ed:smear','ed:fall','ed:diagdrift','ed:updown','ed:split']);

for(const key of keys){
  const d = ramp(W,H);
  try { M.ditherPixels(d, W, H, BW, key, OPTS); }
  catch(e){ checks++; fails++; console.log(`  FAIL ${key}: threw ${e.message}`); continue; }

  const a = d.data;
  let offPalette = 0;
  for(let i=0;i<a.length;i+=4){
    const r=a[i],g=a[i+1],b=a[i+2];
    if(!((r===0&&g===0&&b===0)||(r===255&&g===255&&b===255))) offPalette++;
  }
  ok(offPalette===0, `${key}: ${offPalette} pixels off-palette`);

  if(skipMono.has(key)) continue;
  const bin = new Array(BINS).fill(0);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    if(a[(y*W+x)*4] > 127) bin[Math.floor(x/(W/BINS))]++;
  }
  let mono = true;
  for(let i=1;i<BINS;i++) if(bin[i] < bin[i-1]) mono = false;
  ok(mono, `${key}: density not monotonic — [${bin.join(', ')}]`);
}

// --- 3. ALGO_INFO must cover every algorithm key ---
for(const key of keys){
  const info = M.ALGO_INFO[key];
  ok(!!info, `ALGO_INFO missing entry for ${key}`);
  if(info) ok(info.b && info.p && info.c && info.f, `ALGO_INFO[${key}] has an empty field`);
}

// --- 4. ordered matrices must be well-formed: in (0,1), no duplicates ---
for(const k in M.ORD){
  const O = M.ORD[k];
  if(!O.m || O.fn || O.make) continue;
  const flat = O.m.flat();
  ok(flat.every(v=>v>0 && v<1), `ORD.${k}: thresholds outside (0,1)`);
  ok(new Set(flat).size === flat.length, `ORD.${k}: duplicate thresholds (transcription error?)`);
  ok(O.m.every(r=>r.length===O.m[0].length), `ORD.${k}: ragged matrix`);
}

// --- 5. error-diffusion kernels must conserve ink: mean out ≈ mean in ---
for(const k in M.ED){
  if(skipMono.has('ed:'+k)) continue;
  const d = ramp(W,H);
  M.ditherPixels(d, W, H, BW, 'ed:'+k, OPTS);
  let sum=0; for(let i=0;i<d.data.length;i+=4) sum += d.data[i];
  const mean = sum/(W*H);
  ok(Math.abs(mean-127.5) < 14, `ed:${k}: mean output ${mean.toFixed(1)} drifts from input 127.5`);
}

// --- 6. weights must sum to the stated divisor, except where a kernel
//        deliberately discards error (Atkinson's whole character is losing 1/4)
const LOSSY = new Set(['atkinson']);
for(const k in M.ED){
  const E = M.ED[k];
  if(!E.m) continue;                 // curve-traversal kernels have no matrix
  const sum = E.m.reduce((s,[,,w])=>s+w, 0);
  if(LOSSY.has(k)) ok(sum < E.d, `ed:${k}: expected a lossy kernel, weights sum to the divisor`);
  else ok(sum === E.d, `ed:${k}: weights sum to ${sum} but divisor is ${E.d}`);
}

console.log(`\n${checks - fails}/${checks} checks passed` + (fails ? `  — ${fails} FAILED` : '  — all good'));
process.exit(fails ? 1 : 0);
