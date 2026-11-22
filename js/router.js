"use strict";
/* ---------------- Router: pila de pantalles ----------------
   Cada pantalla és una funció view(el). La pila es desa a l'historial del navegador,
   de manera que el botó «enrere» d'Android (i del navegador) torna a la pantalla anterior. */
let practiceSession = null, examSession = null, examTimer = null;
const SCREENS = {
  inici: { title: "Inici", view: () => viewHome, root: true },
  nou: { title: "Nou tema", view: () => viewNew, root: true },
  progres: { title: "Progrés", view: () => viewProgress, root: true },
  tema: { title: "Tema", view: () => viewTopic, needsTopic: true },
  apunts: { title: "Apunts", view: () => viewNotes, needsTopic: true },
  lab: { title: "Laboratori", view: () => viewLab, needsTopic: true },
  practica: { title: "Pràctica", view: () => viewPractice },
  examen: { title: "Examen", view: () => viewExam }
};
const Router = {
  stack: ["inici"],
  cur() { return this.stack[this.stack.length - 1]; },
  push(name) {
    if (!SCREENS[name]) name = "inici";
    if (this.cur() === name) return render();
    this.stack.push(name); history.pushState({ stack: this.stack.slice() }, "", "#" + name); render();
  },
  back() { if (this.stack.length > 1) history.back(); else this.root("inici"); },
  root(name, ...more) {
    this.stack = [name, ...more].filter(n => SCREENS[n]);
    if (!this.stack.length) this.stack = ["inici"];
    history.replaceState({ stack: this.stack.slice() }, "", "#" + this.cur()); render();
  },
  init() {
    const h = location.hash.replace("#", "");
    this.stack = SCREENS[h] ? (SCREENS[h].root ? [h] : ["inici", h]) : ["inici"];
    history.replaceState({ stack: this.stack.slice() }, "", "#" + this.cur());
    addEventListener("popstate", e => { const st = e.state && e.state.stack; this.stack = Array.isArray(st) && st.length ? st.filter(n => SCREENS[n]) : ["inici"]; render(); });
  }
};
/* Compatibilitat: go() obre una pantalla (les arrels reinicien la pila) */
function go(name) { const s = SCREENS[name]; if (s && s.root) Router.root(name); else Router.push(name); }

function renderStats() {
  const el = $("#stats"); if (!el) return;
  const g = globalStats(), ws = weekStreak();
  const L = levelOf(S.xp);
  el.innerHTML = `<span class="stat lvl" title="Nivell ${L.n}: ${S.xp} XP"><b class="lv">${L.n}</b><span class="lvbar"><span style="width:${L.pct}%"></span></span></span><span class="stat fire" title="Ratxa setmanal"><strong>${ws.streak}</strong><span aria-hidden="true">🔥</span></span>`;
}
function renderChrome() {
  const sc = SCREENS[Router.cur()];
  document.body.dataset.screen = Router.cur();
  $("#back").hidden = Router.stack.length <= 1;
  $("#title").textContent = sc.root ? "" : sc.title;
  $(".brand").hidden = !sc.root;
  $$("#nav [data-root]").forEach(b => b.setAttribute("aria-current", Router.stack[0] === b.dataset.root ? "page" : "false"));
  renderStats();
}
function render() {
  let sc = SCREENS[Router.cur()];
  if (sc.needsTopic && !topicById(S.active)) { Router.stack = ["inici"]; sc = SCREENS.inici; history.replaceState({ stack: ["inici"] }, "", "#inici"); }
  renderChrome();
  sc.view()($("#view"));
  window.scrollTo(0, 0);
}
