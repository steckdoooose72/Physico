/* ==========================================================================
   rumpf-verletzung.js – Pilotmodus „Verletzungsmechanismus" (Rumpf)
   --------------------------------------------------------------------------
   Drittes der Rumpf-Module (nach rumpf-struktur.js und rumpf-bewegung.js).
   Technisch identisch zu js/knie-verletzung.js aufgebaut – siehe dort für
   die ausführlichere Erklärung des Ablaufs.

   Statt „welche Struktur ist das" steht hier eine kurze klinische Situation
   („Eine ruckartige, ungünstige Bewegung …"), und die betroffene Struktur
   wird aus mehreren Antworten gewählt.

   Fachlicher Schwerpunkt: Hexenschuss (Fall 1) und Bandscheibenvorfall
   (Fall 3) werden oft verwechselt, sind aber grundlegend verschieden –
   Hexenschuss ist eine harmlose, meist selbstlimitierende Muskel-/
   Gelenkblockade (hier: M. multifidus), ein Bandscheibenvorfall dagegen
   eine echte strukturelle Schädigung. Beide Fälle sind bewusst so gebaut,
   dass genau diese Unterscheidung geübt wird.

   Ablauf wie in Bone-Prep (js/bone-prep.js), bewusst gleich:
     ein Durchlauf fragt alle Fälle ab, jedes Mal neu gemischt  →  falsch
     beantwortete kommen im selben Durchlauf automatisch noch einmal dran, bis
     alles sitzt  →  Auswertung erst am Ende. Während der Runde wird nie
     verraten, ob eine Antwort stimmt.

   Unterschied zur Struktur-/Bewegungsübung: die 3D-Szene darf die Lösung
   **nicht** vorwegnehmen. Sie zeigt während der Fragen nur neutral die
   Rumpfregion; erst in der Auswertung lässt sich jede Struktur der Runde
   einzeln im Modell nachsehen (Klick auf die Liste).

   Kein Marker-Sonderfall nötig: alle vier Antwortstrukturen (M. multifidus,
   Rippe, Bandscheibe (BWS/LWS), M. transversus abdominis) sind echte
   Meshes, keine reinen Koordinatenpunkte.

   Der Umfang wird **vorab** gewählt, nicht pro Frage angezeigt:
     Einstieg    – die zwei eindeutigen Fälle
     Vertiefung  – dazu zwei feinere Fälle

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (rumpf-verletzung.html), eigene Datendatei (daten/rumpf_verletzungen.json).
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const PAUSE_NACH_ANTWORT = 300;   // Millisekunden, damit der Klick sichtbar wird

// Der Rumpf ist die Pilotseite – die Kamera steht dadurch bei jeder Frage
// gleich. Koordinate grob zwischen dem 5. Brustwirbel (FMA9922) und dem
// Brustbeinkörper (FMA7487) aus daten/strukturen.json, als Mittelpunkt des
// Brustkorbs.
const RUMPF_MITTE = new THREE.Vector3(0, 1.27, 0.02);

// Wie viel Körper (in Metern) das Bild bei den Fragen zeigt – der Rumpf ist
// deutlich größer als Hals oder Kiefer, deshalb entsprechend groß gewählt,
// damit Brustkorb und obere Lendenwirbelsäule beide im Bild Platz haben.
const SICHT_HOEHE = 0.9;

/**
 * Welcher Antwortbegriff steckt hinter welchen Strukturen im Modell. Die
 * Kennungen sind identisch zu denen in js/rumpf-struktur.js übernommen,
 * nicht neu nachgeschlagen – insbesondere die langen Listen für „Rippe"
 * und „Bandscheibe (BWS/LWS)".
 */
const STRUKTUR_KENNUNGEN = {
  'M. multifidus': { ids: ['FMA22879'] },
  'Rippe': {
    ids: [
      'FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA7987', 'FMA8012',
      'FMA8039', 'FMA8066', 'FMA8093', 'FMA8148', 'FMA8175', 'FMA8202',
      'FMA8229', 'FMA8256', 'FMA8283', 'FMA8310', 'FMA8364', 'FMA8391',
      'FMA8445', 'FMA8472', 'FMA8531', 'FMA8532', 'FMA8533', 'FMA8534',
    ],
  },
  'Bandscheibe (BWS/LWS)': {
    ids: [
      'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503',
      'FMA13504', 'FMA13505', 'FMA13506', 'FMA13507', 'FMA13508', 'FMA13509',
      'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037',
    ],
  },
  'M. transversus abdominis': { ids: ['FMA22345'] },
};

