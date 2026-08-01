/* ==========================================================================
   schulter-fall.js – Pilotmodus „Fallvignette" (Schulter)
   --------------------------------------------------------------------------
   Neu gegenüber allen anderen Modulen: nicht "eine Frage → eine Antwort",
   sondern EINE Fallbeschreibung mit MEHREREN Teilfragen zu verschiedenen
   Aspekten desselben Falls. Die Fallbeschreibung erscheint einmal, alle
   Teilfragen dazu stehen gemeinsam auf dem Bildschirm wie ein kleines
   Formular – jede Teilfrage hat ihre eigenen Antwortmöglichkeiten
   (radiobutton-artig: ein Klick wählt, ein zweiter auf eine andere Antwort
   derselben Teilfrage wählt um). Erst wenn jede Teilfrage eine Auswahl hat,
   wird „Fall auswerten" aktiv. Wie in den anderen Modulen gibt es während
   der Runde kein Sofort-Feedback – ob eine Antwort stimmte, steht erst in
   der gemeinsamen Auswertung am Ende.

   War in einem Fall irgendeine Teilfrage falsch, kommt der GANZE Fall im
   selben Durchlauf neu gemischt noch einmal dran (Analogon zu
   naechsterLaufOderEnde() in den anderen Modulen, nur auf Fall- statt auf
   Einzelfrage-Ebene). Kein Einstieg/Vertiefung-Split – Fallvignette ist
   ohnehin die anspruchsvollste Stufe, ein Durchlauf deckt beide Fälle ab.

   Wie in js/schulter-verletzung.js: die 3D-Szene verrät während der Fragen
   nichts, sie zeigt nur neutral die Schulterregion. Erst in der Auswertung
   lässt sich jede beantwortete Teilfrage einzeln im Modell nachsehen.

   Unterschied zu js/schulter-verletzung.js: "AC-Gelenk" und
   "Glenohumeralgelenk" sind reine Koordinatenpunkte (System „gelenkpunkte",
   0 Dreiecke) – schulter-verletzung.js behandelt sie (noch) nicht als
   Marker, wodurch ihre Hervorhebung dort unsichtbar bliebe. Hier wird daher
   die Marker-Kugel aus js/schulter-struktur.js übernommen, damit auch diese
   beiden Antworten in der Auswertung sichtbar hervorgehoben werden.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (schulter-fall.html), eigene Datendatei (daten/schulter_faelle.json).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const PAUSE_NACH_ANTWORT = 300;   // Millisekunden, damit der Klick sichtbar wird

// Die linke Schulter ist die Pilotseite – eine Seite genügt für einen
// klinischen Fall, und die Kamera steht dadurch bei jeder Frage gleich.
const SCHULTER_MITTE = new THREE.Vector3(0.1827, 1.3485, -0.0295);

// Wie viel Körper (in Metern) das Bild bei den Fragen zeigt – groß genug für
// Schulter, Schlüsselbein und Oberarmansatz, klein genug, um nicht abzulenken.
const SICHT_HOEHE = 0.75;

/**
 * Welcher Antwortbegriff steckt hinter welchen Strukturen im Modell.
 * Die Kennungen sind identisch zu denen in schulter-struktur.js/
 * schulter-bewegung.js/schulter-verletzung.js übernommen, nicht neu
 * nachgeschlagen. `marker: true` heißt: reiner Koordinatenpunkt (0
 * Dreiecke, System „gelenkpunkte") – dafür wird wie in schulter-struktur.js
 * eine kleine leuchtende Kugel an die „mitte"-Koordinate gesetzt, statt ein
 * Mesh einzufärben.
 */
const STRUKTUR_KENNUNGEN = {
  'Glenohumeralgelenk':  { ids: ['PT-G-schulter-links'], marker: true },
  'AC-Gelenk':           { ids: ['PT-G-ac-links'], marker: true },
  'Clavicula':           { ids: ['FMA13323'] },
  'Labrum glenoidale':   { ids: ['PT-B-labrum-links'] },
  'Rotatorenmanschette': { ids: ['FMA32545', 'FMA32548', 'FMA13415', 'FMA32554'] },
  'M. infraspinatus':    { ids: ['FMA32548'] },
  'M. subscapularis':    { ids: ['FMA13415'] },
  'M. teres major':      { ids: ['FMA32552'] },
  'M. supraspinatus':    { ids: ['FMA32545'] },
};

