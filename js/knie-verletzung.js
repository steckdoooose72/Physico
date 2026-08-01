/* ==========================================================================
   knie-verletzung.js – Pilotmodus „Verletzungsmechanismus" (Knie)
   --------------------------------------------------------------------------
   Drittes und letztes der geplanten Knie-Module (nach knie-struktur.js und
   knie-bewegung.js). Technisch identisch zu js/schulter-verletzung.js
   aufgebaut – siehe dort für die ausführlichere Erklärung des Ablaufs.

   Statt „welche Struktur ist das" steht hier eine kurze klinische Situation
   („Plötzlicher Richtungswechsel …"), und die betroffene Struktur wird aus
   mehreren Antworten gewählt.

   Ablauf wie in Bone-Prep (js/bone-prep.js), bewusst gleich:
     ein Durchlauf fragt alle Fälle ab, jedes Mal neu gemischt  →  falsch
     beantwortete kommen im selben Durchlauf automatisch noch einmal dran, bis
     alles sitzt  →  Auswertung erst am Ende. Während der Runde wird nie
     verraten, ob eine Antwort stimmt.

   Unterschied zur Struktur-/Bewegungsübung: die 3D-Szene darf die Lösung
   **nicht** vorwegnehmen. Sie zeigt während der Fragen nur neutral die
   Knieregion; erst in der Auswertung lässt sich jede Struktur der Runde
   einzeln im Modell nachsehen (Klick auf die Liste).

   Anders als beim ersten Schulter-Durchgang gab es hier von Anfang an echte
   Bänder/Menisken-Meshes (System „baender", siehe knie-struktur.js) – die
   Hervorhebung in der Auswertung greift deshalb direkt, ohne Nachrüsten.
   Ein Marker-Sonderfall (Kniegelenk, 0 Dreiecke) kommt in diesen sieben
   Fragen nicht als Antwort vor.

   Der Umfang wird **vorab** gewählt, nicht pro Frage angezeigt:
     Einstieg    – die vier eindeutigen Verletzungsmechanismen
     Vertiefung  – dazu drei feinere Fälle

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (knie-verletzung.html), eigene Datendatei (daten/knie_verletzungen.json).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const PAUSE_NACH_ANTWORT = 300;   // Millisekunden, damit der Klick sichtbar wird

// Das linke Knie ist die Pilotseite – eine Seite genügt für einen
// klinischen Fall, und die Kamera steht dadurch bei jeder Frage gleich.
// Koordinate = „mitte" von PT-G-knie-links aus daten/strukturen.json.
const KNIE_MITTE = new THREE.Vector3(0.0749, 0.4112, -0.0306);

// Wie viel Körper (in Metern) das Bild bei den Fragen zeigt – groß genug für
// Kniescheibe, Gelenkspalt und die Bandansätze an Femur/Tibia, klein genug,
// um nicht abzulenken. Der Gelenkbereich ist deutlich kompakter als die
// Schulterregion, daher kleiner als dort.
const SICHT_HOEHE = 0.5;

/**
 * Welcher Antwortbegriff steckt hinter welchen Strukturen im Modell.
 * Die Kennungen stammen aus daten/strukturen.json bzw. sind identisch zu
 * denen in js/knie-struktur.js übernommen – nicht neu erfunden.
 */
const STRUKTUR_KENNUNGEN = {
  'Vorderes Kreuzband': ['PT-B-vkb-links'],
  'Hinteres Kreuzband': ['PT-B-hkb-links'],
  'Innenband':          ['PT-B-innenband-links'],
  'Außenband':          ['PT-B-aussenband-links'],
  'Innenmeniskus':      ['PT-B-innenmeniskus-links'],
  'Außenmeniskus':      ['PT-B-aussenmeniskus-links'],
  'Kniescheibe':        ['FMA24487'],
};

// Knöcherner Rahmen ums Knie: reicht als ruhiger Hintergrund und lädt
// schnell. Die Bänder/Menisken kommen upfront mit dazu (siehe unten) – sie
// sind schematische Formen ohne echtes Dreiecksgewicht, anders als Muskeln.
const GRUND_BUENDEL = ['skelett_bein'];

