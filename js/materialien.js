/* ==========================================================================
   materialien.js – wie die einzelnen Gewebe aussehen
   --------------------------------------------------------------------------
   Für ein realistisches Bild bekommt jedes System sein eigenes Material:
   Knochen matt und elfenbeinfarben, Muskeln dunkelrot mit leichtem feuchten
   Glanz, Nerven blassgelb, Arterien rot, Venen blau.

   "roughness" = wie rau die Oberfläche ist (0 = Spiegel, 1 = komplett matt)
   "clearcoat" = dünne Glanzschicht darüber – das lässt Gewebe feucht wirken.
   ========================================================================== */

import * as THREE from 'three';

export const GEWEBE = {
  skelett:    { farbe: '#e8dcc4', rauheit: 0.62, glanzschicht: 0.0, name: 'Skelett' },
  muskeln:    { farbe: '#9d2f2b', rauheit: 0.48, glanzschicht: 0.35, name: 'Muskulatur' },
  gelenke:    { farbe: '#dfe6ec', rauheit: 0.35, glanzschicht: 0.55, name: 'Gelenke und Bänder' },
  nerven:     { farbe: '#e8dca0', rauheit: 0.55, glanzschicht: 0.25, name: 'Nervensystem' },
  gefaesse:   { farbe: '#a83232', rauheit: 0.42, glanzschicht: 0.40, name: 'Herz und Gefäße' },
  atmung:     { farbe: '#c98a92', rauheit: 0.60, glanzschicht: 0.20, name: 'Atemwege' },
  verdauung:  { farbe: '#c08a5e', rauheit: 0.55, glanzschicht: 0.30, name: 'Verdauung' },
  harn:       { farbe: '#b0885c', rauheit: 0.55, glanzschicht: 0.30, name: 'Harnorgane' },
  geschlecht: { farbe: '#b98070', rauheit: 0.55, glanzschicht: 0.30, name: 'Geschlechtsorgane' },
  hormone:    { farbe: '#c9a05c', rauheit: 0.50, glanzschicht: 0.30, name: 'Hormondrüsen' },
  lymphe:     { farbe: '#9fc4a8', rauheit: 0.55, glanzschicht: 0.25, name: 'Lymphsystem' },
  sinne:      { farbe: '#d8d2c8', rauheit: 0.30, glanzschicht: 0.60, name: 'Sinnesorgane' },
  haut:       { farbe: '#d9a982', rauheit: 0.72, glanzschicht: 0.15, name: 'Haut' },
  // Unsere eigenen Ebenen – nicht Teil von BodyParts3D, selbst an den Knochen ausgerichtet
  nervenbahnen: { farbe: '#f2e08a', rauheit: 0.45, glanzschicht: 0.35, name: 'Periphere Nerven' },
  gelenkpunkte: { farbe: '#f2c14e', rauheit: 0.30, glanzschicht: 0.60, name: 'Gelenke (klinisch)' },
  sonstiges:  { farbe: '#b8b0a4', rauheit: 0.60, glanzschicht: 0.15, name: 'Sonstiges' },
};

/** Arterien rot, Venen blau – wird am Namen erkannt. */
function gefaessFarbe(name) {
  const n = name.toLowerCase();
  if (n.includes('vein') || n.includes('venous') || n.includes('sinus')) return '#3a5a9c';
  if (n.includes('artery') || n.includes('aorta') || n.includes('arterial')) return '#a02a2a';
  return null;
}

const zwischenspeicher = new Map();

/**
 * Liefert das Material für eine Struktur. Gleiche Gewebe teilen sich ein
 * Material – das spart Rechenleistung.
 */
export function materialFuer(system, name = '') {
  const gewebe = GEWEBE[system] ?? GEWEBE.sonstiges;
  const farbe = (system === 'gefaesse' && gefaessFarbe(name)) || gewebe.farbe;
  const schluessel = `${system}|${farbe}`;

  if (!zwischenspeicher.has(schluessel)) {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(farbe),
      roughness: gewebe.rauheit,
      metalness: 0.0,
      clearcoat: gewebe.glanzschicht,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.85,
      // Wichtig fürs Tempo: "transparent" wird nur eingeschaltet, wenn wirklich
      // durchsichtig gestellt wird. Undurchsichtige Flächen zeichnet die
      // Grafikkarte deutlich schneller.
      transparent: false,
      opacity: 1,
      side: THREE.FrontSide,
    });
    material.userData.grundfarbe = material.color.clone();
    material.userData.grunddeckkraft = 1;
    material.userData.system = system;
    zwischenspeicher.set(schluessel, material);
  }
  return zwischenspeicher.get(schluessel);
}

/** Alle bisher erzeugten Materialien eines Systems (für Transparenz-Regler). */
export function materialienVon(system) {
  return [...zwischenspeicher.values()].filter((m) => m.userData.system === system);
}

/**
 * Setzt die Deckkraft eines Materials und schaltet die (teure) Transparenz
 * nur dann ein, wenn sie wirklich gebraucht wird.
 */
export function setzeDeckkraft(material, deckkraft) {
  material.opacity = deckkraft;
  material.transparent = deckkraft < 0.999;
  material.depthWrite = !material.transparent;
  material.userData.grunddeckkraft = deckkraft;
  material.needsUpdate = true;
}

/** Material für hervorgehobene Strukturen (warmes Gold-Olive statt Neonfarbe). */
export function hervorhebungsMaterial() {
  if (!zwischenspeicher.has('__auswahl')) {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#D9B24C'),
      emissive: new THREE.Color('#5A3E12'),
      roughness: 0.35,
      clearcoat: 0.6,
      envMapIntensity: 1.0,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    zwischenspeicher.set('__auswahl', m);
  }
  return zwischenspeicher.get('__auswahl');
}
