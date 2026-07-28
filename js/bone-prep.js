/* ==========================================================================
   bone-prep.js – Übungsmodus „Erkennen" für Knochen
   --------------------------------------------------------------------------
   Ein Knochen wird gezeigt, aus vier Antworten wird der richtige Name gewählt.

   Ablauf einer Runde:
     10 Fragen ohne Rückmeldung  →  Auswertung am Ende
                                 →  von dort aus die Fehler noch einmal üben

   Bewusst so: während der Runde wird nicht verraten, ob eine Antwort stimmt.
   Erst die Auswertung zeigt die Trefferzahl und was daneben lag.

   Darstellung je Stufe:
     Basis  – der Knochen leuchtet im ganzen Skelett auf (die Lage hilft mit)
     Praxis – der Knochen schwebt allein im Bild, frei drehbar
     Extra  – wie Praxis

   Die Zuordnung Knochen → Stufe steht in daten/knochen_stufen.json und wird
   von werkzeuge/knochen_stufen.py erzeugt.
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';

const FRAGEN_PRO_RUNDE = 10;
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

// --- Einstellungen aus der Adresszeile ------------------------------------
const adresse = new URLSearchParams(location.search);
const stufe = [1, 2, 3].includes(Number(adresse.get('stufe'))) ? Number(adresse.get('stufe')) : 1;
const imSkelett = stufe === 1;      // Basis zeigt den Knochen im ganzen Skelett

document.getElementById('kopf-einstellungen').textContent =
  `${STUFEN_NAMEN[stufe]} · Erkennen`;

// --- Bühne ----------------------------------------------------------------
const { szene, kamera, steuerung, fliegeZu, schattenAuffrischen, starteSchleife } =
  erzeugeBuehne({ behaelter: document.getElementById('buehne'), mitBoden: imSkelett });

const katalog = new Katalog(szene);
katalog.beiNeuZeichnen = schattenAuffrischen;

// Ein blasses Material für alles, was gerade nicht gesucht ist (nur Basis-Stufe)
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
let fragen = [];             // die Fragen dieser Runde
let position = 0;            // welche Frage gerade dran ist
let protokoll = [];          // je Frage: { name, gewaehlt, richtig }
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

/**
 * Stellt eine Runde zusammen.
 * `nurDiese` beschränkt sie auf bestimmte Knochen – so werden nach der
 * Auswertung genau die Fehler noch einmal geübt.
 */
function baueRunde(nurDiese = null) {
  const auswahl = mischen(nurDiese ?? knochenNachStufe);
  const anzahl = nurDiese ? auswahl.length : Math.min(FRAGEN_PRO_RUNDE, auswahl.length);
  fragen = auswahl.slice(0, anzahl).map((knochen) => ({
    knochen,
    id: knochen.ids[Math.floor(Math.random() * knochen.ids.length)],   // zufällig links oder rechts
    antworten: mischen([knochen, ...waehleAblenker(knochen)]),
  }));
  position = 0;
  protokoll = [];
}

/** Zeigt den Knochen der aktuellen Frage in der Szene. */
async function zeigeKnochen(frage) {
  const eintrag = katalog.strukturen.get(frage.id);
  if (!eintrag) throw new Error(`Struktur ${frage.id} steht nicht im Verzeichnis.`);

  if (imSkelett) {
    // Basis: ganzes Skelett, gesuchter Knochen hervorgehoben
    for (const [id, mesh] of katalog.meshes) {
      mesh.visible = true;
      mesh.material = id === frage.id ? gesuchtesMaterial : zurueckhaltend;
    }
  } else {
    // Praxis/Extra: nur der gesuchte Knochen, alles andere weg
    await katalog.ladeBuendel(eintrag.buendel);
    for (const [id, mesh] of katalog.meshes) {
      mesh.visible = id === frage.id;
    }
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
    // In der Basis-Stufe bewusst weiter weg: die Nachbarknochen ringsum sind
    // Teil der Aufgabe. Sonst so eng wie möglich an den einzelnen Knochen heran.
    rand: imSkelett ? 2.2 : 1.12,
  };
}

function aktualisiereFortschritt() {
  fortschrittText.textContent = `Frage ${position + 1} von ${fragen.length}`;
  fortschrittFuell.style.width = `${(position / fragen.length) * 100}%`;
}

