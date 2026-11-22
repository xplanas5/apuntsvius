"""Construcció d'Apunts Vius (sense dependències: només Python 3).

Ús:  python build.py

Genera:
  manifest.json, sw.js, icon-192.png, icon-512.png   (a l'arrel: GitHub Pages serveix l'arrel)
  www/              còpia de la web per a Capacitor (APK d'Android)
  app.html          versió d'un sol fitxer (CSS i JS en línia) per obrir-la sense servidor
"""
import json
import re
import shutil
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
WWW = ROOT / "www"
VERSION = "2.0.0"
WEB_FILES = ["index.html", "manifest.json", "sw.js", "icon-192.png", "icon-512.png"]
WEB_DIRS = ["css", "js"]

MANIFEST = {
    "name": "Apunts Vius",
    "short_name": "Apunts Vius",
    "description": "Fotos d'apunts convertides en apunts, simulacions, pràctica i examen. Sense IA.",
    "lang": "ca",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait",
    "background_color": "#f4f6fa",
    "theme_color": "#2546c4",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
    ],
}


def script_list() -> list[str]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    return re.findall(r'<script src="(js/[^"?]+)(?:\?v=[0-9a-f]+)?"></script>', html)


def service_worker() -> str:
    files = ["./", *WEB_FILES, "css/styles.css", *script_list()]
    return """/* Service worker: l'app funciona sense connexió un cop carregada.
   El motor d'OCR (Tesseract) i els diccionaris es desen la primera vegada que es fan servir. */
const CACHE = "apunts-vius-%s";
const FILES = %s;
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
""" % (VERSION, json.dumps(files, ensure_ascii=False))


def single_file() -> str:
    """app.html: tot en un fitxer (sense doctype: el format que accepta la publicació com a artefacte)."""
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    body = html[html.index("<body>") + 6: html.index("</body>")]
    body = re.sub(r'<script src="js/[^"]+"></script>\n?', "", body)
    body = re.sub(r"<!-- Ordre de càrrega.*?-->\n?", "", body)
    body = re.sub(r"<script>\s*/\* PWA.*?</script>\n?", "", body, flags=re.S)
    css = (ROOT / "css/styles.css").read_text(encoding="utf-8")
    js = "\n".join((ROOT / f).read_text(encoding="utf-8").replace('"use strict";\n', "", 1) for f in script_list())
    return f'<meta charset="utf-8">\n<title>Apunts Vius</title>\n<style>\n{css}\n</style>\n{body.strip()}\n<script>\n"use strict";\n{js}\n</script>\n'


def png(size: int) -> bytes:
    """Icona: fons blau amb una franja de marcador groc i línies de quadern."""
    blue, mark, white = (37, 70, 196), (255, 225, 77), (255, 255, 255)
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            fx, fy = x / size, y / size
            c = blue
            if 0.22 < fx < 0.78 and 0.30 < fy < 0.36:
                c = white
            if 0.22 < fx < 0.78 and 0.44 < fy < 0.50:
                c = white
            if 0.18 < fx < 0.82 and 0.56 < fy < 0.68:
                c = mark
            if 0.22 < fx < 0.60 and 0.74 < fy < 0.80:
                c = white
            row += bytes(c)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", raw) + chunk(b"IEND", b"")


def stamp_assets() -> None:
    """Afegeix ?v=<hash> als CSS i JS d'index.html perquè el navegador no faci servir versions antigues."""
    import hashlib
    p = ROOT / "index.html"
    html = p.read_text(encoding="utf-8")

    def h(path: str) -> str:
        return hashlib.sha1((ROOT / path).read_bytes()).hexdigest()[:8]

    html = re.sub(r'(src|href)="((?:js|css)/[^"?]+)(?:\?v=[0-9a-f]+)?"', lambda m: f'{m.group(1)}="{m.group(2)}?v={h(m.group(2))}"', html)
    p.write_text(html, encoding="utf-8")


def main() -> None:
    stamp_assets()
    (ROOT / "manifest.json").write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "sw.js").write_text(service_worker(), encoding="utf-8")
    (ROOT / "icon-192.png").write_bytes(png(192))
    (ROOT / "icon-512.png").write_bytes(png(512))
    (ROOT / ".nojekyll").write_text("", encoding="utf-8")
    WWW.mkdir(exist_ok=True)
    for f in WEB_FILES:
        shutil.copy2(ROOT / f, WWW / f)
    for d in WEB_DIRS:
        shutil.copytree(ROOT / d, WWW / d, dirs_exist_ok=True)
    (ROOT / "app.html").write_text(single_file(), encoding="utf-8")
    print("Fet: manifest.json, sw.js, icones, www/ (", len(script_list()), "scripts ) i app.html")


if __name__ == "__main__":
    main()
