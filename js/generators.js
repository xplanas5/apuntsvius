"use strict";
/* ---------------- Expressions (sense eval) ---------------- */
const FN = { sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, sin: x => Math.sin(x * Math.PI / 180), cos: x => Math.cos(x * Math.PI / 180), tan: x => Math.tan(x * Math.PI / 180) };
function parseExpr(src) {
  const toks = []; let i = 0; src = String(src);
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; if (/[eE]/.test(src[j] || "") && /[-+0-9]/.test(src[j + 1] || "")) { j += 2; while (j < src.length && /[0-9]/.test(src[j])) j++; } toks.push({ t: "n", v: parseFloat(src.slice(i, j)) }); i = j; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++; toks.push({ t: "id", v: src.slice(i, j) }); i = j; continue; }
    if ("+-*/^(),".includes(c)) { toks.push({ t: c }); i++; continue; }
    if (c === "·" || c === "×") { toks.push({ t: "*" }); i++; continue; }
    if (c === "÷") { toks.push({ t: "/" }); i++; continue; }
    throw new Error("Caràcter no vàlid: " + c);
  }
  let p = 0;
  const peek = () => toks[p];
  const eat = t => { if (toks[p] && toks[p].t === t) return toks[p++]; throw new Error("S'esperava " + t); };
  function expr() { let n = term(); while (peek() && (peek().t === "+" || peek().t === "-")) { const op = toks[p++].t; n = { op, a: n, b: term() }; } return n; }
  function term() { let n = unary(); while (peek() && (peek().t === "*" || peek().t === "/")) { const op = toks[p++].t; n = { op, a: n, b: unary() }; } return n; }
  function unary() { if (peek() && peek().t === "-") { p++; return { op: "neg", a: unary() }; } if (peek() && peek().t === "+") { p++; return unary(); } return power(); }
  function power() { const b = atom(); if (peek() && peek().t === "^") { p++; return { op: "^", a: b, b: unary() }; } return b; }
  function atom() {
    const t = toks[p++]; if (!t) throw new Error("Expressió incompleta");
    if (t.t === "n") return { num: t.v };
    if (t.t === "id") { if (peek() && peek().t === "(") { p++; const args = [expr()]; while (peek() && peek().t === ",") { p++; args.push(expr()); } eat(")"); if (!FN[t.v]) throw new Error("Funció desconeguda: " + t.v); return { fn: t.v, args }; } return { v: t.v }; }
    if (t.t === "(") { const e = expr(); eat(")"); return e; }
    throw new Error("Símbol inesperat");
  }
  const tree = expr(); if (p < toks.length) throw new Error("Sobren símbols"); return tree;
}
function evalTree(n, env) {
  if ("num" in n) return n.num;
  if ("v" in n) { if (n.v in env) return env[n.v]; if (n.v === "pi") return Math.PI; throw new Error("Variable desconeguda: " + n.v); }
  if (n.fn) return FN[n.fn](...n.args.map(a => evalTree(a, env)));
  const a = evalTree(n.a, env); if (n.op === "neg") return -a;
  const b = evalTree(n.b, env);
  switch (n.op) { case "+": return a + b; case "-": return a - b; case "*": return a * b; case "/": return a / b; case "^": return Math.pow(a, b); }
  return NaN;
}
function varsOf(n, s = new Set()) { if (!n) return s; if ("v" in n && n.v !== "pi") s.add(n.v); if (n.args) n.args.forEach(a => varsOf(a, s)); if (n.a) varsOf(n.a, s); if (n.b) varsOf(n.b, s); return s; }
const prettyExpr = s => esc(String(s).replace(/\*/g, " · ").replace(/\s+/g, " ").replace(/\^(\w+|\([^)]*\))/g, "<sup>$1</sup>")).replace(/&lt;sup&gt;(.*?)&lt;\/sup&gt;/g, "<sup>$1</sup>");


/* ============================================================
   Generadors d'activitats (deterministes, a partir del JSON)
   ============================================================ */
