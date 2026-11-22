/* Service worker: l'app funciona sense connexió un cop carregada.
   El motor d'OCR (Tesseract) i els diccionaris es desen la primera vegada que es fan servir. */
const CACHE = "apunts-vius-2.0.0";
const FILES = ["./", "index.html", "manifest.json", "sw.js", "icon-192.png", "icon-512.png", "css/styles.css", "js/util.js", "js/fsrs.js", "js/state.js", "js/demo-temes.js", "js/generators.js", "js/sfx.js", "js/game.js", "js/ocr.js", "js/extractor.js", "js/claude-reader.js", "js/screens/inici.js", "js/screens/apunts.js", "js/screens/lab.js", "js/screens/practica.js", "js/screens/examen.js", "js/screens/progres.js", "js/screens/nou.js", "js/screens/revisio.js", "js/router.js", "js/main.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== "ocr").map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (/tesseract|tessdata/.test(u.href)) { // OCR: primer la memòria cau (són fitxers grans i no canvien)
    e.respondWith(caches.open("ocr").then(c => c.match(e.request).then(r => r || fetch(e.request).then(n => { if (n.ok) c.put(e.request, n.clone()); return n; }))));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
