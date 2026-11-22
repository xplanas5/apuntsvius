"use strict";
/* ---------- Laboratori (simulacions) ---------- */
let labState = {};
function viewLab(el) {
  const t = topicById(S.active); if (!t) return go("inici");
  const C = COMPILED[t.id];
  const sims = [...C.formules.map(f => ({ kind: "f", id: f.id, name: f.nom, sub: "Simulador de fórmula" })), ...t.procediments.map(p => ({ kind: "p", id: p.id, name: p.nom, sub: "Seqüència de passos" })), ...(t.relacions.length >= 3 ? [{ kind: "r", id: "all", name: "Construeix el mapa", sub: "Aparella conceptes" }] : []), ...(t.cronologia.length >= 3 ? [{ kind: "t", id: "all", name: "Línia del temps", sub: "Ordena els fets" }] : [])];
  if (!sims.length) { el.innerHTML = `<div class="card empty">Aquest tema no té fórmules, procediments, relacions ni cronologia per simular. Prova la Pràctica.</div>`; return; }
  if (!labState.sel || !sims.find(s => s.kind + ":" + s.id === labState.sel)) labState.sel = sims[0].kind + ":" + sims[0].id;
  el.innerHTML = `<div class="card stack"><span class="eyebrow">Laboratori · ${esc(t.titol)}</span><h1>Entorns de simulació</h1><p class="muted">Manipula, prediu i comprova. Cada repte superat compta com a pràctica i dona XP la primera vegada.</p>
    <div class="row">${sims.map(s => `<button class="btn small ${labState.sel === s.kind + ":" + s.id ? "primary" : ""}" data-sim="${s.kind}:${s.id}">${esc(s.name)}</button>`).join("")}</div></div><div id="simBox"></div>`;
  $$("[data-sim]", el).forEach(b => b.onclick = () => { labState.sel = b.dataset.sim; viewLab(el); });
  const [k, id] = labState.sel.split(":"), box = $("#simBox", el);
  if (k === "f") simFormula(box, t, C.formules.find(f => f.id === id));
  else if (k === "p") simOrder(box, t, makeItem(t.id, "p:" + id), "p:" + id);
  else if (k === "t") simOrder(box, t, makeItem(t.id, "t:all"), "t:all");
  else if (k === "r") simPairs(box, t);
}
function labWin(t, key, chId, label) {
  const id = t.id + "|" + chId;
  if (!S.labDone[id]) { S.labDone[id] = now(); addXP(6, "repte de laboratori"); const c = card(t.id, key); fsrs(c, 3); c.streak = Math.max(c.streak, 1); if (c.pendingError) { c.pendingError = false; fixError(t.id, key); } markDay(); checkBadges(); save(); }
}
function simFormula(box, t, f) {
  const env = { ...f.consts }; f.vars.forEach(v => env[v.simbol] = Number(niceRound((v.min + v.max) / 2, v.pas).toPrecision(6)));
  let xVar = f.vars[0].simbol, challenge = null, predicted = null;
  const newChallenge = () => { const e = randVars(f); challenge = { target: evalTree(f.tree, e), id: "obj_" + Math.round(Math.random() * 1e6) }; };
  newChallenge();
  box.innerHTML = `<div class="lab">
    <div class="card stack">
      <h2>${esc(f.nom)}</h2><span class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)}</span>
      ${f.vars.map(v => `<div class="slider"><div class="lbl"><span>${esc(v.nom)} (${esc(v.simbol)})</span><b id="lv_${v.simbol}"></b></div><input type="range" id="sl_${v.simbol}" min="${v.min}" max="${v.max}" step="${v.pas || (v.max - v.min) / 200}" value="${env[v.simbol]}" aria-label="${esc(v.nom)}"></div>`).join("")}
      ${f.constList.length ? `<p class="small muted">Constants: ${f.constList.map(c => `${esc(c.simbol)} = ${fmt(c.valor)} ${esc(c.unitat || "")}`).join(", ")}</p>` : ""}
      <div><span class="eyebrow">${esc(f.res.nom)}</span><div class="readout" id="out"></div><p class="small muted mono" id="subs"></p></div>
    </div>
    <div class="stack">
      <div class="card stack"><div class="row" style="justify-content:space-between"><h3>Gràfica</h3>${f.vars.length > 1 ? `<select id="xv" style="width:auto">${f.vars.map(v => `<option value="${v.simbol}">${esc(f.lhs)} segons ${esc(v.simbol)}</option>`).join("")}</select>` : ""}</div><canvas class="plot" id="plot" width="600" height="260" aria-label="Gràfica del resultat"></canvas></div>
      <div class="card stack"><h3>Repte 1 · Arriba a l'objectiu</h3><p>Mou els controls fins que <b>${esc(f.lhs)}</b> valgui <b class="mono" id="tgt"></b> (±2%).</p><div id="chOut" class="small"></div><div class="row"><button class="btn small" id="newCh">Un altre objectiu</button></div></div>
      <div class="card stack"><h3>Repte 2 · Prediu abans de provar</h3><p id="prq"></p><div class="opts" id="prOpts"></div><div id="prOut"></div></div>
    </div></div>`;
  const cv = $("#plot", box), ctx = cv.getContext("2d");
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";
  function draw() {
    const v = f.vars.find(x => x.simbol === xVar), N = 80, pts = [];
    for (let i = 0; i <= N; i++) { const x = v.min + (v.max - v.min) * i / N; const y = evalTree(f.tree, { ...env, [xVar]: x }); if (isFinite(y)) pts.push([x, y]); }
    const ys = pts.map(p => p[1]); let y0 = Math.min(0, ...ys), y1 = Math.max(...ys); if (y1 === y0) y1 = y0 + 1;
    const Wc = cv.width, Hc = cv.height, L = 56, Rr = 14, T = 14, B = 34;
    const X = x => L + (x - v.min) / (v.max - v.min) * (Wc - L - Rr), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (Hc - T - B);
    ctx.clearRect(0, 0, Wc, Hc); ctx.font = "12px " + css("--f-mono"); ctx.fillStyle = css("--muted"); ctx.strokeStyle = css("--line");
    for (let i = 0; i <= 4; i++) { const yy = y0 + (y1 - y0) * i / 4; ctx.beginPath(); ctx.moveTo(L, Y(yy)); ctx.lineTo(Wc - Rr, Y(yy)); ctx.stroke(); ctx.textAlign = "right"; ctx.fillText(fmt(yy), L - 6, Y(yy) + 4); }
    ctx.textAlign = "center"; [v.min, (v.min + v.max) / 2, v.max].forEach(x => ctx.fillText(fmt(x), X(x), Hc - 16)); ctx.fillText(`${v.simbol} (${v.unitat})`, (L + Wc) / 2, Hc - 2);
    ctx.strokeStyle = css("--blue"); ctx.lineWidth = 2.5; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1]))); ctx.stroke();
    if (challenge) { ctx.setLineDash([5, 5]); ctx.strokeStyle = css("--warn"); ctx.lineWidth = 1.5; const ty = Y(challenge.target); if (ty > T && ty < Hc - B) { ctx.beginPath(); ctx.moveTo(L, ty); ctx.lineTo(Wc - Rr, ty); ctx.stroke(); } ctx.setLineDash([]); }
    const cy = evalTree(f.tree, env); ctx.fillStyle = css("--mark"); ctx.strokeStyle = css("--ink"); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X(env[xVar]), Y(cy), 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  function update() {
    f.vars.forEach(v => $("#lv_" + v.simbol, box).textContent = `${fmt(env[v.simbol])} ${v.unitat}`);
    const R = evalTree(f.tree, env);
    $("#out", box).innerHTML = `${esc(f.lhs)} = ${fmt(R)} <small>${esc(f.res.unitat)}</small>`;
    $("#subs", box).textContent = `${f.lhs} = ${f.src.replace(/[A-Za-z_][A-Za-z0-9_]*/g, s => (s in env) ? fmt(env[s]) : s).replace(/\*/g, "·")}`;
    $("#tgt", box).textContent = `${fmt(challenge.target)} ${f.res.unitat}`;
    const rel = Math.abs(R - challenge.target) / Math.max(Math.abs(challenge.target), 1e-12), co = $("#chOut", box);
    if (rel <= 0.02) { co.innerHTML = `<div class="fb ok"><b>Aconseguit!</b> ${esc(f.lhs)} = ${fmt(R)} ${esc(f.res.unitat)}. Fixa't en quines combinacions funcionen: n'hi ha més d'una.</div>`; labWin(t, "f:" + f.id, f.id + "_" + challenge.id, f.nom); }
    else co.innerHTML = `<span class="muted">Estàs a un ${Math.round(rel * 100)}% de l'objectiu. ${R < challenge.target ? "Has d'augmentar" : "Has de reduir"} ${esc(f.lhs)}.</span>`;
    draw();
  }
  f.vars.forEach(v => $("#sl_" + v.simbol, box).oninput = e => { env[v.simbol] = parseFloat(e.target.value); update(); });
  const xs = $("#xv", box); if (xs) xs.onchange = e => { xVar = e.target.value; draw(); };
  $("#newCh", box).onclick = () => { newChallenge(); update(); };
  // predicció
  const item = makeItem(t.id, "f:" + f.id, { type: "predict" });
  $("#prq", box).innerHTML = item.prompt.replace(/<p class="muted small">.*?<\/p>/, "");
  $("#prOpts", box).innerHTML = item.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="k">${"ABCD"[i]}</span><span>${esc(o.text)}</span></button>`).join("");
  $$("#prOpts .opt", box).forEach(b => b.onclick = () => {
    if (predicted !== null) return; predicted = +b.dataset.i; const r = checkMcq(item, predicted);
    $$("#prOpts .opt", box).forEach((x, i) => { x.classList.toggle("right", !!item.options[i].ok); if (i === predicted && !r.ok) x.classList.add("wrong"); });
    const v = item.prompt.match(/\((\w+)\)<\/b> i la resta/); const sym = v ? v[1] : null;
    $("#prOut", box).innerHTML = `<div class="fb ${r.ok ? "ok" : "bad"}"><b>${r.ok ? "Bona predicció!" : "Predicció incorrecta."}</b> ${r.ok ? "" : esc(r.diag)} ${sym ? `Ara mou el control de ${esc(sym)} i comprova-ho a la gràfica.` : ""}</div>`;
    if (r.ok) labWin(t, "f:" + f.id, f.id + "_pred", f.nom);
  });
  update();
}
function simOrder(box, t, item, key) {
  let order = item.order.slice(), checked = false;
  const paint = res => {
    box.innerHTML = `<div class="card stack"><h2>${esc(item.label)}</h2>${item.prompt}<ol class="order">${order.map((ix, pos) => `<li class="${res ? (res.wrongPos.includes(pos) ? "wrong" : "right") : ""}"><span class="mono muted">${pos + 1}</span><span class="txt">${esc(item.items[ix])}${res && item.years ? ` <b class="mono">(${esc(item.years[ix])})</b>` : ""}</span><button aria-label="Puja" data-up="${pos}" ${pos === 0 ? "disabled" : ""}>↑</button><button aria-label="Baixa" data-dn="${pos}" ${pos === order.length - 1 ? "disabled" : ""}>↓</button></li>`).join("")}</ol><div class="actions"><button class="btn primary" id="chk">Comprova</button></div><div id="o"></div></div>`;
    $$("[data-up]", box).forEach(b => b.onclick = () => { const p = +b.dataset.up; [order[p - 1], order[p]] = [order[p], order[p - 1]]; paint(); });
    $$("[data-dn]", box).forEach(b => b.onclick = () => { const p = +b.dataset.dn; [order[p + 1], order[p]] = [order[p], order[p + 1]]; paint(); });
    $("#chk", box).onclick = () => { const r = checkOrder(item, order); paint(r); $("#o", box).innerHTML = `<div class="fb ${r.ok ? "ok" : "bad"}"><b>${r.ok ? "Seqüència correcta!" : "Encara no."}</b> ${r.ok ? "" : esc(r.diag) + " Els verds ja són al seu lloc."}</div>`; if (r.ok) labWin(t, key, key, item.label); };
  };
  paint();
}
function simPairs(box, t) {
  const rels = shuffle(t.relacions).slice(0, 5);
  const left = rels.map((r, i) => ({ i, text: `${r.a} — ${r.tipus}` })), right = shuffle(rels.map((r, i) => ({ i, text: r.b })));
  let selL = null, done = new Set(), misses = 0;
  const paint = msg => {
    box.innerHTML = `<div class="card stack"><h2>Construeix el mapa</h2><p class="muted">Toca una frase de l'esquerra i després el concepte que la completa.</p><div class="pairs"><div class="opts">${left.map(l => `<button class="opt ${done.has(l.i) ? "right" : ""}" data-l="${l.i}" aria-pressed="${selL === l.i}" ${done.has(l.i) ? "disabled" : ""}>${esc(l.text)} …</button>`).join("")}</div><div class="opts">${right.map(r => `<button class="opt ${done.has(r.i) ? "right" : ""}" data-r="${r.i}" ${done.has(r.i) ? "disabled" : ""}>${esc(r.text)}</button>`).join("")}</div></div><div id="o">${msg || ""}</div></div>`;
    $$("[data-l]", box).forEach(b => b.onclick = () => { selL = +b.dataset.l; paint(); });
    $$("[data-r]", box).forEach(b => b.onclick = () => {
      if (selL === null) return paint(`<p class="small muted">Primer tria una frase de l'esquerra.</p>`);
      const ri = +b.dataset.r, rl = rels[selL];
      if (ri === selL) { done.add(ri); selL = null; if (done.size === rels.length) { paint(`<div class="fb ok"><b>Mapa complet!</b> ${misses ? `Amb ${misses} errada${misses > 1 ? "es" : ""}: torna-ho a provar per fer-ho net.` : "Sense cap errada."}</div>`); if (!misses) labWin(t, "r:all", "pairs", "Mapa"); return; } paint(`<p class="small" style="color:var(--ok)"><b>Correcte:</b> ${esc(rl.a)} ${esc(rl.tipus)} ${esc(rl.b)}.</p>`); }
      else { misses++; const wrong = rels[ri]; paint(`<div class="fb bad">«${esc(rl.a)} ${esc(rl.tipus)} ${esc(wrong.b)}» no és el que diuen els apunts. Pensa quin concepte encaixa amb «${esc(rl.tipus)}».</div>`); }
    });
  };
  paint();
}

