"use strict";
/* ---------- Revisió del tema detectat ---------- */
function viewReview(el) {
  const d = newState.draft;
  const fCheck = f => { try { compileFormula({ ...f, variables: f.variables, constants: f.constants || [], errors: [] }); return ""; } catch (e) { return e.message; } };
  el.innerHTML = `<div class="card stack"><span class="eyebrow">Revisió</span><h1>Comprova què s'ha detectat</h1><p class="muted">Corregeix, desmarca el que no sigui correcte i afegeix el que falti. Res no es crea fins que no premis «Crear el tema».</p>
    <label class="f">Títol del tema<input type="text" id="rTitle" value="${esc(d.titol)}"></label></div>
  <div class="card stack"><div class="row" style="justify-content:space-between"><h2>Conceptes (${d.conceptes.length})</h2><button class="btn small" id="addC">+ Afegir concepte</button></div>
    ${d.conceptes.length ? "" : `<p class="small muted">No s'ha detectat cap definició. Afegeix-ne a mà.</p>`}
    <div class="stack">${d.conceptes.map((c, i) => `<div class="term ${c.dubtos ? "flag" : ""}" data-ci="${i}"><div class="row"><label class="row small"><input type="checkbox" data-k="on" ${c.off ? "" : "checked"}> Incloure</label>${c.dubtos ? `<span class="pill warn">${esc(c.motiu)}</span>` : ""}</div>
      <label class="f small">Terme<input type="text" data-k="nom" value="${esc(c.nom)}"></label>
      <label class="f small">Definició<textarea data-k="definicio" style="min-height:60px">${esc(c.definicio)}</textarea></label>
      <label class="f small">Exemple (opcional)<input type="text" data-k="exemple" value="${esc(c.exemple)}"></label></div>`).join("")}</div></div>
  <div class="card stack"><div class="row" style="justify-content:space-between"><h2>Fórmules (${d.formules.length})</h2><button class="btn small" id="addF">+ Afegir fórmula</button></div>
    <p class="small muted">Escriu-les amb * per multiplicar, / per dividir i ^ per a potències (p. ex. «Ec = 0.5 * m * v^2»). Els rangs serveixen per generar problemes amb dades noves.</p>
    ${d.formules.map((f, i) => { const err = fCheck(f); return `<div class="term" data-fi="${i}"><div class="row"><label class="row small"><input type="checkbox" data-k="on" ${f.off ? "" : "checked"}> Incloure</label>${err ? `<span class="pill bad">${esc(err)}</span>` : `<span class="pill ok">Es pot calcular</span>`}</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><label class="f small">Nom<input type="text" data-k="nom" value="${esc(f.nom)}"></label><label class="f small">Fórmula<input type="text" class="mono" data-k="expressio" value="${esc(f.expressio)}"></label><label class="f small">Nom del resultat<input type="text" data-k="rnom" value="${esc(f.resultat.nom)}"></label><label class="f small">Unitat del resultat<input type="text" data-k="runitat" value="${esc(f.resultat.unitat)}"></label></div>
      <div class="tbl"><table class="t"><thead><tr><th>Variable</th><th>Nom</th><th>Unitat</th><th>Mín.</th><th>Màx.</th></tr></thead><tbody>${f.variables.map((v, j) => `<tr data-vj="${j}"><td class="mono">${esc(v.simbol)}</td><td><input type="text" data-v="nom" value="${esc(v.nom)}"></td><td><input type="text" data-v="unitat" value="${esc(v.unitat)}" style="max-width:90px"></td><td><input type="number" data-v="min" value="${v.min}" style="max-width:100px"></td><td><input type="number" data-v="max" value="${v.max}" style="max-width:100px"></td></tr>`).join("")}${(f.constants || []).map(c => `<tr><td class="mono">${esc(c.simbol)}</td><td colspan="4" class="small muted">constant = ${fmt(c.valor)} ${esc(c.unitat)}</td></tr>`).join("")}</tbody></table></div></div>`; }).join("")}</div>
  <div class="card stack"><h2>Procediments</h2><p class="small muted">Un procediment per bloc: primera línia el nom, i després un pas per línia. Separa els blocs amb una línia en blanc.</p>
    <textarea id="rProc" style="min-height:110px">${esc(d.procediments.map(p => [p.nom, ...p.passos].join("\n")).join("\n\n"))}</textarea></div>
  <div class="card stack"><h2>Cronologia</h2><p class="small muted">Una línia per fet: «any | fet».</p><textarea id="rCron">${esc(d.cronologia.map(e => `${e.any} | ${e.fet}`).join("\n"))}</textarea></div>
  <div class="card stack"><h2>Relacions</h2><p class="small muted">Una línia per relació: «concepte | relació | concepte» (p. ex. «força | causa | acceleració»).</p><textarea id="rRel">${esc(d.relacions.map(r => `${r.a} | ${r.tipus} | ${r.b}`).join("\n"))}</textarea></div>
  <div class="card stack"><h2>Errors típics</h2><p class="small muted">Una línia per error: «idea errònia | correcció».</p><textarea id="rErr">${esc(d.errors_tipics.map(e => `${e.afirmacio_erronia} | ${e.correccio}`).join("\n"))}</textarea></div>
  <div class="card stack"><div class="row"><button class="btn mark" id="create">Crear el tema</button><button class="btn ghost" id="backTxt">Tornar al text</button></div><div id="genOut"></div></div>`;
  const sync = () => {
    d.titol = $("#rTitle", el).value.trim() || d.titol;
    $$("[data-ci]", el).forEach(box => { const c = d.conceptes[+box.dataset.ci]; c.off = !$("[data-k=on]", box).checked; c.nom = $("[data-k=nom]", box).value.trim(); c.definicio = $("[data-k=definicio]", box).value.trim(); c.exemple = $("[data-k=exemple]", box).value.trim(); c.paraules_clau = keywords(c.definicio, c.nom); });
    $$("[data-fi]", el).forEach(box => {
      const f = d.formules[+box.dataset.fi]; f.off = !$("[data-k=on]", box).checked; f.nom = $("[data-k=nom]", box).value.trim(); f.resultat.nom = $("[data-k=rnom]", box).value.trim(); f.resultat.unitat = $("[data-k=runitat]", box).value.trim();
      const ex = normFormula($("[data-k=expressio]", box).value.trim());
      if (ex !== f.expressio) { f.expressio = ex; const fm = isFormulaText(ex); if (fm) { f.resultat.simbol = fm.lhs; const old = f.variables; f.variables = fm.vars.filter(v => !(f.constants || []).some(c => c.simbol === v)).map(v => old.find(o => o.simbol === v) || { simbol: v, nom: v, unitat: "", min: 1, max: 100, pas: 1 }); } }
      else $$("[data-vj]", box).forEach(tr => { const v = f.variables[+tr.dataset.vj]; if (!v) return; v.nom = $("[data-v=nom]", tr).value; v.unitat = $("[data-v=unitat]", tr).value; v.min = +$("[data-v=min]", tr).value; v.max = +$("[data-v=max]", tr).value; v.pas = 0; });
    });
    d.procediments = $("#rProc", el).value.split(/\n\s*\n/).map(b => b.split("\n").map(s => s.trim()).filter(Boolean)).filter(b => b.length >= 4).map(b => ({ id: "p_" + slug(b[0]), nom: b[0], passos: b.slice(1) }));
    d.cronologia = $("#rCron", el).value.split("\n").map(s => s.split("|").map(x => x.trim())).filter(x => x.length >= 2 && x[0] && x[1]).map(([any, fet]) => ({ any, fet }));
    d.relacions = $("#rRel", el).value.split("\n").map(s => s.split("|").map(x => x.trim())).filter(x => x.length >= 3 && x.every(Boolean)).map(([a, tipus, b]) => ({ a, tipus, b }));
    d.errors_tipics = $("#rErr", el).value.split("\n").map(s => s.split("|").map(x => x.trim())).filter(x => x.length >= 2 && x[0]).map(([a, c]) => ({ id: "e_" + slug(a), afirmacio_erronia: a, correccio: c || "" }));
  };
  el.querySelectorAll("[data-fi] [data-k=expressio]").forEach(i => i.onchange = () => { sync(); viewReview(el); });
  $("#addC", el).onclick = () => { sync(); d.conceptes.push({ id: "c" + d.conceptes.length, nom: "", definicio: "", exemple: "", paraules_clau: [], sinonims: [], distractors: [], font: "", pista_conceptual: "" }); viewReview(el); };
  $("#addF", el).onclick = () => { sync(); d.formules.push({ id: "f" + d.formules.length, nom: "Nova fórmula", expressio: "", resultat: { simbol: "", nom: "", unitat: "" }, variables: [], constants: [], errors: [] }); viewReview(el); };
  $("#backTxt", el).onclick = () => { newState.draft = null; viewNew(el); };
  $("#create", el).onclick = () => {
    sync();
    const topic = { ...d, conceptes: d.conceptes.filter(c => !c.off && c.nom && c.definicio), formules: d.formules.filter(f => !f.off && !fCheck(f)) };
    const names = new Set(topic.conceptes.map(c => norm(c.nom)));
    topic.preguntes_obertes = (d.preguntes_obertes || []).filter(q => !q.concepte_id || topic.conceptes.some(c => c.id === q.concepte_id));
    topic.relacions = topic.relacions.filter(r => r.a && r.b);
    topic.conceptes.forEach(c => { if (c.dubtos && !suspicious(c.definicio)) { c.dubtos = false; c.motiu = ""; } });
    if (!topic.resum || topic.resum.length < 20) topic.resum = topic.conceptes.slice(0, 4).map(c => `${cap1(c.nom)}: ${c.definicio}`).join(" ");
    if (!topic.seccions.length) topic.seccions = [{ titol: "Idees clau", punts: topic.conceptes.slice(0, 8).map(c => `${cap1(c.nom)}: ${c.definicio}`) }];
    if (!names.size && !topic.formules.length) { $("#genOut", el).innerHTML = `<div class="fb warn">Cal com a mínim un concepte o una fórmula.</div>`; return; }
    const ok = addTopic(topic, $("#genOut", el), topic.materia, topic.curs);
    if (ok) newState = { photos: [], text: "", draft: null };
  };
}
function addTopic(raw, out, mat, curs) {
  const t = normTopic({ ...raw, materia: raw.materia || mat, curs: raw.curs || curs, id: raw.id || slug(raw.titol || "tema") });
  if (S.topics[t.id] || DEMOS.some(d => d.id === t.id)) t.id = t.id + "_" + Date.now().toString(36).slice(-4);
  if (t.conceptes.length < 2 && !t.formules.length) { out.innerHTML = `<div class="fb bad">El tema té massa poc contingut (${t.conceptes.length} conceptes). Afegeix-ne més.</div>`; return false; }
  const C = compile(t);
  S.topics[t.id] = t; S.active = t.id; checkBadges(); save();
  out.innerHTML = `<div class="fb ok"><h3>Tema creat: ${esc(t.titol)}</h3><p>${t.conceptes.length} conceptes · ${C.formules.length} fórmules · ${t.procediments.length} procediments · ${t.errors_tipics.length} errors típics · ${t.preguntes_obertes.length} preguntes d'examen.</p><div class="row"><button class="btn primary" id="openT">Obrir el tema</button></div></div>`;
  $("#openT", out).onclick = () => Router.root("inici", "tema");
  return true;
}

