/* ==========================================================================
   hals-struktur.js – Pilotmodus „Struktur erkennen" (Hals)
   --------------------------------------------------------------------------
   Neue Region Hals (Halswirbelsäule). Technisch identisch zu
   js/schulter-struktur.js/js/knie-struktur.js/js/kopf-struktur.js
   aufgebaut – siehe dort für die ausführlichere Erklärung des Ablaufs.

   Ablauf wie in js/bone-prep.js: eine Struktur leuchtet im Modell auf, ihr
   Name wird aus vier Antworten gewählt, kein Sofort-Feedback, falsch
   Beantwortetes kommt im selben Durchlauf automatisch noch einmal dran, bis
   alles sitzt. Ob eine Antwort stimmte, steht erst in der Auswertung.

   Neu gegenüber bone-prep.js: nach der Antwort erscheint eine kurze
   Funktionszeile zur Struktur – und die Hervorhebung **bleibt dabei stehen**.
   Text und Bild sollen zusammen ankommen, nicht der Text erst, nachdem das
   Bild schon weg ist. Deshalb geht es hier auch nicht von selbst weiter,
   sondern erst auf Klick („Weiter"): erst dann wird zurückgesetzt.

   Besonderheit gegenüber Schulter/Knie/Kopf: mehrere Strukturen sind
   UNPAARIG (Atlas, Axis, das obere Kopfgelenk, die Dens-
   Stabilisierungsbänder) – kein links/rechts, nur eine Instanz im
   Verzeichnis. Nur die Muskeln liegen wie gewohnt einseitig (links) vor.

   Die Bandscheiben der HWS werden als EINE generische Gruppen-Antwort
   geführt (alle sechs gemeinsam hervorgehoben) statt als sechs einzelne
   Fragen – analog zum bestehenden Wirbel/Rippen-Muster aus
   werkzeuge/knochen_stufen.py, das ebenfalls nicht nach einzelnem Wirbel
   fragt, sondern nach dem Typ.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (hals-struktur.html).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const ANTWORTEN_PRO_FRAGE = 4;

/**
 * Der Fragenpool. Die Muskeln liegen durchgehend links vor, Atlas, Axis,
 * das Kopfgelenk, die Dens-Stabilisierungsbänder und die Bandscheiben sind
 * dagegen unpaarige, mittige Strukturen ohne Seitenangabe.
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Dafür wird eine kleine
 * leuchtende Kugel an ihre „mitte"-Koordinate gesetzt, damit auch hier etwas
 * zu sehen ist (siehe hebeHervor()). Das betrifft hier nur das obere
 * Kopfgelenk – die Dens-Stabilisierungsbänder (System „baender") sind
 * dagegen ein echtes, wenn auch schematisches Pfad-Mesh und werden wie
 * Knochen/Muskeln behandelt.
 */
