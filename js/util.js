"use strict";
/* Apunts Vius · utilitats comunes */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const DAY = 864e5;
const now = () => Date.now();
const dayKey = (t = now()) => new Date(t).toISOString().slice(0, 10);
function weekKey(t = now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); const w1 = new Date(d.getFullYear(), 0, 4); return d.getFullYear() + "-W" + String(1 + Math.round(((d - w1) / DAY - 3 + ((w1.getDay() + 6) % 7)) / 7)).padStart(2, "0"); }
const slug = s => String(s || "x").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "x";
const fmt = x => { if (!isFinite(x)) return "—"; const a = Math.abs(x); if (a !== 0 && (a < 1e-3 || a >= 1e7)) return x.toExponential(2).replace(".", ","); return Number(x.toPrecision(4)).toLocaleString("ca-ES", { maximumFractionDigits: 6, useGrouping: false }); };
const parseNum = s => { let t = String(s).replace(/\s/g, ""); if (t.includes(",")) t = t.replace(/\./g, "").replace(",", "."); const m = t.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/i); return m ? parseFloat(m[0]) : NaN; };
const norm = s => String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/l·l/g, "ll").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(el|la|els|les|l|un|una|uns|unes|lo|de|del)\b/g, " ").replace(/\s+/g, " ").trim();
function lev(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let prev = Array.from({ length: n + 1 }, (_, i) => i); for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; }


async function copyText(text, btn) { try { await navigator.clipboard.writeText(text); if (btn) { const o = btn.textContent; btn.textContent = "Copiat"; setTimeout(() => btn.textContent = o, 1500); } } catch { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch { } ta.remove(); if (btn) btn.textContent = "Selecciona i copia manualment"; } }
async function saveFile(name, data, type) {
  // Dins el visor de claude.ai les descàrregues passen pel seu permís; a la web i a l'APK, enllaç normal
  const dl = window.claude && window.claude.use ? await window.claude.use("downloads").catch(() => null) : null;
  if (dl) { try { await dl.save({ filename: name, data: new Blob([data], { type }) }); } catch { } return; }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch { }
}

