/* ==========================================================================
   knie-struktur.js – Pilotmodus „Struktur erkennen" (Knie)
   --------------------------------------------------------------------------
   Erstes von drei geplanten Knie-Modulen (danach Bewegung und
   Verletzungsmechanismus, in separaten Schritten).

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (knie-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool. Durchgehend die **linke** Seite, damit der Blick bei jeder
 * Frage von derselben Seite kommt – die Muskeln und die schematischen Bänder/
 * Menisken liegen ohnehin nur links vor.
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Dafür wird eine kleine
 * leuchtende Kugel an ihre „mitte"-Koordinate gesetzt (siehe struktur-
 * engine.js). Das betrifft hier nur das Kniegelenk selbst – die Bänder/
 * Menisken (System „baender") sind dagegen echte, wenn auch schematische
 * Pfad-Meshes und werden wie Knochen/Muskeln behandelt.
 */
const STRUKTUREN = [
  {
    id: 'knie-struktur-001',
    name: 'Oberschenkelknochen',
    ids: ['FMA24475'],
    funktion: 'Längster und stärkster Knochen des Körpers, bildet mit Schienbein und Kniescheibe das Kniegelenk.',
  },
  {
    id: 'knie-struktur-002',
    name: 'Schienbein',
    ids: ['FMA24478'],
    funktion: 'Trägt den Großteil des Körpergewichts im Unterschenkel und bildet mit dem Oberschenkelknochen das Hauptgelenk des Knies.',
  },
  {
    id: 'knie-struktur-003',
    name: 'Wadenbein',
    ids: ['FMA24481'],
    funktion: 'Dünner Knochen neben dem Schienbein, kaum an der Gewichtsübertragung beteiligt, aber wichtig für die Stabilität des oberen Sprunggelenks.',
  },
  {
    id: 'knie-struktur-004',
    name: 'Kniescheibe',
    ids: ['FMA24487'],
    funktion: 'Größtes Sesambein des Körpers, eingelagert in die Quadrizepssehne, verbessert die Hebelwirkung beim Strecken.',
  },
  {
    id: 'knie-struktur-005',
    name: 'Kniegelenk',
    ids: ['PT-G-knie-links'],
    marker: true,
    funktion: 'Zusammengesetztes Gelenk aus Oberschenkel, Schienbein und Kniescheibe, überwiegend ein Scharniergelenk.',
  },
  {
    id: 'knie-struktur-006',
    name: 'Quadrizeps',
    ids: ['FMA38929', 'FMA38935', 'FMA38931', 'FMA38933'],
    funktion: 'Vierköpfiger Muskel, einziger Streckmuskel des Knies.',
  },
  {
    id: 'knie-struktur-007',
    name: 'Ischiocrurale Muskulatur',
    ids: ['FMA22449', 'FMA22359', 'FMA45889', 'FMA45892'],
    funktion: 'Hauptbeuger des Knies, zugleich Hüftstrecker – zweigelenkig.',
  },
  {
    id: 'knie-struktur-008',
    name: 'Vorderes Kreuzband',
    ids: ['PT-B-vkb-links'],
    funktion: 'Verhindert das Nachvornrutschen des Schienbeins, häufigstes gerissenes Kniegelenkband bei Sportverletzungen.',
  },
  {
    id: 'knie-struktur-009',
    name: 'Hinteres Kreuzband',
    ids: ['PT-B-hkb-links'],
    funktion: 'Verhindert das Nachhintenrutschen des Schienbeins, seltener verletzt als das vordere Kreuzband.',
  },
  {
    id: 'knie-struktur-010',
    name: 'Innenband',
    ids: ['PT-B-innenband-links'],
    funktion: 'Stabilisiert das Knie gegen ein Wegknicken nach außen.',
  },
  {
    id: 'knie-struktur-011',
    name: 'Außenband',
    ids: ['PT-B-aussenband-links'],
    funktion: 'Stabilisiert das Knie gegen ein Wegknicken nach innen.',
  },
  {
    id: 'knie-struktur-012',
    name: 'Innenmeniskus',
    ids: ['PT-B-innenmeniskus-links'],
    funktion: 'Faserknorpelscheibe auf der Innenseite des Schienbeinkopfes, dämpft und verteilt die Belastung.',
  },
  {
    id: 'knie-struktur-013',
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

await starteStrukturModul({
  regionId: 'knie',
  regionName: 'Knie',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
