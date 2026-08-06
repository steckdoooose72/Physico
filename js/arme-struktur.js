/* ==========================================================================
   arme-struktur.js – Pilotmodus „Struktur erkennen" (Arme)
   --------------------------------------------------------------------------
   Neue Region Arme, bewusst breit angelegt wie beim Rumpf: Ellenbogen,
   Unterarm und Handgelenk/Hand zusammen, nicht aufgeteilt.

   Der komplette Ablauf (Bühne, Bündel laden, Fragen/Ablenker, Marker-
   Mechanismus, Lernstand-Integration) steckt in js/struktur-engine.js – hier
   steht nur noch der Fragenpool dieser Region. Siehe dort für die
   ausführliche Erklärung.

   Der Humerus wurde bereits in der Schulter-Region eingeführt (FMA23130/
   FMA23131) und wird hier mit denselben IDs wiederverwendet – anatomisch
   gehört sein distales Ende auch zum Ellenbogen. „M. biceps brachii" ist
   dagegen neu: in js/schulter-struktur.js gibt es dafür keine Vorbelegung.

   `marker: true` heißt: die Struktur ist im Verzeichnis nur ein Koordinaten-
   punkt (0 Dreiecke) – betrifft hier nur das Ellenbogengelenk. Die sechs
   Ellenbogen-/Handgelenkbänder (System „baender": Innenband, Außenband,
   Ringband, beide Retinacula, Ligg. intercarpalia) sind dagegen echte, wenn
   auch schematische Pfad-Meshes und werden wie Knochen/Muskeln behandelt.

   Zwei Antworten sind GENERISCHE GRUPPEN mit mehreren Einzel-IDs
   („Handwurzelknochen (übrige)", „Handgelenk-Beuger"/„Handgelenk-Strecker",
   „Mm. pronatores") – analog zur „Bandscheibe (HWS)" aus hals-struktur.js.
   Das Kahnbein steht bewusst als EIGENE Antwort daneben (häufigster
   Handwurzelbruch, klinisch relevant genug für eine eigene Frage) und ist
   deshalb aus der Sammelgruppe „Handwurzelknochen (übrige)" ausgenommen.

   Pilot: absichtlich nicht in der Navigation verlinkt, eigene Seite
   (arme-struktur.html).
   ========================================================================== */

import { starteStrukturModul } from './struktur-engine.js?v=1';

/**
 * Der Fragenpool, durchgehend linke Seite (Muskeln, Bänder und Handwurzel-
 * knochen liegen nur links vor). Humerus/Radius/Ulna sind beidseitig
 * vorhanden, hier wird wie in den anderen Piloten üblich nur links gezeigt.
 */
