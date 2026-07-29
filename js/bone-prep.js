/* ==========================================================================
   bone-prep.js – Übungsmodus „Erkennen" für Knochen
   --------------------------------------------------------------------------
   Ein Knochen wird gezeigt, aus vier Antworten wird der richtige Name gewählt.

   Kein fester Fragenzähler mehr: Ein Durchlauf fragt **alle** Knochen der
   gewählten Stufe ab, jedes Mal in neuer, zufälliger Reihenfolge. Wird der
   Durchlauf komplett zu Ende geklickt (nicht manuell mit „Beenden" abgebrochen),
   kommen alle dabei falsch beantworteten Knochen automatisch noch einmal dran –
   so oft, bis jeder einzelne richtig saß. Erst dann erscheint die Auswertung.
   Wird stattdessen manuell/vorzeitig beendet, zeigt die Auswertung nur die
   gerade noch offenen (falschen) Antworten – keine Trefferquote, denn die
   Runde ist ja nicht zu Ende gespielt.

   Bewusst ohne Rückmeldung während der Runde: ob eine Antwort stimmt, steht
   nie sofort da, sondern erst in der jeweiligen Auswertung.

   Darstellung: in allen drei Stufen leuchtet der gesuchte Knochen im ganzen
   Skelett auf, nie isoliert – die Lage im Körper ist Teil dessen, was man
   beim Erkennen lernt, nicht nur die Form allein.

   Die Zuordnung Knochen → Stufe steht in daten/knochen_stufen.json und wird
   von werkzeuge/knochen_stufen.py erzeugt.
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const ANTWORTEN_PRO_FRAGE = 4;
const PAUSE_NACH_ANTWORT = 400;   // kurz, da der Name schon beim ersten Klick gelesen wurde
const STUFEN_NAMEN = { 1: 'Basis', 2: 'Praxis', 3: 'Extra' };

// --- Elemente -------------------------------------------------------------
const ladehinweis = document.getElementById('ladehinweis');
const frageBereich = document.getElementById('frage-bereich');
const frageText = document.getElementById('frage-text');
const antwortenFeld = document.getElementById('antworten');
const ergebnisFeld = document.getElementById('ergebnis');
const fehlerKnopf = document.getElementById('fehler-knopf');
const fortschrittText = document.getElementById('fortschritt-text');
const fortschrittFuell = document.getElementById('fortschritt-fuell');
const beendenKnopf = document.getElementById('beenden-knopf');

// --- Einstellungen aus der Adresszeile ------------------------------------
const adresse = new URLSearchParams(location.search);
const stufe = [1, 2, 3].includes(Number(adresse.get('stufe'))) ? Number(adresse.get('stufe')) : 1;

document.getElementById('kopf-einstellungen').textContent =
  `${STUFEN_NAMEN[stufe]} · Erkennen`;

// --- Bühne ----------------------------------------------------------------
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({ behaelter: document.getElementById('buehne'), mitBoden: true });

const katalog = new Katalog(szene);
katalog.beiNeuZeichnen = schattenAuffrischen;

// Ein blasses Material für alles, was gerade nicht gesucht ist
const zurueckhaltend = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#cfc7b2'),
  roughness: 0.85,
  metalness: 0,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
});

// Einmal erzeugt und immer wiederverwendet – sonst sammeln sich pro Frage
// neue Materialien auf der Grafikkarte an.
const gesuchtesMaterial = hervorhebungsMaterial();

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
let knochenNachStufe = [];   // alle Knochen der gewählten Stufe
let frageListe = [];         // Fragen des aktuellen Durchlaufs (Laufs)
let position = 0;            // welche Frage im aktuellen Lauf gerade dran ist
let phase = 1;                // 1 = erster Durchlauf, ab 2 = Wiederholung der Fehler
let laufFehler = [];         // in DIESEM Lauf falsch beantwortete Knochen -> nächster Lauf
let stand = new Map();       // Name -> { loesung, gewaehlt, richtig }, letzter Stand je Knochen
let jeFalsch = new Set();    // Namen, die irgendwann in diesem Durchlauf falsch waren
let beendet = false;         // true nach Klick auf „Beenden" oder nach vollständigem Abschluss
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

/**
 * Baut aus der Stufendatei die Liste der möglichen Knochen.
 * Knochen mit gleichem Namen (links/rechts) gelten als eine Antwort – gefragt
 * wird nach dem Namen, nicht nach der Seite.
 */
