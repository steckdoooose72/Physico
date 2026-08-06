/* ==========================================================================
   hals-struktur.js – Pilotmodus „Struktur erkennen" (Hals)
   --------------------------------------------------------------------------
   Neue Region Hals (Halswirbelsäule).

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

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

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool. Die Muskeln liegen durchgehend links vor, Atlas, Axis,
 * das Kopfgelenk, die Dens-Stabilisierungsbänder und die Bandscheiben sind
 * dagegen unpaarige, mittige Strukturen ohne Seitenangabe.
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Dafür wird eine kleine
 * leuchtende Kugel an ihre „mitte"-Koordinate gesetzt (siehe struktur-
 * engine.js). Das betrifft hier nur das obere Kopfgelenk – die Dens-
 * Stabilisierungsbänder (System „baender") sind dagegen ein echtes, wenn
 * auch schematisches Pfad-Mesh und werden wie Knochen/Muskeln behandelt.
 */
const STRUKTUREN = [
  {
    id: 'hals-struktur-001',
    name: 'Atlas',
    ids: ['FMA12519'],
    funktion: 'Erster Halswirbel, hat keinen Wirbelkörper, trägt den Kopf und ermöglicht Nickbewegungen.',
  },
  {
    id: 'hals-struktur-002',
    name: 'Axis',
    ids: ['FMA12520'],
    funktion: 'Zweiter Halswirbel, trägt den Dens (Zahnfortsatz), um den sich der Atlas dreht – ermöglicht die Kopfdrehung.',
  },
  {
    id: 'hals-struktur-003',
    name: 'Oberes Kopfgelenk',
    ids: ['PT-G-kopfgelenk'],
    marker: true,
    funktion: 'Verbindet Hinterhauptbein und Atlas, ermöglicht das Nicken des Kopfes.',
  },
  {
    id: 'hals-struktur-004',
    name: 'Dens-Stabilisierungsbänder',
    ids: ['PT-B-dens-stabilisierung'],
    funktion: 'Halten den Zahnfortsatz des Axis in Position; werden vor Manipulationen der oberen Halswirbelsäule auf Stabilität geprüft.',
  },
  {
    id: 'hals-struktur-005',
    name: 'Bandscheibe (HWS)',
    ids: ['FMA25058', 'FMA13896', 'FMA13897', 'FMA13898', 'FMA13899', 'FMA13900'],
    funktion: 'Puffer zwischen den Halswirbeln, dämpft Stauchung und ermöglicht Beweglichkeit.',
  },
  {
    id: 'hals-struktur-006',
    name: 'M. sternocleidomastoideus',
    ids: ['FMA13409'],
    funktion: 'Dreht den Kopf zur GEGENSEITE, beidseitige Kontraktion beugt den Kopf nach vorn.',
  },
  {
    id: 'hals-struktur-007',
    name: 'Mm. scaleni',
    ids: ['FMA13393', 'FMA13391', 'FMA13389'],
    funktion: 'Seitliche Halsmuskeln, neigen den Hals zur Seite und unterstützen die Einatmung.',
  },
  {
    id: 'hals-struktur-008',
    name: 'M. trapezius',
    ids: ['FMA33587'],
    funktion: 'Absteigender Anteil zieht das Schulterblatt nach oben und unterstützt die Kopfrückneigung.',
  },
  {
    id: 'hals-struktur-009',
    name: 'M. levator scapulae',
    ids: ['FMA32541'],
    funktion: 'Verbindet Halswirbelsäule und Schulterblatt, hebt das Schulterblatt und unterstützt die seitliche Halsneigung.',
  },
  {
    id: 'hals-struktur-010',
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

await starteStrukturModul({
  regionId: 'hals',
  regionName: 'Hals',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
