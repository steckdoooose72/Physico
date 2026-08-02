/* ==========================================================================
   kopf-alltag.js – Pilotmodus „Alltagsbewegung" (Kopf)
   --------------------------------------------------------------------------
   Inhaltlich identisch zu js/kopf-bewegung.js (gleiche Muskeln, gleiche
   IDs, gleiche Funktionstexte) – der einzige Unterschied ist die Frage
   selbst: hier steht eine Alltagsbewegung in Alltagssprache da
   („Du gähnst weit.") statt des Fachbegriffs (Mundöffnung). Siehe
   js/kopf-bewegung.js für die ausführlichere Erklärung des Ablaufs.

   Der Umfang wird **vorab** gewählt, nicht pro Frage angezeigt:
     Einstieg    – die zwei eindeutigen Hauptbewegungen (Gähnen, Beißen)
     Vertiefung  – dazu zwei feinere Fragen zu Rückschub und einseitigem Kauen

   Ablauf wie in den anderen Piloten: alle Fragen des Umfangs in gemischter
   Reihenfolge, kein Sofort-Feedback, falsch Beantwortetes kommt im selben
   Durchlauf automatisch noch einmal, bis alles sitzt  →  Auswertung am Ende.

   Und wie in js/kopf-struktur.js: nach der Antwort bleibt der richtige
   Muskel im Modell hervorgehoben, während die Funktionszeile erscheint –
   Bild und Text zusammen. Zurückgesetzt wird erst mit „Weiter".

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (kopf-alltag.html).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const ANTWORTEN_PRO_FRAGE = 4;

/**
 * Der Fragenpool, durchgehend linke Seite (die Kaumuskeln liegen nur links
 * vor). `umfang` steuert nur, ob eine Frage bei „Einstieg" dabei ist –
 * dieses Feld wird bewusst **nirgends angezeigt**, die Trennung passiert
 * über die Wahl am Anfang.
 */
const BEWEGUNGEN = [
  {
    umfang: 'klar',
    bewegung: 'Du gähnst weit.',
    name: 'M. pterygoideus lateralis',
    ids: ['FMA49023', 'FMA49025'],
    funktion: 'Einziger reiner Kieferöffner, zieht zusätzlich den Discus articularis nach vorn.',
  },
  {
    umfang: 'klar',
    bewegung: 'Du beißt in einen Apfel.',
    name: 'M. masseter',
    ids: ['FMA49002', 'FMA49005'],
    funktion: 'Kieferschließer, einer der kräftigsten Muskeln des Körpers im Verhältnis zu seiner Größe.',
  },
  {
    umfang: 'fein',
    bewegung: 'Du schiebst den Unterkiefer beim Nachdenken leicht nach hinten.',
    name: 'M. temporalis',
    ids: ['FMA49008'],
    funktion: 'Kieferschließer, zieht den Unterkiefer zusätzlich nach hinten.',
  },
  {
    umfang: 'fein',
    bewegung: 'Du kaust einseitig auf einer Seite, der Unterkiefer bewegt sich dabei seitlich.',
    name: 'M. masseter / M. pterygoideus medialis',
    ids: ['FMA49002', 'FMA49005', 'FMA49013'],
    funktion: 'Bilden gemeinsam eine Muskelschlinge für die Seitwärtsbewegung des Unterkiefers.',
  },
];

// Für das Skelett als ruhiger Hintergrund – lädt schnell, steht schon hinter
// der Umfangswahl.
const KNOCHEN_BUENDEL = ['skelett_kopf'];
// Die Muskeln kommen erst nach der Wahl dazu (deutlich größer).
const MUSKEL_BUENDEL = ['muskeln_kopf'];

