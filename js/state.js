"use strict";
/* ---------------- Estat, localStorage i migracions ----------------
   Tot es desa al dispositiu (localStorage). Sense comptes ni servidor. */
const STATE_KEYS = ["nou", "en pràctica", "consolidat", "dominat"];
const STATE_VERSION = 2;
let S = freshState();
const COMPILED = {};
function freshState() {
  return { v: STATE_VERSION, topics: {}, prog: {}, xp: 0, days: {}, errors: [], calib: { segur: [0, 0], crec: [0, 0] }, badges: {}, reported: {}, labDone: {}, exams: [], active: null, fixed: 0,
    stars: {}, bestCombo: 0, golden: { ok: 0, n: 0 }, sound: true, sessions: 0 };
}
const LS_KEY = "apunts-vius";
const LS_OLD = ["apunts-vius-v1"];
function lsGet(k = LS_KEY) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }
function lsSet(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); return true; } catch { return false; } }
/* Migracions: cada funció porta l'estat de la versió n a la n+1 */
const MIGRATIONS = {
  1: s => ({ ...s, stars: {}, bestCombo: 0, golden: { ok: 0, n: 0 }, sound: true, sessions: 0, v: 2 })
};
function migrate(o) {
  if (!o || typeof o !== "object") return null;
  let s = { ...o }; if (!s.v) s.v = 1;
  while (s.v < STATE_VERSION && MIGRATIONS[s.v]) s = MIGRATIONS[s.v](s);
  // Els temes poden venir d'una còpia importada: es reconstrueixen sempre (ids segurs, camps netejats)
  const topics = {};
  for (const raw of Object.values(s.topics && typeof s.topics === "object" ? s.topics : {})) { try { const t = normTopic(raw); topics[t.id] = t; } catch { } }
  const out = { ...freshState(), ...s, topics, v: STATE_VERSION };
  if (out.active && !topics[out.active] && !String(out.active).startsWith("demo_")) out.active = null;
  return out;
}
function loadState() {
  let o = lsGet();
  if (!o) for (const k of LS_OLD) { o = lsGet(k); if (o) break; }
  const m = migrate(o); if (m) S = m;
}
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { if (!lsSet(S)) console.warn("No s'ha pogut desar (emmagatzematge ple o bloquejat)"); }, 300); }
function saveNow() { clearTimeout(saveTimer); lsSet(S); }
addEventListener("pagehide", saveNow);
addEventListener("visibilitychange", () => { if (document.hidden) saveNow(); });