const niceRound = (x, pas) => { if (pas) return Math.round(x / pas) * pas; if (x === 0) return 0; const p = Math.pow(10, Math.floor(Math.log10(Math.abs(x))) - 1); return Math.round(x / p) * p; };
function randVars(f) { const env = { ...f.consts }; f.vars.forEach(v => { env[v.simbol] = Number(niceRound(v.min + Math.random() * (v.max - v.min), v.pas).toPrecision(6)); if (env[v.simbol] === 0) env[v.simbol] = v.pas || v.max / 2; }); return env; }
const unitOf = (f, s) => s === f.lhs ? f.res.unitat : (f.vars.find(v => v.simbol === s) || {}).unitat || (f.constList.find(c => c.simbol === s) || {}).unitat || "";
const nameOf = (f, s) => s === f.lhs ? f.res.nom : (f.vars.find(v => v.simbol === s) || {}).nom || s;
const valU = (f, s, x) => `<b class="mono">${fmt(x)}${unitOf(f, s) ? " " + esc(unitOf(f, s)) : ""}</b>`;

function diagNumber(ans, correct, extra = []) {
  if (!isFinite(ans)) return { ok: false, diag: "Escriu un número (pots fer servir coma decimal)." };
  const rel = x => Math.abs(ans - x) / Math.max(Math.abs(x), 1e-12);
  if (rel(correct) <= 0.02) return { ok: true };
  for (const e of extra) if (isFinite(e.v) && rel(e.v) <= 0.02) return { ok: false, diag: e.why, kind: "conceptual" };
  if (Math.abs(ans + correct) / Math.abs(correct) <= 0.02) return { ok: false, diag: "Tens el valor bé però amb el signe canviat.", kind: "signe" };
  for (const k of [1, 2, 3, 6, -1, -2, -3, -6]) if (rel(correct * Math.pow(10, k)) <= 0.02) return { ok: false, diag: `Sembla un error d'unitats: el teu resultat és ${k > 0 ? Math.pow(10, k) + " vegades més gran" : Math.pow(10, -k) + " vegades més petit"}. Revisa les conversions.`, kind: "unitats" };
  if (rel(correct) <= 0.1) return { ok: false, diag: "Gairebé! Revisa l'arrodoniment o el valor de les constants.", kind: "calcul" };
  return { ok: false, diag: "Revisa quina fórmula has d'aplicar i com hi substitueixes les dades.", kind: "procediment" };
}
function workedExample(f, target) {
  const env = randVars(f), R = evalTree(f.tree, env);
  const subs = f.src.replace(/[A-Za-z_][A-Za-z0-9_]*/g, s => (s in env) ? fmt(env[s]) : s);
  const data = Object.keys(env).filter(s => !(s in f.consts) || true).map(s => `${esc(s)} = ${fmt(env[s])} ${esc(unitOf(f, s))}`).join(", ");
  if (!target || target === f.lhs) return `<p>Exemple resolt amb altres dades: ${data}.</p><p class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)} = ${prettyExpr(subs)} = ${fmt(R)} ${esc(f.res.unitat)}</p>`;
  return `<p>Exemple amb altres dades: si ${esc(f.lhs)} = ${fmt(R)} ${esc(f.res.unitat)} i ${f.vars.filter(v => v.simbol !== target).map(v => `${esc(v.simbol)} = ${fmt(env[v.simbol])} ${esc(v.unitat)}`).join(", ")}, busquem ${esc(target)}.</p><p>Aïllant ${esc(target)} surt ${esc(target)} = ${fmt(env[target])} ${esc(unitOf(f, target))}. Comprovació: <span class="formula">${prettyExpr(subs)} = ${fmt(R)}</span></p>`;
}