const STRUKTUREN = [
  {
    name: 'Atlas',
    ids: ['FMA12519'],
    funktion: 'Erster Halswirbel, hat keinen Wirbelkörper, trägt den Kopf und ermöglicht Nickbewegungen.',
  },
  {
    name: 'Axis',
    ids: ['FMA12520'],
    funktion: 'Zweiter Halswirbel, trägt den Dens (Zahnfortsatz), um den sich der Atlas dreht – ermöglicht die Kopfdrehung.',
  },
  {
    name: 'Oberes Kopfgelenk',
    ids: ['PT-G-kopfgelenk'],
    marker: true,
    funktion: 'Verbindet Hinterhauptbein und Atlas, ermöglicht das Nicken des Kopfes.',
  },
  {
    name: 'Dens-Stabilisierungsbänder',
    ids: ['PT-B-dens-stabilisierung'],
    funktion: 'Halten den Zahnfortsatz des Axis in Position; werden vor Manipulationen der oberen Halswirbelsäule auf Stabilität geprüft.',
  },
  {
    name: 'Bandscheibe (HWS)',
    ids: ['FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899', 'FMA13900'],
    funktion: 'Puffer zwischen den Halswirbeln, dämpft Stauchung und ermöglicht Beweglichkeit.',
  },
  {
    name: 'M. sternocleidomastoideus',
    ids: ['FMA13409'],
    funktion: 'Dreht den Kopf zur GEGENSEITE, beidseitige Kontraktion beugt den Kopf nach vorn.',
  },
  {
    name: 'Mm. scaleni',
    ids: ['FMA13393', 'FMA13391', 'FMA13389'],
    funktion: 'Seitliche Halsmuskeln, neigen den Hals zur Seite und unterstützen die Einatmung.',
  },
  {
    name: 'M. trapezius',
    ids: ['FMA33587'],
    funktion: 'Absteigender Anteil zieht das Schulterblatt nach oben und unterstützt die Kopfrückneigung.',
  },
  {
    name: 'M. levator scapulae',
    ids: ['FMA32541'],
    funktion: 'Verbindet Halswirbelsäule und Schulterblatt, hebt das Schulterblatt und unterstützt die seitliche Halsneigung.',
  },
  {
    name: 'Mm. splenius capitis/cervicis',
    ids: ['FMA22729', 'FMA22727'],
    funktion: 'Dorsale Halsmuskeln, strecken den Kopf und drehen ihn zur GLEICHEN Seite.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. Atlas/Axis und ein
// Teil der Bandscheiben liegen im Kopf-Bündel (skelett_kopf), der Rest der
// Bandscheiben und die Muskeln im Hals-Bündel. „eigene" bringt das obere
// Kopfgelenk UND die Dens-Stabilisierungsbänder mit.
const BENOETIGTE_BUENDEL = ['skelett_kopf', 'skelett_hals', 'muskeln_hals', 'eigene'];

// --- Elemente -------------------------------------------------------------
const ladehinweis = document.getElementById('ladehinweis');
const frageBereich = document.getElementById('frage-bereich');
const antwortenFeld = document.getElementById('antworten');
const funktionsFeld = document.getElementById('funktion');
const funktionsText = document.getElementById('funktion-text');
const weiterKnopf = document.getElementById('weiter-knopf');
const ergebnisFeld = document.getElementById('ergebnis');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittFuell = document.getElementById('fortschritt-fuell');
const beendenKnopf = document.getElementById('beenden-knopf');

// --- Bühne ----------------------------------------------------------------
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({ behaelter: document.getElementById('buehne'), mitBoden: false });

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
 * Der Marker für den Kopfgelenk-Koordinatenpunkt: eine kleine leuchtende
 * Kugel in der Hervorhebungsfarbe. Wird einmal gebaut und je Frage an die
 * richtige Koordinate gesetzt – der Gelenkpunkt selbst hat keine Geometrie,
 * die man einfärben könnte.
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

/**
 * Wartet, bis die Bühne eine echte Größe hat (Behälter noch nicht layoutet =
 * clientWidth 0). Direkt nach dem Laden kann das kurz der Fall sein; würde
 * die allererste Kamerafahrt schon dann laufen, rechnet fliegeZu() mit
 * kamera.aspect = 0/0 = NaN – und weil jede spätere Fahrt von der vorherigen
 * (kaputten) Position aus weiterrechnet, bliebe die Kamera dauerhaft auf NaN
 * stehen, nicht nur kurz falsch positioniert. Gleiche Absicherung wie in
 * den Knie- und Kopf-Piloten.
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
let frageListe = [];         // Fragen des aktuellen Laufs
let position = 0;            // welche Frage im Lauf gerade dran ist
let phase = 1;               // 1 = erster Durchlauf, ab 2 = Wiederholung
let laufFehler = [];         // in DIESEM Lauf falsch beantwortete Strukturen
let stand = new Map();       // Name -> { struktur, gewaehlt, richtig }
let jeFalsch = new Set();    // Namen, die irgendwann falsch waren
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

/** Ablenker: die anderen Strukturen des Pools, gemischt. */
function waehleAblenker(richtig) {
  return mischen(STRUKTUREN.filter((s) => s.name !== richtig.name))
    .slice(0, ANTWORTEN_PRO_FRAGE - 1);
}

/** Baut aus einer Struktur eine Frage. */
function baueFrage(struktur) {
  return {
    struktur,
    antworten: mischen([struktur, ...waehleAblenker(struktur)]),
  };
}

/** Ein Lauf = die gegebenen Strukturen einmal, neu gemischt. */
function baueLauf(liste) {
  return mischen(liste).map(baueFrage);
}

/** Startet einen frischen Durchlauf. */
function startLauf(liste) {
  frageListe = baueLauf(liste);
  position = 0;
  phase = 1;
  laufFehler = [];
  stand = new Map();
  jeFalsch = new Set();
  beendet = false;
}

/**
 * Setzt die Szene zurück: nur der knöcherne Rahmen, zurückhaltend, Marker aus.
 * Muskeln und die schematische Struktur sind zwar geladen, bleiben aber
 * unsichtbar – die Muskeln legen sich sonst als milchige Schicht über alles
 * und verdecken die Hervorhebung, die Dens-Stabilisierungsbänder würden schon
 * vor der Antwort verraten, worum es in der Frage geht.
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
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit die Struktur nicht
 * halb dahinter verschwindet, wird die freie Fläche dazwischen ausgemessen –
 * gleiche Rechnung wie in js/bone-prep.js.
 */
function freiesBildfeld(rand) {
  const hoehe = window.innerHeight;
  const luft = 16;
  const oben = document.getElementById('quiz-kopf').getBoundingClientRect().bottom + luft;
  const unten = (frageBereich.hidden ? hoehe : frageBereich.getBoundingClientRect().top) - luft;
  return {
    nutzHoehe: Math.min(1, Math.max(0.25, (unten - oben) / hoehe)),
    versatzHoch: Math.min(0.35, Math.max(0, 0.5 - (oben + unten) / 2 / hoehe)),
    rand,
  };
}

/**
 * Hebt die gesuchte Struktur hervor: entweder die Meshes einfärben (Knochen,
 * Muskeln, aber auch die schematische Struktur und die Bandscheiben-Gruppe –
 * für die Hervorhebung macht das keinen Unterschied, sie sind genauso reale
 * Meshes) oder – beim reinen Koordinatenpunkt oberes Kopfgelenk – den Marker
 * an seine Stelle setzen. Bleibt so stehen, bis die nächste Frage kommt.
 */
function hebeHervor(struktur) {
  zeigeNeutral();

  if (struktur.marker) {
    const eintrag = katalog.strukturen.get(struktur.ids[0]);
    if (eintrag?.mitte) {
      marker.position.set(...eintrag.mitte);
      marker.visible = true;
    }
  } else {
    for (const id of struktur.ids) {
      const mesh = katalog.meshes.get(id);
      if (!mesh) continue;
      mesh.visible = true;
      mesh.material = gesuchtesMaterial;
    }
  }

  rahmeStruktur(struktur, true);
  schattenAuffrischen();
}

/**
 * Rückt die hervorgehobene Struktur ins freie Feld über der Antwortfläche.
 * Wird zweimal je Frage gebraucht: beim Zeigen und noch einmal, wenn die
 * Funktionszeile die Fläche größer macht – sonst rutscht die Struktur
 * dahinter, und genau das Zusammenspiel von Bild und Text ginge verloren.
 */
function rahmeStruktur(struktur, sofort) {
  if (struktur.marker) {
    // Der Marker ist winzig – entsprechend weiter weg, damit die Nachbar-
    // strukturen als Orientierung mit im Bild sind.
    if (marker.visible) fliegeZu(marker, sofort, freiesBildfeld(4));
    return;
  }
  const erstes = struktur.ids.map((id) => katalog.meshes.get(id)).find(Boolean);
  if (erstes) fliegeZu(erstes, sofort, freiesBildfeld(2.4));
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

  ergebnisFeld.hidden = true;
  frageBereich.hidden = false;
  funktionsFeld.hidden = true;      // Funktionszeile erst nach der Antwort
  weiterKnopf.hidden = true;

  antwortenFeld.innerHTML = '';
  for (const moeglichkeit of frage.antworten) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'antwort-knopf';
    knopf.textContent = moeglichkeit.name;
    knopf.addEventListener('click', () => nimmAntwort(frage, moeglichkeit, knopf));
    antwortenFeld.appendChild(knopf);
  }

  aktualisiereFortschritt();
  hebeHervor(frage.struktur);
  laeuft = false;
}

/**
 * Ein Lauf ist zu Ende. Gab es Fehler, geht es automatisch mit genau diesen
 * Strukturen weiter – neu gemischt. Erst wenn ein Lauf fehlerfrei durchlief,
 * ist der Durchlauf fertig.
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
 * Nimmt eine Antwort entgegen – ohne zu verraten, ob sie stimmt. Statt einer
 * Rückmeldung erscheint die Funktionszeile zur gezeigten Struktur, während
 * die Hervorhebung im Modell **stehen bleibt**. Weiter geht es erst auf Klick.
 */
function nimmAntwort(frage, gewaehlt, knopf) {
  if (laeuft) return;
  laeuft = true;

  const richtig = gewaehlt.name === frage.struktur.name;
  stand.set(frage.struktur.name, { struktur: frage.struktur, gewaehlt: gewaehlt.name, richtig });
  if (!richtig) {
    jeFalsch.add(frage.struktur.name);
    laufFehler.push(frage.struktur);   // kommt in diesem Durchlauf noch einmal dran
  }

  for (const k of antwortenFeld.querySelectorAll('.antwort-knopf')) {
    k.disabled = true;
    k.classList.add(k === knopf ? 'gewaehlt' : 'blass');
  }

  // Die Hervorhebung wird hier bewusst NICHT angefasst – sie steht weiter,
  // solange die Funktionszeile zu lesen ist.
  funktionsText.textContent = frage.struktur.funktion;
  funktionsFeld.hidden = false;
  weiterKnopf.hidden = false;
  weiterKnopf.focus();

  // Die Fläche ist durch die Funktionszeile gewachsen – Kamera nachführen,
  // damit die Struktur daneben sichtbar bleibt statt dahinter zu rutschen.
  rahmeStruktur(frage.struktur, false);

  position += 1;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;
}

weiterKnopf.addEventListener('click', async () => {
  await zeigeFrage();   // setzt Hervorhebung und Funktionszeile zurück
});

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
  const offen = eintraege.filter((e) => !e.richtig);

  if (vorzeitig) {
    fortschrittText.textContent = 'beendet';
    titelEl.textContent = 'Vorzeitig beendet.';
    zahlEl.textContent = '';
    listeFeld.innerHTML = offen.length
      ? '<h3>Das saß noch nicht</h3><ul>' +
        offen
          .map((e) => `<li><b>${e.struktur.name}</b><span class="fehler-wahl">deine Antwort: ${e.gewaehlt}</span></li>`)
          .join('') +
        '</ul>'
      : '<p class="ergebnis-leer">Bisher alles richtig.</p>';
  } else {
    fortschrittText.textContent = 'fertig';
    titelEl.textContent = 'Alles gelernt.';
    const aufAnhieb = eintraege.length - jeFalsch.size;
    zahlEl.textContent =
      `${eintraege.length} Strukturen, ${aufAnhieb} davon auf Anhieb richtig`;
    listeFeld.innerHTML = '';
  }
}

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  startLauf(STRUKTUREN);
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

  for (let i = 0; i < BENOETIGTE_BUENDEL.length; i++) {
    status(`Hals wird geladen … (${i + 1}/${BENOETIGTE_BUENDEL.length})`);
    await katalog.ladeBuendel(BENOETIGTE_BUENDEL[i]);
  }

  status(null);
  starteSchleife();
  await bisBuehneBereit();
  startLauf(STRUKTUREN);
  await zeigeFrage();

  console.log(`Hals-Struktur: ${STRUKTUREN.length} Strukturen im Pool.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.halsStruktur = {
  katalog, szene, kamera, steuerung, marker,
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
