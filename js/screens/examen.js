"use strict";
/* ---------- Examen ---------- */
function viewExam(el) {
  if (examSession && !examSession.done) return examRun(el);
  if (examSession && examSession.done) return examResults(el);
  const ts = allTopics();
  el.innerHTML = `<div class="card stack"><span class="eyebrow">Simulacre</span><h1>Possible examen</h1><p class="muted">Preguntes barrejades de tots els temes que triïs, amb temps i sense pistes. Abans de cada resposta indiques la seguretat: al final veuràs on et creies que sabies i no sabies.</p>
    <div class="grid">${ts.map(t => { const s = topicStats(t), boss = s.consolidat >= 0.8; return `<div class="card stack" style="box-shadow:none"><label class="row"><input type="checkbox" value="${t.id}" ${t.id === S.active ? "checked" : ""}><b>${esc(t.titol)}</b></label><p class="small muted">${Math.round(s.consolidat * 100)}% consolidat</p><button class="btn small ${boss ? "mark" : ""}" data-boss="${t.id}" ${boss ? "" : "disabled"} title="${boss ? "" : "Es desbloqueja amb el 80% consolidat"}">${boss ? "Repte final" : "Repte final (80%)"}</button></div>`; }).join("")}</div>
    <div class="row"><label class="row small">Preguntes <select id="nq" style="width:auto"><option>8</option><option selected>12</option><option>16</option></select></label><label class="row small">Minuts <select id="mins" style="width:auto"><option>10</option><option selected>15</option><option>25</option></select></label><button class="btn primary" id="start">Començar el simulacre</button><button class="btn" id="paper">Examen en paper</button></div>
    <div id="paperOut"></div></div>`;
  const sel = () => $$("input[type=checkbox]:checked", el).map(x => x.value);
  $("#start", el).onclick = () => { const t = sel(); if (t.length) { examSession = buildExam(t, +$("#nq", el).value, +$("#mins", el).value, false); viewExam(el); } };
  $$("[data-boss]", el).forEach(b => b.onclick = () => { examSession = buildExam([b.dataset.boss], 15, 20, true); viewExam(el); });
  $("#paper", el).onclick = () => { const t = sel(); if (t.length) paperExam($("#paperOut", el), t, +$("#nq", el).value); };
}
function buildExam(tids, n, mins, boss) {
  const keys = []; tids.forEach(tid => topicKeys(topicById(tid)).forEach(k => keys.push([tid, k])));
  const byKind = {}; shuffle(keys).forEach(x => (byKind[x[1][0]] = byKind[x[1][0]] || []).push(x));
  const nOpen = Math.min(2, tids.reduce((a, tid) => a + topicById(tid).preguntes_obertes.length, 0));
  const chosen = []; let progress = true;
  while (chosen.length < n - nOpen && progress) { progress = false; for (const k of Object.keys(byKind)) { if (byKind[k].length && chosen.length < n - nOpen) { chosen.push(byKind[k].shift()); progress = true; } } }
  const items = shuffle(chosen).map(([tid, k]) => makeItem(tid, k, { exam: true, type: k[0] === "c" ? pick(["mcq_def", "short", "fill", "mcq_name"]) : undefined })).filter(Boolean);
  const opens = shuffle(tids.flatMap(tid => topicById(tid).preguntes_obertes.map(q => ({ tid, q })))).slice(0, nOpen);
  opens.forEach(({ tid, q }) => items.push({ tid, key: q.concepte_id ? "c:" + q.concepte_id : null, topic: topicById(tid).titol, label: q.pregunta, type: "Pregunta oberta", mode: "open", prompt: `<p class="prompt">${esc(q.pregunta)}</p>`, q }));
  return { tids, items, ans: items.map(() => ({ v: null, conf: null })), i: 0, end: now() + mins * 60e3, mins, boss, done: false };
}
function examRun(el) {
  const E = examSession, item = E.items[E.i], a = E.ans[E.i];
  el.innerHTML = `<div class="card qcard">
    <div class="qhead"><span class="row"><span class="pill ${E.boss ? "mark" : "blue"}">${E.boss ? "Repte final" : "Simulacre"}</span><span class="small muted">${esc(item.topic)} · ${esc(item.type)}</span></span><span class="timer" id="timer"></span></div>
    <div class="dots">${E.items.map((_, i) => `<button class="${E.ans[i].v !== null ? "done" : ""} ${i === E.i ? "cur" : ""}" data-j="${i}" aria-label="Pregunta ${i + 1}">${i + 1}</button>`).join("")}</div>
    <div>${item.prompt}</div><div id="qin"></div>
    <div class="row"><span class="small muted">Seguretat:</span>${["segur", "crec", "no"].map(c => `<button class="btn small ${a.conf === c ? "primary" : ""}" data-conf="${c}">${{ segur: "Segur", crec: "Crec que sí", no: "No ho sé" }[c]}</button>`).join("")}</div>
    <div class="row" style="justify-content:space-between"><div class="row"><button class="btn" id="prev" ${E.i === 0 ? "disabled" : ""}>Anterior</button><button class="btn primary" id="nxt">${E.i === E.items.length - 1 ? "Revisar" : "Següent"}</button></div><button class="btn mark" id="hand">Entregar</button></div>
    <div id="handConfirm"></div></div>`;
  const qin = $("#qin", el);
  if (item.mode === "mcq") { qin.innerHTML = `<div class="opts">${item.options.map((o, i) => `<button class="opt" data-i="${i}" aria-pressed="${a.v === i}"><span class="k">${"ABCDE"[i]}</span><span>${esc(o.text)}</span></button>`).join("")}</div>`; $$(".opt", qin).forEach(b => b.onclick = () => { a.v = +b.dataset.i; examRun(el); }); }
  else if (item.mode === "order") { if (a.v === null) a.v = item.order.slice(); const paint = () => { qin.innerHTML = `<ol class="order">${a.v.map((ix, pos) => `<li><span class="mono muted">${pos + 1}</span><span class="txt">${esc(item.items[ix])}</span><button data-up="${pos}" aria-label="Puja" ${pos === 0 ? "disabled" : ""}>↑</button><button data-dn="${pos}" aria-label="Baixa" ${pos === a.v.length - 1 ? "disabled" : ""}>↓</button></li>`).join("")}</ol>`; $$("[data-up]", qin).forEach(b => b.onclick = () => { const p = +b.dataset.up; [a.v[p - 1], a.v[p]] = [a.v[p], a.v[p - 1]]; paint(); }); $$("[data-dn]", qin).forEach(b => b.onclick = () => { const p = +b.dataset.dn; [a.v[p + 1], a.v[p]] = [a.v[p], a.v[p + 1]]; paint(); }); }; paint(); }
  else if (item.mode === "open") { qin.innerHTML = `<textarea id="ans" aria-label="Resposta" placeholder="Escriu la teva resposta">${esc(a.v || "")}</textarea>`; $("#ans", qin).oninput = e => a.v = e.target.value || null; }
  else { qin.innerHTML = item.mode === "number" ? `<div class="numin"><input type="text" inputmode="decimal" id="ans" value="${esc(a.v || "")}" aria-label="Resposta"><span class="unit">${esc(item.unit || "")}</span></div>` : `<input type="text" id="ans" value="${esc(a.v || "")}" aria-label="Resposta">`; $("#ans", qin).oninput = e => a.v = e.target.value || null; }
  $$("[data-conf]", el).forEach(b => b.onclick = () => { a.conf = b.dataset.conf; $$("[data-conf]", el).forEach(x => x.classList.toggle("primary", x === b)); });
  $$("[data-j]", el).forEach(b => b.onclick = () => { E.i = +b.dataset.j; examRun(el); });
  $("#prev", el).onclick = () => { E.i--; examRun(el); };
  $("#nxt", el).onclick = () => { if (E.i < E.items.length - 1) { E.i++; examRun(el); } else $("#hand", el).click(); };
  $("#hand", el).onclick = () => { const blank = E.ans.filter(x => x.v === null || x.v === "").length; $("#handConfirm", el).innerHTML = `<div class="fb warn"><p>${blank ? `Tens ${blank} pregunta${blank > 1 ? "es" : ""} sense respondre. ` : ""}Vols entregar l'examen?</p><div class="row"><button class="btn small primary" id="yes">Entrega</button><button class="btn small ghost" id="no">Continua</button></div></div>`; $("#yes").onclick = () => gradeExam(el); $("#no").onclick = () => $("#handConfirm", el).innerHTML = ""; };
  clearInterval(examTimer);
  const tick = () => { const left = Math.max(0, E.end - now()), tm = $("#timer"); if (!tm) { clearInterval(examTimer); return; } tm.textContent = `${Math.floor(left / 60e3)}:${String(Math.floor(left / 1e3) % 60).padStart(2, "0")}`; tm.classList.toggle("low", left < 60e3); if (left <= 0) { clearInterval(examTimer); gradeExam(el); } };
  tick(); examTimer = setInterval(tick, 1000);
}
async function gradeExam(el) {
  clearInterval(examTimer);
  const E = examSession; E.done = true;
  E.res = E.items.map((it, i) => {
    const a = E.ans[i];
    if (it.mode === "open") return { open: true, pts: null };
    if (a.v === null || a.v === "") return { ok: false, pts: 0, diag: "Sense resposta." };
    const r = it.mode === "mcq" ? checkMcq(it, a.v) : it.mode === "order" ? checkOrder(it, a.v) : it.check(a.v);
    return { ok: r.ok, pts: r.ok ? 1 : 0, diag: r.diag };
  });
  E.openMode = "self";
  finalizeExam();
  examResults(el);
}
function finalizeExam() {
  const E = examSession;
  if (E.res.some(r => r.open && r.pts === null)) { E.pending = true; return; }
  E.pending = false;
  const total = E.res.reduce((s, r) => s + (r.pts || 0), 0);
  E.nota = Math.round(total / E.items.length * 100) / 10;
  if (E.recorded) return; E.recorded = true;
  let xp = 0;
  E.items.forEach((it, i) => {
    const r = E.res[i], a = E.ans[i]; if (!it.key) return;
    const tid = it.tid, c = card(tid, it.key);
    if (a.conf === "segur" || a.conf === "crec") { S.calib[a.conf][1]++; if (r.ok) S.calib[a.conf][0]++; }
    if (r.ok) { xp += 2; if (E.boss) c.bossOk = true; } else { c.pendingError = true; c.streak = 0; if (c.reps) c.due = now(); logError(tid, it.key, it.label, (r.diag || r.comentari || "Error a l'examen")); }
  });
  markDay();
  S.exams.unshift({ t: now(), nota: E.nota, n: E.items.length, boss: E.boss, tids: E.tids }); S.exams = S.exams.slice(0, 50);
  if (E.boss && E.nota >= 7) xp += 50;
  addXP(xp, E.boss && E.nota >= 7 ? "repte final superat" : "simulacre");
  checkBadges(); save();
}
function criterionHit(crit, ans) {
  if (!ans) return false;
  const q = crit.match(/«([^»]+)»/); const words = (q ? q[1] : crit).split(/\s+/).map(norm).filter(w => w.length > 3 && !STOP.has(w));
  if (!words.length) return false;
  const a = " " + norm(ans) + " ";
  const hits = words.filter(w => a.includes(" " + w.slice(0, Math.max(4, w.length - 2)))).length;
  return hits / words.length >= (q ? 0.99 : 0.5);
}
function examResults(el) {
  const E = examSession;
  const confRows = ["segur", "crec", "no"].map(c => { const xs = E.items.map((_, i) => i).filter(i => E.ans[i].conf === c && !E.res[i].open); const ok = xs.filter(i => E.res[i].ok).length; return [c, xs.length, ok]; });
  const overconf = E.items.map((it, i) => [it, i]).filter(([it, i]) => E.ans[i].conf === "segur" && !E.res[i].ok && !E.res[i].open);
  el.innerHTML = `<div class="card stack"><span class="eyebrow">${E.boss ? "Repte final" : "Simulacre"} corregit</span>
    ${E.pending ? `<h1>Falta autoavaluar les preguntes obertes</h1><p class="muted">Compara la teva resposta amb la resposta model i marca els criteris que compleixes amb sinceritat.</p>` : `<div class="row" style="align-items:flex-end;gap:18px"><div class="score">${fmt(E.nota)}</div><div><b>sobre 10</b><p class="small muted">${E.res.filter(r => r.ok).length} de ${E.items.length} correctes${E.boss ? (E.nota >= 7 ? " · Repte superat! Els elements encertats passen a dominats." : " · Necessites un 7 per superar el repte.") : ""}</p></div></div>`}
    ${!E.pending ? `<div class="calib">${confRows.map(([c, n, ok]) => `<div class="r"><span>${{ segur: "Segur", crec: "Crec que sí", no: "No ho sé" }[c]}</span><div class="track"><span style="width:${n ? ok / n * 100 : 0}%"></span></div><span class="mono small">${n ? Math.round(ok / n * 100) + "%" : "—"}</span></div>`).join("")}</div><p class="small muted">Percentatge d'encert segons la seguretat que has indicat. Si dius «segur», hauria d'acostar-se al 100%.</p>${overconf.length ? `<div class="fb warn"><b>Sobreconfiança:</b> n'estaves segur i has fallat en ${overconf.length} pregunta${overconf.length > 1 ? "es" : ""}. Són les primeres que has de repassar.</div>` : ""}` : ""}
  </div>
  <div class="card stack"><h2>Correcció</h2><div class="stack">${E.items.map((it, i) => { const r = E.res[i], a = E.ans[i];
    if (it.mode === "open") return `<div class="fb ${r.pts === null ? "hint" : r.ok ? "ok" : "bad"}"><h3>${i + 1}. ${esc(it.q.pregunta)}</h3><p><b>La teva resposta:</b> ${esc(a.v || "(en blanc)")}</p><p><b>Resposta model:</b> ${esc(it.q.resposta_model)}</p>${r.pts === null ? `<div class="stack" data-self="${i}"><p class="small muted">Marca els criteris que compleix la teva resposta. Els que ja surten marcats contenen les paraules clau, però comprova-ho tu.</p>${it.q.criteris.map((c, j) => `<label class="row small"><input type="checkbox" data-c="${j}" ${criterionHit(c, a.v) ? "checked" : ""}> ${esc(c)}</label>`).join("")}<button class="btn small primary" data-selfok="${i}">Desa l'autoavaluació</button></div>` : `<p><b>Punts:</b> ${fmt(r.pts)} / 1 (autoavaluació)</p>${r.comentari ? `<p>${esc(r.comentari)}</p>` : ""}`}</div>`;
    return `<div class="fb ${r.ok ? "ok" : "bad"}"><h3>${i + 1}. ${esc(it.type)} · ${esc(it.label.length > 90 ? it.label.slice(0, 90) + "…" : it.label)}</h3>${r.ok ? "" : `<p><b>Correcte:</b> ${esc(it.answerText)}</p><p><b>Diagnòstic:</b> ${esc(r.diag || "")}</p>`}${a.conf ? `<p class="small muted">Seguretat: ${{ segur: "segur", crec: "crec que sí", no: "no ho sé" }[a.conf]}</p>` : ""}</div>`; }).join("")}</div>
    <div class="row">${E.res.some(r => !r.ok) && !E.pending ? `<button class="btn primary" id="fixNow">Practicar ara els errors</button>` : ""}<button class="btn" id="newEx">Un altre simulacre</button></div></div>`;
  $$("[data-selfok]", el).forEach(b => b.onclick = () => { const i = +b.dataset.selfok, box = $(`[data-self="${i}"]`, el), it = E.items[i]; const cm = $$("input[data-c]", box).map(x => x.checked); const pts = it.q.criteris.length ? cm.filter(Boolean).length / it.q.criteris.length : 0; E.res[i] = { open: true, pts, ok: pts >= 0.5, complerts: cm }; finalizeExam(); examResults(el); });
  const fx = $("#fixNow", el); if (fx) fx.onclick = () => { const focus = E.items.map((it, i) => [it, i]).filter(([it, i]) => !E.res[i].ok && it.key).map(([it]) => [it.tid, it.key]); startPractice(E.tids, 15, focus); examSession = null; go("practica"); };
  $("#newEx", el).onclick = () => { examSession = null; viewExam(el); };
}
function paperExam(box, tids, n) {
  const E = buildExam(tids, n, 0, false);
  const qs = E.items.map((it, i) => {
    const txt = it.prompt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let body = "";
    if (it.mode === "mcq") body = it.options.map((o, j) => `   ${"abcde"[j]}) ${o.text}`).join("\n");
    else if (it.mode === "order") body = it.order.map(ix => `   [ ] ${it.items[ix]}`).join("\n");
    else body = "   ______________________________";
    return `${i + 1}. ${txt}\n${body}`;
  }).join("\n\n");
  const key = E.items.map((it, i) => `${i + 1}. ${it.mode === "open" ? it.q.resposta_model : it.mode === "mcq" ? "abcde"[it.options.findIndex(o => o.ok)] + ") " + it.answerText : it.answerText}`).join("\n");
  const title = tids.map(id => topicById(id).titol).join(" + ");
  const text = `EXAMEN DE PRÀCTICA · ${title}\nNom: ____________________   Data: ___________\n\n${qs}\n\n\n--- SOLUCIONARI ---\n${key}\n`;
  box.innerHTML = `<div class="stack"><div class="row"><button class="btn small primary" id="cp">Copiar</button><button class="btn small" id="dl">Desar com a fitxer</button></div><pre class="code">${esc(text)}</pre></div>`;
  $("#cp", box).onclick = e => copyText(text, e.target);
  $("#dl", box).onclick = () => saveFile("examen-" + slug(title) + ".txt", text, "text/plain");
}

