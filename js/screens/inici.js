"use strict";
/* ---------- Pantalla: Inici ---------- */
function stackedBar(s) { const n = s.n || 1; return `<div class="bar" role="img" aria-label="${s.counts[3]} dominats, ${s.counts[2]} consolidats, ${s.counts[1]} en pràctica, ${s.counts[0]} nous"><span style="width:${s.counts[3] / n * 100}%;background:var(--st-dom)"></span><span style="width:${s.counts[2] / n * 100}%;background:var(--st-cons)"></span><span style="width:${s.counts[1] / n * 100}%;background:var(--st-prac)"></span></div>`; }
const LEGEND = `<div class="legend"><span><i style="background:var(--st-new)"></i>nou</span><span><i style="background:var(--st-prac)"></i>en pràctica</span><span><i style="background:var(--st-cons)"></i>consolidat</span><span><i style="background:var(--st-dom)"></i>dominat</span></div>`;
const starsHTML = (n, max = 3) => `<span class="stars" aria-label="${n} de ${max} estrelles">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}">★</i>`).join("")}</span>`;

function viewHome(el) {
  const ts = allTopics(), ws = weekStreak(), g = globalStats();
  const dueTotal = ts.reduce((n, t) => n + topicStats(t).due, 0);
  const pend = S.errors.filter(e => !e.fixed).length;
  el.innerHTML = `
  <section class="hero">
    <div class="card stack">
      <span class="eyebrow">De la foto a l'examen</span>
      <h1>Els teus apunts, convertits en entrenament</h1>
      <p class="muted">Fes una foto dels apunts: l'app en llegeix el text i el converteix en apunts, simulacions, pràctica amb correcció immediata i un possible examen. Tot funciona al teu mòbil, sense IA i sense comptes.</p>
      <div class="row"><button class="btn mark" id="newT">Fer foto dels apunts</button>${dueTotal || pend ? `<button class="btn primary" id="quick">Repassos d'avui (${dueTotal + pend})</button>` : ""}</div>
    </div>
    <div class="card stack">
      <span class="eyebrow">Aquesta setmana</span>
      <div class="row" style="justify-content:space-between"><span>Dies d'estudi</span><b class="mono">${ws.thisWeek} / 3</b></div>
      <div class="progress"><span style="width:${Math.min(100, ws.thisWeek / 3 * 100)}%"></span></div>
      <div class="row" style="justify-content:space-between"><span>Errors per corregir</span><b class="mono">${pend}</b></div>
      <div class="row" style="justify-content:space-between"><span>Elements dominats</span><b class="mono">${g.dom}</b></div>
      <div class="row" style="justify-content:space-between"><span>Estrelles</span><b class="mono">${totalStars()} ★</b></div>
      <p class="small muted">La ratxa és setmanal: n'hi ha prou amb 3 dies. Tens un comodí: una setmana fluixa (amb almenys 1 dia) no et trenca la ratxa.</p>
    </div>
  </section>
  <section class="stack">
    <div class="row" style="justify-content:space-between"><h2>Els teus temes</h2>${LEGEND}</div>
    <div class="grid">${ts.map(t => { const s = topicStats(t); return `
      <article class="card topic">
        <div class="meta">${t.demo ? '<span class="pill">Exemple</span>' : '<span class="pill blue">Dels teus apunts</span>'}<span class="pill">${esc(t.materia)}</span>${s.due ? `<span class="pill mark">${s.due} per repassar</span>` : ""}</div>
        <div class="row" style="justify-content:space-between"><h3>${esc(t.titol)}</h3>${starsHTML(S.stars[t.id] || 0)}</div>
        <p class="small muted">${t.conceptes.length} conceptes · ${COMPILED[t.id].formules.length} fórmules · ${t.procediments.length} procediments</p>
        ${stackedBar(s)}
        <p class="small"><b>${Math.round(s.score * 100)}%</b> de domini · ${Math.round(s.consolidat * 100)}% consolidat</p>
        <div class="row"><button class="btn primary small" data-open="${t.id}">Obrir</button><button class="btn small" data-prac="${t.id}">Practicar</button></div>
      </article>`; }).join("")}</div>
  </section>`;
  $("#newT", el).onclick = () => Router.push("nou");
  $$("[data-open]", el).forEach(b => b.onclick = () => { S.active = b.dataset.open; save(); Router.push("tema"); });
  $$("[data-prac]", el).forEach(b => b.onclick = () => { S.active = b.dataset.prac; save(); startPractice([S.active]); Router.push("practica"); });
  const q = $("#quick", el); if (q) q.onclick = () => { startPractice(allTopics().map(t => t.id), 12); Router.push("practica"); };
}

/* ---------- Pantalla: centre d'un tema ---------- */
function viewTopic(el) {
  const t = topicById(S.active); if (!t) return Router.root("inici");
  const s = topicStats(t), boss = s.consolidat >= 0.8;
  const tiles = [
    ["apunts", "Apunts", "Resum, esquema, glossari, mapa i errors típics"],
    ["lab", "Laboratori", "Simuladors i reptes interactius"],
    ["practica", "Practicar", s.due ? `${s.due} repassos pendents` : "Sessió amb correcció immediata"],
    ["examen", boss ? "Repte final" : "Possible examen", boss ? "Desbloquejat: demostra que ho domines" : "Simulacre cronometrat"]
  ];
  el.innerHTML = `<div class="card stack"><span class="eyebrow">${esc(t.materia)}${t.curs ? " · " + esc(t.curs) : ""}</span><div class="row" style="justify-content:space-between"><h1>${esc(t.titol)}</h1>${starsHTML(S.stars[t.id] || 0)}</div>${stackedBar(s)}<p class="small"><b>${Math.round(s.score * 100)}%</b> de domini · ${s.counts[3]} dominats de ${s.n}</p></div>
    <div class="tiles">${tiles.map(([id, n, d]) => `<button class="tile" data-to="${id}"><b>${n}</b><span class="small muted">${d}</span></button>`).join("")}</div>`;
  $$("[data-to]", el).forEach(b => b.onclick = () => {
    const to = b.dataset.to;
    if (to === "practica") { startPractice([t.id]); Router.push("practica"); }
    else if (to === "examen") { examSession = boss ? buildExam([t.id], 15, 20, true) : null; Router.push("examen"); }
    else Router.push(to);
  });
}
