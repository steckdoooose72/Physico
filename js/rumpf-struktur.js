/* ==========================================================================
   rumpf-struktur.js – Pilotmodus „Struktur erkennen" (Rumpf)
   --------------------------------------------------------------------------
   Neue Region Rumpf, bewusst breit angelegt: Wirbelsäule (BWS/LWS) und
   Becken zusammen, nicht aufgeteilt.

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Drei Antworten sind GENERISCHE GRUPPEN mit vielen Einzel-IDs (Brustwirbel,
   Lendenwirbel, Rippe – analog zur „Bandscheibe (HWS)" aus
   hals-struktur.js). Die IDs wurden aus daten/strukturen.json gefiltert
   (englischer Name enthält „thoracic vertebra" / „lumbar vertebra" / „rib")
   – das schließt bei den Wirbelgruppen jeweils automatisch auch die
   zugehörigen Bandscheiben-IDs mit ein, weil deren englischer Name densel-
   ben Teilstring trägt (z. B. „intervertebral disk of fifth thoracic
   vertebra" enthält „thoracic vertebra"). Die vierte Gruppe „Bandscheibe
   (BWS/LWS)" enthält dieselben Bandscheiben-IDs noch einmal als eigene
   Antwortmöglichkeit – bei Klick auf „Brustwirbel"/„Lendenwirbel" leuchten
   die zugehörigen Bandscheiben also mit auf, das ist hier bewusst
   hingenommen (Wirbelkörper und Bandscheibe liegen im Modell ohnehin
   direkt aneinander).

   `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
   punkt (0 Dreiecke) – betrifft hier Iliosakralgelenk, Hüftgelenk, Steißbein
   und Symphyse. Die beiden Längsbänder der Wirbelsäule (System „baender")
   sind dagegen echte, wenn auch schematische Pfad-Meshes und werden wie
   Knochen/Muskeln behandelt.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (rumpf-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool. Wirbelsäule, Becken und die schematischen Strukturen sind
 * unpaarige bzw. links dargestellte Strukturen (Hüftbein, Iliosakralgelenk,
 * Beckenbodenmuskeln, Bauchmuskeln nur links vor – wie in den anderen
 * Piloten üblich).
 */