// Knöcherner Rahmen um den Rumpf: reicht als ruhiger Hintergrund und lädt
// schnell. Die obersten Brustwirbel/-rippen liegen im Hals-Bündel, der Rest
// im Rumpf-Bündel. Die Muskeln kommen erst bei Bedarf dazu (siehe
// hebeHervor()).
const GRUND_BUENDEL = ['skelett_hals', 'skelett_rumpf'];

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
// Blick fest auf den Rumpf: bei jeder Frage derselbe Ausschnitt, damit die
// Kamera nicht verrät, worum es geht.
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({
    behaelter: document.getElementById('buehne'),
    kameraStart: new THREE.Vector3(0.5, 1.42, 0.65),
    blickZiel: RUMPF_MITTE.clone(),
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
 * die allererste Kamerafahrt schon dann laufen, rechnet fliegeZu()/die
 * feste Rahmung mit kamera.aspect = 0/0 = NaN – und weil jede spätere Fahrt
 * von der vorherigen (kaputten) Position aus weiterrechnet, bliebe die
 * Kamera dauerhaft auf NaN stehen. Gleiche Absicherung wie in den anderen
 * Regionen-Piloten.
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
  const antwort = await fetch('daten/rumpf_verletzungen.json');
  if (!antwort.ok) throw new Error('daten/rumpf_verletzungen.json fehlt.');
  const alle = await antwort.json();
  if (!Array.isArray(alle) || !alle.length) {
    throw new Error('daten/rumpf_verletzungen.json enthält keine Fälle.');
  }
  return alle;
}

/** Baut aus einem Fall eine Frage. Alle richtigen Strukturen stehen mit zur Wahl. */
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
 */
function zeigeNeutral() {
  for (const [, mesh] of katalog.meshes) {
    mesh.visible = mesh.userData.system === 'skelett';
    if (mesh.visible) mesh.material = zurueckhaltend;
  }
  schattenAuffrischen();
}

/**
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit der Rumpf nicht
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
 * Rahmt die Rumpfregion ein – bei jeder Frage derselbe Ausschnitt, damit
 * die Kamera nichts verrät.
 *
 * Bewusst von Hand gerechnet statt über fliegeZu() – siehe
 * js/hals-verletzung.js für die Begründung (Gelenkpunkt-Mesh trägt
 * unsichtbare Bewegungsachsen als Kinder, die die Hüllbox aufblähen
 * würden).
 */
function rahmeRumpf() {
  const { versatzHoch } = freiesBildfeld(1);
  const abstand = SICHT_HOEHE / (2 * Math.tan((kamera.fov * Math.PI) / 360));

  const richtung = new THREE.Vector3(0.55, 0.22, 0.8).normalize();
  // „Oben" im Bild: der Teil der Welt-Senkrechten quer zur Blickrichtung
  const bildOben = new THREE.Vector3(0, 1, 0)
    .addScaledVector(richtung, -richtung.y)
    .normalize();

  // Blickpunkt unter den Rumpf legen, damit er über der Antwortfläche liegt
  const ziel = RUMPF_MITTE.clone().addScaledVector(bildOben, -versatzHoch * SICHT_HOEHE);
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
  rahmeRumpf();
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
 * Bündel der gesuchten Strukturen bei Bedarf nachladen (Muskeln sind groß,
 * deshalb erst jetzt und nicht schon beim Start).
 */
async function hebeHervor(name, knopf) {
  const eintrag = STRUKTUR_KENNUNGEN[name];
  if (!eintrag) return;
  const kennungen = eintrag.ids;

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
  rahmeRumpf();
});

/**
 * Startet den gewählten Umfang. „einstieg" nimmt nur die eindeutigen Fälle
 * (schwierigkeit „klar" in daten/rumpf_verletzungen.json), „vertiefung" alle.
 */
async function starteUmfang(umfang) {
  poolAktuell = umfang === 'einstieg'
    ? faelle.filter((f) => f.schwierigkeit === 'klar')
    : faelle;

  kopfUmfang.textContent =
    umfang === 'einstieg' ? 'Rumpf · Einstieg' : 'Rumpf · Vertiefung';

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
  rahmeRumpf();
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
    status(`Rumpf wird geladen … (${i + 1}/${GRUND_BUENDEL.length})`);
    await katalog.ladeBuendel(GRUND_BUENDEL[i]);
  }

  status(null);
  starteSchleife();
  zeigeNeutral();
  await bisBuehneBereit();
  rahmeRumpf();
  startBereich.hidden = false;   // erst die Umfangswahl, dann die Fragen

  const klar = faelle.filter((f) => f.schwierigkeit === 'klar').length;
  console.log(`Rumpf-Verletzung: ${klar} klar, ${faelle.length} gesamt.`);
} catch (fehler) {
  status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.rumpfVerletzung = {
  katalog, szene, kamera, steuerung,
  get faelle() { return faelle; },
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
