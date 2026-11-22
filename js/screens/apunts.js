"use strict";
/* ---------- Apunts ---------- */
let coverMode = false;
function viewNotes(el) {
  const t = topicById(S.active); if (!t) return go("inici");
  const C = COMPILED[t.id], flagged = t.conceptes.filter(c => c.dubtos).length + C.formules.filter(f => f.dubtos).length;
  const sections = [["resum", "Resum"], ["esquema", "Esquema"], ["glossari", "Glossari"], C.formules.length && ["formules", "Fórmules"], t.procediments.length && ["procediments", "Procediments"], t.relacions.length && ["mapa", "Mapa conceptual"], t.cronologia.length && ["cronologia", "Cronologia"], t.errors_tipics.length && ["compte", "Compte!"]].filter(Boolean);
  el.innerHTML = `
  <div class="card stack">
    <div class="row" style="justify-content:space-between"><div class="stack" style="gap:4px"><span class="eyebrow">${esc(t.materia)} ${t.curs ? "· " + esc(t.curs) : ""}</span><h1>${esc(t.titol)}</h1></div>
    <div class="row"><button class="btn primary" id="toPractice">Practicar aquest tema</button>${!t.demo ? `<button class="btn ghost small" id="exportT">Copiar JSON</button><button class="btn ghost small" id="delT">Esborrar tema</button>` : ""}</div></div>
    ${!t.demo ? `<p class="ai-note">Contingut extret automàticament (OCR i regles) a partir de les teves fotos: pot tenir errors de lectura. ${flagged ? `Hi ha <b>${flagged}</b> element${flagged > 1 ? "s" : ""} marcat${flagged > 1 ? "s" : ""} com a dubtós${flagged > 1 ? "os" : ""}: comprova'ls amb els apunts originals.` : "Cada concepte mostra el fragment de l'apunt d'on surt."}</p>` : `<p class="small muted">Tema d'exemple per provar l'app. Crea'n un amb les teves fotos amb el botó de la càmera.</p>`}
    <div id="delConfirm"></div>
  </div>
  <div class="notes-layout">
    <nav class="toc card" aria-label="Seccions">${sections.map(([id, n]) => `<a href="#apunts" data-sec="${id}">${n}</a>`).join("")}</nav>
    <div class="stack">
      <section class="card stack" id="s-resum"><h2>Resum</h2><p>${esc(t.resum)}</p>${recallBox(t, 0)}</section>
      <section class="card stack" id="s-esquema"><h2>Esquema</h2>${t.seccions.map(s => `<div class="stack" style="gap:6px"><h3>${esc(s.titol)}</h3><ul class="clean">${s.punts.map(p => `<li>${esc(p)}</li>`).join("")}</ul></div>`).join("")}${recallBox(t, 1)}</section>
      <section class="card stack" id="s-glossari"><div class="row" style="justify-content:space-between"><h2>Glossari</h2><label class="row small"><input type="checkbox" id="cover" ${coverMode ? "checked" : ""}> Tapa i recorda</label></div>
        <p class="small muted">${coverMode ? "Intenta recordar cada definició abans de tocar-la per destapar-la." : "Activa «Tapa i recorda» per amagar les definicions i posar-te a prova."}</p>
        <div class="gloss">${t.conceptes.map(c => `<div class="term ${c.dubtos ? "flag" : ""}" data-cid="${c.id}"><h3><span class="hl">${esc(c.nom)}</span> ${stateChip(t.id, "c:" + c.id)}</h3><p class="def ${coverMode ? "covered" : ""}" tabindex="0">${esc(c.definicio)}</p>${c.exemple ? `<p class="small muted">Ex.: ${esc(c.exemple)}</p>` : ""}${c.font ? `<p class="src">«${esc(c.font)}»</p>` : ""}${c.dubtos ? `<p class="small" style="color:var(--warn)"><b>Dubtós:</b> ${esc(c.motiu || "comprova-ho amb la foto")}</p><div class="row"><button class="btn small" data-okc="${c.id}">És correcte</button><button class="btn small ghost" data-rmc="${c.id}">Treure'l</button></div>` : ""}</div>`).join("")}</div></section>
      ${C.formules.length ? `<section class="card stack" id="s-formules"><h2>Fórmules</h2>${C.formules.map(f => `<div class="stack" style="gap:6px"><h3>${esc(f.nom)}</h3><span class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)}</span><p class="small muted">${[`${esc(f.lhs)}: ${esc(f.res.nom)} (${esc(f.res.unitat)})`, ...f.vars.map(v => `${esc(v.simbol)}: ${esc(v.nom)} (${esc(v.unitat)})`), ...f.constList.map(c => `${esc(c.simbol)} = ${fmt(c.valor)} ${esc(c.unitat || "")}`)].join(" · ")}</p>${f.errors.length ? `<p class="small"><b>Errors habituals:</b> ${f.errors.map(e => esc(e.explicacio)).join(" ")}</p>` : ""}</div>`).join('<div class="sep"></div>')}<div class="row"><button class="btn small" data-go="lab">Obrir el laboratori</button></div></section>` : ""}
      ${t.procediments.length ? `<section class="card stack" id="s-procediments"><h2>Procediments</h2>${t.procediments.map(p => `<div class="stack" style="gap:6px"><h3>${esc(p.nom)}</h3><ol class="steps">${p.passos.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>`).join("")}</section>` : ""}
      ${t.relacions.length ? `<section class="card stack" id="s-mapa"><h2>Mapa conceptual</h2><div class="map-wrap">${conceptMap(t)}</div></section>` : ""}
      ${t.cronologia.length ? `<section class="card stack" id="s-cronologia"><h2>Cronologia</h2><div class="tl">${t.cronologia.slice().sort((a, b) => parseFloat(a.any) - parseFloat(b.any)).map(e => `<div><b>${esc(e.any)}</b> · ${esc(e.fet)}</div>`).join("")}</div></section>` : ""}
      ${t.errors_tipics.length ? `<section class="card stack" id="s-compte"><h2>Compte! Errors típics</h2>${t.errors_tipics.map(e => `<div class="fb bad"><p><b>Error:</b> ${esc(e.afirmacio_erronia)}</p><p><b>En realitat:</b> ${esc(e.correccio)}</p></div>`).join("")}</section>` : ""}
    </div>
  </div>`;
  $$("[data-sec]", el).forEach(a => a.onclick = e => { e.preventDefault(); const s = $("#s-" + a.dataset.sec); if (s) s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); });
  $("#cover", el).onchange = e => { coverMode = e.target.checked; viewNotes(el); };
  $$(".def.covered", el).forEach(d => { const un = () => d.classList.remove("covered"); d.onclick = un; d.onkeydown = e => { if (e.key === "Enter" || e.key === " ") un(); }; });
  $$("[data-go]", el).forEach(b => b.onclick = () => go(b.dataset.go));
  $("#toPractice", el).onclick = () => { startPractice([t.id]); go("practica"); };
  $$("[data-okc]", el).forEach(b => b.onclick = () => { const c = conceptById(t, b.dataset.okc); c.dubtos = false; save(); viewNotes(el); });
  $$("[data-rmc]", el).forEach(b => b.onclick = () => { t.conceptes = t.conceptes.filter(c => c.id !== b.dataset.rmc); save(); viewNotes(el); });
  const ex = $("#exportT", el); if (ex) ex.onclick = () => copyText(JSON.stringify(t, null, 2), ex);
  const del = $("#delT", el); if (del) del.onclick = () => { $("#delConfirm", el).innerHTML = `<div class="fb bad"><p>Segur que vols esborrar «${esc(t.titol)}» i el seu progrés? No es pot desfer.</p><div class="row"><button class="btn small" id="delYes">Sí, esborra'l</button><button class="btn small ghost" id="delNo">Cancel·la</button></div></div>`; $("#delYes").onclick = () => { delete S.topics[t.id]; delete S.prog[t.id]; delete COMPILED[t.id]; S.active = null; save(); Router.root("inici"); }; $("#delNo").onclick = () => $("#delConfirm", el).innerHTML = ""; };
  $$(".recall", el).forEach(wireRecall);
}
function stateChip(tid, key) { const s = stateOf(peekCard(tid, key)); return `<span class="pill ${["", "blue", "blue", "mark"][s]}" style="font-size:.68rem">${STATE_KEYS[s]}</span>`; }
function recallBox(t, i) {
  const pool = t.conceptes.filter(c => c.nom); if (!pool.length) return "";
  const c = pool[(i * 3 + 1) % pool.length];
  return `<div class="fb hint recall" data-cid="${c.id}" data-tid="${t.id}"><h3>Tapa i recorda</h3><p>Sense mirar: com es diu? <i>${esc(c.definicio)}</i></p><div class="row"><input type="text" aria-label="Resposta" style="max-width:260px"><button class="btn small">Comprova</button></div><p class="out small"></p></div>`;
}
function wireRecall(box) {
  const t = topicById(box.dataset.tid), c = conceptById(t, box.dataset.cid), inp = $("input", box), out = $(".out", box);
  const it = makeItem(t.id, "c:" + c.id, { type: "short" });
  const go2 = () => { const r = it.check(inp.value); out.innerHTML = r.ok ? `<b style="color:var(--ok)">Correcte!</b> ${esc(r.note || "")}` : `<b style="color:var(--bad)">Encara no.</b> ${esc(r.diag)} <button class="btn small ghost" data-rev>Mostra la resposta</button>`; const rv = $("[data-rev]", out); if (rv) rv.onclick = () => out.innerHTML = `Resposta: <b>${esc(c.nom)}</b>`; };
  $("button", box).onclick = go2; inp.onkeydown = e => { if (e.key === "Enter") go2(); };
}
function conceptMap(t) {
  const nodes = [...new Set(t.relacions.flatMap(r => [r.a, r.b]))];
  const W0 = Math.max(560, nodes.length * 90), H0 = 380, cx = W0 / 2, cy = H0 / 2, R = Math.min(W0 / 2 - 90, H0 / 2 - 40);
  const pos = {}; nodes.forEach((n, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / nodes.length; pos[n] = [cx + R * Math.cos(a) * 1.25, cy + R * Math.sin(a)]; });
  const edges = t.relacions.map(r => { const [x1, y1] = pos[r.a], [x2, y2] = pos[r.b], mx = (x1 + x2) / 2, my = (y1 + y2) / 2; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line2)" stroke-width="2" marker-end="url(#ar)"/><text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="12" fill="var(--blue)" font-family="var(--f-body)" font-weight="700" paint-order="stroke" stroke="var(--sheet)" stroke-width="4">${esc(r.tipus)}</text>`; }).join("");
  const ns = nodes.map(n => { const [x, y] = pos[n], w = Math.max(70, n.length * 7.6 + 20); return `<rect x="${x - w / 2}" y="${y - 15}" width="${w}" height="30" rx="15" fill="var(--sheet)" stroke="var(--ink)" stroke-width="1.5"/><text x="${x}" y="${y + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="var(--ink)" font-family="var(--f-body)">${esc(n)}</text>`; }).join("");
  return `<svg width="${W0}" height="${H0}" viewBox="0 0 ${W0} ${H0}" role="img" aria-label="Mapa conceptual"><defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--line2)"/></marker></defs>${edges}${ns}</svg>`;
}