const STRUKTUREN = [
  {
    id: 'rumpf-struktur-001',
    name: 'Brustwirbel',
    ids: [
      'FMA10014', 'FMA10037', 'FMA10059', 'FMA10081', 'FMA10458', 'FMA13495',
      'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503', 'FMA13504', 'FMA13505',
      'FMA13506', 'FMA13507', 'FMA13508', 'FMA13509', 'FMA9165', 'FMA9187',
      'FMA9209', 'FMA9248', 'FMA9922', 'FMA9945', 'FMA9968', 'FMA9991',
    ],
    funktion: '12 Wirbel, an denen die Rippen ansetzen; weniger beweglich als Hals- und Lendenwirbelsäule.',
  },
  {
    id: 'rumpf-struktur-002',
    name: 'Lendenwirbel',
    ids: [
      'FMA13072', 'FMA13073', 'FMA13074', 'FMA13075', 'FMA13076',
      'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037',
    ],
    funktion: '5 Wirbel, tragen den Großteil des Oberkörpergewichts; sehr beweglicher Abschnitt.',
  },
  {
    id: 'rumpf-struktur-003',
    name: 'Bandscheibe (BWS/LWS)',
    ids: [
      'FMA10458', 'FMA13495', 'FMA13500', 'FMA13501', 'FMA13502', 'FMA13503',
      'FMA13504', 'FMA13505', 'FMA13506', 'FMA13507', 'FMA13508', 'FMA13509',
      'FMA16033', 'FMA16034', 'FMA16035', 'FMA16036', 'FMA16037',
    ],
    funktion: 'Puffer zwischen den Wirbelkörpern; ca. 90% der Bandscheibenvorfälle betreffen die Lendenwirbelsäule.',
  },
  {
    id: 'rumpf-struktur-004',
    name: 'Rippe',
    ids: [
      'FMA7857', 'FMA7882', 'FMA7909', 'FMA7957', 'FMA7987', 'FMA8012',
      'FMA8039', 'FMA8066', 'FMA8093', 'FMA8148', 'FMA8175', 'FMA8202',
      'FMA8229', 'FMA8256', 'FMA8283', 'FMA8310', 'FMA8364', 'FMA8391',
      'FMA8445', 'FMA8472', 'FMA8531', 'FMA8532', 'FMA8533', 'FMA8534',
    ],
    funktion: '12 Rippenpaare, bilden mit Brustbein und Brustwirbelsäule den Brustkorb.',
  },
  {
    id: 'rumpf-struktur-005',
    name: 'Brustbein',
    ids: ['FMA7486', 'FMA7487', 'FMA7488'],
    funktion: 'Besteht aus drei Teilen, verbindet die Rippen über den Rippenknorpel vorn.',
  },
  {
    id: 'rumpf-struktur-006',
    name: 'Lig. longitudinale anterius',
    ids: ['PT-B-laengsband-vorne'],
    funktion: 'Verläuft über die Vorderseite der Wirbelkörper, verhindert übermäßige Streckung.',
  },
  {
    id: 'rumpf-struktur-007',
    name: 'Lig. longitudinale posterius',
    ids: ['PT-B-laengsband-hinten'],
    funktion: 'Verläuft über die Rückseite der Wirbelkörper; ein Bandscheibenvorfall drückt häufig gegen dieses Band bzw. dahinterliegende Nerven.',
  },
  {
    id: 'rumpf-struktur-008',
    name: 'Hüftbein',
    ids: ['FMA16587'],
    funktion: 'Verschmolzen aus Darmbein, Sitzbein und Schambein, bildet zusammen mit dem Kreuzbein den Beckenring.',
  },
  {
    id: 'rumpf-struktur-009',
    name: 'Kreuzbein',
    ids: ['FMA16202'],
    funktion: 'Verschmolzene untere Wirbel, verbindet die Wirbelsäule mit dem Becken.',
  },
  {
    id: 'rumpf-struktur-010',
    name: 'Iliosakralgelenk',
    ids: ['PT-G-isg-links'],
    marker: true,
    funktion: 'Verbindet Kreuzbein und Hüftbein, nur wenig beweglich, aber häufige Schmerzquelle.',
  },
  {
    id: 'rumpf-struktur-011',
    name: 'Hüftgelenk',
    ids: ['PT-G-huefte-links'],
    marker: true,
    funktion: 'Kugelgelenk zwischen Hüftbein und Oberschenkelknochen, trägt einen Großteil des Körpergewichts beim Stehen und Gehen.',
  },
  {
    id: 'rumpf-struktur-012',
    name: 'Steißbein',
    ids: ['PT-B-steissbein'],
    marker: true,
    funktion: 'Verschmolzene Restwirbel am unteren Ende der Wirbelsäule; Schmerzen dort (Coccygodynie) entstehen oft nach einem Sturz auf das Gesäß oder nach einer Geburt.',
  },
  {
    id: 'rumpf-struktur-013',
    name: 'Symphyse',
    ids: ['PT-B-symphyse'],
    marker: true,
    funktion: 'Knorpelige Verbindung zwischen den beiden Schambein-Ästen; Symphysenlockerung/-schmerzen sind ein häufiges Thema in der Schwangerschaft und im Sport.',
  },
  {
    id: 'rumpf-struktur-014',
    name: 'Beckenboden',
    ids: ['FMA45855', 'FMA45859', 'FMA46444'],
    funktion: 'Muskelgruppe, die den Beckenausgang verschließt und Organe trägt; arbeitet eng mit der tiefen Bauchmuskulatur zusammen.',
  },
  {
    id: 'rumpf-struktur-015',
    name: 'M. rectus abdominis',
    ids: ['FMA13378'],
    funktion: 'Gerader Bauchmuskel, Hauptbeuger des Rumpfes.',
  },
  {
    id: 'rumpf-struktur-016',
    name: 'Mm. obliqui abdominis',
    ids: ['FMA13337', 'FMA13893'],
    funktion: 'Ermöglichen Rumpfrotation und Lateralflexion, arbeiten dabei mit der Gegenseite zusammen.',
  },
  {
    id: 'rumpf-struktur-017',
    name: 'Diaphragma',
    ids: ['FMA13295'],
    funktion: 'Wichtigster Atemmuskel, obere Begrenzung der Rumpfmuskulatur.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. Die obersten
// Brustwirbel/-rippen liegen im Hals-Bündel, der Rest von Wirbelsäule,
// Rippen und Brustbein im Rumpf-Bündel. „eigene" bringt das Iliosakral-
// gelenk, das Hüftgelenk, Steißbein, Symphyse UND die beiden Längsbänder mit.
const BENOETIGTE_BUENDEL = ['skelett_hals', 'skelett_rumpf', 'muskeln_rumpf', 'muskeln_becken', 'eigene'];

await starteStrukturModul({
  regionId: 'rumpf',
  regionName: 'Rumpf',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