// --- Elemente -------------------------------------------------------------
const ladehinweis = document.getElementById('ladehinweis');
const startBereich = document.getElementById('start-bereich');
const frageBereich = document.getElementById('frage-bereich');
const situationText = document.getElementById('situation-text');
const antwortenFeld = document.getElementById('antworten');
const kopfUmfang = document.getElementById('kopf-umfang');
const ergebnisFeld = document.getElementById('ergebnis');
const ansichtLeiste = document.getElementById('ansicht-leiste');
const ansichtName = document.getElementById('ansicht-name');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittFuell = document.getElementById('fortschritt-fuell');
const beendenKnopf = document.getElementById('beenden-knopf');

// --- Bühne ----------------------------------------------------------------
// Blick fest aufs linke Knie: bei jeder Frage derselbe Ausschnitt, damit die
// Kamera nicht verrät, worum es geht.
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({
    behaelter: document.getElementById('buehne'),
    kameraStart: new THREE.Vector3(0.33, 0.55, 0.31),
    blickZiel: KNIE_MITTE.clone(),
    mitBoden: false,
  });

const katalog = new Katalog(szene);
katalog.beiNeuZeichnen = schattenAuffrischen;

// Alles, was gerade nur Kulisse ist, tritt zurück
const zurueckhaltend = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#cfc7b2'),
  roughness: 0.85,
  metalness: 0,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});

// Einmal erzeugt und wiederverwendet – sonst sammeln sich Materialien an.
const gesuchtesMaterial = hervorhebungsMaterial();

/**
 * Wartet, bis die Bühne eine echte Größe hat (Behälter noch nicht layoutet =
 * clientWidth 0). Direkt nach dem Laden kann das kurz der Fall sein; würde
 * die allererste Kamerafahrt schon dann laufen, rechnet fliegeZu() mit
 * kamera.aspect = 0/0 = NaN – und weil jede spätere Fahrt von der vorherigen
 * (kaputten) Position aus weiterrechnet, bliebe die Kamera dauerhaft auf NaN
 * stehen, nicht nur kurz falsch positioniert. Gleiche Absicherung wie in
 * js/knie-struktur.js und js/knie-bewegung.js.
 */
async function bisBuehneBereit() {
  const behaelter = document.getElementById('buehne');
  for (let i = 0; i < 60 && behaelter.clientWidth === 0; i++) {
    await new Promise(requestAnimationFrame);
  }
}

function status(text, istFehler = false) {
  if (!text) {
    ladehinweis.classList.add('weg');
    return;
  }
  ladehinweis.classList.remove('weg');
  ladehinweis.classList.toggle('fehler', istFehler);
  ladehinweis.innerHTML = text;
}

// --- Zustand einer Runde --------------------------------------------------
let faelle = [];             // alle Fälle aus der Datendatei
let poolAktuell = [];        // die Fälle des gewählten Umfangs
let frageListe = [];         // Fragen des aktuellen Laufs
let position = 0;            // welche Frage im Lauf gerade dran ist
let phase = 1;               // 1 = erster Durchlauf, ab 2 = Wiederholung
let laufFehler = [];         // in DIESEM Lauf falsch beantwortete Fälle
let stand = new Map();       // Situation -> { fall, gewaehlt, richtig }
let jeFalsch = new Set();    // Situationen, die irgendwann falsch waren
let beendet = false;         // nach „Beenden" oder vollständigem Abschluss
let laeuft = false;          // sperrt Doppelklicks während des Wechsels

/** Mischt eine Liste (Fisher-Yates). */
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Lädt die Fälle. Jeder Eintrag bringt seine eigenen Ablenker mit. */
async function ladeFaelle() {
  const antwort = await fetch('daten/knie_verletzungen.json');
  if (!antwort.ok) throw new Error('daten/knie_verletzungen.json fehlt.');
  const alle = await antwort.json();
  if (!Array.isArray(alle) || !alle.length) {
    throw new Error('daten/knie_verletzungen.json enthält keine Fälle.');
  }
  return alle;
}

/**
 * Baut aus einem Fall eine Frage. Alle richtigen Strukturen stehen mit zur
 * Wahl – bei mehreren zählt jede einzeln als richtige Antwort (siehe die
 * Hyperextension/-flexion-Frage mit zwei zulässigen Kreuzbändern).
 */
function baueFrage(fall) {
  return { fall, antworten: mischen([...fall.richtig, ...fall.ablenker]) };
}

/** Ein Lauf = die gegebenen Fälle einmal, in neu gemischter Reihenfolge. */
function baueLauf(fallListe) {
  return mischen(fallListe).map(baueFrage);
}

