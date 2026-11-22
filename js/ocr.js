"use strict";
/* ---------------- OCR al dispositiu ----------------
   Tesseract.js (codi obert). Sense IA generativa ni servidor.
   Cadena: foto → retall de la pàgina (4 cantonades, com un escàner) → redreçament de perspectiva
   → gris "sense retolador" → OCR per paraules
   → filtre de soroll (fotos, notes al marge) → detecció del retolador (==text marcat==). */
let tessLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tessLoading) return tessLoading;
  tessLoading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = TESS_URL; s.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error("no Tesseract")); s.onerror = () => rej(new Error("No s'ha pogut carregar el motor d'OCR")); document.head.appendChild(s); });
  tessLoading.catch(() => { tessLoading = null; });
  return tessLoading;
}
const loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/* ---------- Detecció automàtica de la pàgina ----------
   Pàgina clara sobre fons més fosc: màscara d'Otsu a baixa resolució i les 4 cantonades extremes. */
function detectPage(img) {
  const IW = img.naturalWidth || img.width, IH = img.naturalHeight || img.height, S = 320, sc = S / Math.max(IW, IH), w = Math.round(IW * sc), h = Math.round(IH * sc);
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), hist = new Array(256).fill(0);
  for (let i = 0, j = 0; i < d.length; i += 4, j++) { const v = Math.max(d[i], d[i + 1], d[i + 2]); g[j] = v; hist[v]++; }
  const thr = otsuThreshold(hist, g.length);
  let n = 0, tl = null, tr = null, br = null, bl = null, vtl = 1e9, vtr = -1e9, vbr = -1e9, vbl = 1e9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (g[y * w + x] <= thr) continue;
    // ignora píxels clars aïllats: cal un veí clar a dreta i a sota
    if (x + 2 >= w || y + 2 >= h || g[y * w + x + 2] <= thr || g[(y + 2) * w + x] <= thr) continue;
    n++;
    if (x + y < vtl) { vtl = x + y; tl = [x, y]; } if (x - y > vtr) { vtr = x - y; tr = [x, y]; }
    if (x + y > vbr) { vbr = x + y; br = [x, y]; } if (x - y < vbl) { vbl = x - y; bl = [x, y]; }
  }
  const full = [[0, 0], [IW, 0], [IW, IH], [0, IH]];
  if (!tl || n < w * h * 0.25 || n > w * h * 0.97) return full;
  // si la part clara toca les vores de la foto, la pàgina omple el quadre: millor no retallar
  const lit = (x, y) => g[y * w + x] > thr, frac = (len, f) => { let c = 0; for (let i = 0; i < len; i++) if (f(i)) c++; return c / len; };
  const touching = [frac(w, x => lit(x, 1)), frac(w, x => lit(x, h - 2)), frac(h, y => lit(1, y)), frac(h, y => lit(w - 2, y))].filter(f => f > 0.3).length;
  if (touching >= 2) return full;
  const q = [tl, tr, br, bl].map(([x, y]) => [x / sc, y / sc]);
  return quadArea(q) > 0.3 * IW * IH ? q : full;
}
function otsuThreshold(hist, total) {
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / wF, b = wB * wF * (mB - mF) ** 2; if (b > best) { best = b; t = i; } }
  return t;
}
const quadArea = q => Math.abs(q.reduce((s, [x, y], i) => { const [x2, y2] = q[(i + 1) % 4]; return s + x * y2 - x2 * y; }, 0)) / 2;

/* ---------- Redreçament de perspectiva (homografia) ---------- */
function homography(src, dst) {
  // troba H tal que dst = H·src (8 incògnites) per eliminació gaussiana
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  return [...b.map((v, i) => v / A[i][i]), 1];
}
function warpPage(img, quad, targetW = 2600) {
  const IW = img.naturalWidth || img.width, IH = img.naturalHeight || img.height;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const isFull = quad.every(([x, y], i) => dist([x, y], [[0, 0], [IW, 0], [IW, IH], [0, IH]][i]) < Math.max(IW, IH) * 0.015);
  let flat;
  if (isFull) flat = img; // la foto ja és la pàgina: no cal redreçar (i així no es perd nitidesa)
  else {
    // redreçament a mida real (bilineal 1:1) i ampliació després amb el redimensionat suau del navegador
    const wq = Math.max(dist(quad[0], quad[1]), dist(quad[3], quad[2])), hq = Math.max(dist(quad[0], quad[3]), dist(quad[1], quad[2]));
    const W = Math.round(wq), H = Math.round(hq);
    const sc = document.createElement("canvas"); sc.width = IW; sc.height = IH;
    const sctx = sc.getContext("2d"); sctx.drawImage(img, 0, 0); const S = sctx.getImageData(0, 0, IW, IH).data;
    const Hm = homography([[0, 0], [W, 0], [W, H], [0, H]], quad); // sortida → origen
    flat = document.createElement("canvas"); flat.width = W; flat.height = H;
    const fctx = flat.getContext("2d"), O = fctx.createImageData(W, H), od = O.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const z = Hm[6] * x + Hm[7] * y + 1, sx = (Hm[0] * x + Hm[1] * y + Hm[2]) / z, sy = (Hm[3] * x + Hm[4] * y + Hm[5]) / z;
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, o = (y * W + x) * 4;
      od[o + 3] = 255;
      if (x0 < 0 || y0 < 0 || x0 + 1 >= IW || y0 + 1 >= IH) { od[o] = od[o + 1] = od[o + 2] = 255; continue; }
      const i00 = (y0 * IW + x0) * 4, i10 = i00 + 4, i01 = i00 + IW * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) od[o + c] = (S[i00 + c] * (1 - fx) + S[i10 + c] * fx) * (1 - fy) + (S[i01 + c] * (1 - fx) + S[i11 + c] * fx) * fy;
    }
    fctx.putImageData(O, 0, 0);
  }
  const fw = flat.naturalWidth || flat.width, fh = flat.naturalHeight || flat.height, k = Math.min(3, targetW / fw);
  const out = document.createElement("canvas"); out.width = Math.round(fw * k); out.height = Math.round(fh * k);
  const octx = out.getContext("2d"); octx.imageSmoothingQuality = "high"; octx.drawImage(flat, 0, 0, out.width, out.height);
  return out;
}

