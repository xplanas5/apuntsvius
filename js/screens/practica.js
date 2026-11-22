"use strict";
/* ---------- Pràctica ---------- */
function startPractice(tids, n = 10, focus = null) {
  const items = buildSession(tids, n, focus);
  practiceSession = { tids, items, i: 0, results: [], requeued: new Set(), xp0: S.xp, changes: [] };
  startSessionGame(practiceSession);
}
function viewPractice(el) {
  if (!practiceSession) {
    const ts = allTopics();
    el.innerHTML = `<div class="card stack"><span class="eyebrow">Pràctica espaiada</span><h1>Què vols practicar?</h1><p class="muted">L'app tria primer els errors pendents i els repassos que toquen avui, després conceptes nous, i ho barreja tot. Cada resposta actualitza quan has de tornar a veure aquell element.</p>
      <div class="grid">${ts.map(t => { const s = topicStats(t); return `<label class="card row" style="box-shadow:none"><input type="checkbox" value="${t.id}" ${t.id === S.active ? "checked" : ""}><span><b>${esc(t.titol)}</b><br><span class="small muted">${s.due} per repassar · ${s.counts[0]} nous</span></span></label>`; }).join("")}</div>
      <div class="row"><label class="row small">Preguntes <select id="nq" style="width:auto"><option>5</option><option selected>10</option><option>15</option></select></label><button class="btn primary" id="go">Començar</button>${S.errors.some(e => !e.fixed) ? `<button class="btn" id="goErr">Només errors pendents (${S.errors.filter(e => !e.fixed).length})</button>` : ""}</div></div>`;
    $("#go", el).onclick = () => { const tids = $$("input[type=checkbox]:checked", el).map(x => x.value); if (!tids.length) return; startPractice(tids, +$("#nq", el).value); viewPractice(el); };
    const ge = $("#goErr", el); if (ge) ge.onclick = () => { practiceErrors(); viewPractice(el); };
    return;
  }
  const P = practiceSession;
  if (!P.items.length) { el.innerHTML = `<div class="card empty">No hi ha res per practicar ara mateix.<br><br><button class="btn" id="back">Tornar</button></div>`; $("#back", el).onclick = () => { practiceSession = null; viewPractice(el); }; return; }
  if (P.i >= P.items.length) return practiceSummary(el);
  const item = P.items[P.i];
  const st = { attempts: 0, hint: 0, sel: null, order: item.order ? item.order.slice() : null, done: false, conf: null };
  el.innerHTML = `<div class="card qcard ${isGolden(P, P.i) ? "golden" : ""}">
    <div class="qhead"><span class="row"><span class="pill blue">${esc(item.type)}</span><span class="small muted">${esc(item.topic)}</span>${stateChip(item.tid, item.key)}</span><span class="row">${isGolden(P, P.i) ? '<span class="pill gold">Pregunta d\'or</span>' : ""}${P.combo >= 2 ? `<span class="pill mark">Combo x${P.combo}</span>` : ""}<span class="small mono muted">${P.i + 1} / ${P.items.length}</span></span></div>
    <div class="progress"><span style="width:${P.i / P.items.length * 100}%"></span></div>
    <div id="qp">${item.prompt}</div>
    <div id="qin"></div>
    <div class="actions" id="qact">
      <span class="small muted">Comprova i digues com n'estàs de segur:</span>
      <div class="conf"><button class="btn primary" data-conf="segur">N'estic segur</button><button class="btn" data-conf="crec">Crec que sí</button></div>
      <button class="btn ghost" id="hintBtn">Necessito una pista</button>
    </div>
    <div id="hintArea"></div>
    <div id="fb"></div>
    <div class="row" style="justify-content:space-between"><button class="btn ghost small" id="report">Aquesta pregunta està malament</button><button class="btn mark" id="next" hidden>Següent</button></div>
  </div>`;
  const qin = $("#qin", el);
  function paintInput(res) {
    if (item.mode === "mcq") {
      qin.innerHTML = `<div class="opts">${item.options.map((o, i) => `<button class="opt ${res && st.done && o.ok ? "right" : ""} ${res && i === st.sel && !res.ok ? "wrong" : ""}" data-i="${i}" aria-pressed="${st.sel === i}" ${st.done ? "disabled" : ""}><span class="k">${"ABCDE"[i]}</span><span>${esc(o.text)}</span></button>`).join("")}</div>`;
      $$(".opt", qin).forEach(b => b.onclick = () => { st.sel = +b.dataset.i; paintInput(); });
    } else if (item.mode === "order") {
      qin.innerHTML = `<ol class="order">${st.order.map((ix, pos) => `<li class="${res && res.wrongPos ? (res.wrongPos.includes(pos) ? "wrong" : "right") : ""}"><span class="mono muted">${pos + 1}</span><span class="txt">${esc(item.items[ix])}${st.done && item.years ? ` <b class="mono">(${esc(item.years[ix])})</b>` : ""}</span><button aria-label="Puja" data-up="${pos}" ${pos === 0 || st.done ? "disabled" : ""}>↑</button><button aria-label="Baixa" data-dn="${pos}" ${pos === st.order.length - 1 || st.done ? "disabled" : ""}>↓</button></li>`).join("")}</ol>`;
      $$("[data-up]", qin).forEach(b => b.onclick = () => { const p = +b.dataset.up; [st.order[p - 1], st.order[p]] = [st.order[p], st.order[p - 1]]; paintInput(); });
      $$("[data-dn]", qin).forEach(b => b.onclick = () => { const p = +b.dataset.dn; [st.order[p + 1], st.order[p]] = [st.order[p], st.order[p + 1]]; paintInput(); });
    } else if (!qin.firstChild) {
      qin.innerHTML = item.mode === "number" ? `<div class="numin"><input type="text" inputmode="decimal" id="ans" autocomplete="off" aria-label="Resposta numèrica" placeholder="0,0"><span class="unit">${esc(item.unit || "")}</span></div>` : `<input type="text" id="ans" autocomplete="off" aria-label="Resposta" placeholder="Escriu la resposta">`;
      const a = $("#ans", qin); a.focus(); a.onkeydown = e => { if (e.key === "Enter") submit("crec"); };
    }
  }
  function submit(conf) {
    if (st.done) return;
    let r;
    if (item.mode === "mcq") { if (st.sel === null) return flash("Tria una opció."); r = checkMcq(item, st.sel); }
    else if (item.mode === "order") r = checkOrder(item, st.order);
    else { const v = $("#ans", qin).value; if (!v.trim()) return flash("Escriu una resposta."); r = item.check(v); }
    st.attempts++;
    const fb = $("#fb", el);
    if (r.ok) {
      st.done = true;
      const rec = record(item.tid, item.key, { ok: true, firstTry: st.attempts === 1, hint: st.hint > 0, conf, label: item.label });
      P.results.push({ item, ok: true, first: st.attempts === 1 && !st.hint, conf });
      if (rec.before !== rec.after) P.changes.push([item.label, rec.before, rec.after]);
      const extra = onAnswer(P, P.i, { ok: true, first: st.attempts === 1 && !st.hint, rec });
      fb.innerHTML = `<div class="fb ok">${extra}<h3>${st.attempts === 1 && !st.hint ? "Correcte al primer intent!" : "Correcte!"}</h3>${r.note ? `<p>${esc(r.note)}</p>` : ""}${item.explain ? `<p>${item.raw ? item.explain : esc(item.explain)}</p>` : ""}${item.source ? `<p class="src">Font dels apunts: «${esc(item.source)}»</p>` : ""}${rec.noXP ? `<p class="small">Ja ho domines i no tocava repassar-ho: no suma XP. Torna quan l'app t'ho demani.</p>` : ""}${conf === "segur" ? "" : `<p class="small">Has encertat però no n'estaves segur: és normal mentre consolides.</p>`}${rec.before !== rec.after ? `<p class="small"><b>Progrés:</b> ${STATE_KEYS[rec.before]} → <b>${STATE_KEYS[rec.after]}</b></p>` : ""}</div>`;
      finish(r);
    } else if (st.attempts === 1) {
      Sfx.play("bad");
      fb.innerHTML = `<div class="fb warn"><h3>Encara no. Torna-ho a provar</h3><p>${esc(r.diag)}</p>${conf === "segur" ? `<p class="small"><b>Ull:</b> n'estaves segur i no era correcte. Aquest és el tipus d'error que més convé revisar.</p>` : ""}</div>`;
      if (item.mode === "order") paintInput(r);
      if (item.mode === "mcq") { const bad = st.sel; st.sel = null; paintInput(); const b = $$(".opt", qin)[bad]; if (b) { b.classList.add("wrong"); b.disabled = true; } }
    } else {
      st.done = true;
      const rec = record(item.tid, item.key, { ok: false, conf, label: item.label, diag: r.diag });
      P.results.push({ item, ok: false, conf, diag: r.diag });
      const extra = onAnswer(P, P.i, { ok: false, first: false, rec });
      if (!P.requeued.has(item.key + item.tid)) { P.requeued.add(item.key + item.tid); const again = makeItem(item.tid, item.key); if (again) P.items.splice(Math.min(P.items.length, P.i + 3), 0, again); }
      fb.innerHTML = `<div class="fb bad">${extra}<h3>Resposta correcta: ${item.mode === "order" ? "" : esc(item.answerText)}</h3>${item.mode === "order" ? `<p>${esc(item.answerText)}</p>` : ""}<p><b>Diagnòstic:</b> ${esc(r.diag)}</p>${item.explain ? `<p>${item.raw ? item.explain : esc(item.explain)}</p>` : ""}${item.source ? `<p class="src">Font dels apunts: «${esc(item.source)}»</p>` : ""}<p class="small">L'error queda al quadern i <b>tornarà a sortir d'aquí a poc</b> en aquesta mateixa sessió. Corregir-lo et dona +8 XP.</p></div>`;
      finish(r);
    }
  }
  function finish(r) {
    if (item.mode === "mcq" || item.mode === "order") paintInput(r);
    else { const a = $("#ans", qin); if (a) a.disabled = true; }
    $("#qact", el).hidden = true; $("#hintArea", el).innerHTML = "";
    const nx = $("#next", el); nx.hidden = false; nx.focus(); nx.onclick = () => { P.i++; viewPractice(el); };
  }
  function flash(msg) { $("#fb", el).innerHTML = `<p class="small muted">${esc(msg)}</p>`; }
  $$("[data-conf]", el).forEach(b => b.onclick = () => submit(b.dataset.conf));
  $("#hintBtn", el).onclick = () => {
    if (st.hint >= 3) return;
    const ha = $("#hintArea", el);
    ha.innerHTML = `<div class="fb hint"><label class="f" for="stuck">Abans de la pista ${st.hint + 1}/3: on t'has encallat? (una frase)</label><input type="text" id="stuck" placeholder="Ex.: no sé quina fórmula fer servir"><div class="row"><button class="btn small primary" id="giveHint">Veure la pista</button></div></div>`;
    const s = $("#stuck", ha); s.focus();
    const give = () => { if (s.value.trim().length < 8) { s.placeholder = "Explica-ho una mica més (mínim 8 caràcters)"; s.value = ""; return; } st.hint++; renderHints(); };
    $("#giveHint", ha).onclick = give; s.onkeydown = e => { if (e.key === "Enter") give(); };
  };
  function renderHints() {
    const names = ["Pista conceptual", "Pista de procediment", "Exemple semblant"];
    $("#hintArea", el).innerHTML = `<div class="fb hint">${item.hints.slice(0, st.hint).map((hh, i) => `<p><b>${names[i]}:</b> ${item.raw ? hh : esc(hh)}</p>`).join("")}<p class="small muted">${st.hint < 3 ? "Amb pista l'encert suma menys XP, però compta com a pràctica." : "Ja has vist totes les pistes. La resposta l'has de trobar tu."}</p></div>`;
    if (st.hint >= 3) $("#hintBtn", el).disabled = true;
  }
  $("#report", el).onclick = () => { (S.reported[item.tid] = S.reported[item.tid] || {})[item.key] = { t: now(), type: item.type }; save(); $("#fb", el).innerHTML = `<div class="fb warn">Gràcies. Aquest element no tornarà a sortir. Pots revisar-lo als Apunts. <button class="btn small" id="skip">Saltar</button></div>`; $("#skip", el).onclick = () => { P.i++; viewPractice(el); }; };
  paintInput();
}
function practiceErrors() { const pend = S.errors.filter(e => !e.fixed && topicById(e.tid)); startPractice([...new Set(pend.map(e => e.tid))], 15, pend.map(e => [e.tid, e.key])); }
function practiceSummary(el) {
  const P = practiceSession, ok = P.results.filter(r => r.ok).length, first = P.results.filter(r => r.first).length, n = P.results.length;
  const segur = P.results.filter(r => r.conf === "segur"), segurOk = segur.filter(r => r.ok).length;
  if (!P.finished) { P.finished = true; P.stars = finishSession(P); }
  const next = P.tids.map(tid => topicStats(topicById(tid) || { conceptes: [] })).reduce((a, b) => a + b.due, 0);
  el.innerHTML = `<div class="card stack"><span class="eyebrow">Sessió acabada</span><h1>${first}/${n} encerts al primer intent</h1>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
      <div><span class="eyebrow">XP guanyada</span><div class="score">${S.xp - P.xp0}</div></div>
      <div><span class="eyebrow">Encerts totals</span><div class="score">${ok}</div></div>
      <div><span class="eyebrow">Quan deies «segur»</span><div class="score">${segur.length ? Math.round(segurOk / segur.length * 100) + "%" : "—"}</div><p class="small muted">d'encert</p></div>
    </div>
    ${Object.keys(P.stars).length ? `<div class="fb ok">${Object.entries(P.stars).map(([tid, n]) => `<p><b>${esc((topicById(tid) || {}).titol || "")}</b>: ${starsHTML(n)} nova marca!</p>`).join("")}</div>` : ""}
    ${P.maxCombo >= 3 ? `<p>Millor combo de la sessió: <b>x${P.maxCombo}</b></p>` : ""}
    ${P.changes.length ? `<div class="stack"><h3>Has avançat</h3><ul class="clean">${P.changes.map(([l, a, b]) => `<li>${esc(l)}: ${STATE_KEYS[a]} → <b>${STATE_KEYS[b]}</b></li>`).join("")}</ul></div>` : ""}
    ${P.results.some(r => !r.ok) ? `<div class="stack"><h3>Per revisar</h3><ul class="clean">${P.results.filter(r => !r.ok).map(r => `<li><b>${esc(r.item.label)}</b>: ${esc(r.diag || "")}</li>`).join("")}</ul></div>` : ""}
    <p class="muted small">${next ? `Encara tens ${next} element${next > 1 ? "s" : ""} per repassar avui.` : "Has fet tots els repassos d'avui. L'app et dirà quan tornar."}</p>
    <div class="row"><button class="btn primary" id="again">Una altra sessió</button><button class="btn" id="home">Inici</button></div></div>`;
  $("#again", el).onclick = () => { startPractice(P.tids); viewPractice(el); };
  $("#home", el).onclick = () => { practiceSession = null; Router.root("inici"); };
}