/** Startet einen frischen Durchlauf. */
function startLauf(fallListe) {
  frageListe = baueLauf(fallListe);
  position = 0;
  phase = 1;
  laufFehler = [];
  stand = new Map();
  jeFalsch = new Set();
  beendet = false;
}

/**
 * Setzt die Szene auf „neutral": nur der knöcherne Rahmen, zurückhaltend.
 * Genau so sieht die Bühne während der Fragen aus – ohne jeden Hinweis.
 *
 * Bänder/Menisken bleiben hier aus, obwohl geladen: sie würden sonst schon
 * vor der Antwort verraten, worum es in der Frage geht.
 */
function zeigeNeutral() {
  for (const [, mesh] of katalog.meshes) {
    mesh.visible = mesh.userData.system === 'skelett';
    if (mesh.visible) mesh.material = zurueckhaltend;
  }
  schattenAuffrischen();
}

/**
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit das Knie nicht
 * halb dahinter verschwindet, wird die freie Fläche dazwischen ausgemessen –
 * gleiche Rechnung wie in js/bone-prep.js.
 */
function freiesBildfeld(rand) {
  const hoehe = window.innerHeight;
  const luft = 16;
  const oben = document.getElementById('quiz-kopf').getBoundingClientRect().bottom + luft;
  // Je nachdem, was gerade unten liegt: die Fragen oder die schmale Leiste
  const untenFeld = !frageBereich.hidden ? frageBereich
    : !ansichtLeiste.hidden ? ansichtLeiste
    : null;
  const unten = (untenFeld ? untenFeld.getBoundingClientRect().top : hoehe) - luft;
  return {
    nutzHoehe: Math.min(1, Math.max(0.25, (unten - oben) / hoehe)),
    versatzHoch: Math.min(0.35, Math.max(0, 0.5 - (oben + unten) / 2 / hoehe)),
    rand,
  };
}

/**
 * Rahmt die Knieregion ein – bei jeder Frage derselbe Ausschnitt, damit die
 * Kamera nichts verrät.
 *
 * Bewusst von Hand gerechnet statt über fliegeZu(): der Bezugspunkt wäre der
 * Gelenkpunkt, und dessen Mesh trägt die (unsichtbaren) Bewegungsachsen als
 * Kinder – die blähen seine Hüllbox auf, die Kamera landete dadurch viel zu
 * weit weg. Ein fester Ausschnitt ist hier ohnehin das, was wir wollen.
 */
function rahmeKnie() {
  const { versatzHoch } = freiesBildfeld(1);
  const abstand = SICHT_HOEHE / (2 * Math.tan((kamera.fov * Math.PI) / 360));

  const richtung = new THREE.Vector3(0.55, 0.22, 0.8).normalize();
  // „Oben" im Bild: der Teil der Welt-Senkrechten quer zur Blickrichtung
  const bildOben = new THREE.Vector3(0, 1, 0)
    .addScaledVector(richtung, -richtung.y)
    .normalize();

  // Blickpunkt unters Knie legen, damit es über der Antwortfläche liegt
  const ziel = KNIE_MITTE.clone().addScaledVector(bildOben, -versatzHoch * SICHT_HOEHE);
  steuerung.target.copy(ziel);
  kamera.position.copy(ziel).addScaledVector(richtung, abstand);
  steuerung.update();
}

function aktualisiereFortschritt() {
  const praefix = phase > 1 ? 'Wiederholung · ' : '';
  fortschrittText.textContent = `${praefix}Frage ${position + 1} von ${frageListe.length}`;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;
}

async function zeigeFrage() {
  if (beendet) return;
  const frage = frageListe[position];
  if (!frage) return naechsterLaufOderEnde();

  startBereich.hidden = true;
  ergebnisFeld.hidden = true;
  frageBereich.hidden = false;

  // Keine Schwierigkeits-Kennzeichnung mehr an der einzelnen Frage – die
  // Trennung passiert über die Umfangswahl am Anfang (siehe starteUmfang()).
  situationText.textContent = frage.fall.situation;

  antwortenFeld.innerHTML = '';
  for (const moeglichkeit of frage.antworten) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'antwort-knopf';
    knopf.textContent = moeglichkeit;
    knopf.addEventListener('click', () => nimmAntwort(frage, moeglichkeit, knopf));
    antwortenFeld.appendChild(knopf);
  }

  aktualisiereFortschritt();
  zeigeNeutral();
  rahmeKnie();
  laeuft = false;
}