const STRUKTUREN = [
  {
    id: 'arme-struktur-001',
    name: 'Humerus',
    ids: ['FMA23130', 'FMA23131'],
    funktion: 'Oberarmknochen, sein distales Ende ist Teil des Ellenbogengelenks.',
  },
  {
    id: 'arme-struktur-002',
    name: 'Radius',
    ids: ['FMA23465'],
    funktion: 'Speiche, lateraler Unterarmknochen, dreht sich bei Pronation/Supination um die Ulna.',
  },
  {
    id: 'arme-struktur-003',
    name: 'Ulna',
    ids: ['FMA23468'],
    funktion: 'Elle, medialer Unterarmknochen, mit dem Olecranon als tastbarer Knochenvorsprung.',
  },
  {
    id: 'arme-struktur-004',
    name: 'Ellenbogengelenk',
    ids: ['PT-G-ellenbogen-links'],
    marker: true,
    funktion: 'Zusammengesetzt aus drei Teilgelenken zwischen Humerus, Radius und Ulna; ermöglicht Beugung/Streckung sowie die Drehung des Unterarms.',
  },
  {
    id: 'arme-struktur-005',
    name: 'Innenband (Ellenbogen)',
    ids: ['PT-B-innenband-ellenbogen-links'],
    funktion: 'Sichert den Ellenbogen gegen Valgusstress, zieht vom medialen Humerusepikondylus zur Ulna.',
  },
  {
    id: 'arme-struktur-006',
    name: 'Außenband (Ellenbogen)',
    ids: ['PT-B-aussenband-ellenbogen-links'],
    funktion: 'Sichert den Ellenbogen gegen Varusstress, zieht vom lateralen Humerusepikondylus zum Radius.',
  },
  {
    id: 'arme-struktur-007',
    name: 'Ringband',
    ids: ['PT-B-ringband-links'],
    funktion: 'Umschließt das Speichenköpfchen und hält es am Ellenbogen in Position, ohne die Drehbewegung zu behindern.',
  },
  {
    id: 'arme-struktur-008',
    name: 'Retinaculum flexorum',
    ids: ['PT-B-retinaculum-flexorum-links'],
    funktion: 'Unter diesem Band verläuft der N. medianus durch den Karpaltunnel – bei Druck entsteht das Karpaltunnelsyndrom.',
  },
  {
    id: 'arme-struktur-009',
    name: 'Retinaculum extensorum',
    ids: ['PT-B-retinaculum-extensorum-links'],
    funktion: 'Straffes Band quer über den Handrücken, hält die Strecksehnen nah am Knochen.',
  },
  {
    id: 'arme-struktur-010',
    name: 'Ligg. intercarpalia',
    ids: ['PT-B-ligg-intercarpalia-links'],
    funktion: 'Kurze Bänder zwischen den körpernahen Handwurzelknochen, halten die Handwurzel als funktionelle Einheit zusammen.',
  },
  {
    id: 'arme-struktur-011',
    name: 'M. biceps brachii',
    ids: ['FMA37687', 'FMA37685'],
    funktion: 'Beugt den Ellenbogen, stärkster Supinator – aber nur bei gebeugtem Ellenbogen.',
  },
  {
    id: 'arme-struktur-012',
    name: 'M. triceps brachii',
    ids: ['FMA37700', 'FMA37696', 'FMA37698'],
    funktion: 'Hauptstrecker des Ellenbogens.',
  },
  {
    id: 'arme-struktur-013',
    name: 'M. brachialis',
    ids: ['FMA37669'],
    funktion: 'Reiner Ellenbogenbeuger, unabhängig von der Unterarmdrehung.',
  },
  {
    id: 'arme-struktur-014',
    name: 'M. brachioradialis',
    ids: ['FMA38487'],
    funktion: 'Ellenbogenbeuger, besonders wirksam in Mittelstellung zwischen Pronation/Supination.',
  },
  {
    id: 'arme-struktur-015',
    name: 'Mm. pronatores',
    ids: ['FMA38561', 'FMA38563', 'FMA38455'],
    funktion: 'Drehen den Unterarm in Pronation (Handfläche nach unten).',
  },
  {
    id: 'arme-struktur-016',
    name: 'M. supinator',
    ids: ['FMA38514'],
    funktion: 'Dreht den Unterarm in Supination, unabhängig von der Ellenbogenstellung – im Gegensatz zum Bizeps.',
  },
  {
    id: 'arme-struktur-017',
    name: 'Kahnbein',
    ids: ['FMA24436'],
    funktion: 'Häufigster gebrochener Handwurzelknochen, typisch bei Sturz auf die ausgestreckte Hand.',
  },
  {
    id: 'arme-struktur-018',
    name: 'Handwurzelknochen (übrige)',
    ids: ['FMA24438', 'FMA24440', 'FMA24442', 'FMA24444', 'FMA24445', 'FMA24447', 'FMA24449'],
    funktion: 'Mondbein, Dreiecksbein, Erbsenbein, großes und kleines Vieleckbein, Kopfbein und Hakenbein – ohne das Kahnbein.',
  },
  {
    id: 'arme-struktur-019',
    name: 'Handgelenk-Beuger',
    ids: ['FMA38461', 'FMA38618', 'FMA38620'],
    funktion: 'Beugen das Handgelenk zur Handinnenfläche hin.',
  },
  {
    id: 'arme-struktur-020',
    name: 'Handgelenk-Strecker',
    ids: ['FMA38496', 'FMA38499', 'BP44', 'BP46'],
    funktion: 'Strecken das Handgelenk zum Handrücken hin.',
  },
];

// Alles, was der Fragenpool braucht – einmal beim Start geladen, damit
// mitten in der Runde nichts nachgeladen werden muss. „eigene" bringt das
// Ellenbogengelenk UND die sechs Ellenbogen-/Handgelenkbänder mit.
const BENOETIGTE_BUENDEL = ['skelett_arm', 'muskeln_arm', 'eigene'];

await starteStrukturModul({
  regionId: 'arme',
  regionName: 'Arme',
  regionVerb: 'werden',
  benoetigteBuendel: BENOETIGTE_BUENDEL,
  strukturen: STRUKTUREN,
});