/* ---------------- Normalització i compilació dels temes ---------------- */
function arr(x) { return Array.isArray(x) ? x : []; }
function normTopic(raw) {
  const t = JSON.parse(JSON.stringify(raw || {}));
  t.id = t.id ? slug(t.id) : "t" + Date.now().toString(36);
  t.titol = String(t.titol || "Tema sense títol").slice(0, 80);
  t.materia = String(t.materia || ""); t.curs = String(t.curs || ""); t.resum = String(t.resum || "");
  t.seccions = arr(t.seccions).map(s => ({ titol: String(s.titol || ""), punts: arr(s.punts).map(String) }));
  const used = new Set();
  const uid = (x, pre) => { let b = slug(x || pre), id = b, k = 2; while (used.has(id)) id = b + "_" + k++; used.add(id); return id; };
  t.conceptes = arr(t.conceptes).filter(c => c && c.nom && c.definicio).map(c => ({
    id: uid(c.id || c.nom, "c"), nom: String(c.nom), definicio: String(c.definicio), exemple: String(c.exemple || ""),
    paraules_clau: arr(c.paraules_clau).map(String), sinonims: arr(c.sinonims).map(String),
    distractors: arr(c.distractors).map(d => typeof d === "string" ? { text: d, per_que: "" } : { text: String(d.text || ""), per_que: String(d.per_que || "") }).filter(d => d.text),
    font: String(c.font || ""), pista_conceptual: String(c.pista_conceptual || ""), dubtos: !!c.dubtos, motiu: String(c.motiu || "") }));
  t.formules = arr(t.formules).map(f => ({ ...f, id: uid(f.id || f.nom, "f"), variables: arr(f.variables), constants: arr(f.constants), errors: arr(f.errors), dubtos: !!f.dubtos }));
  t.procediments = arr(t.procediments).filter(p => arr(p.passos).length >= 3).map(p => ({ id: uid(p.id || p.nom, "p"), nom: String(p.nom || "Procediment"), passos: arr(p.passos).map(String), concepte_id: p.concepte_id ? slug(p.concepte_id) : "", dubtos: !!p.dubtos }));
  t.relacions = arr(t.relacions).filter(r => r.a && r.b && r.tipus).map(r => ({ a: String(r.a), tipus: String(r.tipus), b: String(r.b) }));
  t.cronologia = arr(t.cronologia).filter(e => e.fet && e.any !== undefined).map(e => ({ id: uid(e.id || "d_" + e.any + "_" + String(e.fet).slice(0, 20), "d"), any: String(e.any), ordre: isFinite(+e.ordre) && e.ordre !== "" && e.ordre !== undefined ? +e.ordre : (parseFloat(e.any) || 0), fet: String(e.fet) }));
  t.idees_clau = arr(t.idees_clau).filter(k => k && k.text && k.frase).map(k => ({ id: uid(k.id || "k_" + k.text, "k"), text: String(k.text), frase: String(k.frase), marques: arr(k.marques).map(String).filter(m => String(k.frase).includes(m)) }));
  t.grups = arr(t.grups).filter(g => g && g.nom && arr(g.items).length >= 2).map(g => ({ id: uid(g.id || "g_" + g.nom, "g"), nom: String(g.nom), items: arr(g.items).map(String) }));
  t.errors_tipics = arr(t.errors_tipics).filter(e => e.afirmacio_erronia).map(e => ({ id: uid(e.id || e.afirmacio_erronia, "e"), afirmacio_erronia: String(e.afirmacio_erronia), correccio: String(e.correccio || ""), concepte_id: e.concepte_id ? slug(e.concepte_id) : "", dubtos: !!e.dubtos }));
  t.preguntes_obertes = arr(t.preguntes_obertes).filter(q => q.pregunta).map(q => ({ id: uid(q.id || q.pregunta, "o"), pregunta: String(q.pregunta), resposta_model: String(q.resposta_model || ""), criteris: arr(q.criteris).map(String), concepte_id: q.concepte_id ? slug(q.concepte_id) : "" }));
  t.creat = t.creat || now();
  return t;
}
function compileFormula(f) {
  const parts = String(f.expressio || "").split("=");
  if (parts.length !== 2) throw new Error("Cal la forma R = expressió");
  const lhs = parts[0].trim(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(lhs)) throw new Error("El resultat ha de ser un símbol");
  const tree = parseExpr(parts[1]);
  const ID = /^[A-Za-z_][A-Za-z0-9_]*$/; // només identificadors: els símbols van a atributs i ids de l'HTML
  f = { ...f, constants: (f.constants || []).filter(c => ID.test(String(c.simbol || ""))), variables: (f.variables || []).filter(v => ID.test(String(v.simbol || ""))) };
  const consts = {}; f.constants.forEach(c => { consts[c.simbol] = Number(c.valor); });
  const vars = f.variables.filter(v => v.simbol && isFinite(+v.min) && isFinite(+v.max) && +v.max > +v.min).map(v => ({ simbol: v.simbol, nom: v.nom || v.simbol, unitat: v.unitat || "", min: +v.min, max: +v.max, pas: +v.pas > 0 ? +v.pas : 0 }));
  const need = varsOf(tree); for (const s of need) if (!(s in consts) && !vars.find(v => v.simbol === s)) throw new Error("Falta la variable " + s);
  if (!vars.length) throw new Error("Cap variable");
  const env = { ...consts }; vars.forEach(v => env[v.simbol] = (v.min + v.max) / 2);
  if (!isFinite(evalTree(tree, env))) throw new Error("No es pot avaluar");
  const errors = f.errors.map(e => { try { return { tree: parseExpr(e.expressio), explicacio: String(e.explicacio || "") }; } catch { return null; } }).filter(Boolean);
  const res = f.resultat || {};
  return { id: f.id, nom: f.nom || lhs, src: parts[1].trim(), lhs, tree, consts, constList: f.constants, vars, errors, res: { simbol: res.simbol || lhs, nom: res.nom || lhs, unitat: res.unitat || "" }, concepte_id: f.concepte_id || "", dubtos: !!f.dubtos };
}
function compile(t) {
  const fs = [];
  for (const f of t.formules) { try { fs.push(compileFormula(f)); } catch (e) { console.warn("Fórmula descartada", f.expressio, e.message); } }
  COMPILED[t.id] = { t, formules: fs };
  return COMPILED[t.id];
}
const allTopics = () => [...DEMOS.map(d => COMPILED[d.id] ? COMPILED[d.id].t : compile(normTopic(d)).t), ...Object.values(S.topics)];
const topicById = id => (COMPILED[id] ? COMPILED[id].t : null);
const conceptById = (t, id) => t.conceptes.find(c => c.id === id);

