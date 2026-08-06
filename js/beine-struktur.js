/* ==========================================================================
   beine-struktur.js – Pilotmodus „Struktur erkennen" (Beine)
   --------------------------------------------------------------------------
   Region "Beine", bewusst breit angelegt wie beim Rumpf: Hüfte,
   Oberschenkel, Unterschenkel und Fuß zusammen, nicht aufgeteilt.

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Femur wurde bereits in der Knie-Region eingeführt (FMA24475), das
   Hüftgelenk bereits in js/rumpf-struktur.js (PT-G-huefte-links) – beide
   werden hier mit denselben IDs wiederverwendet, da sie anatomisch auch zu
   "Beine" gehören.

   `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
   punkt (0 Dreiecke) – betrifft hier die drei Gelenkpunkte Hüftgelenk,
   Oberes und Unteres Sprunggelenk. Die drei Fuß-/Sprunggelenkbänder
   (System „baender": Außenband (Sprunggelenk), Achillessehne,
   Plantarfaszie) sind dagegen echte, wenn auch schematische Pfad-Meshes
   und werden wie Knochen/Muskeln behandelt.

   Eine Antwort ist eine GENERISCHE GRUPPE mit mehreren Einzel-IDs
   („Fußwurzelknochen (übrige)") – analog zur „Bandscheibe (HWS)" aus
   hals-struktur.js.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (beine-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool, durchgehend linke Seite (Muskeln, Bänder und Sprunggelenke
 * liegen nur links vor). Femur/Tibia/Fibula/Talus/Calcaneus sind beidseitig
 * vorhanden, hier wird wie in den anderen Piloten üblich nur links gezeigt.
 */
const STRUKTUREN = [
  {
    id: 'beine-struktur-001',
    name: 'Femur',
    ids: ['FMA24475'],
    funktion: 'Längster und stärkster Knochen des Körpers, verbindet Hüfte und Knie.',
  },
  {
    id: 'beine-struktur-002',
    name: 'Tibia',
    ids: ['FMA24478'],
    funktion: 'Schienbein, trägt den Großteil des Körpergewichts im Unterschenkel.',
  },
  {
    id: 'beine-struktur-003',
    name: 'Fibula',
    ids: ['FMA24481'],
    funktion: 'Wadenbein, kaum an der Gewichtsübertragung beteiligt, wichtig für die Stabilität des oberen Sprunggelenks.',
  },
  {
    id: 'beine-struktur-004',
    name: 'Talus',
    ids: ['FMA24483'],
    funktion: 'Sprungbein, Teil sowohl des oberen als auch des unteren Sprunggelenks.',
  },
  {
    id: 'beine-struktur-005',
    name: 'Calcaneus',
    ids: ['FMA24498'],
    funktion: 'Fersenbein, größter Fußwurzelknochen, Ansatzpunkt der Achillessehne.',
  },
  {
    id: 'beine-struktur-006',
    name: 'Fußwurzelknochen (übrige)',
    ids: ['FMA24501', 'FMA24529', 'FMA24522', 'FMA24524', 'FMA24526'],
    funktion: 'Kahnbein, Würfelbein und die drei Keilbeine – ohne Sprung- und Fersenbein.',
  },
  {
    id: 'beine-struktur-007',
    name: 'Hüftgelenk',
    ids: ['PT-G-huefte-links'],
    marker: true,
    funktion: 'Kugelgelenk zwischen Hüftbein und Femur, trägt einen Großteil des Körpergewichts.',
  },
  {
    id: 'beine-struktur-008',
    name: 'Oberes Sprunggelenk',
    ids: ['PT-G-osg-links'],
    marker: true,
    funktion: 'Zwischen Unterschenkelknochen und Talus, ermöglicht Plantarflexion/Dorsalextension.',
  },
  {
    id: 'beine-struktur-009',
    name: 'Unteres Sprunggelenk',
    ids: ['PT-G-usg-links'],
    marker: true,
    funktion: 'Zwischen Talus und Calcaneus, ermöglicht Supination/Pronation.',
  },
  {
    id: 'beine-struktur-010',
    name: 'Außenband (Sprunggelenk)',
    ids: ['PT-B-aussenband-sprunggelenk-links'],
    funktion: 'Fasst die drei häufig gemeinsam verletzten Außenbänder zusammen; häufigste Sportverletzung überhaupt beim Umknicken nach außen.',
  },
  {
    id: 'beine-struktur-011',
    name: 'Achillessehne',
    ids: ['PT-B-achillessehne-links'],
    funktion: 'Verbindet die Wadenmuskulatur mit dem Fersenbein; reißt meist bei vorgeschädigter Sehne und explosiver Belastung.',
  },
  {
    id: 'beine-struktur-012',
    name: 'Plantarfaszie',
    ids: ['PT-B-plantarfaszie-links'],
    funktion: 'Stabilisiert das Fußlängsgewölbe; Reizung an ihrem Ansatz am Fersenbein ist eine der häufigsten Ursachen für Fersenschmerz.',
  },
  {
    id: 'beine-struktur-013',
    name: 'M. iliopsoas',
    ids: ['FMA22343', 'FMA22323'],
    funktion: 'Hauptbeuger der Hüfte.',
  },
  {
    id: 'beine-struktur-014',
    name: 'Mm. glutei',
    ids: ['FMA22329', 'FMA22331', 'FMA22333'],
    funktion: 'Strecken, spreizen und stabilisieren die Hüfte.',
  },
  {
    id: 'beine-struktur-015',
    name: 'Mm. adductores',
    ids: ['FMA22460', 'FMA22457', 'FMA22454', 'FMA43884', 'FMA22451'],
    funktion: 'Führen das Bein zur Körpermitte heran.',
  },
  {
    id: 'beine-struktur-016',
    name: 'M. triceps surae',
    ids: ['FMA45961', 'FMA45958', 'FMA22559'],
    funktion: 'Wadenmuskulatur, senkt die Fußspitze.',
  },
  {
    id: 'beine-struktur-017',
    name: 'M. tibialis anterior',
    ids: ['FMA22545'],
    funktion: 'Hebt die Fußspitze.',
  },
  {
    id: 'beine-struktur-018',
    name: 'M. tibialis posterior',
    ids: ['FMA65019'],
    funktion: 'Dreht die Fußsohle nach innen, unterstützt das Längsgewölbe.',
  },
  {
    id: 'beine-struktur-019',
    name: 'Mm. fibulares',
    ids: ['FMA22553', 'FMA22555'],
    funktion: 'Drehen die Fußsohle nach außen.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. Das Hüftbein als
// Hintergrund liegt im Rumpf-Bündel, Femur/Tibia/Fibula/Fußknochen im
// Bein-Bündel. „eigene" bringt die drei Gelenkpunkte UND die drei
// Sprunggelenk-/Fußbänder mit.
const BENOETIGTE_BUENDEL = ['skelett_rumpf', 'skelett_bein', 'muskeln_rumpf', 'muskeln_becken', 'muskeln_bein', 'eigene'];

await starteStrukturModul({
  regionId: 'beine',
  regionName: 'Beine',
  regionVerb: 'werden',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
