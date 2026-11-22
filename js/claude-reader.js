"use strict";
/* ---------- Lectura amb Claude (opcional) ----------
   Només quan l'app s'obre com a artifact de claude.ai: la pàgina demana a Claude,
   amb el compte de qui la fa servir (sense clau d'API), que llegeixi les fotos i
   en tregui el tema. A GitHub Pages i a l'APK no existeix i s'usa l'OCR local. */
let _claudeVision = null;
function claudeVision() {
  if (_claudeVision) return _claudeVision;
  _claudeVision = (async () => {
    try {
      if (!window.claude || typeof window.claude.use !== "function") return null;
      const sample = await window.claude.use("sample"); if (!sample) return null;
      const lim = await sample.limits().catch(() => null);
      if (!lim || !lim.images) return null;
      return { sample, lim };
    } catch { return null; }
  })();
  return _claudeVision;
}

function canvasToBlob(cv, maxSide, maxBytes, types) {
  const type = types.includes("image/jpeg") ? "image/jpeg" : types[0];
  return new Promise(async res => {
    let side = maxSide, q = 0.85, blob = null;
    for (let i = 0; i < 6; i++) {
      const k = Math.min(1, side / Math.max(cv.width, cv.height)), c = document.createElement("canvas");
      c.width = Math.round(cv.width * k); c.height = Math.round(cv.height * k);
      c.getContext("2d").drawImage(cv, 0, 0, c.width, c.height);
      blob = await new Promise(r => c.toBlob(r, type, q));
      if (blob && blob.size <= maxBytes) break;
      side = Math.round(side * 0.8); q = Math.max(0.6, q - 0.08);
    }
    res(blob);
  });
}

const CLAUDE_PROMPT = (meta, n, part) => `Ets l'assistent d'una app d'estudi per a alumnes de ${meta.curs} (assignatura: ${meta.materia}). T'envio ${n} foto${n > 1 ? "s" : ""} de pàgines d'apunts o d'un dossier${part ? ` (${part})` : ""}, en ordre. Poden tenir text subratllat amb retolador (groc, lila, verd...), notes a mà al marge, fotos i exercicis.

Llegeix-les amb cura i crea el material d'estudi. Regles:
- Escriu en català. Fes servir NOMÉS el que diuen els apunts; no inventis dades.
- Ignora números de pàgina, peus de foto, URL i l'índex.
- "idees_clau": les frases on hi ha text marcat amb retolador. "frase" és la frase completa tal com surt; "text" és el fragment marcat més important, copiat literalment perquè sigui part exacta de "frase"; "marques" són tots els fragments marcats d'aquesta frase (literals). Si no hi ha res marcat, tria les idees més importants.
- "conceptes": termes clau amb una definició breu i fidel als apunts, 2-3 "paraules_clau" i, si n'hi ha, un exemple.
- "cronologia": fets amb data. "any" és la data com surt ("1950", "anys 60", "segona meitat del segle XX"); "ordre" és un any aproximat per ordenar (anys 60 → 1965); "fet" és una frase completa.
- "grups": llistes classificables (p. ex. una llista per dècades o tipus), cada una amb almenys 2 elements.
- "formules": només si n'hi ha (ciències). "expressio" com "v = d / t" amb símbols curts; "variables" amb simbol, nom, unitat, min i max raonables.
- "procediments": llistes de passos numerats, si n'hi ha.
- "errors_tipics": confusions habituals que els apunts adverteixen, amb "afirmacio_erronia" i "correccio".
- "preguntes_obertes": les preguntes o exercicis del dossier (tal com surten) i alguna pregunta d'examen raonable, amb "resposta_model" breu i 2-3 "criteris".
- "seccions": l'esquema dels apunts (títol de cada apartat i 2-6 punts breus).
- "resum": 4-6 frases.
- Màxim: 15 conceptes, 20 idees clau, 15 fets de cronologia, 8 preguntes.

Respon NOMÉS amb un objecte JSON amb aquesta forma (deixa en [] el que no hi sigui):
{"titol":"","resum":"","seccions":[{"titol":"","punts":[""]}],"conceptes":[{"nom":"","definicio":"","exemple":"","paraules_clau":[""]}],"idees_clau":[{"text":"","frase":"","marques":[""]}],"cronologia":[{"any":"","ordre":1950,"fet":""}],"grups":[{"nom":"","items":[""]}],"formules":[{"nom":"","expressio":"","resultat":{"simbol":"","nom":"","unitat":""},"variables":[{"simbol":"","nom":"","unitat":"","min":1,"max":100,"pas":1}],"constants":[]}],"procediments":[{"nom":"","passos":[""]}],"errors_tipics":[{"afirmacio_erronia":"","correccio":""}],"preguntes_obertes":[{"pregunta":"","resposta_model":"","criteris":[""]}]}`;