async function ladeKnochen() {
  const antwort = await fetch('daten/knochen_stufen.json');
  if (!antwort.ok) throw new Error('daten/knochen_stufen.json fehlt.');
  const alle = await antwort.json();

  const nachName = new Map();
  for (const [id, wert] of Object.entries(alle)) {
    for (const einordnung of wert.einordnungen) {
      if (einordnung.stufe !== stufe) continue;
      if (!nachName.has(einordnung.name)) {
        nachName.set(einordnung.name, {
          name: einordnung.name,
          latein: einordnung.latein ?? '',   // fehlt bei Atlas/Axis – der Name ist dort schon lateinisch
          region: wert.region,
          ids: [],
        });
      }
      nachName.get(einordnung.name).ids.push(id);
    }
  }
  return [...nachName.values()];
}

/** „Oberschenkelknochen (Femur)" – der medizinische Name gehört mit dazu. */
function mitLatein(knochen) {
  return knochen.latein ? `${knochen.name} (${knochen.latein})` : knochen.name;
}

/** Sucht drei Ablenker – bevorzugt aus derselben Körperregion. */
function waehleAblenker(richtig) {
  const andere = knochenNachStufe.filter((k) => k.name !== richtig.name);
  const gleicheRegion = mischen(andere.filter((k) => k.region === richtig.region));
  const restliche = mischen(andere.filter((k) => k.region !== richtig.region));
  return [...gleicheRegion, ...restliche].slice(0, ANTWORTEN_PRO_FRAGE - 1);
}

/** Baut aus einem Knochen eine Frage: welche Struktur zeigen, welche Antworten. */
function baueFrage(knochen) {
  return {
    knochen,
    id: knochen.ids[Math.floor(Math.random() * knochen.ids.length)],   // zufällig links oder rechts
    antworten: mischen([knochen, ...waehleAblenker(knochen)]),
  };
}

/** Ein Lauf = die gegebenen Knochen einmal, in neu gemischter Reihenfolge. */
function baueLauf(knochenListe) {
  return mischen(knochenListe).map(baueFrage);
}

/**
 * Startet einen frischen Durchlauf mit den gegebenen Knochen – entweder alle
 * der Stufe (normaler Start/„Nochmal") oder nur die zuletzt offenen Fehler
 * („Fehler üben" nach vorzeitigem Beenden).
 */
function startLauf(knochenListe) {
  frageListe = baueLauf(knochenListe);
  position = 0;
  phase = 1;
  laufFehler = [];
  stand = new Map();
  jeFalsch = new Set();
  beendet = false;
}

/** Zeigt den Knochen der aktuellen Frage im ganzen Skelett, hervorgehoben. */
async function zeigeKnochen(frage) {
  const eintrag = katalog.strukturen.get(frage.id);
  if (!eintrag) throw new Error(`Struktur ${frage.id} steht nicht im Verzeichnis.`);

  for (const [id, mesh] of katalog.meshes) {
    mesh.visible = true;
    mesh.material = id === frage.id ? gesuchtesMaterial : zurueckhaltend;
  }

  const mesh = katalog.meshes.get(frage.id);
  if (mesh) fliegeZu(mesh, true, freiesBildfeld());   // ohne Animation einrahmen
  schattenAuffrischen();
}

/**
 * Kopfzeile und Antwortfläche liegen über der Bühne. Damit der Knochen nicht
 * halb dahinter verschwindet, wird die freie Fläche dazwischen ausgemessen:
 * wie hoch sie ist und wie weit ihre Mitte über der Bildmitte liegt.
 */