/**
 * Ein Lauf ist zu Ende. Gab es Fehler, geht es automatisch mit genau diesen
 * Fällen weiter – neu gemischt, ohne Klick. Erst wenn ein Lauf ohne Fehler
 * durchlief, ist der Durchlauf fertig.
 */
async function naechsterLaufOderEnde() {
  if (laufFehler.length === 0) {
    zeigeErgebnis(false);
    return;
  }
  frageListe = baueLauf(laufFehler);
  laufFehler = [];
  phase += 1;
  position = 0;
  await zeigeFrage();
}

/**
 * Nimmt eine Antwort entgegen – ohne zu verraten, ob sie stimmt.
 * Der gewählte Knopf wird nur neutral markiert, dann geht es weiter.
 */
async function nimmAntwort(frage, gewaehlt, knopf) {
  if (laeuft) return;
  laeuft = true;

  const richtig = frage.fall.richtig.includes(gewaehlt);
  stand.set(frage.fall.situation, { fall: frage.fall, gewaehlt, richtig });
  if (!richtig) {
    jeFalsch.add(frage.fall.situation);
    laufFehler.push(frage.fall);   // kommt in diesem Durchlauf noch einmal dran
  }

  for (const k of antwortenFeld.querySelectorAll('.antwort-knopf')) {
    k.disabled = true;
    k.classList.add(k === knopf ? 'gewaehlt' : 'blass');
  }

  position += 1;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;

  await new Promise((r) => setTimeout(r, PAUSE_NACH_ANTWORT));
  await zeigeFrage();
}

/**
 * Hebt eine Struktur im Modell hervor – erst in der Auswertung, nie vorher.
 * Fehlt eine Struktur im Modell (leere Liste in STRUKTUR_KENNUNGEN), bleibt
 * es beim Text; die zugehörigen Knöpfe sind dann gar nicht erst anklickbar.
 * Aktuell betrifft das keine der sieben Situationen.
 */
async function hebeHervor(name, knopf) {
  const kennungen = STRUKTUR_KENNUNGEN[name] ?? [];
  if (!kennungen.length) return;

  // Bündel der gesuchten Strukturen bei Bedarf nachladen.
  const fehlende = [...new Set(
    kennungen
      .filter((id) => !katalog.meshes.has(id))
      .map((id) => katalog.strukturen.get(id)?.buendel)
      .filter(Boolean)
  )];

  if (fehlende.length) {
    knopf.disabled = true;
    status(`${name} wird geladen …`);
    for (const buendel of fehlende) await katalog.ladeBuendel(buendel);
    status(null);
    knopf.disabled = false;
  }

  // Auswertung beiseite, schmale Leiste her – sonst verdeckt sie das Modell
  ergebnisFeld.hidden = true;
  ansichtLeiste.hidden = false;
  ansichtName.textContent = name;

  zeigeNeutral();
  let erstes = null;
  for (const id of kennungen) {
    const mesh = katalog.meshes.get(id);
    if (!mesh) continue;
    mesh.visible = true;
    mesh.material = gesuchtesMaterial;
    erstes = erstes ?? mesh;
  }
  if (erstes) fliegeZu(erstes, false, freiesBildfeld(3.4));
  schattenAuffrischen();
}