// --- Elemente -------------------------------------------------------------
const ladehinweis = document.getElementById('ladehinweis');
const startBereich = document.getElementById('start-bereich');
const frageBereich = document.getElementById('frage-bereich');
const bewegungsText = document.getElementById('bewegung-text');
const antwortenFeld = document.getElementById('antworten');
const funktionsFeld = document.getElementById('funktion');
const funktionsText = document.getElementById('funktion-text');
const weiterKnopf = document.getElementById('weiter-knopf');
const ergebnisFeld = document.getElementById('ergebnis');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittFuell = document.getElementById('fortschritt-fuell');
const beendenKnopf = document.getElementById('beenden-knopf');
const kopfUmfang = document.getElementById('kopf-umfang');

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
 * Wartet, bis die Bühne eine echte Größe hat (Behälter noch nicht layoutet =
 * clientWidth 0). Direkt nach dem Laden kann das kurz der Fall sein; würde
 * die allererste Kamerafahrt schon dann laufen, rechnet fliegeZu() mit
 * kamera.aspect = 0/0 = NaN – und weil jede spätere Fahrt von der vorherigen
 * (kaputten) Position aus weiterrechnet, bliebe die Kamera dauerhaft auf NaN
 * stehen, nicht nur kurz falsch positioniert. Gleiche Absicherung wie in
 * js/kopf-struktur.js.
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
let poolAktuell = [];        // die Bewegungen des gewählten Umfangs
let muskelnGeladen = false;  // Muskelbündel nur einmal holen
let frageListe = [];         // Fragen des aktuellen Laufs
let position = 0;            // welche Frage im Lauf gerade dran ist
let phase = 1;               // 1 = erster Durchlauf, ab 2 = Wiederholung
let laufFehler = [];         // in DIESEM Lauf falsch beantwortete Bewegungen
let stand = new Map();       // Name -> { eintrag, gewaehlt, richtig }
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

/** Ablenker: die anderen Muskeln des gewählten Umfangs, gemischt. */
function waehleAblenker(richtig) {
  return mischen(poolAktuell.filter((b) => b.name !== richtig.name))
    .slice(0, ANTWORTEN_PRO_FRAGE - 1);
}

/** Baut aus einer Bewegung eine Frage. */
function baueFrage(eintrag) {
  return { eintrag, antworten: mischen([eintrag, ...waehleAblenker(eintrag)]) };
}

/** Ein Lauf = die gegebenen Bewegungen einmal, neu gemischt. */
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
 * Setzt die Szene zurück: nur der knöcherne Rahmen, zurückhaltend. Die
 * Muskeln sind zwar geladen, bleiben aber unsichtbar – sie legen sich sonst
 * als milchige Schicht über alles und verdecken die Hervorhebung.
 */
function zeigeNeutral() {
  for (const [, mesh] of katalog.meshes) {
    mesh.visible = mesh.userData.system === 'skelett';
    if (mesh.visible) mesh.material = zurueckhaltend;
  }
  schattenAuffrischen();
}

/**
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit der Muskel nicht
 * halb dahinter verschwindet, wird die freie Fläche dazwischen ausgemessen –
 * gleiche Rechnung wie in den anderen Piloten.
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

/** Hebt den gesuchten Muskel hervor – bleibt stehen bis zur nächsten Frage. */
function hebeHervor(eintrag) {
  zeigeNeutral();
  for (const id of eintrag.ids) {
    const mesh = katalog.meshes.get(id);
    if (!mesh) continue;
    mesh.visible = true;
    mesh.material = gesuchtesMaterial;
  }
  rahmeMuskel(eintrag, true);
  schattenAuffrischen();
}

/**
 * Rückt den hervorgehobenen Muskel ins freie Feld über der Antwortfläche.
 * Zweimal je Frage nötig: beim Zeigen und noch einmal, wenn die
 * Funktionszeile die Fläche größer macht – sonst rutscht der Muskel
 * dahinter, und genau das Zusammenspiel von Bild und Text ginge verloren.
 */
function rahmeMuskel(eintrag, sofort) {
  const erstes = eintrag.ids.map((id) => katalog.meshes.get(id)).find(Boolean);
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

  startBereich.hidden = true;
  ergebnisFeld.hidden = true;
  frageBereich.hidden = false;
  funktionsFeld.hidden = true;      // Funktionszeile erst nach der Antwort
  weiterKnopf.hidden = true;

  bewegungsText.textContent = frage.eintrag.bewegung;

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
  hebeHervor(frage.eintrag);
  laeuft = false;
}

/**
 * Ein Lauf ist zu Ende. Gab es Fehler, geht es automatisch mit genau diesen
 * Bewegungen weiter – neu gemischt. Erst wenn ein Lauf fehlerfrei durchlief,
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
 * Rückmeldung erscheint die Funktionszeile zum gezeigten Muskel, während die
 * Hervorhebung im Modell **stehen bleibt**. Weiter geht es erst auf Klick.
 */
