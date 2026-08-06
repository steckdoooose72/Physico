/* ==========================================================================
   struktur-engine.js – gemeinsame Ablauflogik für alle "Struktur erkennen"-
   Module (schulter-struktur.js, kopf-struktur.js, hals-struktur.js,
   rumpf-struktur.js, arme-struktur.js, knie-struktur.js, beine-struktur.js)
   --------------------------------------------------------------------------
   Vorher hatte jede der 7 Regionen ihre eigene, fast wortgleiche Kopie
   dieses Ablaufs – nur der Fragenpool (STRUKTUREN) und die benötigten
   Bündel unterschieden sich wirklich. Diese Datei zieht die gemeinsame
   Logik einmal zusammen; jede Region ruft nur noch starteStrukturModul()
   mit ihrer eigenen Konfiguration auf (siehe die einzelnen <region>-
   struktur.js-Dateien – die bestehen jetzt nur noch aus Fragenpool +
   Bündelliste + diesem Aufruf).

   Ablauf wie in js/bone-prep.js: eine Struktur leuchtet im Modell auf, ihr
   Name wird aus vier Antworten gewählt, kein Sofort-Feedback, falsch
   Beantwortetes kommt im selben Durchlauf automatisch noch einmal dran, bis
   alles sitzt. Ob eine Antwort stimmte, steht erst in der Auswertung. Nach
   der Antwort erscheint eine kurze Funktionszeile zur Struktur – und die
   Hervorhebung **bleibt dabei stehen**, bis auf „Weiter" geklickt wird.

   `marker: true` an einem Pool-Item heißt: die Struktur ist im Verzeichnis
   nur ein Koordinatenpunkt (0 Dreiecke), es gibt also nichts einzufärben.
   Dafür wird eine kleine leuchtende Kugel an ihre „mitte"-Koordinate
   gesetzt (siehe hebeHervor()).

   Lernstand (Spaced Repetition, siehe lernstand.js): jede Region bringt
   über ihre Pool-Items eine stabile `id` mit. Bei jedem Start wird nur die
   laut Lernstand fällige Teilmenge abgefragt; ist gerade nichts fällig,
   zeigt die Runde als Fallback alle Items ("freies Wiederholen"), damit die
   Seite nie leer dasteht. Nach jeder Antwort wird der Lernstand sofort
   aktualisiert und gespeichert – auch bei Wiederholungen innerhalb
   desselben Laufs, damit ein Abbruch zwischendurch nichts verliert.

   `bisBuehneBereit()` ist bewusst für ALLE Regionen Teil dieser Engine,
   nicht nur eine Übernahme aus den 6 Nicht-Schulter-Dateien: sie schützt
   vor der in CLAUDE.md dokumentierten NaN-Kamera-Falle (erste Kamerafahrt
   vor abgeschlossenem Layout des Bühnen-Behälters). Schulter hatte diesen
   Schutz vorher schlicht noch nicht – kein neues Verhalten, sondern
   dieselbe Absicherung, die die anderen 6 Regionen schon hatten.
   ========================================================================== */

import * as THREE from 'three';

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { hervorhebungsMaterial } from './materialien.js?v=2';
import { ladeLernstand, speichereLernstand, aktualisiereItem, faelligeItems } from './lernstand.js?v=1';

const ANTWORTEN_PRO_FRAGE = 4;

/**
 * Startet ein komplettes "Struktur erkennen"-Modul für eine Region.
 *
 * @param {object} konfiguration
 * @param {string} konfiguration.regionId - kurzer Bezeichner, z. B. 'kopf'
 *   – wird für den Debug-Export `window.<regionId>Struktur` verwendet.
 * @param {string} konfiguration.regionName - Anzeigename für Statustexte
 *   und Konsolen-Log, z. B. 'Kopf'.
 * @param {string} [konfiguration.regionVerb='wird'] - Verbform für den
 *   Ladetext ("<Region> <Verb> geladen …") – bei pluralischen Regionsnamen
 *   (Arme, Beine) 'werden' statt 'wird'.
 * @param {string[]} konfiguration.benoetigteBuendel - Katalog-Bündel, die
 *   der Fragenpool braucht, in Ladereihenfolge.
 * @param {Array} konfiguration.strukturen - der Fragenpool (STRUKTUREN),
 *   jedes Item mit stabiler `id`, `name`, `ids` (Kennungen im Modell),
 *   `funktion` und optional `marker: true`.
 */