function freiesBildfeld() {
  const hoehe = window.innerHeight;
  const rand = 16;   // etwas Luft zu den Papierflächen
  const oben = document.getElementById('quiz-kopf').getBoundingClientRect().bottom + rand;
  const unten = (frageBereich.hidden ? hoehe : frageBereich.getBoundingClientRect().top) - rand;
  return {
    nutzHoehe: Math.min(1, Math.max(0.25, (unten - oben) / hoehe)),
    versatzHoch: Math.min(0.35, Math.max(0, 0.5 - (oben + unten) / 2 / hoehe)),
    // Bewusst mit etwas Abstand: die Nachbarknochen ringsum sind Teil der
    // Aufgabe, nicht nur die Form des gesuchten Knochens allein.
    rand: 2.2,
  };
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
  frageText.textContent = 'Welcher Knochen ist hervorgehoben?';

  antwortenFeld.innerHTML = '';
  for (const moeglichkeit of frage.antworten) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = 'antwort-knopf';

    if (moeglichkeit.latein) {
      // Zuerst nur der medizinische Name – die Herausforderung ist, ihn zu
      // kennen. Der umgangssprachliche Name ist verdeckt; ein Klick deckt ihn
      // auf, erst ein zweiter Klick wählt die Antwort (siehe klickAntwort()).
      // Bei Atlas/Axis steht er schon im Namen selbst, dort gibt es kein
      // latein-Feld und damit nichts zu verdecken – ein Klick wählt direkt.
      const oben = document.createElement('span');
      oben.className = 'antwort-primaer';
      oben.textContent = moeglichkeit.latein;
      const unten = document.createElement('span');
      unten.className = 'antwort-verdeckt';
      unten.textContent = moeglichkeit.name;
      knopf.append(oben, unten);
    } else {
      knopf.append(moeglichkeit.name);
    }
    knopf.addEventListener('click', () => klickAntwort(frage, moeglichkeit, knopf));
    antwortenFeld.appendChild(knopf);
  }

  aktualisiereFortschritt();
  await zeigeKnochen(frage);
  laeuft = false;
}

/**
 * Ein Lauf ist zu Ende. Gab es dabei Fehler, geht es automatisch mit genau
 * diesen Knochen in einen neuen, gemischten Lauf weiter – ohne Klick, ohne
 * dass verraten wird, dass es sich um eine Wiederholung der Fehler handelt
 * (das steht nur dezent im Fortschritt: „Wiederholung · …"). Erst wenn ein
 * Lauf ganz ohne Fehler durchlief, ist der Durchlauf wirklich fertig.
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
 * Erster Klick auf eine Antwort deckt nur ihren umgangssprachlichen Namen auf
 * (falls verdeckt) – erst der zweite Klick auf **dieselbe** Antwort wählt sie.
 * So kann man mehrere Antworten ansehen, bevor man sich festlegt. Antworten
 * ohne verdeckten Namen (Atlas/Axis) haben nichts aufzudecken und wählen sich
 * deshalb schon beim ersten Klick.
 */
function klickAntwort(frage, moeglichkeit, knopf) {
  if (laeuft) return;
  const verdeckt = knopf.querySelector('.antwort-verdeckt');
  if (verdeckt && !knopf.classList.contains('aufgedeckt')) {
    knopf.classList.add('aufgedeckt');
    verdeckt.style.filter = 'none';
    return;
  }
  nimmAntwort(frage, moeglichkeit, knopf);
}

/**
 * Nimmt eine Antwort entgegen – ohne zu verraten, ob sie stimmt.
 * Der gewählte Knopf wird nur kurz markiert, dann geht es weiter.
 */
async function nimmAntwort(frage, gewaehlt, knopf) {
  if (laeuft) return;
  laeuft = true;

  const richtig = gewaehlt.name === frage.knochen.name;
  stand.set(frage.knochen.name, {
    loesung: mitLatein(frage.knochen),
    gewaehlt: mitLatein(gewaehlt),
    richtig,
  });
  if (!richtig) {
    jeFalsch.add(frage.knochen.name);
    laufFehler.push(frage.knochen);   // kommt im nächsten Lauf noch einmal dran
  }

  for (const k of antwortenFeld.querySelectorAll('.antwort-knopf')) {
    k.disabled = true;
    if (k === knopf) {
      k.classList.add('gewaehlt', 'aufgedeckt');
      // Direkt setzen statt nur der CSS-Klasse zu vertrauen – das deckt den
      // umgangssprachlichen Namen zuverlässig auf, auch wenn die Klasse aus
      // irgendeinem Grund (z. B. Spezifitäts-Eigenheiten) nicht greift.
      const verdeckt = k.querySelector('.antwort-verdeckt');
      if (verdeckt) verdeckt.style.filter = 'none';
    } else {
      k.classList.add('blass');
    }
  }

  position += 1;
  fortschrittFuell.style.width = `${(position / frageListe.length) * 100}%`;

  await new Promise((r) => setTimeout(r, PAUSE_NACH_ANTWORT));
  await zeigeFrage();
}

