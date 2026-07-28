/* ==========================================================================
   main.js – Startpunkt von Physico
   --------------------------------------------------------------------------
   Verbindet die Bausteine des Modell-Viewers:

     buehne.js      – Szene, Licht, Kamera, Steuerung (teilt er sich mit den Übungen)
     katalog.js     – lädt Verzeichnis und Modelldateien
     materialien.js – Aussehen der Gewebe
     ui.js          – Bedienleiste (Systeme, Regionen, Suche)
     auswahl.js     – Anklicken und Hervorheben
     panel.js       – Info-Panel rechts
   ========================================================================== */

import { erzeugeBuehne } from './buehne.js?v=6';
import { Katalog } from './katalog.js?v=3';
import { Bedienleiste } from './ui.js?v=3';
import { Auswahl } from './auswahl.js?v=2';
import { Panel } from './panel.js?v=2';

const buehne = document.getElementById('buehne');
const ladehinweis = document.getElementById('ladehinweis');

// Szene, Licht, Kamera, Steuerung und Bildschleife kommen aus buehne.js –
// dieselbe Bühne benutzen auch die Übungsseiten.
const {
  szene, kamera, renderer, steuerung,
  fliegeZu, ansichtZuruecksetzen, schattenAuffrischen, starteSchleife,
} = erzeugeBuehne({ behaelter: buehne });

/**
 * Merkt sich die zuletzt angesehene Struktur im Browser-Speicher.
 * Die Startseite bietet sie dann als "weitermachen" an.
 */
function merkeAuswahl(id) {
  if (!id) return;
  try {
    localStorage.setItem('physico:zuletzt', JSON.stringify({
      id,
      name: katalog.anzeige(id),
      zeit: Date.now(),
    }));
  } catch {
    // Wenn der Browser nichts speichern darf, ist das kein Beinbruch.
  }
}

// --- Statusanzeige --------------------------------------------------------
function status(text) {
  if (!text) {
    ladehinweis.classList.add('weg');
    return;
  }
  ladehinweis.classList.remove('weg', 'fehler');
  ladehinweis.textContent = text;
}

// --- Aufbau ---------------------------------------------------------------
// Achtung: außerhalb des try-Blocks deklariert, damit window.physico unten
// wirklich diese Objekte bekommt. (Ein <aside id="bedienleiste"> legt sonst
// eine gleichnamige globale Variable an – eine hübsche Falle.)
let bedienleiste = null;
let auswahl = null;

const katalog = new Katalog(szene);
katalog.beiNeuZeichnen = schattenAuffrischen;
const panel = new Panel({
  inhalt: document.getElementById('info-inhalt'),
  panel: document.getElementById('info-panel'),
  schwebeName: document.getElementById('schwebe-name'),
  katalog,
});

try {
  status('Verzeichnis wird geladen …');
  const verzeichnis = await katalog.starten();

  auswahl = new Auswahl({
    kamera,
    renderer,
    katalog,
    beiAuswahl: (id) => {
      panel.zeige(id);
      merkeAuswahl(id);
    },
    beiSchweben: (id, x, y) => panel.schwebe(id, x, y),
  });

  bedienleiste = new Bedienleiste({
    katalog,
    beiAuswahl: (mesh) => auswahl.waehle(mesh),
    beiFokus: (mesh) => fliegeZu(mesh),
    beiStatus: status,
    beiNeuZeichnen: schattenAuffrischen,
  });
  bedienleiste.aufbauen();

  status('Modell wird geladen …');
  await bedienleiste.ausAdresse();     // Vorgaben aus der Adresszeile (kommen von der Startseite)
  status(null);

  document.getElementById('strukturzahl').textContent =
    `${verzeichnis.strukturen.length} Strukturen im Verzeichnis`;

  console.log(`Physico: ${verzeichnis.strukturen.length} Strukturen, Detailstufe "${verzeichnis.stufe}".`);
} catch (fehler) {
  ladehinweis.classList.remove('weg');
  ladehinweis.classList.add('fehler');
  ladehinweis.innerHTML = `<b>Das Modell konnte nicht geladen werden.</b><br><br>${fehler.message}`;
  console.error(fehler);
}

// --- Tastatur -------------------------------------------------------------
// (Die Größenanpassung des Fensters übernimmt buehne.js.)
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'r' || e.key === 'R') ansichtZuruecksetzen();
});

// --- Zum Nachschauen in der Browser-Konsole -------------------------------
// Tippe dort z. B. "physico.renderer.info.render.triangles" für die Anzahl
// gezeichneter Dreiecke oder "physico.katalog.meshes.size" für die geladenen
// Strukturen. Nur zum Nachsehen gedacht, das Programm braucht es nicht.
window.physico = { renderer, szene, kamera, steuerung, katalog,
  get bedienleiste() { return bedienleiste; }, get auswahl() { return auswahl; } };

// --- Bild für Bild zeichnen ----------------------------------------------
starteSchleife();
