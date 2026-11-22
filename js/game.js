"use strict";
function addXP(n, why) { if (n <= 0) return; S.xp += n; popXP("+" + n + " XP · " + why); }
function popXP(text) { const d = document.createElement("div"); d.className = "xp-pop"; d.textContent = text; document.body.appendChild(d); setTimeout(() => d.remove(), 1900); renderStats(); }
function logError(tid, key, label, diag) {
  const open = S.errors.find(e => e.tid === tid && e.key === key && !e.fixed);
  if (open) { open.n++; open.diag = diag; open.t = now(); }
  else S.errors.unshift({ tid, key, label, diag, t: now(), n: 1, fixed: false });
  S.errors = S.errors.slice(0, 200);
}
function fixError(tid, key) { const e = S.errors.find(e => e.tid === tid && e.key === key && !e.fixed); if (e) { e.fixed = true; e.tf = now(); S.fixed++; return true; } return false; }

/* Registra un intent: grade 1-4, xp segons l'esforç útil */
function record(tid, key, { ok, firstTry, hint, conf, label, diag }) {
  const c = card(tid, key), wasDue = c.reps && c.due <= now() && (now() - c.last) >= 0.5 * DAY, before = stateOf(c);
  let g = !ok ? 1 : (hint || !firstTry) ? 2 : conf === "segur" ? 4 : 3;
  fsrs(c, g);
  let xp = 0, why = [];
  if (ok) {
    if (firstTry && !hint) {
      c.streak++;
      const d = dayKey(); if (!c.okDays.includes(d)) c.okDays = [...c.okDays, d].slice(-10);
      if (before < 3 || wasDue) { xp += 10; why.push("encert al primer intent"); }
    } else { c.streak = 0; xp += 4; why.push(hint ? "encert amb pista" : "encert al segon intent"); }
    if (c.pendingError) { c.pendingError = false; if (fixError(tid, key)) { xp += 8; why.push("error corregit"); } }
    if (wasDue) { xp += 5; why.push("repàs a temps"); }
  } else {
    c.streak = 0; c.pendingError = true; logError(tid, key, label, diag);
  }
  if (conf === "segur" || conf === "crec") { S.calib[conf][1]++; if (ok) S.calib[conf][0]++; if ((conf === "segur") === ok && ok) { xp += 2; why.push("ben calibrat"); } }
  markDay();
  const after = stateOf(c);
  if (xp) addXP(xp, why.join(" + "));
  checkBadges(); save();
  return { before, after, xp, noXP: ok && firstTry && !hint && before >= 3 && !wasDue };
}

/* ---------------- Insígnies ---------------- */
const BADGES = [
  { id: "primer", ic: "1", nom: "Primer tema", desc: "Crea un tema a partir dels teus apunts" },
  { id: "errors10", ic: "E", nom: "Caçador d'errors", desc: "Corregeix 10 errors del quadern" },
  { id: "calib", ic: "C", nom: "Ben calibrat", desc: "20 respostes amb seguretat i un 80% d'encert quan dius 'segur'" },
  { id: "lab5", ic: "L", nom: "Mans al laboratori", desc: "Supera 5 reptes de simulació" },
  { id: "boss", ic: "B", nom: "Repte final", desc: "Aprova el repte final d'un tema" },
  { id: "setmana", ic: "S", nom: "Setmana completa", desc: "Estudia 3 dies diferents en una setmana" },
  { id: "ratxa3", ic: "3", nom: "Constància", desc: "Ratxa de 3 setmanes" },
  { id: "dom10", ic: "D", nom: "Domini", desc: "Domina 10 elements" }
];
function checkBadges() {
  const has = id => S.badges[id];
  const give = id => { if (!has(id)) { S.badges[id] = now(); const b = BADGES.find(b => b.id === id); setTimeout(() => popXP("Insígnia: " + b.nom), 900); } };
  if (Object.keys(S.topics).length) give("primer");
  if (S.fixed >= 10) give("errors10");
  const [ok, n] = S.calib.segur; if (n >= 20 && ok / n >= 0.8) give("calib");
  if (Object.keys(S.labDone).length >= 5) give("lab5");
  if (S.exams.some(e => e.boss && e.nota >= 7)) give("boss");
  const ws = weekStreak(); if (ws.thisWeek >= 3) give("setmana"); if (ws.streak >= 3) give("ratxa3");
  if (globalStats().dom >= 10) give("dom10");
}


/* ---------------- Sessions: combo, pregunta d'or i estrelles ----------------
   Tot premia esforç útil: el combo només compta encerts al primer intent sense pista
   i només dona bonus si l'encert ja sumava XP (no es pot farmejar el que ja domines). */
function totalStars() { return Object.values(S.stars || {}).reduce((a, b) => a + b, 0); }
function startSessionGame(P) {
  P.combo = 0; P.maxCombo = 0;
  const cands = P.items.map((_, i) => i).filter(i => i >= 2);
  P.golden = cands.length ? pick(cands) : -1;
}
function isGolden(P, idx) { return P.golden === idx; }
/* Retorna HTML extra per al feedback */
function onAnswer(P, idx, { ok, first, rec }) {
  let html = "";
  if (ok && first) {
    P.combo++; P.maxCombo = Math.max(P.maxCombo, P.combo);
    if (P.combo >= 3 && rec && rec.xp > 0) { const b = P.combo >= 5 ? 3 : 2; S.xp += b; popXP(`Combo x${P.combo} · +${b} XP`); }
    if (P.combo >= 3) { html += `<p class="combo">Combo x${P.combo}</p>`; Sfx.play("combo"); } else Sfx.play("ok");
  } else { if (P.combo >= 3) html += `<p class="small muted">S'ha trencat el combo de ${P.combo}.</p>`; P.combo = 0; Sfx.play(ok ? "ok" : "bad"); }
  if (isGolden(P, idx)) {
    S.golden.n++;
    if (ok && first) { S.golden.ok++; S.xp += 15; popXP("Pregunta d'or · +15 XP"); Sfx.play("gold"); Sfx.confetti(); html += `<p class="gold-msg">Pregunta d'or superada: +15 XP</p>`; }
    else html += `<p class="small muted">Era la pregunta d'or. La propera vegada!</p>`;
  }
  S.bestCombo = Math.max(S.bestCombo || 0, P.maxCombo || 0);
  save();
  return html;
}
/* Estrelles per tema: 1 = 60% al primer intent, 2 = 80%, 3 = tot bé (mínim 5 preguntes) */
function finishSession(P) {
  S.sessions = (S.sessions || 0) + 1;
  const won = {};
  for (const tid of P.tids) {
    const rs = P.results.filter(r => r.item.tid === tid); if (rs.length < 3) continue;
    const f = rs.filter(r => r.first).length / rs.length;
    const st = f === 1 && rs.length >= 5 ? 3 : f >= 0.8 ? 2 : f >= 0.6 ? 1 : 0;
    if (st > (S.stars[tid] || 0)) { S.stars[tid] = st; won[tid] = st; }
  }
  if (Object.keys(won).length) { Sfx.play("level"); Sfx.confetti(); }
  checkBadges(); save();
  return won;
}
