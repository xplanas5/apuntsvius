"use strict";
/* ---------- Pantalla: Inici ---------- */
function stackedBar(s) { const n = s.n || 1; return `<div class="bar" role="img" aria-label="${s.counts[3]} dominats, ${s.counts[2]} consolidats, ${s.counts[1]} en pràctica, ${s.counts[0]} nous"><span style="width:${s.counts[3] / n * 100}%;background:var(--st-dom)"></span><span style="width:${s.counts[2] / n * 100}%;background:var(--st-cons)"></span><span style="width:${s.counts[1] / n * 100}%;background:var(--st-prac)"></span></div>`; }
const LEGEND = `<div class="legend"><span><i style="background:var(--st-new)"></i>nou</span><span><i style="background:var(--st-prac)"></i>en pràctica</span><span><i style="background:var(--st-cons)"></i>consolidat</span><span><i style="background:var(--st-dom)"></i>dominat</span></div>`;
const starsHTML = (n, max = 3) => `<span class="stars" aria-label="${n} de ${max} estrelles">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? "on" : ""}">★</i>`).join("")}</span>`;

function viewHome(el) {
  const ts = allTopics(), ws = weekStreak(), g = globalStats();
  const dueTotal = ts.reduce((n, t) => n + topicStats(t).due, 0);
  const pend = S.errors.filter(e => !e.fixed).length;
  const L = levelOf(S.xp);
  el.innerHTML = `
  <section class="hero2">
    <div class="hero-main">
      <span class="eyebrow">De la foto a l'examen</span>
      <h1>Els teus apunts, <span class="hl">vius</span>.</h1>
      <p>Fes una foto dels apunts i converteix-los en resum, idees clau, pràctica amb correcció immediata i un possible examen. Sense IA i sense comptes.</p>
      <div class="row"><button class="btn mark big" id="newT"><span aria-hidden="true">📷</span> Fer foto dels apunts</button>${dueTotal || pend ? `<button class="btn primary big" id="quick">Repassos d'avui · ${dueTotal + pend}</button>` : ""}</div>
    </div>
    <div class="hero-side">
      <div class="lvcard"><div class="lvnum"><small>Nivell</small><b>${L.n}</b></div><div class="grow"><div class="row" style="justify-content:space-between"><b>${S.xp} XP</b><span class="small">${L.toNext} XP per al nivell ${L.n + 1}</span></div><div class="xpbar"><span style="width:${L.pct}%"></span></div></div></div>
      <div class="kpis">
        <div class="kpi"><b>${ws.thisWeek}<small>/3</small></b><span>dies aquesta setmana</span></div>
        <div class="kpi"><b>${ws.streak}<small>🔥</small></b><span>setmanes de ratxa</span></div>
        <div class="kpi"><b>${totalStars()}<small>★</small></b><span>estrelles</span></div>
        <div class="kpi ${pend ? "alert" : ""}"><b>${pend}</b><span>errors per corregir</span></div>
      </div>
    </div>
  </section>
  <section class="stack">
    <div class="row" style="justify-content:space-between"><h2>Els teus temes</h2>${LEGEND}</div>
    <div class="grid topics">${ts.map(t => { const s = topicStats(t), sj = subjectStyle(t.materia), n = [t.conceptes.length && `${t.conceptes.length} conceptes`, COMPILED[t.id].formules.length && `${COMPILED[t.id].formules.length} fórmules`, (t.idees_clau || []).length && `${t.idees_clau.length} idees clau`, t.cronologia.length && `${t.cronologia.length} dates`].filter(Boolean).slice(0, 3).join(" · "); return `
      <article class="tcard" style="--sj:${sj.c}">
        <div class="tband"><span class="tic" aria-hidden="true">${sj.ic}</span><span class="small">${esc(t.materia)}${t.curs ? " · " + esc(t.curs) : ""}</span>${t.demo ? '<span class="pill">Exemple</span>' : ""}</div>
        <div class="tbody">
          <div class="row" style="justify-content:space-between;flex-wrap:nowrap;align-items:flex-start"><div class="stack" style="gap:6px"><h3>${esc(t.titol)}</h3>${starsHTML(S.stars[t.id] || 0)}</div>${ring(Math.round(s.score * 100), 60, sj.c)}</div>
          <p class="small muted">${n}</p>
          ${stackedBar(s)}
          <div class="row">${s.due ? `<span class="pill mark">${s.due} per repassar</span>` : ""}</div>
          <div class="row"><button class="btn primary" data-prac="${t.id}">▶ Practicar</button><button class="btn" data-open="${t.id}">Obrir</button></div>
        </div>
      </article>`; }).join("")}
      <button class="tcard add" id="newT2"><span class="plus" aria-hidden="true">+</span><b>Nou tema</b><span class="small muted">Fes fotos dels apunts</span></button></div>
  </section>`;
  $("#newT2", el).onclick = () => Router.push("nou");
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
  const sj = subjectStyle(t.materia), icons = { apunts: "📒", lab: "🧪", practica: "🎯", examen: boss ? "🏆" : "📝" };
  el.innerHTML = `<div class="thead" style="--sj:${sj.c}"><div class="grow stack" style="gap:8px"><span class="eyebrow">${sj.ic} ${esc(t.materia)}${t.curs ? " · " + esc(t.curs) : ""}</span><h1>${esc(t.titol)}</h1>${starsHTML(S.stars[t.id] || 0)}<p class="small">${s.counts[3]} dominats · ${s.counts[2]} consolidats · ${s.n} elements</p></div>${ring(Math.round(s.score * 100), 92, "#fff")}</div>
    ${stackedBar(s)}
    <div class="tiles">${tiles.map(([id, n, d]) => `<button class="tile ${id === "practica" ? "hot" : ""} ${id === "examen" && boss ? "boss" : ""}" data-to="${id}"><span class="tic" aria-hidden="true">${icons[id]}</span><b>${n}</b><span class="small muted">${d}</span></button>`).join("")}</div>`;
  $$("[data-to]", el).forEach(b => b.onclick = () => {
    const to = b.dataset.to;
    if (to === "practica") { startPractice([t.id]); Router.push("practica"); }
    else if (to === "examen") { examSession = boss ? buildExam([t.id], 15, 20, true) : null; Router.push("examen"); }
    else Router.push(to);
  });
}
