/* ==========================================================================
   schulter-struktur.js – Pilotmodus „Struktur erkennen" (Schulter)
   --------------------------------------------------------------------------
   Die Grundlagenstufe vor dem Verletzungsmechanismus (schulter-verletzung.js):
   dort muss man die Strukturen der Schulter schon kennen, hier lernt man sie
   überhaupt erst kennen.

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (schulter-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool. Durchgehend die **linke** Seite, damit der Blick bei jeder
 * Frage von derselben Seite kommt – die Muskeln liegen ohnehin nur links vor.
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Für diese beiden wird
 * eine kleine leuchtende Kugel an ihre „mitte"-Koordinate gesetzt, damit auch
 * hier etwas zu sehen ist (siehe struktur-engine.js).
 */
const STRUKTUREN = [
  {
    id: 'schulter-struktur-001',
    name: 'Schlüsselbein',
    ids: ['FMA13323'],
    funktion: 'Verbindet Brustbein und Schulterblatt – die einzige Knochenverbindung zwischen Rumpf und Arm.',
  },
  {
    id: 'schulter-struktur-002',
    name: 'Schulterblatt',
    ids: ['FMA13396'],
    funktion: 'Bildet mit dem Oberarmkopf die Schulterpfanne und ist Ansatzpunkt vieler Schultermuskeln.',
  },
  {
    id: 'schulter-struktur-003',
    name: 'Oberarmknochen',
    ids: ['FMA23131'],
    funktion: 'Sein Kopf sitzt in der Schulterpfanne und ermöglicht die Bewegung des Arms.',
  },
  {
    id: 'schulter-struktur-004',
    name: 'AC-Gelenk',
    ids: ['PT-G-ac-links'],
    marker: true,
    funktion: 'Verbindet Schlüsselbein und Schulterdach, stabilisiert durch Bänder zwischen Schulterblatt und Schlüsselbein.',
  },
  {
    id: 'schulter-struktur-005',
    name: 'Schultergelenk',
    ids: ['PT-G-schulter-links'],
    marker: true,
    funktion: 'Das eigentliche Schulterhauptgelenk – Kugelgelenk zwischen Oberarmkopf und Schulterpfanne, das beweglichste Gelenk des Körpers.',
  },
  {
    id: 'schulter-struktur-006',
    name: 'Rotatorenmanschette',
    ids: ['FMA32545', 'FMA32548', 'FMA13415', 'FMA32554'],
    funktion: 'Vier Muskeln, die den Oberarmkopf in der Schulterpfanne halten und stabilisieren.',
  },
  {
    id: 'schulter-struktur-007',
    name: 'Deltamuskel',
    ids: ['FMA34681', 'FMA34683', 'FMA34685'],
    funktion: 'Hauptmuskel für das Abspreizen des Arms, mit vorderem, mittlerem und hinterem Anteil.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss.
const BENOETIGTE_BUENDEL = [
  'skelett_hals', 'skelett_rumpf', 'skelett_arm',
  'muskeln_hals', 'muskeln_rumpf', 'muskeln_arm',
];

await starteStrukturModul({
  regionId: 'schulter',
  regionName: 'Schulter',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