function zeigeErgebnis(vorzeitig) {
  beendet = true;
  frageBereich.hidden = true;
  ergebnisFeld.hidden = false;
  fortschrittFuell.style.width = '100%';

  const titelEl = document.getElementById('ergebnis-titel');
  const zahlEl = document.getElementById('ergebnis-zahl');
  const fehlerFeld = document.getElementById('ergebnis-fehler');
  const eintraege = [...stand.entries()];             // [name, { loesung, gewaehlt, richtig }]
  const offen = eintraege.filter(([, e]) => !e.richtig);

  if (vorzeitig) {
    fortschrittText.textContent = 'beendet';
    titelEl.textContent = 'Vorzeitig beendet.';
    zahlEl.textContent = '';
    fehlerFeld.innerHTML = offen.length
      ? '<h3>Das saß noch nicht</h3><ul>' +
        offen
          .map(([, e]) => `<li><b>${e.loesung}</b><span class="fehler-wahl">deine Antwort: ${e.gewaehlt}</span></li>`)
          .join('') +
        '</ul>'
      : '<p class="ergebnis-leer">Bisher alles richtig.</p>';
  } else {
    fortschrittText.textContent = 'fertig';
    titelEl.textContent = 'Alles gelernt.';
    const gesamt = eintraege.length;
    const aufAnhieb = gesamt - jeFalsch.size;
    zahlEl.textContent = `${gesamt} Knochen, ${aufAnhieb} davon auf Anhieb richtig`;
    fehlerFeld.innerHTML = '';
  }

  // Merkt sich die noch offenen Fehler, damit sie einzeln geübt werden können
  fehlerKnopf.hidden = offen.length === 0;
  fehlerKnopf.dataset.namen = JSON.stringify(offen.map(([name]) => name));
}

fehlerKnopf.addEventListener('click', async () => {
  const namen = JSON.parse(fehlerKnopf.dataset.namen || '[]');
  const knochen = knochenNachStufe.filter((k) => namen.includes(k.name));
  if (!knochen.length) return;
  startLauf(knochen);
  await zeigeFrage();
});

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  startLauf(knochenNachStufe);
  await zeigeFrage();
});

beendenKnopf.addEventListener('click', () => {
  if (frageBereich.hidden) return;   // Runde läuft gerade nicht (Ladephase/Auswertung)
  zeigeErgebnis(true);
});

// --- Start ----------------------------------------------------------------
try {
  status('Verzeichnis wird geladen …');
  await katalog.starten();
  katalog.stufe = 'grob';   // ganzes Skelett auf einmal – Übersichtsauflösung reicht

  knochenNachStufe = await ladeKnochen();
  if (knochenNachStufe.length < ANTWORTEN_PRO_FRAGE) {
    throw new Error(`In der Stufe „${STUFEN_NAMEN[stufe]}" stehen zu wenige Knochen bereit.`);
  }

  const buendel = katalog.buendelFuer('skelett');
  for (let i = 0; i < buendel.length; i++) {
    status(`Skelett wird geladen … (${i + 1}/${buendel.length})`);
    await katalog.ladeBuendel(buendel[i]);
  }

  status(null);
  starteSchleife();
  startLauf(knochenNachStufe);
  await zeigeFrage();

  console.log(`Bone-Prep: Stufe ${stufe}, ${knochenNachStufe.length} mögliche Knochen.`);
} catch (fehler) {
  status(`<b>Die Übung konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.bonePrep = {
  katalog, szene, kamera, steuerung,
  get frageListe() { return frageListe; },
  get position() { return position; },
  get phase() { return phase; },
  get stand() { return stand; },
};