export async function starteStrukturModul(konfiguration) {
  const {
    regionId,
    regionName,
    regionVerb = 'wird',
    benoetigteBuendel,
    strukturen,
  } = konfiguration;

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

  // --- Bühne ------------------------------------------------------------------
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
   * Der Marker für Koordinatenpunkt-Items (`marker: true`): eine kleine
   * leuchtende Kugel in der Hervorhebungsfarbe. Wird einmal gebaut und je
   * Frage an die richtige Koordinate gesetzt – der Gelenkpunkt selbst hat
   * keine Geometrie, die man einfärben könnte.
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

  // --- Lernstand --------------------------------------------------------------
  // Wird einmal beim Start geladen und bei jeder Antwort aktualisiert/gespeichert
  // (siehe lernstand.js). `poolAktuell` sind die Strukturen dieser Runde – bei
  // fälligen Items nur die Teilmenge, sonst (Fallback) alle.
  let lernstand = ladeLernstand();
  let poolAktuell = strukturen;

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
    return mischen(strukturen.filter((s) => s.name !== richtig.name))
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
   * Muskeln und schematische Strukturen sind zwar geladen, bleiben aber
   * unsichtbar – sie legen sich sonst als milchige Schicht über alles und
   * verdecken die Hervorhebung bzw. verraten schon vor der Antwort, worum es
   * in der Frage geht.
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
   * Muskeln, aber auch schematische Strukturen – für die Hervorhebung macht
   * das keinen Unterschied, sie sind genauso reale Meshes) oder – bei den
   * reinen Koordinatenpunkten – den Marker an ihre Stelle setzen. Bleibt so
   * stehen, bis die nächste Frage kommt.
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

    // Lernstand sofort persistieren – auch bei Wiederholungen innerhalb
    // desselben Laufs, damit ein Abbruch zwischendurch nichts verliert.
    lernstand = aktualisiereItem(lernstand, frage.struktur.id, richtig);
    speichereLernstand(lernstand);

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
      const aufAnhieb = eintraege.length - jeFalsch.size;
      // „Alles gelernt." nur, wenn wirklich jede fällige Struktur schon beim
      // ersten Versuch saß – sonst ehrlich benennen, wie viele es am Ende waren.
      titelEl.textContent = aufAnhieb === eintraege.length
        ? 'Alles gelernt.'
        : `Runde beendet — ${aufAnhieb} von ${eintraege.length} richtig`;
      zahlEl.textContent =
        `${eintraege.length} Strukturen, ${aufAnhieb} davon auf Anhieb richtig`;
      listeFeld.innerHTML = '';
    }
  }

  /**
   * Ermittelt den Pool für einen neuen Durchlauf: nur die laut Lernstand
   * fälligen Strukturen. Ist gerade nichts fällig (z. B. direkt nach einer
   * gerade erst richtig beantworteten Runde), fällt sie auf ALLE Strukturen
   * zurück, damit die Seite nie leer dasteht – mit kurzem Hinweis dazu, damit
   * klar ist, dass das freies Wiederholen ist und keine „echte" Fälligkeit.
   */
  async function starteRunde() {
    const alleIds = strukturen.map((s) => s.id);
    const faelligeIds = new Set(faelligeItems(lernstand, alleIds));
    const faellig = strukturen.filter((s) => faelligeIds.has(s.id));

    if (faellig.length > 0) {
      poolAktuell = faellig;
    } else {
      poolAktuell = strukturen;
      status('Nichts fällig — freies Wiederholen');
      await new Promise((r) => setTimeout(r, 900));
      status(null);
    }

    startLauf(poolAktuell);
    await zeigeFrage();
  }

  document.getElementById('nochmal-knopf').addEventListener('click', async () => {
    await starteRunde();
  });

  beendenKnopf.addEventListener('click', () => {
    if (frageBereich.hidden) return;   // Runde läuft gerade nicht
    zeigeErgebnis(true);
  });

  // --- Start ------------------------------------------------------------------
  try {
    status('Verzeichnis wird geladen …');
    await katalog.starten();
    katalog.stufe = 'grob';

    for (let i = 0; i < benoetigteBuendel.length; i++) {
      status(`${regionName} ${regionVerb} geladen … (${i + 1}/${benoetigteBuendel.length})`);
      await katalog.ladeBuendel(benoetigteBuendel[i]);
    }

    status(null);
    starteSchleife();
    await bisBuehneBereit();
    await starteRunde();

    console.log(`${regionName}-Struktur: ${strukturen.length} Strukturen im Pool, `
      + `${poolAktuell.length} davon in dieser Runde fällig.`);
  } catch (fehler) {
    status(`<b>Der Pilot konnte nicht starten.</b><br><br>${fehler.message}`, true);
    console.error(fehler);
  }

  // Zum Nachsehen in der Browser-Konsole
  window[`${regionId}Struktur`] = {
    katalog, szene, kamera, steuerung, marker,
    get frageListe() { return frageListe; },
    get position() { return position; },
    get phase() { return phase; },
    get stand() { return stand; },
    get lernstand() { return lernstand; },
    get poolAktuell() { return poolAktuell; },
  };
}
