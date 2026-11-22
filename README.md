# Apunts Vius

Fes una foto dels apunts i converteix-la en **apunts reorganitzats, simulacions, pràctica amb correcció immediata i un possible examen**. Pensada per a ESO i Batxillerat, tota en català.

- **Sense IA:** el text es llegeix amb OCR ([Tesseract.js](https://github.com/naptha/tesseract.js), de codi obert) i el tema s'extreu amb regles fixes. No hi ha models generatius, claus d'API ni servidors.
- **Gratuïta:** no cal cap compte ni subscripció. Es pot allotjar gratis a GitHub Pages, i l'APK es compila gratis amb GitHub Actions.
- **Privada:** les fotos es processen al dispositiu i no es desen ni s'envien enlloc. El progrés es guarda al mateix dispositiu (localStorage).

## Què fa

1. **Foto → text (OCR).** Els botons «Fer foto» (obre la càmera) i «Triar de la galeria». Abans de llegir, la imatge es millora (escala de grisos i binarització d'Otsu). El text es pot corregir a mà, o s'hi pot enganxar text directament.
2. **Text → tema (regles).** L'extractor detecta:
   - títols i seccions;
   - definicions («Terme: …», «El terme és …», «… s'anomena terme»);
   - fórmules («F = m · a»), amb la llegenda de les variables («m = massa (kg)») i les constants («g = 9,8 m/s²»);
   - procediments (llistes numerades);
   - cronologies (línies que comencen per l'any);
   - errors típics («No confondre A amb B», «Compte: …»);
   - relacions entre conceptes (causa, produeix, conté, forma part de…).
3. **Revisió.** Abans de crear el tema, tot el que s'ha detectat es pot corregir, desmarcar o completar.
4. **Estudi:**
   - **Apunts:** resum, esquema, glossari amb «tapa i recorda», fórmules, mapa conceptual, cronologia i errors típics.
   - **Laboratori:** simuladors amb control lliscant i gràfica, reptes per arribar a un valor objectiu, prediccions, ordenar passos i relacionar conceptes.
   - **Pràctica:** preguntes generades a partir del tema (tipus test, completar, càlcul amb dades noves, trobar l'error, ordenar…), amb repàs espaiat (FSRS).
   - **Examen:** simulacre cronometrat o versió en paper. Desbloqueja el repte final quan el tema està consolidat al 80%.
5. **Feedback i control de l'error:**
   - diagnòstic de l'error (confusió de conceptes, unitats, signe, fórmula invertida…) i un segon intent sense veure la resposta;
   - fins a 3 pistes graduades, que demanen primer on t'has encallat;
   - quadern d'errors, i els errors tornen a sortir a la mateixa sessió;
   - calibratge de la seguretat («N'estic segur» / «Crec que sí»).
6. **Gamificació:**
   - XP només per esforç útil;
   - combos d'encerts al primer intent;
   - una pregunta d'or per sessió;
   - estrelles per tema (1–3);
   - insígnies;
   - ratxa setmanal amb comodí;
   - sons i confeti, que es poden desactivar i respecten «reduir moviment».

## Estructura

```
index.html
css/styles.css          tokens, tema clar/fosc, components
js/util.js              utilitats comunes
js/state.js             estat, localStorage, migracions
js/router.js            pila de pantalles (el botó enrere d'Android hi funciona)
js/screens/*.js         una pantalla per fitxer (inici i tema, apunts, lab, pràctica, examen, progrés, nou, revisió)
js/generators.js        expressions sense eval i generadors d'activitats a partir del JSON del tema
js/fsrs.js              planificació de repassos
js/game.js              XP, sessions, combo, pregunta d'or, estrelles, insígnies
js/sfx.js               sons amb AudioContext i confeti
js/ocr.js               OCR al dispositiu (Tesseract.js) i millora de la imatge
js/extractor.js         extracció del tema per regles, sense IA
js/demo-temes.js        temes d'exemple
js/main.js              arrencada
manifest.json, sw.js    PWA (funciona sense connexió un cop carregada)
build.py                genera manifest, sw.js, icones, www/ (per a l'APK) i app.html (un sol fitxer)
```

## Executar-la en local

```
python build.py
python -m http.server 8000
```

Obre `http://localhost:8000`. La càmera i l'OCR necessiten `localhost` o `https`.

## Publicar-la a GitHub Pages (gratis)

1. Crea un repositori i puja-hi tots els fitxers (`git add . && git commit -m "Apunts Vius" && git push`).
2. A **Settings → Pages**, tria **Deploy from a branch → main → / (root)**.
3. Al cap d'un minut, l'app és a `https://<usuari>.github.io/<repositori>/`. Des del mòbil es pot instal·lar amb «Afegir a la pantalla d'inici».

## APK d'Android (gratis)

Cada `push` a `main` llança el workflow `.github/workflows/android.yml`, que compila l'APK amb Capacitor als servidors de GitHub. També es pot llançar a mà: **Actions → APK Android → Run workflow**. L'APK es descarrega des de l'execució, a **Artifacts → apunts-vius-apk**. Per instal·lar-lo al mòbil, cal permetre «instal·lar aplicacions desconegudes».

És un APK de depuració (sense signar per a Play Store): serveix per instal·lar-lo directament.

## Limitacions (cal saber-les)

- **Lletra manuscrita:** Tesseract funciona molt bé amb text imprès i amb lletra clara d'impremta, però amb lletra lligada o desordenada falla força. Per això el text sempre es pot corregir abans d'analitzar-lo.
- **L'extractor no «entén» el text:** només reconeix els patrons de la llista de dalt. Si els apunts no tenen definicions en aquest format, en detectarà poques. A la pantalla «Nou tema» hi ha consells per escriure'ls.
- **Primera lectura:** cal connexió per descarregar el motor d'OCR i el diccionari de l'idioma (uns quants MB). Després queden desats i l'OCR funciona sense connexió.
- `app.html` (la versió d'un sol fitxer) es pot obrir sense servidor, però en entorns amb restriccions de xarxa l'OCR pot no carregar-se. En aquest cas, s'hi pot enganxar el text.
