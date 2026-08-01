/* ==========================================================================
   knie-struktur.js – Pilotmodus „Struktur erkennen" (Knie)
   --------------------------------------------------------------------------
   Erstes von drei geplanten Knie-Modulen (danach Bewegung und
   Verletzungsmechanismus, in separaten Schritten). Technisch identisch zu
   js/schulter-struktur.js aufgebaut – siehe dort für die ausführlichere
   Erklärung des Ablaufs.

   Ablauf wie in js/bone-prep.js: eine Struktur leuchtet im Modell auf, ihr
   Name wird aus vier Antworten gewählt, kein Sofort-Feedback, falsch
   Beantwortetes kommt im selben Durchlauf automatisch noch einmal dran, bis
   alles sitzt. Ob eine Antwort stimmte, steht erst in der Auswertung.

   Neu gegenüber bone-prep.js: nach der Antwort erscheint eine kurze
   Funktionszeile zur Struktur – und die Hervorhebung **bleibt dabei stehen**.
   Text und Bild sollen zusammen ankommen, nicht der Text erst, nachdem das
   Bild schon weg ist. Deshalb geht es hier auch nicht von selbst weiter,
   sondern erst auf Klick („Weiter"): erst dann wird zurückgesetzt.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (knie-struktur.html).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const ANTWORTEN_PRO_FRAGE = 4;

/**
 * Der Fragenpool. Durchgehend die **linke** Seite, damit der Blick bei jeder
 * Frage von derselben Seite kommt – die Muskeln und die schematischen Bänder/
 * Menisken liegen ohnehin nur links vor.
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Dafür wird eine kleine
 * leuchtende Kugel an ihre „mitte"-Koordinate gesetzt, damit auch hier etwas
 * zu sehen ist (siehe hebeHervor()). Das betrifft hier nur das Kniegelenk
 * selbst – die Bänder/Menisken (System „baender") sind dagegen echte,
 * wenn auch schematische Pfad-Meshes und werden wie Knochen/Muskeln behandelt.
 */
const STRUKTUREN = [
  {
    name: 'Oberschenkelknochen',
    ids: ['FMA24475'],
    funktion: 'Längster und stärkster Knochen des Körpers, bildet mit Schienbein und Kniescheibe das Kniegelenk.',
  },
  {
    name: 'Schienbein',
    ids: ['FMA24478'],
    funktion: 'Trägt den Großteil des Körpergewichts im Unterschenkel und bildet mit dem Oberschenkelknochen das Hauptgelenk des Knies.',
  },
  {
    name: 'Wadenbein',
    ids: ['FMA24481'],
    funktion: 'Dünner Knochen neben dem Schienbein, kaum an der Gewichtsübertragung beteiligt, aber wichtig für die Stabilität des oberen Sprunggelenks.',
  },
  {
    name: 'Kniescheibe',
    ids: ['FMA24487'],
    funktion: 'Größtes Sesambein des Körpers, eingelagert in die Quadrizepssehne, verbessert die Hebelwirkung beim Strecken.',
  },
  {
    name: 'Kniegelenk',
    ids: ['PT-G-knie-links'],
    marker: true,
    funktion: 'Zusammengesetztes Gelenk aus Oberschenkel, Schienbein und Kniescheibe, überwiegend ein Scharniergelenk.',
  },
  {
    name: 'Quadrizeps',
    ids: ['FMA38929', 'FMA38935', 'FMA38931', 'FMA38933'],
    funktion: 'Vierköpfiger Muskel, einziger Streckmuskel des Knies.',
  },
  {
    name: 'Ischiocrurale Muskulatur',
    ids: ['FMA22449', 'FMA22359', 'FMA45889', 'FMA45892'],
    funktion: 'Hauptbeuger des Knies, zugleich Hüftstrecker – zweigelenkig.',
  },
  {
    name: 'Vorderes Kreuzband',
    ids: ['PT-B-vkb-links'],
    funktion: 'Verhindert das Nachvornrutschen des Schienbeins, häufigstes gerissenes Kniegelenkband bei Sportverletzungen.',
  },
  {
    name: 'Hinteres Kreuzband',
    ids: ['PT-B-hkb-links'],
    funktion: 'Verhindert das Nachhintenrutschen des Schienbeins, seltener verletzt als das vordere Kreuzband.',
  },
  {
    name: 'Innenband',
    ids: ['PT-B-innenband-links'],
    funktion: 'Stabilisiert das Knie gegen ein Wegknicken nach außen.',
  },
  {
    name: 'Außenband',
    ids: ['PT-B-aussenband-links'],
    funktion: 'Stabilisiert das Knie gegen ein Wegknicken nach innen.',
  },
  {
    name: 'Innenmeniskus',
    ids: ['PT-B-innenmeniskus-links'],
    funktion: 'Faserknorpelscheibe auf der Innenseite des Schienbeinkopfes, dämpft und verteilt die Belastung.',
  },
  {
    name: 'Außenmeniskus',
    ids: ['PT-B-aussenmeniskus-links'],
    funktion: 'Faserknorpelscheibe auf der Außenseite des Schienbeinkopfes, etwas beweglicher als der Innenmeniskus.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. „eigene" bringt die
// schematischen Bänder/Menisken UND den Kniegelenk-Koordinatenpunkt mit
// (System „baender" bzw. „gelenkpunkte" liegen beide in derselben Ebene).
const BENOETIGTE_BUENDEL = ['skelett_bein', 'muskeln_bein', 'eigene'];

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
 * Der Marker für den Kniegelenk-Koordinatenpunkt: eine kleine leuchtende
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
 * stehen, nicht nur kurz falsch positioniert.
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
 * Muskeln und Bänder/Menisken sind zwar geladen, bleiben aber unsichtbar –
 * die Muskeln legen sich sonst als milchige Schicht über alles und verdecken
 * die Hervorhebung, die Bänder/Menisken würden schon vor der Antwort verraten,
 * worum es in der Frage geht.
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
 * Muskeln, aber auch die schematischen Bänder/Menisken – für die Hervorhebung
 * macht das keinen Unterschied, sie sind genauso reale Meshes) oder – beim
 * reinen Koordinatenpunkt Kniegelenk – den Marker an seine Stelle setzen.
 * Bleibt so stehen, bis die nächste Frage kommt.
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
    // knochen als Orientierung mit im Bild sind.
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
    status(`Knie wird geladen … (${i + 1}/${BENOETIGTE_BUENDEL.length})`);
    await katalog.ladeBuendel(BENOETIGTE_BUENDEL[i]);
  }

  status(null);
  starteSchleife();
  await bisBuehneBereit();
  startLauf(STRUKTUREN);
  await zeigeFrage();

  console.log(`Knie-Struktur: ${STRUKTUREN.length} Strukturen im Pool.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.knieStruktur = {
  katalog, szene, kamera, steuerung, marker,
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