/* ---------- Imatge per a l'OCR ----------
   max(R,G,B): el retolador (lila, verd, groc…) queda clar i el text negre continua fosc.
   (Provat amb fotos reals: millor que binaritzar o estirar el contrast.) */
function ocrCanvas(color) {
  const w = color.width, h = color.height, d = color.getContext("2d").getImageData(0, 0, w, h), px = d.data;
  for (let i = 0; i < px.length; i += 4) { const v = Math.max(px[i], px[i + 1], px[i + 2]); px[i] = px[i + 1] = px[i + 2] = v; }
  const out = document.createElement("canvas"); out.width = w; out.height = h; out.getContext("2d").putImageData(d, 0, 0);
  return out;
}
/* Fracció del fons d'una paraula que és de color saturat (retolador) */
function markerRatio(ctx, b) {
  const w = b.x1 - b.x0, h = b.y1 - b.y0; if (w < 3 || h < 3) return 0;
  const sat = (d, i) => { const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); return mx < 90 ? -1 : (mx - mn) / mx; };
  // referència: el paper just a sobre de la paraula (la llum càlida o el paper groguenc no compten com a retolador)
  const sy = Math.max(0, Math.round(b.y0 - h * 0.7)), sh = Math.max(1, Math.round(h * 0.45));
  const ref = ctx.getImageData(b.x0, sy, w, sh).data, rs = [];
  for (let i = 0; i < ref.length; i += 4) { const v = sat(ref, i); if (v >= 0) rs.push(v); }
  rs.sort((x, y) => x - y);
  const base = rs.length ? rs[Math.floor(rs.length * 0.3)] : 0;
  const d = ctx.getImageData(b.x0, b.y0, w, h).data; let hl = 0, bg = 0;
  for (let i = 0; i < d.length; i += 4) { const v = sat(d, i); if (v < 0) continue; bg++; if (v > Math.max(0.18, base + 0.12)) hl++; }
  return bg ? hl / bg : 0;
}

/* ---------- Text net a partir de les línies de Tesseract ---------- */
function linesToText(data, colorCanvas) {
  const ctx = colorCanvas.getContext("2d");
  const lines = (data.lines || []).filter(l => l.words && l.words.length);
  let kept = 0, dropped = 0, marked = 0, prevBottom = null;
  const hs = lines.map(l => l.bbox.y1 - l.bbox.y0).sort((a, b) => a - b), lineH = hs[Math.floor(hs.length / 2)] || 30;
  const out = [];
  for (const l of lines) {
    const ws = l.words, mean = ws.reduce((s, w) => s + w.confidence, 0) / ws.length, weak = ws.filter(w => w.confidence < 60).length / ws.length;
    const letters = l.text.replace(/[^A-Za-zÀ-ÿ]/g, "").length / Math.max(1, l.text.replace(/\s/g, "").length);
    // línies de fotos, collages o notes a mà: confiança baixa o pocs caràcters de text
    if (mean < 50 || weak > 0.6 || (letters < 0.5 && !/^\s*\d+[.)]/.test(l.text))) { dropped++; continue; }
    if (/^\s*\d{1,3}\s*$/.test(l.text)) { dropped++; continue; } // número de pàgina
    kept++;
    if (prevBottom !== null && l.bbox.y0 - prevBottom > lineH * 0.9) out.push("");
    prevBottom = l.bbox.y1;
    const toks = ws.filter(w => w.confidence >= 30).map(w => ({ t: w.text, hl: markerRatio(ctx, w.bbox) > 0.35 }));
    // un forat d'una sola paraula dins d'un tram marcat també compta com a marcat
    toks.forEach((k, i) => { if (!k.hl && toks[i - 1] && toks[i + 1] && toks[i - 1].hl && toks[i + 1].hl) k.hl = true; });
    const parts = toks.map((k, i) => { const start = k.hl && !(toks[i - 1] && toks[i - 1].hl), end = k.hl && !(toks[i + 1] && toks[i + 1].hl); if (start) marked++; return (start ? "==" : "") + k.t + (end ? "==" : ""); });
    out.push(parts.join(" "));
  }
  return { text: out.join("\n"), kept, dropped, marked };
}

async function runOCR(pages, lang, onProgress) {
  const T = await loadTesseract();
  let cur = 0;
  const worker = await T.createWorker(lang, 1, { logger: m => { if (m.status === "recognizing text") onProgress((cur + m.progress) / pages.length, `Llegint la pàgina ${cur + 1} de ${pages.length}`); else onProgress(cur / pages.length, m.status === "loading language traineddata" ? "Descarregant el diccionari de l'idioma (només la primera vegada)" : "Preparant el motor d'OCR"); } });
  const res = [];
  try {
    for (cur = 0; cur < pages.length; cur++) {
      const color = pages[cur];
      const { data } = await worker.recognize(ocrCanvas(color));
      const r = linesToText(data, color);
      res.push({ ...r, conf: data.confidence || 0 });
    }
  } finally { await worker.terminate(); }
  return res;
}