const RELTYPES = ["causa", "és part de", "s'oposa a", "és un tipus de", "produeix", "conté"];
function makeItem(tid, key, opts = {}) {
  const C = COMPILED[tid], t = C.t, [kind, id] = key.split(":"), c = peekCard(tid, key), lvl = c.streak || 0;
  const base = { tid, key, topic: t.titol };
  if (kind === "c") {
    const co = conceptById(t, id); if (!co) return null;
    const others = t.conceptes.filter(x => x.id !== co.id);
    const accepted = [co.nom, ...co.sinonims];
    const hintsC = [co.pista_conceptual || `Pensa en: ${co.paraules_clau.slice(0, 2).join(", ") || co.exemple}`, `Comença per «${co.nom.slice(0, 2)}…» i té ${co.nom.replace(/\s/g, "").length} lletres.`, co.exemple ? `Exemple: ${co.exemple}` : `Paraules clau: ${co.paraules_clau.join(", ")}`];
    const checkText = ans => {
      const a = norm(ans); if (!a) return { ok: false, diag: "Escriu una resposta." };
      for (const acc of accepted) { const n = norm(acc); if (a === n) return { ok: true }; if (lev(a, n) <= Math.max(1, Math.floor(n.length * 0.2))) return { ok: true, note: `Correcte, però vigila l'ortografia: «${co.nom}».` }; }
      const conf = others.find(o => [o.nom, ...o.sinonims].some(x => norm(x) === a || lev(norm(x), a) <= 1));
      if (conf) return { ok: false, diag: `Has confós «${co.nom.slice(0, 1)}…» amb «${conf.nom}». ${conf.nom[0].toUpperCase() + conf.nom.slice(1)} és: ${conf.definicio}`, kind: "confusio" };
      const dis = co.distractors.find(d => norm(d.text) === a);
      if (dis) return { ok: false, diag: dis.per_que || `«${dis.text}» és un error habitual.`, kind: "conceptual" };
      return { ok: false, diag: "No és el terme. Rellegeix la definició: quina paraula clau la identifica?", kind: "record" };
    };
    const types = lvl === 0 ? ["mcq_def", "mcq_name"] : lvl === 1 ? ["fill", "mcq_name", "short"] : ["short", "fill"];
    let type = opts.type || pick(types);
    const kw = co.paraules_clau.find(k => co.definicio.toLowerCase().includes(k.toLowerCase()) && k.length > 3);
    if (type === "fill" && !kw) type = "short";
    if (type === "mcq_name" && others.length < 2) type = "mcq_def";
    if (type === "mcq_def") {
      const dists = shuffle([...co.distractors.map(d => ({ text: d.text, why: d.per_que })), ...others.map(o => ({ text: o.nom, why: `«${o.nom}» és: ${o.definicio}` }))]).filter((d, i, a) => a.findIndex(x => norm(x.text) === norm(d.text)) === i && norm(d.text) !== norm(co.nom)).slice(0, 3);
      const options = shuffle([{ text: co.nom, ok: true }, ...dists.map(d => ({ text: d.text, why: d.why }))]);
      return { ...base, label: co.nom, type: "Reconeix", mode: "mcq", prompt: `<p class="muted small">Quin concepte correspon a aquesta definició?</p><p class="prompt">${esc(co.definicio)}</p>`, options, answerText: co.nom, explain: co.definicio, source: co.font, hints: [hintsC[0], "Descarta les opcions que són una altra magnitud o un altre element.", hintsC[2]], concept: co };
    }
    if (type === "mcq_name") {
      const ds = shuffle(others).slice(0, 3).map(o => ({ text: o.definicio, why: `Aquesta és la definició de «${o.nom}».` }));
      const options = shuffle([{ text: co.definicio, ok: true }, ...ds]);
      return { ...base, label: co.nom, type: "Reconeix", mode: "mcq", prompt: `<p class="muted small">Quina és la definició correcta?</p><p class="prompt big">${esc(co.nom)}</p>`, options, answerText: co.definicio, explain: co.exemple ? "Exemple: " + co.exemple : "", source: co.font, hints: [hintsC[0], `Busca la definició que parla de: ${co.paraules_clau[0] || "la idea principal"}.`, hintsC[2]], concept: co };
    }
    if (type === "fill") {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const shown = esc(co.definicio).replace(re, '<span class="hl mono">________</span>');
      return { ...base, label: co.nom, type: "Completa", mode: "text", prompt: `<p class="muted small">Completa la definició de <b>${esc(co.nom)}</b>:</p><p class="prompt">${shown}</p>`, check: ans => { const a = norm(ans), n = norm(kw); if (a === n || lev(a, n) <= Math.max(1, Math.floor(n.length * 0.2))) return { ok: true }; return { ok: false, diag: "Aquesta no és la paraula que falta. Pensa què fa que la definició sigui precisa.", kind: "record" }; }, answerText: kw, explain: co.definicio, source: co.font, hints: [hintsC[0], `La paraula comença per «${kw.slice(0, 2)}» i té ${kw.length} lletres.`, hintsC[2]], concept: co };
    }
    return { ...base, label: co.nom, type: "Recorda", mode: "text", prompt: `<p class="muted small">Escriu el nom del concepte (sense mirar els apunts):</p><p class="prompt">${esc(co.definicio)}</p>`, check: checkText, answerText: co.nom, explain: co.exemple ? "Exemple: " + co.exemple : "", source: co.font, hints: hintsC, concept: co };
  }
  if (kind === "f") {
    const f = C.formules.find(x => x.id === id); if (!f) return null;
    const co = conceptById(t, f.concepte_id);
    const env = randVars(f), R = evalTree(f.tree, env);
    if (!isFinite(R)) return null;
    const canSolve = f.vars.length >= 1 && lvl >= 1 && Math.random() < 0.6;
    if (opts.type === "predict" || (!opts.exam && lvl >= 1 && Math.random() < 0.2 && f.vars.length)) {
      const v = pick(f.vars), e2 = { ...env, [v.simbol]: env[v.simbol] * 2 }, ratio = evalTree(f.tree, e2) / R;
      const choices = [{ r: 2, text: "Es duplica" }, { r: 0.5, text: "Es redueix a la meitat" }, { r: 4, text: "Es multiplica per 4" }, { r: 1, text: "No canvia" }, { r: 0.25, text: "Es divideix entre 4" }];
      let right = choices.find(ch => Math.abs(ch.r - ratio) < 0.02);
      const options = right ? shuffle([right, ...shuffle(choices.filter(ch => ch !== right)).slice(0, 3)]).map(ch => ({ text: ch.text, ok: ch === right, why: `En realitat, si dobles ${v.simbol}, ${f.lhs} queda multiplicat per ${fmt(ratio)}.` })) : shuffle([{ text: `Augmenta (×${fmt(ratio)})`, ok: ratio > 1 }, { text: `Disminueix`, ok: ratio < 1 }, { text: "No canvia", ok: Math.abs(ratio - 1) < 0.01 }]).map(o => ({ ...o, why: `Si dobles ${v.simbol}, ${f.lhs} es multiplica per ${fmt(ratio)}.` }));
      return { ...base, label: f.nom, type: "Prediu", mode: "mcq", prompt: `<p class="muted small">${esc(f.nom)}: <span class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)}</span></p><p class="prompt">Si dobles <b>${esc(v.nom)} (${esc(v.simbol)})</b> i la resta no canvia, què li passa a <b>${esc(f.res.nom)} (${esc(f.lhs)})</b>?</p>`, options, answerText: right ? right.text : "×" + fmt(ratio), explain: `Ho pots comprovar al laboratori movent el control de ${v.simbol}.`, source: co ? co.font : "", hints: [`Mira si ${v.simbol} multiplica, divideix o està elevat a alguna potència.`, `Prova-ho amb números: ${v.simbol} = 1 i ${v.simbol} = 2.`, workedExample(f)], formula: f };
    }
    if (canSolve && !opts.forceResult) {
      const target = pick(f.vars).simbol, truth = env[target];
      const given = [...f.vars.filter(v => v.simbol !== target).map(v => `${esc(v.nom)} (${esc(v.simbol)}) = ${valU(f, v.simbol, env[v.simbol])}`), `${esc(f.res.nom)} (${esc(f.lhs)}) = ${valU(f, f.lhs, R)}`];
      const extra = []; f.vars.filter(v => v.simbol !== target).forEach(o => { extra.push({ v: R * env[o.simbol], why: `Has multiplicat ${f.lhs} per ${o.simbol}. Per aïllar ${target}, el que multiplica passa dividint (i al revés).` }, { v: R / env[o.simbol], why: `Has dividit ${f.lhs} entre ${o.simbol}, però en aquesta fórmula s'aïlla d'una altra manera. Revisa on és ${target}.` }, { v: env[o.simbol] / R, why: `Has invertit la divisió. Aïlla ${target} pas a pas.` }); });
      const extraOk = extra.filter(e => Math.abs(e.v - truth) / Math.abs(truth) > 0.02);
      return { ...base, label: f.nom, type: "Aïlla i calcula", mode: "number", unit: unitOf(f, target), prompt: `<p class="muted small">${esc(f.nom)}</p><p class="prompt">Dades: ${given.join(" · ")}${f.constList.length ? " · " + f.constList.map(c => `${esc(c.simbol)} = ${fmt(c.valor)} ${esc(c.unitat || "")}`).join(" · ") : ""}</p><p class="prompt">Calcula <b>${esc(nameOf(f, target))} (${esc(target)})</b>.</p>`, check: ans => { const n = parseNum(ans); const envA = { ...env, [target]: n }; const back = evalTree(f.tree, envA); if (isFinite(back) && Math.abs(back - R) / Math.abs(R) <= 0.02) return { ok: true }; return diagNumber(n, truth, extraOk); }, answerText: `${fmt(truth)} ${unitOf(f, target)}`, explain: `${esc(f.lhs)} = ${prettyExpr(f.src)} → s'aïlla ${esc(target)}.`, source: co ? co.font : "", hints: [esc(co ? (co.pista_conceptual || "Quina magnitud et demanen?") : "Quina magnitud et demanen i quines dades tens?"), `Fes servir <span class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)}</span> i aïlla ${esc(target)} abans de substituir.`, workedExample(f, target)], formula: f, raw: true };
    }
    const extra = f.errors.map(e => { try { return { v: evalTree(e.tree, env), why: e.explicacio }; } catch { return null; } }).filter(e => e && Math.abs(e.v - R) / Math.max(Math.abs(R), 1e-12) > 0.02);
    const given = f.vars.map(v => `${esc(v.nom)} (${esc(v.simbol)}) = ${valU(f, v.simbol, env[v.simbol])}`);
    return { ...base, label: f.nom, type: "Calcula", mode: "number", unit: f.res.unitat, prompt: `<p class="muted small">${esc(f.nom)}</p><p class="prompt">Dades: ${given.join(" · ")}${f.constList.length ? " · " + f.constList.map(c => `${esc(c.simbol)} = ${fmt(c.valor)} ${esc(c.unitat || "")}`).join(" · ") : ""}</p><p class="prompt">Calcula <b>${esc(f.res.nom)} (${esc(f.lhs)})</b>.</p>`, check: ans => diagNumber(parseNum(ans), R, extra), answerText: `${fmt(R)} ${f.res.unitat}`, explain: `${esc(f.lhs)} = ${prettyExpr(f.src)} = ${prettyExpr(f.src.replace(/[A-Za-z_][A-Za-z0-9_]*/g, s => (s in env) ? fmt(env[s]) : s))} = ${fmt(R)} ${esc(f.res.unitat)}`, source: co ? co.font : "", hints: [esc(co ? (co.pista_conceptual || `Què és ${f.res.nom}?`) : `Què és ${f.res.nom}?`), `Fórmula: <span class="formula">${esc(f.lhs)} = ${prettyExpr(f.src)}</span>. Comprova que les dades són en unitats del SI.`, workedExample(f)], formula: f, raw: true };
  }
  if (kind === "p") {
    const p = t.procediments.find(x => x.id === id); if (!p) return null;
    let order = shuffle(p.passos.map((s, i) => i)); if (order.every((v, i) => v === i)) order = order.reverse();
    return { ...base, label: p.nom, type: "Ordena", mode: "order", prompt: `<p class="muted small">Ordena els passos del procediment:</p><p class="prompt big">${esc(p.nom)}</p>`, items: p.passos, order, answerText: p.passos.map((s, i) => (i + 1) + ". " + s).join(" "), explain: "", source: "", hints: ["Pensa quin pas has de fer abans de poder fer els altres.", `El primer pas és: «${p.passos[0]}».`, `L'últim pas és: «${p.passos[p.passos.length - 1]}».`] };
  }
  if (kind === "e") {
    const e = t.errors_tipics.find(x => x.id === id); if (!e) return null;
    const truths = shuffle(t.conceptes).slice(0, 3).map(c => ({ text: `${c.nom[0].toUpperCase() + c.nom.slice(1)}: ${c.definicio}`, why: "Aquesta afirmació és correcta." }));
    const options = shuffle([{ text: e.afirmacio_erronia, ok: true }, ...truths]);
    return { ...base, label: e.afirmacio_erronia, type: "Detecta l'error", mode: "mcq", prompt: `<p class="muted small">Només una afirmació és <b>falsa</b>. Quina?</p>`, options, answerText: e.afirmacio_erronia, explain: "Correcció: " + e.correccio, source: "", hints: ["Busca l'afirmació que confon dos conceptes o generalitza massa.", "Les definicions dels apunts són correctes: compara-les amb el que recordes.", "Pensa en un contraexemple per a cada afirmació."] };
  }
  if (kind === "r") {
    const r = pick(t.relacions); const types = [...new Set([...t.relacions.map(x => x.tipus), ...RELTYPES])];
    const options = shuffle([{ text: r.tipus, ok: true }, ...shuffle(types.filter(x => x !== r.tipus)).slice(0, 3).map(x => ({ text: x, why: `La relació correcta és «${r.a} ${r.tipus} ${r.b}».` }))]);
    return { ...base, label: `${r.a} → ${r.b}`, type: "Relaciona", mode: "mcq", prompt: `<p class="muted small">Quina relació hi ha entre aquests dos conceptes?</p><p class="prompt"><b>${esc(r.a)}</b> <span class="muted">…?…</span> <b>${esc(r.b)}</b></p>`, options, answerText: `${r.a} ${r.tipus} ${r.b}`, explain: "", source: "", hints: ["Pregunta't: un fa que passi l'altre? Un forma part de l'altre?", "Llegeix la frase completa amb cada opció i mira quina té sentit.", "Mira el mapa conceptual de la pestanya Apunts."] };
  }
  if (kind === "t") {
    const ev = shuffle(t.cronologia).slice(0, Math.min(5, t.cronologia.length));
    const sorted = ev.slice().sort((a, b) => a.ordre - b.ordre);
    let order = shuffle(sorted.map((_, i) => i)); if (order.every((v, i) => v === i)) order = order.reverse();
    return { ...base, label: "Cronologia", type: "Ordena en el temps", mode: "order", prompt: `<p class="muted small">Ordena els fets del més antic al més recent:</p>`, items: sorted.map(e => e.fet), years: sorted.map(e => e.any), order, answerText: sorted.map(e => `${e.any}: ${e.fet}`).join(" · "), explain: "", source: "", hints: ["Pensa quins fets depenen d'altres anteriors.", `El més antic és: «${sorted[0].fet}».`, `Anys: ${sorted.map(e => e.any).join(", ")} (desordenats ja no!).`] };
  }
  if (kind === "k") return ideaItem(t, id, base, lvl);
  if (kind === "d") return dateItem(t, id, base);
  if (kind === "g") return groupItem(t, id, base);
  if (kind === "v") return truthItem(t, base);
  return null;
}