function nimmAntwort(frage, gewaehlt, knopf) {
  if (laeuft) return;
  laeuft = true;

  const richtig = gewaehlt.name === frage.eintrag.name;
  stand.set(frage.eintrag.name, { eintrag: frage.eintrag, gewaehlt: gewaehlt.name, richtig });
  if (!richtig) {
    jeFalsch.add(frage.eintrag.name);
    laufFehler.push(frage.eintrag);   // kommt in diesem Durchlauf noch einmal dran
  }

  for (const k of antwortenFeld.querySelectorAll('.antwort-knopf')) {
    k.disabled = true;
    k.classList.add(k === knopf ? 'gewaehlt' : 'blass');
  }

  // Die Hervorhebung wird hier bewusst NICHT angefasst – sie steht weiter,
  // solange die Funktionszeile zu lesen ist.
  funktionsText.textContent = frage.eintrag.funktion;
  funktionsFeld.hidden = false;
  weiterKnopf.hidden = false;
  weiterKnopf.focus();

  // Die Fläche ist durch die Funktionszeile gewachsen – Kamera nachführen,
  // damit der Muskel daneben sichtbar bleibt statt dahinter zu rutschen.
  rahmeMuskel(frage.eintrag, false);

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
          .map((e) => `<li><b>${e.eintrag.name}</b><span class="fehler-wahl">deine Antwort: ${e.gewaehlt}</span></li>`)
          .join('') +
        '</ul>'
      : '<p class="ergebnis-leer">Bisher alles richtig.</p>';
  } else {
    fortschrittText.textContent = 'fertig';
    titelEl.textContent = 'Alles gelernt.';
    const aufAnhieb = eintraege.length - jeFalsch.size;
    zahlEl.textContent =
      `${eintraege.length} Bewegungen, ${aufAnhieb} davon auf Anhieb richtig`;
    listeFeld.innerHTML = '';
  }
}

/**
 * Startet den gewählten Umfang: Muskeln nachladen (einmalig), dann losfragen.
 * „einstieg" nimmt nur die klaren Bewegungen, „vertiefung" alle.
 */
async function starteUmfang(umfang) {
  poolAktuell = umfang === 'einstieg'
    ? BEWEGUNGEN.filter((b) => b.umfang === 'klar')
    : BEWEGUNGEN;

  kopfUmfang.textContent =
    umfang === 'einstieg' ? 'Kopf · Einstieg' : 'Kopf · Vertiefung';

  if (!muskelnGeladen) {
    startBereich.hidden = true;
    for (let i = 0; i < MUSKEL_BUENDEL.length; i++) {
      status(`Muskeln werden geladen … (${i + 1}/${MUSKEL_BUENDEL.length})`);
      await katalog.ladeBuendel(MUSKEL_BUENDEL[i]);
    }
    muskelnGeladen = true;
    status(null);
  }

  await bisBuehneBereit();
  startLauf(poolAktuell);
  await zeigeFrage();
}

document.getElementById('einstieg-knopf')
  .addEventListener('click', () => starteUmfang('einstieg'));
document.getElementById('vertiefung-knopf')
  .addEventListener('click', () => starteUmfang('vertiefung'));

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  startLauf(poolAktuell);
  await zeigeFrage();
});

document.getElementById('umfang-knopf').addEventListener('click', () => {
  beendet = true;
  ergebnisFeld.hidden = true;
  frageBereich.hidden = true;
  startBereich.hidden = false;
  fortschrittText.textContent = '–';
  fortschrittFuell.style.width = '0';
  zeigeNeutral();
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

  // Erst das Skelett – so steht schon etwas hinter der Umfangswahl, und die
  // schweren Muskelbündel warten, bis wirklich gewählt wurde.
  for (let i = 0; i < KNOCHEN_BUENDEL.length; i++) {
    status(`Skelett wird geladen … (${i + 1}/${KNOCHEN_BUENDEL.length})`);
    await katalog.ladeBuendel(KNOCHEN_BUENDEL[i]);
  }

  status(null);
  starteSchleife();
  zeigeNeutral();
  startBereich.hidden = false;

  console.log(`Kopf-Alltag: ${BEWEGUNGEN.filter((b) => b.umfang === 'klar').length} klar, `
    + `${BEWEGUNGEN.length} gesamt.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.kopfAlltag = {
  katalog, szene, kamera, steuerung,
  get pool() { return poolAktuell; },
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
