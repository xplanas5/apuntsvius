"use strict";
/* OCR al dispositiu amb Tesseract.js (codi obert, sense IA generativa ni servidor) */
/* ---------- OCR ---------- */
let tessLoading = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tessLoading) return tessLoading;
  tessLoading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = TESS_URL; s.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error("no Tesseract")); s.onerror = () => rej(new Error("No s'ha pogut carregar el motor d'OCR")); document.head.appendChild(s); });
  tessLoading.catch(() => { tessLoading = null; });
  return tessLoading;
}
async function enhance(blob) {
  // Escala de grisos + estirament de contrast + binarització d'Otsu: millora molt l'OCR de fotos
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
  const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, cv.width, cv.height), px = d.data, hist = new Array(256).fill(0), g = new Uint8ClampedArray(px.length / 4);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) { const v = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0; g[j] = v; hist[v]++; }
  let total = g.length, sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, thr = 128;
  for (let i = 0; i < 256; i++) { wB += hist[i]; if (!wB) continue; const wF = total - wB; if (!wF) break; sumB += i * hist[i]; const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) ** 2; if (between > best) { best = between; thr = i; } }
  for (let i = 0, j = 0; i < px.length; i += 4, j++) { const v = g[j] > thr ? 255 : 0; px[i] = px[i + 1] = px[i + 2] = v; }
  ctx.putImageData(d, 0, 0);
  return await new Promise(r => cv.toBlob(r, "image/png"));
}
async function runOCR(blobs, lang, onProgress, useEnhance) {
  const T = await loadTesseract();
  let cur = 0;
  const worker = await T.createWorker(lang, 1, { logger: m => { if (m.status === "recognizing text") onProgress((cur + m.progress) / blobs.length, `Llegint la foto ${cur + 1} de ${blobs.length}`); else onProgress(cur / blobs.length, m.status === "loading language traineddata" ? "Descarregant el diccionari de l'idioma (només la primera vegada)" : "Preparant el motor d'OCR"); } });
  const texts = [];
  try {
    for (cur = 0; cur < blobs.length; cur++) {
      const input = useEnhance ? await enhance(blobs[cur]) : blobs[cur];
      const { data } = await worker.recognize(input);
      texts.push({ text: data.text || "", conf: data.confidence || 0 });
    }
  } finally { await worker.terminate(); }
  return texts;
}

