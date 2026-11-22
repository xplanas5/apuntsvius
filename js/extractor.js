"use strict";
/* Extracció del tema per regles (sense IA) a partir del text dels apunts */
const STOP = new Set("el la els les l un una uns unes de del dels d i o a al als en amb per pel pels que què qui es és són son se s com més menys molt no hi ha han ho li lo seu seva seus seves aquest aquesta aquests aquestes aquell aquella quan on si també però sense sobre entre fins cap tot tots totes ja pot poden fa fan cal ser estar te té tenen y the of and to is".split(" "));
const TESS_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
const wc = s => String(s).trim().split(/\s+/).filter(Boolean).length;
const cap1 = s => { s = String(s).trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
const endDot = s => /[.!?…)]$/.test(s.trim()) ? s.trim() : s.trim() + ".";
const stripArt = s => String(s).trim().replace(/^["'«»]+|["'«»]+$/g, "").replace(/^(el|la|els|les|l'|un|una|uns|unes)\s*/i, "").replace(/^l'/i, "").trim();


/* ---------- Extracció per regles ---------- */
function cleanText(t) {
  return String(t).replace(/\r/g, "").replace(/[“”]/g, '"').replace(/[‘’´`]/g, "'").replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/([a-zà-ÿ])([lL])\s?[-.•·]\s?([lL])([a-zà-ÿ])/gi, "$1$2·$3$4").replace(/(\w)-\n(\w)/g, "$1$2").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
const BULLET = /^\s*(?:[-–—•*·▪►>✓]|\d{1,2}[.)º]|[a-h][.)])\s+/;
const NUMBERED = /^\s*(\d{1,2})[.)º]\s+/;
function isHeading(s) {
  s = s.trim(); if (!s || s.length > 70) return false;
  if (/^#+\s/.test(s)) return true;
  if (/^(tema|unitat|bloc|lliçó|capítol)\s+\d+/i.test(s)) return true;
  if (/^(\d+\.\d+(\.\d+)*|[IVX]+\.)\s+\S/.test(s) && wc(s) <= 9 && !/[.;]$/.test(s)) return true;
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length >= 4 && letters === letters.toUpperCase() && wc(s) <= 8) return true;
  if (/:$/.test(s) && wc(s) <= 6 && !/=/.test(s)) return true;
  return false;
}
function logicalLines(text) {
  const out = [];
  for (const raw of cleanText(text).split("\n")) {
    const s = raw.trim();
    if (!s) { out.push({ kind: "blank", text: "" }); continue; }
    const prev = out[out.length - 1];
    if (isHeading(s)) { let h = s.replace(/^#+\s*/, "").replace(/:$/, "").replace(/^(\d+(\.\d+)*|[IVX]+)[.)]?\s+/, "").trim(); if (h === h.toUpperCase()) h = cap1(h.toLowerCase()); out.push({ kind: "h", text: h }); continue; }
    if (BULLET.test(s)) { const n = s.match(NUMBERED); out.push({ kind: "li", num: n ? +n[1] : null, text: s.replace(BULLET, "").trim() }); continue; }
    const assign = x => /^\s*[A-Za-z][A-Za-z0-9_]{0,3}\s*=/.test(x);
    if (prev && (prev.kind === "p" || prev.kind === "li") && !/[.!?:;]$/.test(prev.text) && /^[a-zà-ÿ]/.test(s) && !assign(s) && !assign(prev.text) && !/^on\s/.test(s)) { prev.text += " " + s; continue; }
    out.push({ kind: "p", text: s });
  }
  return out.filter((l, i, a) => !(l.kind === "blank" && (i === 0 || a[i - 1].kind === "blank")));
}
function normFormula(s) {
  return s.replace(/[·×∙•]/g, "*").replace(/÷|:(?=\s*\w)/g, "/").replace(/−|–/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√\s*\(/g, "sqrt(").replace(/√\s*([A-Za-z0-9_]+)/g, "sqrt($1)").replace(/(\d),(\d)/g, "$1.$2").replace(/\s+x\s+/g, " * ");
}
function isFormulaText(s) {
  const m = normFormula(s.replace(/\([^)]*[a-zà-ÿ]{4,}[^)]*\)/g, "")).match(/^\s*([A-Za-z][A-Za-z0-9_]{0,3})\s*=\s*([A-Za-z0-9_+\-*/^().\s]+)$/);
  if (!m || !/[A-Za-z]/.test(m[2]) || /[A-Za-z]{5,}/.test(m[2].replace(/sqrt|sin|cos|tan|log|ln|abs|exp/g, ""))) return null;
  try { const tree = parseExpr(m[2]); const vs = varsOf(tree); if (!vs.size) return null; return { lhs: m[1], rhs: m[2].trim(), vars: [...vs] }; } catch { return null; }
}
function defFrom(s) {
  s = s.trim().replace(BULLET, "").replace(/\s+/g, " ");
  if (s.length < 14 || isFormulaText(s)) return null;
  let m;
  const ok = (term, def) => { term = stripArt(String(term).replace(/^(?:[^\s]{1,2}\s+)+(?=\S{3,})/, "")).replace(/[*_]/g, ""); if (/^(no|ja|també|encara|només|molt|més|així)\b/i.test(term) || term.split(/\s+/).some(w => w.length === 1 && !/^[aoiey]$/i.test(w))) return null; def = def.trim(); if (!term || wc(term) > 5 || term.length > 45 || !/[a-zà-ÿ]/i.test(term) || /^\d/.test(term) || wc(def) < 3 || STOP.has(norm(term))) return null; if (/^(ex|exemple|p\. ex|compte|atenció|nota|ull|font)$/i.test(term) || /^(això|aquest|aquesta|aquests|aquestes|ell|ella|ells|elles|que|realitat|fet|cas|veritat|problema)\b/i.test(term)) return null; return [term, def]; };
  if ((m = s.match(/^(.{2,48}?)\s*:\s+(.{10,})$/))) return ok(m[1], m[2]);
  if ((m = s.match(/^(.{2,48}?)\s+[–—-]\s+(.{10,})$/))) return ok(m[1], m[2]);
  if ((m = s.match(/^(?:s'anomena|anomenem|es diu|rep el nom de)\s+(.{2,40}?)\s+(?:a la |a l'|al |als |a les |a )(.{10,})$/i))) return ok(m[1], m[2]);
  if ((m = s.match(/^(.{10,}?)\s+(?:s'anomena|s'anomenen|es diu|es diuen|rep el nom de|es coneix com a?)\s+([^,.;]{2,40})\.?$/i))) return ok(m[2], m[1]);
  if ((m = s.match(/^([^,.;:]{2,45}?)\s+(?:és|són|es defineix com|consisteix en)\s+(.{10,})$/i)) && /^(un|una|uns|unes|el|la|els|les|l'|aquell|aquella|qualsevol|tot|tota|com|quan|la que|el que)\b/i.test(m[2]) && !/^(molt|més|menys|que|a dir)\b/i.test(m[2])) return ok(m[1], m[2]);
  return null;
}
function suspicious(s) {
  const toks = String(s).split(/\s+/).filter(Boolean); if (!toks.length) return false;
  const bad = toks.filter(t => /[^A-Za-zÀ-ÿ·'’\-.,;:()0-9%°/²³"]/.test(t) || (t.length > 3 && !/[aeiouàèéíïòóúüAEIOU]/.test(t))).length;
  return bad / toks.length > 0.2;
}
function keywords(def, term) {
  const tn = norm(term).split(" ");
  const freq = {}; norm(def).split(" ").filter(w => w.length > 4 && !STOP.has(w) && !tn.includes(w)).forEach(w => freq[w] = (freq[w] || 0) + w.length);
  const orig = def.split(/[^A-Za-zÀ-ÿ·'-]+/);
  return Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 3).map(w => (orig.find(o => norm(o) === w) || w).replace(/^[ldsmtn]'/i, ""));
}
const UNIT_RANGE = { kg: [0.5, 100, 0.5], g: [1, 1000, 1], m: [1, 1000, 1], km: [1, 500, 1], cm: [1, 200, 1], s: [1, 120, 1], h: [0.5, 10, 0.5], "m/s": [1, 50, 0.5], "km/h": [10, 150, 5], "m/s²": [0.5, 10, 0.1], "m/s2": [0.5, 10, 0.1], n: [1, 500, 1], j: [10, 5000, 10], w: [10, 2000, 10], pa: [100, 100000, 100], l: [0.1, 10, 0.1], "°c": [0, 100, 1], v: [1, 24, 0.5], a: [0.1, 10, 0.1], "ω": [1, 1000, 1] };
/* ---------- Retolador i soroll ---------- */
function collectMarks(text) {
  const t = String(text).replace(/==\s*\n\s*==/g, " ");
  const out = [];
  for (const m of t.matchAll(/==([^=]+)==/g)) { const x = m[1].replace(/\s+/g, " ").replace(/^[\s,.;:·-]+|[\s,;:·-]+$/g, "").trim(); const content = norm(x).split(" ").filter(w => w.length > 4 && !STOP.has(w)); if (wc(x) >= 2 && x.length >= 10 && content.length >= 1 && (wc(x) >= 3 || content.length >= 2) && !suspicious(x) && !/^(a dir|es a dir|per tant|que|i|o)\b/i.test(norm(x))) out.push(x); }
  return [...new Set(out)];
}
function stripNoise(text) {
  const L = String(text).replace(/==/g, "").split("\n");
  const isIdx = l => /^\s*(\d+(\.\d+)*\.?\s+)?[A-Za-zÀ-ÿ'"][^\d]{2,60}?\s+\d{1,3}\s*$/.test(l);
  return L.filter((l, i) => {
    if (/https?:\/\/|www\.|\.com\/|\bFont:/i.test(l)) return false; // peus de foto i fonts
    if (isIdx(l) && ((L[i - 1] && isIdx(L[i - 1])) || (L[i + 1] && isIdx(L[i + 1])))) return false; // índex
    return true;
  }).join("\n");
}
const isQuestion = s => { const x = s.replace(/^\s*\d{1,2}\s*[.)]\s*/, "").trim(); return wc(x) >= 5 && (/\?\s*$/.test(x) || (/\b(explica|raona|esbrina|imagina|descriu|compara|justifica|investiga|reflexiona|defineix)\b/i.test(x) && /[:?.]\s*$/.test(x) && /^(imagina|explica|raona|esbrina|busca|investiga|reflexiona|descriu|compara|justifica|defineix|escriu|fes|elabora|pensa)\b/i.test(x) && wc(x) <= 60)); };
const sentencesOf = s => String(s).split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý«"(])/).map(x => x.trim()).filter(Boolean);

function extractTopic(text, meta) {
  const marks = collectMarks(text), markN = marks.map(norm);
  text = stripNoise(text);
  const lines = logicalLines(text), full = cleanText(text);
  const marked = sent => { const n = " " + norm(sent) + " "; return markN.some(m => n.includes(" " + m + " ")); };
  const t = { titol: meta.titol || "", materia: meta.materia, curs: meta.curs, seccions: [], conceptes: [], formules: [], procediments: [], relacions: [], cronologia: [], errors_tipics: [], preguntes_obertes: [] };
  // títol
  if (!t.titol) { const h = lines.find(l => l.kind === "h") || lines.find(l => l.text && wc(l.text) <= 8); t.titol = h ? cap1(h.text.replace(/[\s,;:.\-–]+$/, "")).slice(0, 70) : "Els meus apunts"; }
  // llegenda de variables: "m = massa (kg)", "v: velocitat (m/s)"
  const legend = {}, consts = {};
  for (const m of full.matchAll(/\b([A-Za-z][A-Za-z0-9_]{0,2})\s*(?:=|:|→|és|es)\s*(?:la |el |l'|les |els )?([a-zà-ÿç·' ]{3,30}?)\s*\(([^)]{1,12})\)/g)) if (!legend[m[1]]) legend[m[1]] = { nom: m[2].trim(), unitat: m[3].trim() };
  for (const m of full.matchAll(/(?:^|[^A-Za-z0-9_])(g|G|c|k|K|R|h|NA|Na)\s*=\s*(\d+(?:[.,]\d+)?(?:\s*[·x*]\s*10\^?-?\d+)?)\s*([A-Za-z/²³0-9°%·]*)/g)) { const sv = m[2].replace(",", "."), e = sv.match(/10\^?(-?\d+)\s*$/); consts[m[1]] = { valor: parseFloat(sv) * (e ? Math.pow(10, +e[1]) : 1), unitat: m[3] || "" }; }
  let section = null, lastHeading = "", listRun = [], lastConcept = null;
  const flushList = () => {
    const nums = listRun.filter(x => x.num !== null);
    if (nums.length >= 3) t.procediments.push({ id: "p_" + slug(lastHeading || "procediment"), nom: cap1(lastHeading || "Procediment"), passos: nums.map(x => endDot(cap1(x.text))) });
    listRun = [];
  };
  const pushPoint = s => {
    if (!section) { section = { titol: "Apunts", punts: [] }; t.seccions.push(section); }
    let pts = [s];
    if (s.length > 180) { const ss = sentencesOf(s), mk = ss.filter(marked); pts = mk.length ? mk : ss.slice(0, 1); }
    for (const x of pts) if (section.punts.length < 10) section.punts.push(x.length > 220 ? x.slice(0, 217) + "…" : x);
  };
  for (const l of lines) {
    if (l.kind !== "li" && listRun.length) flushList();
    if (l.kind === "blank") continue;
    if (l.kind === "h") { lastHeading = l.text; section = { titol: cap1(l.text), punts: [] }; t.seccions.push(section); continue; }
    if ((l.kind === "li" || l.kind === "p") && isQuestion(l.text) && l.text.length < 400) {
      const q = l.text.replace(/^\s*\d{1,2}\s*[.)]\s*/, "").trim();
      if (!t.preguntes_obertes.some(x => x.pregunta === q)) t.preguntes_obertes.push({ id: "o_" + slug(q), pregunta: q, resposta_model: "", criteris: ["Respon exactament el que es pregunta", "Argumenta la resposta amb idees del tema", "Fa servir algun exemple o dada concreta"] });
      continue;
    }
    if (l.kind === "li") listRun.push(l);
    const s = l.text;
    // exemple associat al concepte anterior
    const ex = s.match(/^(?:ex(?:emple)?s?|p\.\s?ex\.?)\s*[:.]?\s*(.+)$/i);
    if (ex && lastConcept) { if (!lastConcept.exemple) lastConcept.exemple = ex[1].trim(); pushPoint(s); continue; }
    // errors típics
    let m;
    if ((m = s.match(/no\s+(?:s'ha de |hem de |has de )?confondre\s+(?:el |la |els |les |l')?(.+?)\s+amb\s+(?:el |la |els |les |l')?([^.,;]+)/i))) { t.errors_tipics.push({ id: "e_" + slug(m[1]), afirmacio_erronia: `${cap1(m[1])} i ${m[2]} són el mateix.`, correccio: endDot(cap1(s)) }); pushPoint(s); continue; }
    if ((m = s.match(/^(?:compte|atenció|ull|error típic|error habitual|important)\s*[:!.,-]?\s*(.+)$/i)) && / no /i.test(" " + m[1] + " ")) { t.errors_tipics.push({ id: "e_" + slug(m[1]), afirmacio_erronia: endDot(cap1((/\sni\s/i.test(m[1]) ? m[1].split(/[,;]/)[0].replace(/\s+ni\s+/i, " i ") : m[1]).replace(/\s+no\s+/i, " ").replace(/\s+mai\s+/i, " sempre "))), correccio: endDot(cap1(m[1])) }); pushPoint(s); continue; }
    // fórmules (també "Nom: F = m · a")
    const fparts = s.match(/^(.{3,50}?)\s*:\s*(.+=.+)$/); const ftxt = fparts && isFormulaText(fparts[2]) ? fparts[2] : s;
    const fm = isFormulaText(ftxt);
    if (fm && !t.formules.some(f => f.expressio === `${fm.lhs} = ${fm.rhs}`)) {
      const vars = fm.vars.filter(v => !(v in consts) || v === fm.lhs);
      const lg = legend[fm.lhs] || {};
      t.formules.push({ id: "f_" + slug(fm.lhs + "_" + fm.vars.join("")), nom: cap1(fparts && fparts[2] === ftxt ? fparts[1] : (lg.nom ? "Càlcul de " + lg.nom : lastHeading || "Fórmula " + fm.lhs)), expressio: `${fm.lhs} = ${fm.rhs}`,
        resultat: { simbol: fm.lhs, nom: lg.nom || fm.lhs, unitat: lg.unitat || "" },
        variables: vars.map(v => { const L = legend[v] || {}, r = UNIT_RANGE[(L.unitat || "").toLowerCase()] || [1, 100, 1]; return { simbol: v, nom: L.nom || v, unitat: L.unitat || "", min: r[0], max: r[1], pas: r[2] }; }),
        constants: fm.vars.filter(v => v in consts && v !== fm.lhs).map(v => ({ simbol: v, nom: (legend[v] || {}).nom || v, valor: consts[v].valor, unitat: consts[v].unitat })), errors: [] });
      pushPoint(s); continue;
    }
    // cronologia
    const ym = s.match(/^(?:any\s+)?(-?\d{3,4})\s*[:.\-–—)]?\s+(.{8,})$/) || s.match(/^(.{8,}?)\s*\((\d{3,4})\)\.?$/);
    if (ym) { const yearFirst = /^\D?-?\d/.test(s.replace(/^any\s+/i, "")); const any = yearFirst ? ym[1] : ym[2], fet = yearFirst ? ym[2] : ym[1]; if (+any > 0 && +any < 2100) { t.cronologia.push({ any, fet: endDot(cap1(fet)) }); pushPoint(s); continue; } }
    // definicions (la línia sencera i, en paràgrafs, cada frase)
    const cands = [s, ...(l.kind === "p" && s.length > 120 ? sentencesOf(s) : [])];
    for (const piece of cands) {
      const d = defFrom(piece);
      if (!d || t.conceptes.some(c => norm(c.nom) === norm(d[0]))) continue;
      const def = d[1].length > 260 ? sentencesOf(d[1])[0] : d[1];
      const c = { id: slug(d[0]), nom: d[0].length > 1 && d[0] === d[0].toUpperCase() ? d[0] : d[0].charAt(0).toLowerCase() + d[0].slice(1), definicio: endDot(cap1(def)), exemple: "", paraules_clau: keywords(def, d[0]), sinonims: [], distractors: [], font: piece.length > 160 ? piece.slice(0, 157) + "…" : piece, pista_conceptual: "" };
      if (suspicious(piece)) { c.dubtos = true; c.motiu = "Possible error de lectura de l'OCR: revisa'l"; }
      t.conceptes.push(c); lastConcept = c;
      if (piece === s) break;
    }
    pushPoint(s);
  }
  if (listRun.length) flushList();
  // relacions entre conceptes detectats
  const names = t.conceptes.map(c => c.nom);
  const CONN = [["és part de", /\b(forma part d|és part d|es troba (?:a|en|dins))/i], ["causa", /\b(causa|provoca|origina|fa que|produeix un canvi)\b/i], ["produeix", /\b(produeix|genera|fabrica|allibera)\b/i], ["conté", /\b(conté|inclou|està format per)\b/i], ["s'oposa a", /\b(s'oposa|oposat|contrari)\b/i], ["és un tipus de", /\b(és un tipus de|és una mena de|és una classe de)\b/i]];
  for (const sent of full.split(/(?<=[.!?])\s+|\n/)) {
    const ns = " " + norm(sent) + " ";
    const found = names.map(n => [n, ns.indexOf(" " + norm(n) + " ")]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]);
    if (found.length < 2) continue;
    const conn = CONN.find(([, re]) => re.test(sent)); if (!conn) continue;
    const r = { a: found[0][0], tipus: conn[0], b: found[1][0] };
    if (r.a !== r.b && !t.relacions.some(x => x.a === r.a && x.b === r.b) && t.relacions.length < 12) t.relacions.push(r);
  }
  // resum i preguntes d'examen
  t.resum = t.conceptes.slice(0, 4).map(c => `${cap1(c.nom)}: ${c.definicio}`).join(" ") || lines.filter(l => l.kind === "p").map(l => l.text).join(" ").slice(0, 500);
  t.conceptes.filter(c => c.paraules_clau.length >= 2).slice(0, 3).forEach(c => t.preguntes_obertes.push({ id: "o_" + c.id, pregunta: `Explica què és ${/^[aeiouàèéíòóú]/i.test(c.nom) ? "l'" : "el/la "}${c.nom}${c.exemple ? " i posa'n un exemple" : ""}.`, resposta_model: c.definicio + (c.exemple ? " Exemple: " + c.exemple : ""), criteris: [...c.paraules_clau.slice(0, 3).map(k => `Fa servir la idea de «${k}»`), ...(c.exemple ? ["Posa un exemple adequat"] : [])], concepte_id: c.id }));
  t.procediments.slice(0, 1).forEach(p => t.preguntes_obertes.push({ id: "o_" + p.id, pregunta: `Descriu els passos per a: ${p.nom.toLowerCase()}.`, resposta_model: p.passos.join(" "), criteris: [`Comença amb: ${p.passos[0]}`, `Acaba amb: ${p.passos[p.passos.length - 1]}`, "Els passos estan en l'ordre correcte"] }));
  humanities(t, lines, full, marks);
  t.seccions = t.seccions.filter(s => s.punts.length);
  return t;
}

/* ---------- Text d'humanitats: retolador, dates, grups ---------- */
const DECADE_WORDS = { vint: 20, trenta: 30, quaranta: 40, cinquanta: 50, seixanta: 60, setanta: 70, vuitanta: 80, noranta: 90 };
function romanToInt(r) { const v = { I: 1, V: 5, X: 10, L: 50 }; let n = 0; r = r.toUpperCase(); for (let i = 0; i < r.length; i++) { const a = v[r[i]], b = v[r[i + 1]] || 0; n += a < b ? -a : a; } return n; }
function findDate(sent) {
  const c = [];
  let m;
  const re1 = /\banys\s+(?:19)?([2-9]0)\b/gi; while ((m = re1.exec(sent))) c.push({ i: m.index, len: m[0].length, label: "anys " + m[1], ordre: 1900 + +m[1] + 5 });
  const re2 = new RegExp("\\banys\\s+(" + Object.keys(DECADE_WORDS).join("|") + ")\\b", "gi"); while ((m = re2.exec(sent))) { const d = DECADE_WORDS[m[1].toLowerCase()]; c.push({ i: m.index, len: m[0].length, label: "anys " + d, ordre: 1900 + d + 5 }); }
  const re3 = /\b([2-9]0)s\b/g; while ((m = re3.exec(sent))) c.push({ i: m.index, len: m[0].length, label: "anys " + m[1], ordre: 1900 + +m[1] + 5 });
  const re4 = /\b(?:(?:primera|segona)\s+)?(?:(principis|finals|meitat|mitjan)\s+(?:de l'|del\s+))?segle\s+([IVXL]{1,5})\b/gi;
  while ((m = re4.exec(sent))) { const n = romanToInt(m[2]); if (n < 1 || n > 21) continue; const q = (m[1] || "").toLowerCase(), half = (/^(primera|segona)/i.exec(m[0]) || [""])[0].toLowerCase(), off = q === "principis" ? 10 : q === "finals" ? 90 : half === "primera" ? 25 : half === "segona" ? 75 : 50; c.push({ i: m.index, len: m[0].length, label: (half ? half + " " : "") + (q ? q + " del " : "") + "segle " + m[2].toUpperCase(), ordre: (n - 1) * 100 + off }); }
  const re5 = /(^|[^\d.,])(1[0-9]{3}|20[0-4][0-9])(?![\d]|[.,]\d)/g; while ((m = re5.exec(sent))) c.push({ i: m.index + m[1].length, len: m[2].length, label: m[2], ordre: +m[2] });
  return c.sort((a, b) => a.i - b.i)[0] || null;
}
function humanities(t, lines, full, marks) {
  // idees clau: el que l'alumne ha marcat amb retolador, amb la frase on surt
  const plain = full.replace(/\s+/g, " "), sents = sentencesOf(plain);
  // una idea per frase: tots els trossos marcats de la frase; el més llarg serà el buit a completar
  t.idees_clau = []; const byFrase = new Map();
  for (const mk of marks) {
    const nm = norm(mk), frase = sents.find(x => (" " + norm(x) + " ").includes(" " + nm + " "));
    if (!frase || frase.length > 400) continue;
    if (!byFrase.has(frase)) byFrase.set(frase, []);
    const arr = byFrase.get(frase); if (!arr.some(x => norm(x) === nm)) arr.push(mk);
  }
  for (const [frase, ms] of byFrase) {
    const main = ms.slice().sort((a, b) => b.length - a.length)[0];
    t.idees_clau.push({ id: "k_" + slug(main), text: main, frase, marques: ms });
    if (t.idees_clau.length >= 25) break;
  }
  // dates dins de les frases (anys 70, 1950, segle XIX…)
  for (const sent of sents) {
    if (sent.length < 25 || sent.length > 320 || isQuestion(sent) || suspicious(sent)) continue;
    const d = findDate(sent); if (!d) continue;
    if (t.cronologia.some(e => e.fet === sent)) continue;
    t.cronologia.push({ any: d.label, ordre: d.ordre, fet: sent });
    if (t.cronologia.length >= 18) break;
  }
  t.cronologia.forEach(e => { if (e.ordre === undefined) e.ordre = parseFloat(e.any) || 0; });
  // grups: un títol (o una frase que acaba en «:») seguit de 3 o més elements de llista
  t.grups = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]; if (!(l.kind === "h" || (l.kind === "p" && (/:$/.test(l.text) || wc(l.text) <= 4)))) continue;
    const items = []; let j = i + 1;
    while (j < lines.length && lines[j].kind === "li") { const x = lines[j].text.split(/:\s/)[0].trim(); if (x && x.length <= 70 && !isQuestion(x)) items.push(x.replace(/[.;,]$/, "")); j++; }
    if (items.length >= 3) t.grups.push({ id: "g_" + slug(l.text), nom: cap1(l.text.replace(/:$/, "")).slice(0, 80), items: items.slice(0, 20) });
  }
  // resum: les frases marcades amb retolador, si n'hi ha
  const mk = t.idees_clau.map(k => k.frase).filter((x, i, a) => a.indexOf(x) === i);
  if (mk.length >= 2) t.resum = mk.slice(0, 6).join(" ");
}