// Knöcherner Rahmen um die Schulter: reicht als ruhiger Hintergrund und lädt
// schnell. Muskelbündel kommen erst bei Bedarf dazu (siehe hebeHervor()).
const GRUND_BUENDEL = ['skelett_hals', 'skelett_rumpf', 'skelett_arm'];

// --- Elemente -------------------------------------------------------------
const ladehinweis = document.getElementById('ladehinweis');
const frageBereich = document.getElementById('frage-bereich');
const situationText = document.getElementById('situation-text');
const teilfragenFeld = document.getElementById('teilfragen');
const absendenKnopf = document.getElementById('absenden-knopf');
const ergebnisFeld = document.getElementById('ergebnis');
const ansichtLeiste = document.getElementById('ansicht-leiste');
const ansichtName = document.getElementById('ansicht-name');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittFuell = document.getElementById('fortschritt-fuell');
const beendenKnopf = document.getElementById('beenden-knopf');

// --- Bühne ----------------------------------------------------------------
// Blick fest auf die linke Schulter: bei jeder Frage derselbe Ausschnitt,
// damit die Kamera nicht verrät, worum es geht.
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({
    behaelter: document.getElementById('buehne'),
    kameraStart: new THREE.Vector3(0.78, 1.52, 0.72),
    blickZiel: SCHULTER_MITTE.clone(),
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
 * Der Marker für Koordinatenpunkte (AC-Gelenk, Glenohumeralgelenk): eine
 * kleine leuchtende Kugel in der Hervorhebungsfarbe, wiederverwendet und je
 * nach Bedarf umgesetzt – die Gelenkpunkte selbst haben keine Geometrie, die
 * man einfärben könnte. Gleicher Aufbau wie in js/schulter-struktur.js.
 */
const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.028, 32, 24),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color('#D9B24C'),
    emissive: new THREE.Color('#8A6520'),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
  })
);
marker.visible = false;
marker.castShadow = false;
szene.add(marker);

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
let frageListe = [];         // Fälle des aktuellen Laufs, mit gemischten Teilfragen-Antworten
let position = 0;            // welcher Fall im Lauf gerade dran ist
let phase = 1;               // 1 = erster Durchlauf, ab 2 = Wiederholung
let laufFehler = [];         // in DIESEM Lauf falsch beantwortete Fälle (roh, unbebaut)
let stand = new Map();       // Teilfrage-Text -> { teilfrage, gewaehlt, richtig }
let jeFalsch = new Set();    // Teilfrage-Texte, die irgendwann falsch waren
let fallAuswahl = [];        // aktuelle Auswahl je Teilfrage im gezeigten Fall (Antwortstring oder null)
let beendet = false;         // nach „Beenden" oder vollständigem Abschluss
let laeuft = false;          // sperrt Doppel-Absenden während des Wechsels

/** Mischt eine Liste (Fisher-Yates). */
function mischen(liste) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Lädt die Fälle. Jede Teilfrage bringt ihre eigenen Ablenker mit. */
async function ladeFaelle() {
  const antwort = await fetch('daten/schulter_faelle.json');
  if (!antwort.ok) throw new Error('daten/schulter_faelle.json fehlt.');
  const alle = await antwort.json();
  if (!Array.isArray(alle) || !alle.length) {
    throw new Error('daten/schulter_faelle.json enthält keine Fälle.');
  }
  return alle;
}

