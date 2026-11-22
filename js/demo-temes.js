"use strict";
/* ---------------- Temes d'exemple ---------------- */
const DEMOS = [
{ id: "demo_forces", demo: true, titol: "Forces i moviment", materia: "Física i Química", curs: "4t ESO",
  resum: "Una força és una interacció capaç de canviar l'estat de moviment o la forma d'un cos. La segona llei de Newton relaciona força, massa i acceleració (F = m · a). El pes és la força amb què la Terra atrau un cos (P = m · g). La velocitat mitjana és el quocient entre la distància recorreguda i el temps.",
  seccions: [
    { titol: "Què és una força", punts: ["Interacció entre cossos que pot canviar-ne el moviment o la forma", "Es mesura en newtons (N) amb un dinamòmetre", "És una magnitud vectorial: té mòdul, direcció i sentit"] },
    { titol: "Lleis de Newton", punts: ["1a llei (inèrcia): sense força neta, un cos manté el repòs o el MRU", "2a llei: F = m · a", "3a llei: a tota acció li correspon una reacció igual i de sentit contrari"] },
    { titol: "Massa i pes", punts: ["La massa (kg) mesura la quantitat de matèria i no canvia", "El pes (N) depèn de la gravetat del lloc: P = m · g", "A la Terra, g ≈ 9,8 m/s²"] },
    { titol: "Moviment", punts: ["Velocitat mitjana: v = d / t", "Unitats SI: metres i segons, v en m/s", "Per passar de km/h a m/s, es divideix entre 3,6"] }
  ],
  conceptes: [
    { id: "forca", nom: "força", definicio: "Interacció entre dos cossos capaç de modificar l'estat de moviment o la forma d'un cos.", exemple: "Empènyer un carro el posa en moviment.", paraules_clau: ["interacció", "moviment", "forma"], sinonims: [], distractors: [{ text: "energia", per_que: "L'energia és la capacitat de fer un treball, no una interacció entre cossos." }, { text: "velocitat", per_que: "La velocitat descriu com es mou un cos, no què el fa canviar." }], font: "Força: interacció que pot canviar el moviment o la forma d'un cos", pista_conceptual: "Pensa en allò que fas quan empenys o estires alguna cosa." },
    { id: "newton", nom: "newton", definicio: "Unitat de força del Sistema Internacional: la força que dona una acceleració d'1 m/s² a una massa d'1 kg.", exemple: "Una poma pesa aproximadament 1 N.", paraules_clau: ["unitat", "força", "acceleració"], sinonims: ["n"], distractors: [{ text: "joule", per_que: "El joule és la unitat d'energia i de treball." }, { text: "quilogram", per_que: "El quilogram és la unitat de massa, no de força." }], font: "Unitat de força: newton (N)", pista_conceptual: "Porta el nom del científic de les tres lleis." },
    { id: "massa", nom: "massa", definicio: "Quantitat de matèria d'un cos; es mesura en quilograms i no depèn del lloc on és el cos.", exemple: "Un astronauta té la mateixa massa a la Terra i a la Lluna.", paraules_clau: ["matèria", "quilograms", "lloc"], sinonims: [], distractors: [{ text: "pes", per_que: "El pes és una força i canvia segons la gravetat; la massa no." }, { text: "volum", per_que: "El volum és l'espai que ocupa un cos, no la quantitat de matèria." }], font: "La massa (kg) mesura la quantitat de matèria i no canvia", pista_conceptual: "És la magnitud que es manté igual a la Lluna." },
    { id: "pes", nom: "pes", definicio: "Força amb què un planeta atrau un cos; es calcula com P = m · g i es mesura en newtons.", exemple: "Un cos de 10 kg pesa 98 N a la Terra.", paraules_clau: ["força", "atrau", "newtons"], sinonims: [], distractors: [{ text: "massa", per_que: "La massa és quantitat de matèria (kg); el pes és una força (N)." }, { text: "densitat", per_que: "La densitat relaciona massa i volum." }], font: "El pes (N) depèn de la gravetat del lloc: P = m · g", pista_conceptual: "És una força i a la Lluna seria unes sis vegades menor." },
    { id: "acceleracio", nom: "acceleració", definicio: "Variació de la velocitat per unitat de temps; es mesura en m/s².", exemple: "Un cotxe que passa de 0 a 20 m/s en 10 s té una acceleració de 2 m/s².", paraules_clau: ["variació", "velocitat", "temps"], sinonims: [], distractors: [{ text: "velocitat", per_que: "La velocitat és distància per temps; l'acceleració és com canvia la velocitat." }, { text: "força", per_que: "La força causa l'acceleració, però no és el mateix." }], font: "Acceleració: canvi de velocitat en el temps (m/s²)", pista_conceptual: "Indica com de ràpid canvia la velocitat." },
    { id: "inercia", nom: "inèrcia", definicio: "Tendència d'un cos a mantenir el seu estat de repòs o de moviment rectilini uniforme si no hi actua cap força neta.", exemple: "Quan l'autobús frena, els passatgers van cap endavant.", paraules_clau: ["tendència", "repòs", "força"], sinonims: ["principi d'inercia"], distractors: [{ text: "fregament", per_que: "El fregament és una força que s'oposa al moviment; la inèrcia no és cap força." }, { text: "pes", per_que: "El pes és la força de la gravetat." }], font: "1a llei (inèrcia): sense força neta, un cos manté el repòs o el MRU", pista_conceptual: "Explica per què et vas endavant quan l'autobús frena." },
    { id: "fregament", nom: "fregament", definicio: "Força que apareix entre dues superfícies en contacte i que s'oposa al moviment relatiu entre elles.", exemple: "Una pilota que rodola acaba aturant-se.", paraules_clau: ["superfícies", "contacte", "oposa"], sinonims: ["friccio", "força de fregament"], distractors: [{ text: "inèrcia", per_que: "La inèrcia és una tendència, no una força entre superfícies." }, { text: "normal", per_que: "La normal és perpendicular a la superfície i no s'oposa al moviment." }], font: "El fregament s'oposa al moviment", pista_conceptual: "Per culpa seva una pilota que rodola s'acaba aturant." },
    { id: "velocitat", nom: "velocitat mitjana", definicio: "Quocient entre la distància recorreguda i el temps emprat; en el SI es mesura en m/s.", exemple: "100 m en 20 s: 5 m/s.", paraules_clau: ["distància", "temps", "quocient"], sinonims: ["velocitat"], distractors: [{ text: "acceleració", per_que: "L'acceleració és el canvi de velocitat per unitat de temps." }, { text: "rapidesa instantània", per_que: "La instantània és en un moment concret, no la mitjana del recorregut." }], font: "Velocitat mitjana: v = d / t", pista_conceptual: "Es calcula dividint distància entre temps." }
  ],
  formules: [
    { id: "f_newton", nom: "Segona llei de Newton", expressio: "F = m * a", concepte_id: "forca", resultat: { simbol: "F", nom: "força", unitat: "N" }, variables: [{ simbol: "m", nom: "massa", unitat: "kg", min: 0.5, max: 60, pas: 0.5 }, { simbol: "a", nom: "acceleració", unitat: "m/s²", min: 0.2, max: 10, pas: 0.1 }], constants: [], errors: [{ expressio: "m / a", explicacio: "Has dividit la massa entre l'acceleració. A la segona llei es multipliquen: F = m · a." }, { expressio: "a / m", explicacio: "Has dividit l'acceleració entre la massa. La força és el producte m · a." }, { expressio: "m + a", explicacio: "Has sumat magnituds diferents. Massa i acceleració es multipliquen." }] },
    { id: "f_pes", nom: "Pes d'un cos", expressio: "P = m * g", concepte_id: "pes", resultat: { simbol: "P", nom: "pes", unitat: "N" }, variables: [{ simbol: "m", nom: "massa", unitat: "kg", min: 1, max: 120, pas: 1 }], constants: [{ simbol: "g", nom: "gravetat a la Terra", valor: 9.8, unitat: "m/s²" }], errors: [{ expressio: "m", explicacio: "Has donat la massa com si fos el pes. El pes és una força: cal multiplicar per g." }, { expressio: "m / g", explicacio: "Has dividit entre g. El pes es calcula multiplicant: P = m · g." }] },
    { id: "f_vel", nom: "Velocitat mitjana", expressio: "v = d / t", concepte_id: "velocitat", resultat: { simbol: "v", nom: "velocitat", unitat: "m/s" }, variables: [{ simbol: "d", nom: "distància", unitat: "m", min: 20, max: 2000, pas: 10 }, { simbol: "t", nom: "temps", unitat: "s", min: 4, max: 300, pas: 1 }], constants: [], errors: [{ expressio: "t / d", explicacio: "Has invertit la divisió. La velocitat és distància entre temps." }, { expressio: "d * t", explicacio: "Has multiplicat. La velocitat mitjana és d / t." }] }
  ],
  procediments: [
    { id: "p_dinamica", nom: "Resoldre un problema de dinàmica", concepte_id: "forca", passos: ["Llegir l'enunciat i identificar què es demana", "Anotar les dades i passar-les a unitats del SI", "Dibuixar les forces que actuen sobre el cos", "Escriure la fórmula adequada (F = m · a)", "Substituir les dades i calcular", "Revisar el resultat i escriure'n la unitat"] }
  ],
  relacions: [
    { a: "força", tipus: "causa", b: "acceleració" },
    { a: "massa", tipus: "s'oposa a", b: "acceleració" },
    { a: "fregament", tipus: "s'oposa a", b: "moviment" },
    { a: "pes", tipus: "és un tipus de", b: "força" },
    { a: "newton", tipus: "és la unitat de", b: "força" }
  ],
  cronologia: [
    { any: "-350", fet: "Aristòtil: els cossos necessiten una força contínua per moure's" },
    { any: "1638", fet: "Galileu descriu la inèrcia amb plans inclinats" },
    { any: "1687", fet: "Newton publica els Principia amb les tres lleis" },
    { any: "1905", fet: "Einstein proposa la relativitat especial" }
  ],
  errors_tipics: [
    { id: "e_massapes", afirmacio_erronia: "La massa i el pes són la mateixa magnitud.", correccio: "La massa és quantitat de matèria (kg) i no canvia; el pes és una força (N) que depèn de la gravetat.", concepte_id: "pes" },
    { id: "e_moviment", afirmacio_erronia: "Si un cos es mou, sempre hi ha d'haver una força que l'empenyi.", correccio: "Per la inèrcia, un cos pot moure's amb velocitat constant sense força neta.", concepte_id: "inercia" },
    { id: "e_caiguda", afirmacio_erronia: "Sense aire, un objecte pesant cau més de pressa que un de lleuger.", correccio: "Al buit tots els cossos cauen amb la mateixa acceleració, g.", concepte_id: "pes" }
  ],
  preguntes_obertes: [
    { id: "o_lluna", pregunta: "Un astronauta de 70 kg viatja a la Lluna. Explica què passa amb la seva massa i amb el seu pes.", resposta_model: "La massa continua sent 70 kg, perquè és la quantitat de matèria. El pes disminueix, perquè la gravetat de la Lluna és més petita (unes sis vegades menor).", criteris: ["Diu que la massa no canvia", "Diu que el pes disminueix", "Ho justifica per la gravetat menor de la Lluna"], concepte_id: "pes" },
    { id: "o_bus", pregunta: "Per què ens anem cap endavant quan un autobús frena de cop?", resposta_model: "Per la inèrcia: el nostre cos tendeix a mantenir la velocitat que portava, mentre l'autobús s'atura.", criteris: ["Esmenta la inèrcia", "Explica que el cos tendeix a mantenir el moviment"], concepte_id: "inercia" }
  ] },
{ id: "demo_cel", demo: true, titol: "La cèl·lula", materia: "Biologia i Geologia", curs: "1r ESO",
  resum: "La cèl·lula és la unitat estructural i funcional dels éssers vius. Totes tenen membrana, citoplasma i material genètic. Les procariotes no tenen nucli; les eucariotes sí. Les cèl·lules vegetals tenen paret cel·lular i cloroplasts. Per observar-les fem servir el microscopi òptic.",
  seccions: [
    { titol: "Teoria cel·lular", punts: ["Tots els éssers vius estan formats per cèl·lules", "La cèl·lula és la unitat de vida més petita", "Tota cèl·lula prové d'una altra cèl·lula"] },
    { titol: "Parts de la cèl·lula", punts: ["Membrana plasmàtica: envolta i controla el pas de substàncies", "Citoplasma: medi intern on hi ha els orgànuls", "Material genètic (ADN): conté la informació"] },
    { titol: "Tipus de cèl·lules", punts: ["Procariota: sense nucli (bacteris)", "Eucariota: amb nucli (animals, plantes, fongs)", "La vegetal té paret cel·lular, cloroplasts i un vacúol gran"] },
    { titol: "El microscopi", punts: ["Augment total = augment de l'ocular × augment de l'objectiu", "Sempre es comença enfocant amb l'objectiu de menys augments"] }
  ],
  conceptes: [
    { id: "cellula", nom: "cèl·lula", definicio: "Unitat estructural i funcional més petita dels éssers vius, capaç de fer les funcions vitals.", exemple: "Una neurona, un glòbul vermell, un bacteri.", paraules_clau: ["unitat", "funcional", "vius"], sinonims: ["celula"], distractors: [{ text: "teixit", per_que: "Un teixit és un conjunt de cèl·lules semblants." }, { text: "molècula", per_que: "Una molècula no està viva ni fa funcions vitals." }], font: "La cèl·lula és la unitat de vida més petita", pista_conceptual: "És el que tenen en comú tots els éssers vius." },
    { id: "membrana", nom: "membrana plasmàtica", definicio: "Capa fina que envolta la cèl·lula i controla el pas de substàncies entre l'interior i l'exterior.", exemple: "Deixa entrar glucosa i oxigen.", paraules_clau: ["envolta", "controla", "substàncies"], sinonims: ["membrana"], distractors: [{ text: "paret cel·lular", per_que: "La paret és una capa rígida extra que només tenen plantes, fongs i bacteris." }, { text: "citoplasma", per_que: "El citoplasma és el medi intern, no l'envolta." }], font: "Membrana plasmàtica: envolta i controla el pas de substàncies", pista_conceptual: "És la frontera de la cèl·lula, com una porta amb control." },
    { id: "citoplasma", nom: "citoplasma", definicio: "Medi intern de la cèl·lula, entre la membrana i el nucli, on es troben els orgànuls.", exemple: "Els mitocondris floten al citoplasma.", paraules_clau: ["medi", "intern", "orgànuls"], sinonims: [], distractors: [{ text: "nucli", per_que: "El nucli conté l'ADN; el citoplasma és el medi on hi ha els orgànuls." }, { text: "vacúol", per_que: "El vacúol és un orgànul que emmagatzema substàncies." }], font: "Citoplasma: medi intern on hi ha els orgànuls", pista_conceptual: "És l'espai on 'neden' els orgànuls." },
    { id: "nucli", nom: "nucli", definicio: "Orgànul de les cèl·lules eucariotes que conté el material genètic (ADN) i controla l'activitat cel·lular.", exemple: "El nucli d'una cèl·lula de la galta es veu tenyit amb blau de metilè.", paraules_clau: ["eucariotes", "ADN", "controla"], sinonims: [], distractors: [{ text: "mitocondri", per_que: "El mitocondri obté energia; no guarda la informació genètica principal." }, { text: "ribosoma", per_que: "El ribosoma fabrica proteïnes." }], font: "Eucariota: amb nucli", pista_conceptual: "És el centre de control i guarda l'ADN." },
    { id: "mitocondri", nom: "mitocondri", definicio: "Orgànul on es fa la respiració cel·lular per obtenir energia dels nutrients.", exemple: "Les cèl·lules musculars en tenen molts.", paraules_clau: ["respiració", "energia", "nutrients"], sinonims: [], distractors: [{ text: "cloroplast", per_que: "El cloroplast fa la fotosíntesi; el mitocondri, la respiració." }, { text: "nucli", per_que: "El nucli guarda l'ADN, no produeix energia." }], font: "Mitocondris: respiració cel·lular", pista_conceptual: "És la 'central energètica' de la cèl·lula." },
    { id: "cloroplast", nom: "cloroplast", definicio: "Orgànul de les cèl·lules vegetals que conté clorofil·la i on es fa la fotosíntesi.", exemple: "Les cèl·lules de les fulles en són plenes.", paraules_clau: ["vegetals", "clorofil·la", "fotosíntesi"], sinonims: [], distractors: [{ text: "mitocondri", per_que: "El mitocondri fa la respiració, i el tenen animals i plantes." }, { text: "vacúol", per_que: "El vacúol emmagatzema aigua i substàncies." }], font: "La vegetal té paret cel·lular, cloroplasts i un vacúol gran", pista_conceptual: "És verd i fabrica aliment amb la llum." },
    { id: "paret", nom: "paret cel·lular", definicio: "Coberta rígida situada per fora de la membrana que protegeix i dona forma a les cèl·lules vegetals, dels fongs i dels bacteris.", exemple: "Fa que les cèl·lules de la ceba es vegin com rectangles.", paraules_clau: ["rígida", "membrana", "vegetals"], sinonims: ["paret"], distractors: [{ text: "membrana plasmàtica", per_que: "Totes les cèl·lules tenen membrana; la paret només algunes, i és rígida." }, { text: "citoplasma", per_que: "El citoplasma és interior i fluid." }], font: "La vegetal té paret cel·lular", pista_conceptual: "Les cèl·lules animals no en tenen i per això tenen formes variades." },
    { id: "procariota", nom: "cèl·lula procariota", definicio: "Cèl·lula sense nucli, amb el material genètic dispers al citoplasma.", exemple: "Els bacteris.", paraules_clau: ["sense nucli", "dispers"], sinonims: ["procariota"], distractors: [{ text: "cèl·lula eucariota", per_que: "Les eucariotes sí que tenen nucli." }, { text: "cèl·lula vegetal", per_que: "La vegetal és eucariota: té nucli." }], font: "Procariota: sense nucli (bacteris)", pista_conceptual: "És el tipus de cèl·lula dels bacteris." },
    { id: "eucariota", nom: "cèl·lula eucariota", definicio: "Cèl·lula amb nucli que envolta el material genètic i amb orgànuls envoltats de membrana.", exemple: "Cèl·lules d'animals, plantes i fongs.", paraules_clau: ["nucli", "orgànuls"], sinonims: ["eucariota"], distractors: [{ text: "cèl·lula procariota", per_que: "Les procariotes no tenen nucli." }, { text: "virus", per_que: "Els virus no són cèl·lules." }], font: "Eucariota: amb nucli (animals, plantes, fongs)", pista_conceptual: "Les teves cèl·lules són d'aquest tipus." }
  ],
  formules: [
    { id: "f_augment", nom: "Augment total del microscopi", expressio: "A = Oc * Ob", concepte_id: "cellula", resultat: { simbol: "A", nom: "augment total", unitat: "×" }, variables: [{ simbol: "Oc", nom: "augment de l'ocular", unitat: "×", min: 5, max: 15, pas: 5 }, { simbol: "Ob", nom: "augment de l'objectiu", unitat: "×", min: 4, max: 100, pas: 1 }], constants: [], errors: [{ expressio: "Oc + Ob", explicacio: "Has sumat els augments. L'augment total és el producte: ocular × objectiu." }, { expressio: "Ob / Oc", explicacio: "Has dividit. Els augments es multipliquen." }] }
  ],
  procediments: [
    { id: "p_ceba", nom: "Preparar una mostra de ceba per al microscopi", concepte_id: "paret", passos: ["Separar una capa de la ceba i treure'n la pel·lícula fina", "Posar la pel·lícula estesa sobre el portaobjectes", "Afegir una gota de colorant (blau de metilè)", "Tapar amb el cobreobjectes evitant bombolles", "Observar primer amb l'objectiu de menys augments", "Canviar a més augments i enfocar amb el cargol micromètric"] }
  ],
  relacions: [
    { a: "cloroplast", tipus: "és part de", b: "cèl·lula vegetal" },
    { a: "nucli", tipus: "conté", b: "ADN" },
    { a: "mitocondri", tipus: "produeix", b: "energia" },
    { a: "paret cel·lular", tipus: "dona forma a", b: "cèl·lula vegetal" },
    { a: "cèl·lula procariota", tipus: "s'oposa a", b: "cèl·lula eucariota" }
  ],
  cronologia: [
    { any: "1665", fet: "Robert Hooke observa cel·les en un tall de suro" },
    { any: "1674", fet: "Van Leeuwenhoek observa microorganismes vius" },
    { any: "1838", fet: "Schleiden: totes les plantes estan fetes de cèl·lules" },
    { any: "1839", fet: "Schwann: també els animals estan fets de cèl·lules" },
    { any: "1855", fet: "Virchow: tota cèl·lula prové d'una altra cèl·lula" }
  ],
  errors_tipics: [
    { id: "e_paretanimal", afirmacio_erronia: "Les cèl·lules animals tenen paret cel·lular.", correccio: "Només en tenen les vegetals, els fongs i els bacteris. Les animals només tenen membrana.", concepte_id: "paret" },
    { id: "e_bacterinucli", afirmacio_erronia: "Els bacteris tenen el material genètic dins d'un nucli.", correccio: "Els bacteris són procariotes: no tenen nucli i l'ADN és al citoplasma.", concepte_id: "procariota" },
    { id: "e_plantamito", afirmacio_erronia: "Les plantes no tenen mitocondris perquè ja tenen cloroplasts.", correccio: "Les cèl·lules vegetals tenen cloroplasts i també mitocondris: fan fotosíntesi i respiració.", concepte_id: "mitocondri" }
  ],
  preguntes_obertes: [
    { id: "o_vegani", pregunta: "Indica dues diferències entre una cèl·lula animal i una de vegetal.", resposta_model: "La vegetal té paret cel·lular i cloroplasts (i un vacúol gran); l'animal no té paret ni cloroplasts.", criteris: ["Esmenta la paret cel·lular", "Esmenta els cloroplasts o el vacúol gran"], concepte_id: "paret" },
    { id: "o_teoria", pregunta: "Enuncia la teoria cel·lular.", resposta_model: "Tots els éssers vius estan formats per cèl·lules; la cèl·lula és la unitat de vida; tota cèl·lula prové d'una altra.", criteris: ["Tots els éssers vius estan formats per cèl·lules", "La cèl·lula és la unitat de vida", "Tota cèl·lula prové d'una altra"], concepte_id: "cellula" }
  ] }
];