async function analyzeWithClaude(canvases, meta, onMsg) {
  const v = await claudeVision(); if (!v) throw { code: "unavailable" };
  const per = Math.max(1, Math.min(v.lim.images.maxCount || 1, 6)), chunks = [];
  for (let i = 0; i < canvases.length; i += per) chunks.push(canvases.slice(i, i + per));
  const parts = [];
  for (let c = 0; c < chunks.length; c++) {
    onMsg(`Preparant les fotos${chunks.length > 1 ? ` (bloc ${c + 1} de ${chunks.length})` : ""}…`);
    const blobs = [];
    for (const cv of chunks[c]) blobs.push(await canvasToBlob(cv, 2000, v.lim.images.maxInputBytes || 4e6, v.lim.images.mediaTypes || ["image/jpeg"]));
    onMsg(`Claude està llegint ${blobs.length} pàgin${blobs.length > 1 ? "es" : "a"}… (pot trigar un minut)`);
    const part = chunks.length > 1 ? `bloc ${c + 1} de ${chunks.length} del mateix tema` : "";
    parts.push(await v.sample.json(CLAUDE_PROMPT(meta, blobs.length, part), { images: blobs, modelTier: "default" }));
  }
  return mergeClaudeParts(parts, meta);
}

function mergeClaudeParts(parts, meta) {
  const A = x => Array.isArray(x) ? x : [], keys = ["seccions", "conceptes", "idees_clau", "cronologia", "grups", "formules", "procediments", "errors_tipics", "preguntes_obertes"];
  const out = { titol: "", resum: "", materia: meta.materia, curs: meta.curs, relacions: [] };
  keys.forEach(k => out[k] = []);
  for (const p of parts) {
    if (!p || typeof p !== "object") continue;
    if (!out.titol && typeof p.titol === "string") out.titol = p.titol;
    if (typeof p.resum === "string") out.resum = (out.resum ? out.resum + " " : "") + p.resum;
    keys.forEach(k => out[k].push(...A(p[k])));
  }
  // forma mínima que esperen la revisió i els generadors
  const s = x => typeof x === "string" ? x.trim() : (x == null ? "" : String(x));
  out.conceptes = out.conceptes.filter(c => c && s(c.nom) && s(c.definicio)).map(c => ({ id: slug(s(c.nom)), nom: s(c.nom), definicio: endDot(cap1(s(c.definicio))), exemple: s(c.exemple), paraules_clau: A(c.paraules_clau).map(s).filter(Boolean).slice(0, 4), sinonims: [], distractors: [], font: "", pista_conceptual: "" }));
  out.idees_clau = out.idees_clau.filter(k => k && s(k.text) && s(k.frase)).map(k => { let text = s(k.text), frase = s(k.frase); if (!blankIn(frase, text)) frase = frase.includes(text) ? frase : frase + " (" + text + ")"; return { id: "k_" + slug(text), text, frase, marques: A(k.marques).map(s).filter(m => m && frase.includes(m)) }; });
  out.cronologia = out.cronologia.filter(e => e && s(e.any) && s(e.fet)).map(e => { const f = findDate(/^\d/.test(s(e.any)) ? s(e.any) : "els " + s(e.any)); return { any: s(e.any), ordre: isFinite(+e.ordre) && e.ordre !== "" ? +e.ordre : (f ? f.ordre : parseFloat(e.any) || 0), fet: endDot(cap1(s(e.fet))) }; });
  out.grups = out.grups.filter(g => g && s(g.nom) && A(g.items).length >= 2).map(g => ({ id: "g_" + slug(s(g.nom)), nom: s(g.nom), items: A(g.items).map(s).filter(Boolean) }));
  out.procediments = out.procediments.filter(p => p && s(p.nom) && A(p.passos).length >= 2).map(p => ({ id: "p_" + slug(s(p.nom)), nom: s(p.nom), passos: A(p.passos).map(x => endDot(cap1(s(x)))) }));
  out.errors_tipics = out.errors_tipics.filter(e => e && s(e.afirmacio_erronia) && s(e.correccio)).map(e => ({ id: "e_" + slug(s(e.afirmacio_erronia)), afirmacio_erronia: s(e.afirmacio_erronia), correccio: s(e.correccio) }));
  out.preguntes_obertes = out.preguntes_obertes.filter(q => q && s(q.pregunta)).map(q => ({ id: "o_" + slug(s(q.pregunta)), pregunta: s(q.pregunta), resposta_model: s(q.resposta_model), criteris: A(q.criteris).map(s).filter(Boolean).slice(0, 4) }));
  out.seccions = out.seccions.filter(x => x && s(x.titol)).map(x => ({ titol: s(x.titol), punts: A(x.punts).map(s).filter(Boolean).slice(0, 10) }));
  out.formules = out.formules.filter(f => f && s(f.expressio)).map(f => ({ id: "f_" + slug(s(f.expressio)), nom: s(f.nom) || s(f.expressio), expressio: s(f.expressio), resultat: f.resultat && typeof f.resultat === "object" ? { simbol: s(f.resultat.simbol), nom: s(f.resultat.nom), unitat: s(f.resultat.unitat) } : { simbol: s(f.expressio).split("=")[0].trim(), nom: "", unitat: "" }, variables: A(f.variables).filter(x => x && s(x.simbol)).map(x => ({ simbol: s(x.simbol), nom: s(x.nom) || s(x.simbol), unitat: s(x.unitat), min: +x.min || 1, max: +x.max || 100, pas: +x.pas || 1 })), constants: A(f.constants).filter(x => x && s(x.simbol) && isFinite(+x.valor)).map(x => ({ simbol: s(x.simbol), nom: s(x.nom), valor: +x.valor, unitat: s(x.unitat) })), errors: [] }));
  if (!out.titol) out.titol = "Els meus apunts";
  out.font_lectura = "claude";
  return out;
}

function claudeErrorMsg(e) {
  const c = e && e.code;
  if (c === "not_granted") return "Cal que permetis que aquesta pàgina faci servir Claude (ho demana la primera vegada). Si ho has denegat, torna a obrir la pàgina.";
  if (c === "rate_limited") return "Has arribat al límit d'ús del teu compte de Claude. Torna-ho a provar més tard o fes servir l'OCR.";
  if (c === "image_rejected") return "Claude no ha acceptat alguna de les fotos (massa grans o massa fotos). Prova amb menys pàgines.";
  if (c === "invalid_json") return "La resposta de Claude no s'ha pogut llegir bé. Torna-ho a provar, potser amb menys pàgines alhora.";
  if (c === "unavailable" || c === "images_unavailable") return "Aquesta opció només funciona quan obres l'app des de claude.ai.";
  return "No s'ha pogut completar l'anàlisi amb Claude" + (e && e.message ? `: ${e.message}` : ".");
}
