"use strict";
/* ---------------- Arrencada ---------------- */
function compileAll() {
  DEMOS.forEach(d => compile(normTopic(d)));
  Object.values(S.topics).forEach(t => { try { compile(t); } catch (e) { console.warn("Tema descartat", e); delete S.topics[t.id]; } });
  if (S.active && !COMPILED[S.active]) S.active = null;
}
function boot() {
  loadState(); compileAll();
  $("#back").onclick = () => Router.back();
  $$("#nav [data-root]").forEach(b => b.onclick = () => Router.root(b.dataset.root));
  Router.init(); render();
}
boot();