/* ---------------- Progrés per element ---------------- */
function topicKeys(t) {
  const k = [];
  t.conceptes.forEach(c => k.push("c:" + c.id));
  COMPILED[t.id].formules.forEach(f => k.push("f:" + f.id));
  t.procediments.forEach(p => k.push("p:" + p.id));
  t.errors_tipics.forEach(e => k.push("e:" + e.id));
  if (t.relacions.length >= 2) k.push("r:all");
  if (t.cronologia.length >= 3) k.push("t:all");
  (t.idees_clau || []).forEach(x => k.push("k:" + x.id));
  if ((t.cronologia || []).length >= 2) t.cronologia.forEach(x => k.push("d:" + x.id));
  if ((t.grups || []).length >= 2) t.grups.forEach(g => k.push("g:" + g.id));
  if ((t.cronologia || []).length >= 2 || t.conceptes.length >= 3) k.push("v:all");
  return k.filter(x => !(S.reported[t.id] || {})[x]);
}
function card(tid, key) { const p = S.prog[tid] || (S.prog[tid] = {}); return p[key] || (p[key] = { reps: 0, streak: 0, okDays: [], pendingError: false }); }
function peekCard(tid, key) { return (S.prog[tid] || {})[key] || { reps: 0, streak: 0, okDays: [] }; }
function stateOf(c) {
  if (!c.reps) return 0;
  const days = (c.okDays || []).length;
  if (c.bossOk || (c.S || 0) >= 15 || (c.streak >= 4 && days >= 2)) return 3;
  if (c.streak >= 2 || (c.S || 0) >= 4) return 2;
  return 1;
}
function topicStats(t) {
  const keys = topicKeys(t), counts = [0, 0, 0, 0]; let due = 0;
  keys.forEach(k => { const c = peekCard(t.id, k); counts[stateOf(c)]++; if (c.reps && c.due <= now()) due++; });
  const n = keys.length || 1;
  return { keys, counts, n: keys.length, due, consolidat: (counts[2] + counts[3]) / n, domini: counts[3] / n, score: (counts[1] * 0.25 + counts[2] * 0.6 + counts[3]) / n };
}
function globalStats() {
  let n = 0, pts = 0, dom = 0, cons = 0;
  for (const t of allTopics()) { const s = topicStats(t); if (!Object.keys(S.prog[t.id] || {}).length && t.demo) continue; n += s.n; pts += s.score * s.n; dom += s.counts[3]; cons += s.counts[2] + s.counts[3]; }
  return { n, domini: n ? pts / n : 0, dom, cons };
}
function markDay() { const d = dayKey(); S.days[d] = (S.days[d] || 0) + 1; }
function weekStreak() {
  const weeks = {}; Object.keys(S.days).forEach(d => { const w = weekKey(new Date(d + "T12:00:00").getTime()); weeks[w] = (weeks[w] || 0) + 1; });
  let streak = 0, t = now(), comodi = false; const cur = weekKey(t);
  for (let i = 0; i < 104; i++) {
    const w = weekKey(t - i * 7 * DAY), n = weeks[w] || 0;
    if (n >= 3) streak++;
    else if (w === cur) continue;
    else if (!comodi && n >= 1) { comodi = true; streak++; }
    else break;
  }
  return { streak, thisWeek: weeks[cur] || 0, comodi };
}