/** Baut aus einem rohen Fall eine Frage: pro Teilfrage die Antworten gemischt. */
function baueFrage(fall) {
  return {
    fall,
    teilfragen: fall.teilfragen.map((teilfrage) => ({
      teilfrage,
      antworten: mischen([teilfrage.richtig, ...teilfrage.ablenker]),
    })),
  };
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
 * Setzt die Szene auf „neutral": nur der knöcherne Rahmen, zurückhaltend,
 * Marker aus. Genau so sieht die Bühne während der Fragen aus – ohne jeden
 * Hinweis.
 */
function zeigeNeutral() {
  for (const [, mesh] of katalog.meshes) {
    mesh.visible = mesh.userData.system === 'skelett';
    if (mesh.visible) mesh.material = zurueckhaltend;
  }
  marker.visible = false;
  schattenAuffrischen();
}

/**
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit die Schulter nicht
 * halb dahinter verschwindet, wird die freie Fläche dazwischen ausgemessen –
 * gleiche Rechnung wie in js/bone-prep.js.
 */
function freiesBildfeld(rand) {
  const hoehe = window.innerHeight;
  const luft = 16;
  const oben = document.getElementById('quiz-kopf').getBoundingClientRect().bottom + luft;
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
 * Rahmt die Schulterregion ein – bei jedem Fall derselbe Ausschnitt, damit
 * die Kamera nichts verrät. Bewusst von Hand gerechnet statt über
 * fliegeZu() – siehe js/schulter-verletzung.js für die Begründung
 * (Gelenkpunkt-Mesh trägt unsichtbare Bewegungsachsen als Kinder, die die
 * Hüllbox aufblähen würden).
 */
function rahmeSchulter() {
  const { versatzHoch } = freiesBildfeld(1);
  const abstand = SICHT_HOEHE / (2 * Math.tan((kamera.fov * Math.PI) / 360));

  const richtung = new THREE.Vector3(0.55, 0.22, 0.8).normalize();
  const bildOben = new THREE.Vector3(0, 1, 0)
    .addScaledVector(richtung, -richtung.y)
    .normalize();

  const ziel = SCHULTER_MITTE.clone().addScaledVector(bildOben, -versatzHoch * SICHT_HOEHE);
  steuerung.target.copy(ziel);
  kamera.position.copy(ziel).addScaledVector(richtung, abstand);
  steuerung.update();
}

function aktualisiereFortschritt() {
  const praefix = phase > 1 ? 'Wiederholung · ' : '';
  fortschrittText.textContent = `${praefix}Fall ${position + 1} von ${frageListe.length}`;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;
}

/** Aktiv nur, wenn jede Teilfrage eine Auswahl hat. */
function aktualisiereAbsendenKnopf() {
  absendenKnopf.disabled = fallAuswahl.some((a) => a === null);
}

/** Wählt eine Antwort innerhalb einer Teilfrage aus (radiobutton-artig). */
function waehleTeilAntwort(index, moeglichkeit, knopf) {
  if (laeuft) return;
  const gruppe = teilfragenFeld.querySelector(`.teilfrage-antworten[data-index="${index}"]`);
  for (const k of gruppe.querySelectorAll('.antwort-knopf')) k.classList.remove('ausgewaehlt');
  knopf.classList.add('ausgewaehlt');
  fallAuswahl[index] = moeglichkeit;
  aktualisiereAbsendenKnopf();
}

async function zeigeFrage() {
  if (beendet) return;
  const frage = frageListe[position];
  if (!frage) return naechsterLaufOderEnde();

  ergebnisFeld.hidden = true;
  frageBereich.hidden = false;

  situationText.textContent = frage.fall.situation;

  teilfragenFeld.innerHTML = '';
  frage.teilfragen.forEach((tf, index) => {
    const block = document.createElement('div');
    block.className = 'teilfrage';

    const frageEl = document.createElement('p');
    frageEl.className = 'teilfrage-frage';
    frageEl.textContent = tf.teilfrage.frage;
    block.appendChild(frageEl);

    const antwortenEl = document.createElement('div');
    antwortenEl.className = 'antworten teilfrage-antworten';
    antwortenEl.dataset.index = String(index);
    for (const moeglichkeit of tf.antworten) {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'antwort-knopf';
      knopf.textContent = moeglichkeit;
      knopf.addEventListener('click', () => waehleTeilAntwort(index, moeglichkeit, knopf));
      antwortenEl.appendChild(knopf);
    }
    block.appendChild(antwortenEl);

    teilfragenFeld.appendChild(block);
  });

  fallAuswahl = new Array(frage.teilfragen.length).fill(null);
  aktualisiereAbsendenKnopf();

  aktualisiereFortschritt();
  zeigeNeutral();
  rahmeSchulter();
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
 * Sendet den ganzen Fall ab – ohne pro Teilfrage zu verraten, ob sie stimmt.
 * Jede Antwort wird nur neutral markiert, dann geht es weiter. War
 * irgendeine Teilfrage falsch, kommt der ganze Fall in diesem Durchlauf noch
 * einmal dran (siehe naechsterLaufOderEnde()).
 */
async function sendeFall(frage) {
  if (laeuft) return;
  laeuft = true;

  let fallRichtig = true;

  frage.teilfragen.forEach((tf, index) => {
    const gewaehlt = fallAuswahl[index];
    const richtig = gewaehlt === tf.teilfrage.richtig;
    stand.set(tf.teilfrage.frage, { teilfrage: tf.teilfrage, gewaehlt, richtig });
    if (!richtig) {
      jeFalsch.add(tf.teilfrage.frage);
      fallRichtig = false;
    }

    const gruppe = teilfragenFeld.querySelector(`.teilfrage-antworten[data-index="${index}"]`);
    for (const k of gruppe.querySelectorAll('.antwort-knopf')) {
      k.disabled = true;
      k.classList.remove('ausgewaehlt');
      k.classList.add(k.textContent === gewaehlt ? 'gewaehlt' : 'blass');
    }
  });

  if (!fallRichtig) laufFehler.push(frage.fall);   // kommt in diesem Durchlauf noch einmal dran

  position += 1;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;

  await new Promise((r) => setTimeout(r, PAUSE_NACH_ANTWORT));
  await zeigeFrage();
}

absendenKnopf.addEventListener('click', () => {
  const frage = frageListe[position];
  if (frage) sendeFall(frage);
});

/**
 * Hebt eine Struktur im Modell hervor – erst in der Auswertung, nie vorher.
 * Verzweigt auf den Marker (AC-Gelenk, Glenohumeralgelenk) oder auf normale
 * Mesh-Einfärbung mit Bündel-Nachladen, wie in schulter-struktur.js bzw.
 * schulter-verletzung.js.
 */
async function hebeHervor(name, knopf) {
  const eintrag = STRUKTUR_KENNUNGEN[name];
  if (!eintrag) return;
  const kennungen = eintrag.ids;

  // Auswertung beiseite, schmale Leiste her – sonst verdeckt sie das Modell
  ergebnisFeld.hidden = true;
  ansichtLeiste.hidden = false;
  ansichtName.textContent = name;

  if (eintrag.marker) {
    // Gelenkpunkte liefern ihre Koordinate aus dem Verzeichnis, unabhängig
    // vom Bündel-Ladezustand – wie in js/schulter-struktur.js.
    const struktur = katalog.strukturen.get(kennungen[0]);
    zeigeNeutral();
    if (struktur?.mitte) {
      marker.position.set(...struktur.mitte);
      marker.visible = true;
      fliegeZu(marker, false, freiesBildfeld(4));
    }
    schattenAuffrischen();
    return;
  }

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
      `${eintraege.length} Teilfragen, ${aufAnhieb} davon auf Anhieb richtig`;
  }

  if (!eintraege.length) {
    listeFeld.innerHTML = '<p class="ergebnis-leer">Noch nichts beantwortet.</p>';
    return;
  }

  // Für jede beantwortete Teilfrage die richtige Struktur zum Nachsehen.
  listeFeld.innerHTML = '<h3>Im Modell nachsehen</h3><ul class="strukturliste"></ul>';
  const liste = listeFeld.querySelector('.strukturliste');

  for (const eintrag of eintraege) {
    const loesung = eintrag.teilfrage.richtig;
    const imModell = !!STRUKTUR_KENNUNGEN[loesung];

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
    } else if (jeFalsch.has(eintrag.teilfrage.frage)) {
      vermerk.textContent = 'saß noch nicht · ansehen';
      vermerk.classList.add('gepatzt');
    } else {
      vermerk.textContent = 'ansehen';
    }

    knopf.append(bezeichnung, vermerk);
    knopf.addEventListener('click', () => hebeHervor(loesung, knopf));
    zeile.appendChild(knopf);

    const frageHinweis = document.createElement('p');
    frageHinweis.className = 'struktur-hinweis';
    frageHinweis.textContent = eintrag.teilfrage.frage;
    zeile.appendChild(frageHinweis);

    liste.appendChild(zeile);
  }
}

document.getElementById('ansicht-zurueck').addEventListener('click', () => {
  ansichtLeiste.hidden = true;
  ergebnisFeld.hidden = false;
  zeigeNeutral();
  rahmeSchulter();
});

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  ansichtLeiste.hidden = true;
  startLauf(faelle);
  await zeigeFrage();
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
    status(`Schulter wird geladen … (${i + 1}/${GRUND_BUENDEL.length})`);
    await katalog.ladeBuendel(GRUND_BUENDEL[i]);
  }
  await katalog.ladeBuendel('eigene');   // Gelenkpunkte + Labrum, bleiben zunächst aus

  status(null);
  starteSchleife();
  startLauf(faelle);
  await zeigeFrage();

  console.log(`Schulter-Fall: ${faelle.length} Fälle, `
    + `${faelle.reduce((n, f) => n + f.teilfragen.length, 0)} Teilfragen gesamt.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.schulterFall = {
  katalog, szene, kamera, steuerung, marker,
  get faelle() { return faelle; },
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