async function zeigeFrage() {
  const frage = fragen[position];
  if (!frage) return zeigeErgebnis();

  ergebnisFeld.hidden = true;
  frageBereich.hidden = false;
  frageText.textContent = imSkelett
    ? 'Welcher Knochen ist hervorgehoben?'
    : 'Welcher Knochen ist das?';

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

  protokoll.push({
    name: frage.knochen.name,
    loesung: mitLatein(frage.knochen),
    gewaehlt: mitLatein(gewaehlt),
    richtig: gewaehlt.name === frage.knochen.name,
  });

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
  fortschrittFuell.style.width = `${(position / fragen.length) * 100}%`;

  await new Promise((r) => setTimeout(r, PAUSE_NACH_ANTWORT));
  await zeigeFrage();
}

function zeigeErgebnis() {
  frageBereich.hidden = true;
  ergebnisFeld.hidden = false;
  fortschrittText.textContent = 'fertig';
  fortschrittFuell.style.width = '100%';

  const gesamt = protokoll.length;
  const treffer = protokoll.filter((e) => e.richtig).length;
  const quote = gesamt ? treffer / gesamt : 0;

  document.getElementById('ergebnis-titel').textContent =
    quote === 1 ? 'Alles richtig.' : quote >= 0.7 ? 'Gut gemacht.' : 'Weiter üben.';
  document.getElementById('ergebnis-zahl').textContent = `${treffer} von ${gesamt} richtig`;

  const fehler = protokoll.filter((e) => !e.richtig);
  const fehlerFeld = document.getElementById('ergebnis-fehler');
  if (fehler.length) {
    fehlerFeld.innerHTML =
      '<h3>Das saß noch nicht</h3><ul>' +
      fehler
        .map((e) => `<li><b>${e.loesung}</b><span class="fehler-wahl">deine Antwort: ${e.gewaehlt}</span></li>`)
        .join('') +
      '</ul>';
  } else {
    fehlerFeld.innerHTML = '';
  }

  // Merkt sich die Knochen der Fehler, damit sie einzeln geübt werden können
  fehlerKnopf.hidden = fehler.length === 0;
  fehlerKnopf.dataset.namen = JSON.stringify([...new Set(fehler.map((e) => e.name))]);
}

fehlerKnopf.addEventListener('click', async () => {
  const namen = JSON.parse(fehlerKnopf.dataset.namen || '[]');
  const knochen = knochenNachStufe.filter((k) => namen.includes(k.name));
  if (!knochen.length) return;
  baueRunde(knochen);
  await zeigeFrage();
});

document.getElementById('nochmal-knopf').addEventListener('click', async () => {
  baueRunde();
  await zeigeFrage();
});

// --- Start ----------------------------------------------------------------
try {
  status('Verzeichnis wird geladen …');
  await katalog.starten();
  katalog.stufe = imSkelett ? 'grob' : 'fein';

  knochenNachStufe = await ladeKnochen();
  if (knochenNachStufe.length < ANTWORTEN_PRO_FRAGE) {
    throw new Error(`In der Stufe „${STUFEN_NAMEN[stufe]}" stehen zu wenige Knochen bereit.`);
  }

  if (imSkelett) {
    // Für die Basis-Stufe wird das ganze Skelett gebraucht
    const buendel = katalog.buendelFuer('skelett');
    for (let i = 0; i < buendel.length; i++) {
      status(`Skelett wird geladen … (${i + 1}/${buendel.length})`);
      await katalog.ladeBuendel(buendel[i]);
    }
  }

  status(null);
  starteSchleife();
  baueRunde();
  await zeigeFrage();

  console.log(`Bone-Prep: Stufe ${stufe}, ${knochenNachStufe.length} mögliche Knochen.`);
} catch (fehler) {
  status(`<b>Die Übung konnte nicht starten.</b><br><br>${fehler.message}`, true);
  console.error(fehler);
}

// Zum Nachsehen in der Browser-Konsole
window.bonePrep = {
  katalog, szene, kamera, steuerung,
  get fragen() { return fragen; },
  get position() { return position; },
  get protokoll() { return protokoll; },
};
