/* ==========================================================================
   kopf-struktur.js – Pilotmodus „Struktur erkennen" (Kopf)
   --------------------------------------------------------------------------
   Neue Region Kopf, bewusst nur mit Fokus auf das Kiefergelenk – die
   übrigen Schädelknochen sind für die Physio-Ausbildung nicht relevant
   genug und deshalb hier nicht Teil des Pools.

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Anders als bei Schulter/Knie haben die vier Kaumuskeln UNTERSCHIEDLICHE
   Funktionen (nicht wie Rotatorenmanschette/Quadrizeps eine gemeinsame
   Gruppen-Funktion) – deshalb hier als vier EINZELNE Antworten im Pool,
   nicht zu einer Gruppe zusammengefasst.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (kopf-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool. Durchgehend die **linke** Seite, damit der Blick bei jeder
 * Frage von derselben Seite kommt – die Kaumuskeln und die schematische
 * Struktur liegen ohnehin nur links vor (der Unterkiefer selbst ist
 * unpaarig und braucht keine Seitenangabe).
 *
 * `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
 * punkt (0 Dreiecke), es gibt also nichts einzufärben. Dafür wird eine kleine
 * leuchtende Kugel an ihre „mitte"-Koordinate gesetzt (siehe struktur-
 * engine.js). Das betrifft hier nur das Kiefergelenk selbst – der Discus
 * articularis (System „baender") ist dagegen ein echtes, wenn auch
 * schematisches Pfad-Mesh und wird wie Knochen/Muskeln behandelt.
 */
const STRUKTUREN = [
  {
    id: 'kopf-struktur-001',
    name: 'Unterkiefer',
    ids: ['FMA52748'],
    funktion: 'Einziger beweglicher Schädelknochen, sein Gelenkkopf ist Teil des Kiefergelenks.',
  },
  {
    id: 'kopf-struktur-002',
    name: 'Kiefergelenk',
    ids: ['PT-G-kiefer-links'],
    marker: true,
    funktion: 'Verbindet Unterkiefer und Schläfenbein, gilt als komplexestes Gelenk des Körpers mit 6 Freiheitsgraden.',
  },
  {
    id: 'kopf-struktur-003',
    name: 'Discus articularis',
    ids: ['PT-B-discus-links'],
    funktion: 'Knorpelscheibe zwischen Unterkiefer und Schläfenbein, wirkt als Stoßdämpfer; ihre Verlagerung ist die häufigste Ursache für Kiefergelenkknacken.',
  },
  {
    id: 'kopf-struktur-004',
    name: 'M. masseter',
    ids: ['FMA49002', 'FMA49005'],
    funktion: 'Kieferschließer, einer der kräftigsten Muskeln des Körpers im Verhältnis zu seiner Größe.',
  },
  {
    id: 'kopf-struktur-005',
    name: 'M. temporalis',
    ids: ['FMA49008'],
    funktion: 'Kieferschließer, zieht den Unterkiefer zusätzlich nach hinten (Retrusion).',
  },
  {
    id: 'kopf-struktur-006',
    name: 'M. pterygoideus medialis',
    ids: ['FMA49013'],
    funktion: 'Kieferschließer, bildet zusammen mit dem M. masseter eine Muskelschlinge für Seitwärtsbewegungen des Unterkiefers.',
  },
  {
    id: 'kopf-struktur-007',
    name: 'M. pterygoideus lateralis',
    ids: ['FMA49023', 'FMA49025'],
    funktion: 'Einziger reiner Kieferöffner, zieht zusätzlich den Discus articularis nach vorn.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. „eigene" bringt den
// Discus articularis UND den Kiefergelenk-Koordinatenpunkt mit (System
// „baender" bzw. „gelenkpunkte" liegen beide in derselben Ebene).
const BENOETIGTE_BUENDEL = ['skelett_kopf', 'muskeln_kopf', 'eigene'];

await starteStrukturModul({
  regionId: 'kopf',
  regionName: 'Kopf',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
