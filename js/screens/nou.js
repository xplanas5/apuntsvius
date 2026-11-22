"use strict";
/* ---------- Vista: nou tema ---------- */
let newState = { photos: [], text: "", draft: null };
function viewNew(el) {
  if (newState.draft) return viewReview(el);
  el.innerHTML = `<div class="card stack"><span class="eyebrow">Nou tema</span><h1>Dels teus apunts a un tema d'estudi</h1>
    <p class="muted">Fes fotos dels apunts. L'app en llegeix el text amb <b>OCR</b>, al teu dispositiu i sense IA, i en detecta definicions, fórmules, passos, dates i errors típics. Després ho revises tot abans de crear el tema.</p>
    <details><summary>Com escriure els apunts perquè es detectin millor</summary><ul class="clean small" style="margin-top:8px">
      <li><b>Definicions:</b> «Massa: quantitat de matèria…» o «La massa és la quantitat de matèria…»</li>
      <li><b>Fórmules:</b> en una línia sola: «F = m · a». Per a les unitats: «m = massa (kg)».</li>
      <li><b>Procediments:</b> llista numerada (1. 2. 3.) sota un títol.</li>
      <li><b>Cronologia:</b> línies que comencen per l'any: «1665: Hooke observa…».</li>
      <li><b>Errors típics:</b> «No confondre massa amb pes» o «Compte: el pes no és la massa».</li>
      <li><b>Títols:</b> en majúscules o acabats en dos punts.</li></ul></details>
  </div>
  <div class="card stack">
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">
      <label class="f">Matèria<select id="mat"><option>Ciències de la Naturalesa</option><option>Biologia i Geologia</option><option>Física i Química</option><option>Matemàtiques</option><option>Tecnologia</option><option>Geografia i Història</option><option>Llengua catalana</option><option>Llengua castellana</option><option>Anglès</option><option>Filosofia</option><option>Economia</option><option>Altres</option></select></label>
      <label class="f">Curs<select id="curs"><option>1r ESO</option><option>2n ESO</option><option selected>3r ESO</option><option>4t ESO</option><option>1r Batxillerat</option><option>2n Batxillerat</option></select></label>
      <label class="f">Idioma dels apunts<select id="lang"><option value="cat">Català</option><option value="spa">Castellà</option><option value="eng">Anglès</option><option value="cat+spa">Català i castellà</option></select></label>
    </div>
    <div class="photo-btns">
      <button class="btn mark big" id="cam"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>${newState.photos.length ? "Fer una altra foto" : "Fer foto"}</button>
      <button class="btn big" id="gal"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9.6l4-4 3 3 5-5 4 4V6H4zm4 1.5A1.5 1.5 0 1 1 8 10.5 1.5 1.5 0 0 1 8 7.5z"/></svg>Triar de la galeria</button>
    </div>
    <p class="small muted">Consell: foto ben il·luminada, de prop i recta, una pàgina per foto. Funciona millor amb text imprès o lletra clara.</p>
    <div class="drop desk-only" id="drop" tabindex="0" role="button" aria-label="Arrossegar fotos"><span class="small muted">També pots arrossegar fotos aquí</span></div>
    <input type="file" id="fileCam" accept="image/*" capture="environment" hidden>
    <input type="file" id="file" accept="image/*" multiple hidden>
    <div class="thumbs" id="thumbs"></div>
    <div class="row"><label class="row small"><input type="checkbox" id="enh" checked> Millorar el contrast abans de llegir</label></div>
    <div class="row"><button class="btn small" id="ocr">Tornar a llegir les fotos</button><span class="small muted" id="ocrMsg"></span></div>
    <div class="progress" id="ocrBar" hidden><span style="width:0%"></span></div>
    <label class="f" for="txt">Text dels apunts <span class="small muted" style="font-weight:400">(corregeix aquí els errors de lectura, o enganxa-hi el text directament)</span></label>
    <textarea id="txt" style="min-height:220px;font-family:var(--f-mono);font-size:.88rem" placeholder="Aquí apareixerà el text llegit de les fotos.">${esc(newState.text)}</textarea>
    <div class="row"><button class="btn primary" id="analyze">Analitzar el text</button></div>
    <div id="genOut"></div>
  </div>
  <div class="card stack" id="imp-sec"><h2>Importar un tema</h2><p class="small muted">Per compartir temes entre docent i alumnat: a la pestanya Apunts, «Copiar JSON», i aquí, enganxar-lo.</p>
    <textarea id="imp" placeholder='Enganxa aquí el JSON del tema ({"titol": ...})'></textarea>
    <div class="row"><button class="btn" id="doImp">Importar</button></div><div id="impOut"></div></div>`;
  $("#txt", el).oninput = e => newState.text = e.target.value;
  $("#mat", el).onchange = e => { const v = e.target.value; $("#lang", el).value = v === "Llengua castellana" ? "spa" : v === "Anglès" ? "eng" : "cat"; };
  $("#doImp", el).onclick = () => { const out = $("#impOut", el); try { const raw = JSON.parse(($("#imp", el).value.match(/\{[\s\S]*\}/) || [""])[0]); addTopic(raw, out, $("#mat", el).value, $("#curs", el).value); } catch { out.innerHTML = `<div class="fb bad">No és un JSON vàlid. Comprova que l'has copiat sencer.</div>`; } };
  wirePhotos(el);
  $("#ocr", el).onclick = async () => {
    const todo = newState.photos.filter(p => p.blob && !p.read), blobs = todo.map(p => p.blob), msg = $("#ocrMsg", el), bar = $("#ocrBar", el), btn = $("#ocr", el);
    if (!blobs.length) { msg.textContent = newState.photos.length ? "Ja s'han llegit totes les fotos." : "Primer fes o tria alguna foto."; return; }
    btn.disabled = true; bar.hidden = false;
    try {
      const res = await runOCR(blobs, $("#lang", el).value, (p, m) => { $("span", bar).style.width = Math.round(p * 100) + "%"; msg.textContent = m; }, $("#enh", el).checked);
      todo.forEach(p => p.read = true);
      const txt = res.map(r => r.text.trim()).join("\n\n");
      newState.text = (newState.text ? newState.text + "\n\n" : "") + txt; $("#txt", el).value = newState.text;
      const conf = Math.round(res.reduce((s, r) => s + r.conf, 0) / res.length);
      msg.innerHTML = conf >= 75 ? `Fet. Lectura bona (${conf}% de confiança). Revisa el text i analitza'l.` : `<span style="color:var(--warn)">Lectura dubtosa (${conf}% de confiança). Corregeix el text, o prova amb més llum, més a prop o sense «millorar el contrast».</span>`;
      $("span", bar).style.width = "100%";
    } catch (e) {
      console.warn(e);
      msg.innerHTML = `<span style="color:var(--bad)">No s'ha pogut fer l'OCR en aquesta vista (cal connexió la primera vegada per descarregar el motor i l'idioma). Pots enganxar el text directament.</span>`; bar.hidden = true;
    } finally { btn.disabled = false; }
  };
  $("#analyze", el).onclick = () => {
    const text = $("#txt", el).value.trim(), out = $("#genOut", el);
    if (text.length < 40) { out.innerHTML = `<div class="fb warn">Cal més text per crear un tema.</div>`; return; }
    const d = extractTopic(text, { materia: $("#mat", el).value, curs: $("#curs", el).value });
    if (d.conceptes.length < 2 && !d.formules.length) { out.innerHTML = `<div class="fb warn"><b>Només s'han detectat ${d.conceptes.length} definicions.</b> Revisa el text: escriu les definicions com «Terme: definició» o «El terme és…» (mira els consells de dalt). També pots afegir conceptes a mà al pas següent.</div><div class="row"><button class="btn small" id="anyway">Continuar igualment</button></div>`; $("#anyway", out).onclick = () => { newState.draft = d; viewNew(el); }; return; }
    newState.draft = d; viewNew(el);
  };
}
function wirePhotos(el) {
  const file = $("#file", el), cam = $("#fileCam", el), drop = $("#drop", el), MAX = 10;
  const paint = () => { $("#thumbs", el).innerHTML = newState.photos.map((p, i) => `<div class="thumb"><img src="${p.url}" alt="Foto ${i + 1}"><div class="tb"><button class="btn small ghost" data-rot="${i}" aria-label="Girar">↻</button><button class="btn small ghost" data-rm="${i}" aria-label="Treure">✕</button></div></div>`).join(""); $$("[data-rot]", el).forEach(b => b.onclick = async () => { const p = newState.photos[+b.dataset.rot]; p.rot = (p.rot + 90) % 360; p.read = false; await prepPhoto(p); paint(); }); $$("[data-rm]", el).forEach(b => b.onclick = () => { newState.photos.splice(+b.dataset.rm, 1); paint(); }); };
  const add = async files => { for (const f of Array.from(files)) { if (newState.photos.length >= MAX) break; if (!/^image\//.test(f.type)) continue; const p = { file: f, rot: 0 }; try { await prepPhoto(p); newState.photos.push(p); } catch { } } paint(); const cb = $("#cam", el); if (cb && newState.photos.length) cb.lastChild.textContent = "Fer una altra foto"; if (newState.photos.some(p => !p.read)) $("#ocr", el).click(); };
  drop.onclick = () => file.click(); drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") file.click(); };
  $("#cam", el).onclick = () => cam.click(); $("#gal", el).onclick = () => file.click();
  file.onchange = e => { add(e.target.files); e.target.value = ""; }; cam.onchange = e => { add(e.target.files); e.target.value = ""; };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); }; drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); add(e.dataTransfer.files); };
  paint();
}
async function prepPhoto(p) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(p.file); });
  const max = 2400, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * sc), hh = Math.round(img.naturalHeight * sc), rot = p.rot % 180 !== 0;
  const cv = document.createElement("canvas"); cv.width = rot ? hh : w; cv.height = rot ? w : hh;
  const ctx = cv.getContext("2d"); ctx.translate(cv.width / 2, cv.height / 2); ctx.rotate(p.rot * Math.PI / 180); ctx.drawImage(img, -w / 2, -hh / 2, w, hh);
  p.blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.92));
  if (p.url) URL.revokeObjectURL(p.url); p.url = URL.createObjectURL(p.blob);
}