/* ---------- Activitats per a text (humanitats) ---------- */
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function blankIn(frase, text) {
  const re = new RegExp(text.trim().split(/\s+/).map(reEsc).join("\\s+"), "i"), m = frase.match(re);
  return m ? { before: frase.slice(0, m.index), after: frase.slice(m.index + m[0].length) } : null;
}
function ideaItem(t, id, base, lvl) {
  const k = t.idees_clau.find(x => x.id === id); if (!k) return null;
  const b = blankIn(k.frase, k.text); if (!b) return null;
  const others = shuffle(t.idees_clau.filter(x => x.id !== k.id && norm(x.text) !== norm(k.text))).sort((x, y) => Math.abs(wc(x.text) - wc(k.text)) - Math.abs(wc(y.text) - wc(k.text))).slice(0, 3);
  const prompt = `<p class="muted small">Completa la frase dels teus apunts (és una idea que vas marcar):</p><p class="prompt">${esc(b.before)}<span class="blank">______</span>${esc(b.after)}</p>`;
  const common = { ...base, label: k.text, type: "Idea clau", prompt, answerText: k.text, explain: k.frase, source: "", hints: [`Té ${wc(k.text)} paraules.`, `Comença per «${k.text.split(/\s+/).slice(0, 1).join(" ")}…».`, `Comença per «${k.text.split(/\s+/).slice(0, 2).join(" ")}…».`] };
  if (others.length >= 2 && lvl < 2) return { ...common, mode: "mcq", options: shuffle([{ text: k.text, ok: true }, ...others.map(o => ({ text: o.text, why: `Aquesta idea també és dels apunts, però va en una altra frase: «${o.frase.slice(0, 120)}…»` }))]) };
  const target = norm(k.text), tw = target.split(" ").filter(w => w.length > 3);
  return { ...common, mode: "text", check: ans => {
    const a = norm(ans); if (!a) return { ok: false, diag: "Escriu una resposta." };
    if (a === target || lev(a, target) <= Math.max(2, Math.floor(target.length * 0.2))) return { ok: true };
    const hit = tw.filter(w => (" " + a + " ").includes(" " + w.slice(0, Math.max(4, w.length - 2)))).length;
    if (tw.length && hit / tw.length >= 0.7) return { ok: true, note: `Ho has dit amb altres paraules. Als apunts posa: «${k.text}».` };
    return { ok: false, diag: hit ? `Vas bé (${hit} de ${tw.length} paraules clau), però falta una part de la idea.` : "No és aquesta idea. Rellegeix la frase sencera: de què parla?", kind: "parcial" };
  } };
}
function dateVariants(e, all) {
  const labels = [...new Set(all.filter(x => x.any !== e.any).map(x => x.any))];
  const m = e.any.match(/^anys (\d0)$/), y = e.any.match(/^\d{4}$/), sg = e.any.match(/segle ([IVXL]+)$/i);
  const gen = [];
  if (m) for (const d of [-20, -10, 10, 20]) { const v = +m[1] + d; if (v >= 10 && v <= 90) gen.push("anys " + v); }
  if (y) for (const d of [-30, -12, 7, 15, 25]) gen.push(String(+e.any + d));
  if (sg) { const n = romanToInt(sg[1]), toR = k => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"][k]; for (const d of [-2, -1, 1]) if (n + d >= 1 && n + d <= 21) gen.push(e.any.replace(sg[1], toR(n + d))); }
  return [...new Set([...shuffle(labels), ...shuffle(gen)])].filter(x => x !== e.any).slice(0, 3);
}
function dateItem(t, id, base) {
  const e = t.cronologia.find(x => x.id === id); if (!e) return null;
  const d = findDate(e.fet);
  const shown = d && d.len ? esc(e.fet.slice(0, d.i)) + '<span class="blank">______</span>' + esc(e.fet.slice(d.i + d.len)) : esc(e.fet);
  const opts = dateVariants(e, t.cronologia); if (opts.length < 2) return null;
  const options = shuffle([{ text: e.any, ok: true }, ...opts.map(o => { const other = t.cronologia.find(x => x.any === o); return { text: o, why: other ? `${o} correspon a un altre fet: «${other.fet.slice(0, 110)}…»` : `No: és ${e.any}. ${Math.abs((parseFloat(o.replace(/\D/g, "")) || 0) - (parseFloat(e.any.replace(/\D/g, "")) || 0)) <= 10 ? "T'has quedat a prop!" : "T'has allunyat força."}` }; })]);
  return { ...base, label: e.fet.slice(0, 60), type: "Quan va passar?", mode: "mcq", prompt: `<p class="muted small">Quan va passar?</p><p class="prompt">${shown}</p>`, options, answerText: e.any, explain: e.fet, source: "", hints: ["Pensa què va passar abans i què després.", `Ordena mentalment: ${t.cronologia.slice().sort((a, b) => a.ordre - b.ordre).slice(0, 4).map(x => x.any).join(" → ")}…`, "Mira la cronologia de la pestanya Apunts."] };
}
function groupItem(t, id, base) {
  const g = t.grups.find(x => x.id === id); if (!g || t.grups.length < 2) return null;
  const it = pick(g.items), others = shuffle(t.grups.filter(x => x.id !== g.id)).slice(0, 3);
  const options = shuffle([{ text: g.nom, ok: true }, ...others.map(o => ({ text: o.nom, why: `«${it}» va a «${g.nom}». A «${o.nom}» hi ha, per exemple: ${o.items.slice(0, 2).join(", ")}.` }))]);
  return { ...base, label: it, type: "Classifica", mode: "mcq", prompt: `<p class="muted small">On va?</p><p class="prompt big">${esc(it)}</p>`, options, answerText: g.nom, explain: `${g.nom}: ${g.items.join(", ")}.`, source: "", hints: ["Pensa en què tenen en comú els elements de cada grup.", `Al mateix grup hi ha: ${g.items.filter(x => x !== it).slice(0, 2).join(", ")}.`, `Els grups són: ${t.grups.map(x => x.nom).join(" · ")}.`] };
}
function truthItem(t, base) {
  const useDate = t.cronologia.length >= 2 && (t.conceptes.length < 3 || Math.random() < 0.5), isTrue = Math.random() < 0.5;
  let text, fix;
  if (useDate) {
    const e = pick(t.cronologia), d = findDate(e.fet), alt = d && d.len ? dateVariants(e, t.cronologia)[0] : null;
    if (isTrue || !alt) text = e.fet; else text = e.fet.slice(0, d.i) + alt + e.fet.slice(d.i + d.len);
    fix = e.fet;
  } else {
    const c = pick(t.conceptes), o = pick(t.conceptes.filter(x => x.id !== c.id));
    text = `${cap1(c.nom)}: ${isTrue ? c.definicio : o.definicio}`; fix = `${cap1(c.nom)}: ${c.definicio}`;
  }
  const truth = text === fix;
  const options = [{ text: "Vertader", ok: truth, why: truth ? "" : `És vertader. Als apunts: «${fix}»` }, { text: "Fals", ok: !truth, why: !truth ? "" : `És fals. El correcte és: «${fix}»` }];
  return { ...base, label: "Vertader o fals", type: "Vertader o fals", mode: "mcq", prompt: `<p class="muted small">Vertader o fals?</p><p class="prompt">${esc(text)}</p>`, options, answerText: truth ? "Vertader" : "Fals", explain: truth ? "" : "Correcte: " + fix, source: "", hints: ["Fixa't en les dates, els llocs i les paraules clau.", "Una sola paraula canviada fa falsa la frase.", "Compara-ho amb la cronologia i el glossari dels apunts."] };
}
function checkMcq(item, idx) { const o = item.options[idx]; if (!o) return { ok: false, diag: "Tria una opció." }; return o.ok ? { ok: true } : { ok: false, diag: o.why || "No és aquesta.", kind: "confusio" }; }
function checkOrder(item, order) {
  const wrongPos = order.map((v, i) => v === i ? -1 : i).filter(i => i >= 0);
  if (!wrongPos.length) return { ok: true, wrongPos };
  const firstBad = wrongPos[0], should = item.items[firstBad];
  return { ok: false, wrongPos, diag: `${wrongPos.length} element${wrongPos.length > 1 ? "s" : ""} fora de lloc. A la posició ${firstBad + 1} hi hauria d'anar un altre pas: pensa què cal fer just després de «${firstBad > 0 ? item.items[firstBad - 1] : "començar"}».`, kind: "sequencia", should };
}

/* ---------------- Selecció de sessions ---------------- */
function buildSession(tids, n = 10, focus = null) {
  let pool = [];
  if (focus) pool = focus.slice();
  else {
    const due = [], err = [], fresh = [], rest = [];
    for (const tid of tids) { const t = topicById(tid); if (!t) continue; for (const k of topicKeys(t)) { const c = peekCard(tid, k), e = [tid, k]; if (c.pendingError) err.push(e); else if (!c.reps) fresh.push(e); else if (c.due <= now()) due.push([tid, k, c.due]); else rest.push([tid, k, c.S || 0, stateOf(c)]); } }
    due.sort((a, b) => a[2] - b[2]); rest.sort((a, b) => a[3] - b[3] || a[2] - b[2]);
    pool = [...err, ...due.map(x => [x[0], x[1]]), ...shuffle(fresh).slice(0, 5), ...rest.map(x => [x[0], x[1]])];
  }
  const chosen = []; const seen = new Set();
  for (const [tid, k] of pool) { const id = tid + "|" + k; if (seen.has(id)) continue; seen.add(id); chosen.push([tid, k]); if (chosen.length >= n) break; }
  // Intercalat: evita dos elements del mateix tipus seguits
  const out = []; let rem = shuffle(chosen);
  while (rem.length) { const last = out[out.length - 1]; let i = rem.findIndex(x => !last || (x[1][0] !== last[1][0] || x[0] !== last[0])); if (i < 0) i = 0; out.push(rem.splice(i, 1)[0]); }
  return out.map(([tid, k]) => makeItem(tid, k)).filter(Boolean);
}