function zeigeErgebnis(vorzeitig) {
  beendet = true;
  frageBereich.hidden = true;
  ergebnisFeld.hidden = false;
  fortschrittFuell.style.width = '100%';
  zeigeNeutral();

  const titelEl = document.getElementById('ergebnis-titel');
  const zahlEl = document.getElementById('ergebnis-zahl');
  const listeFeld = document.getElementById('ergebnis-fehler');
  const eintraege = [...stand.values()];

  if (vorzeitig) {
    fortschrittText.textContent = 'beendet';
    titelEl.textContent = 'Vorzeitig beendet.';
    zahlEl.textContent = '';
  } else {
    fortschrittText.textContent = 'fertig';
    titelEl.textContent = 'Alles gelernt.';
    const aufAnhieb = eintraege.length - jeFalsch.size;
    zahlEl.textContent =
      `${eintraege.length} Situationen, ${aufAnhieb} davon auf Anhieb richtig`;
  }

  if (!eintraege.length) {
    listeFeld.innerHTML = '<p class="ergebnis-leer">Noch nichts beantwortet.</p>';
    return;
  }

  // Für jede beantwortete Situation die richtige Struktur zum Nachsehen.
  listeFeld.innerHTML = '<h3>Im Modell nachsehen</h3><ul class="strukturliste"></ul>';
  const liste = listeFeld.querySelector('.strukturliste');

  for (const eintrag of eintraege) {
    const loesung = eintrag.fall.richtig[0];
    const imModell = (STRUKTUR_KENNUNGEN[loesung] ?? []).length > 0;

    const zeile = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'struktur-knopf';
    knopf.disabled = !imModell;

    const bezeichnung = document.createElement('span');
    bezeichnung.textContent = loesung;

    const vermerk = document.createElement('span');
    vermerk.className = 'struktur-vermerk';
    if (!imModell) {
      vermerk.textContent = 'nicht im 3D-Modell';
    } else if (jeFalsch.has(eintrag.fall.situation)) {
      // „saß noch nicht" ersetzt das „ansehen" nicht – anklickbar bleibt es
      vermerk.textContent = 'saß noch nicht · ansehen';
      vermerk.classList.add('gepatzt');
    } else {
      vermerk.textContent = 'ansehen';
    }

    knopf.append(bezeichnung, vermerk);
    knopf.addEventListener('click', () => hebeHervor(loesung, knopf));
    zeile.appendChild(knopf);

    if (eintrag.fall.hinweis) {
      const hinweis = document.createElement('p');
      hinweis.className = 'struktur-hinweis';
      hinweis.textContent = eintrag.fall.hinweis;
      zeile.appendChild(hinweis);
    }
    liste.appendChild(zeile);
  }
}

document.getElementById('ansicht-zurueck').addEventListener('click', () => {
  ansichtLeiste.hidden = true;
  ergebnisFeld.hidden = false;
  zeigeNeutral();
  rahmeKnie();
});

/**
 * Startet den gewählten Umfang. „einstieg" nimmt nur die eindeutigen Fälle
 * (schwierigkeit „klar" in daten/knie_verletzungen.json), „vertiefung" alle.
 */
async function starteUmfang(umfang) {
  poolAktuell = umfang === 'einstieg'
    ? faelle.filter((f) => f.schwierigkeit === 'klar')
    : faelle;

  kopfUmfang.textContent =
    umfang === 'einstieg' ? 'Knie · Einstieg' : 'Knie · Vertiefung';

  ansichtLeiste.hidden = true;
  await bisBuehneBereit();
  startLauf(poolAktuell);
  await zeigeFrage();
}

document.getElementById('einstieg-knopf')
  .addEventListener('click', () => starteUmfang('einstieg'));
document.getElementById('vertiefung-knopf')
  .addEventListener('click', () => starteUmfang('vertiefung'));

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  ansichtLeiste.hidden = true;
  startLauf(poolAktuell);
  await zeigeFrage();
});

document.getElementById('umfang-knopf').addEventListener('click', () => {
  beendet = true;
  ansichtLeiste.hidden = true;
  ergebnisFeld.hidden = true;
  frageBereich.hidden = true;
  startBereich.hidden = false;
  fortschrittText.textContent = '–';
  fortschrittFuell.style.width = '0';
  zeigeNeutral();
  rahmeKnie();
});

beendenKnopf.addEventListener('click', () => {
  if (frageBereich.hidden) return;   // Runde läuft gerade nicht
  zeigeErgebnis(true);
});

// --- Start ----------------------------------------------------------------
try {
  status('Verzeichnis wird geladen …');
  await katalog.starten();
  katalog.stufe = 'grob';

  faelle = await ladeFaelle();

  for (let i = 0; i < GRUND_BUENDEL.length; i++) {
    status(`Knie wird geladen … (${i + 1}/${GRUND_BUENDEL.length})`);
    await katalog.ladeBuendel(GRUND_BUENDEL[i]);
  }
  await katalog.ladeBuendel('eigene');   // Bänder/Menisken + Gelenkpunkt, bleiben zunächst aus

  status(null);
  starteSchleife();
  zeigeNeutral();
  await bisBuehneBereit();
  rahmeKnie();
  startBereich.hidden = false;   // erst die Umfangswahl, dann die Fragen

  const klar = faelle.filter((f) => f.schwierigkeit === 'klar').length;
  console.log(`Knie-Verletzung: ${klar} klar, ${faelle.length} gesamt.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.knieVerletzung = {
  katalog, szene, kamera, steuerung,
  get faelle() { return faelle; },
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
