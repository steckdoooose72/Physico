/* ==========================================================================
   formen.js – die Grundbausteine des Modells
   --------------------------------------------------------------------------
   Jede anatomische Struktur besteht (vorerst) aus einer einfachen Grundform.
   Diese Datei übersetzt den Eintrag "form" aus den JSON-Dateien in eine
   echte 3D-Geometrie.

   Verfügbare Formen:
     kugel    – { "typ": "kugel", "radius": 0.09, "skalierung": [1, 1.2, 0.9] }
     kapsel   – { "typ": "kapsel", "laenge": 0.30, "radius": 0.025 }   (lange Knochen)
     quader   – { "typ": "quader", "groesse": [0.16, 0.05, 0.10] }
     zylinder – { "typ": "zylinder", "hoehe": 0.12, "radius": 0.03, "radiusOben": 0.02 }
     pfad     – { "typ": "pfad", "punkte": [[x,y,z], ...], "radius": 0.006 }  (Nerven)

   Später können wir hier den Typ "datei" ergänzen, der ein echtes
   Anatomie-Mesh (.glb) lädt – der Rest des Programms bleibt gleich.
   ========================================================================== */

import * as THREE from 'three';

/**
 * Baut aus einer Form-Beschreibung eine three.js-Geometrie.
 * @param {object} form – der "form"-Block aus der JSON-Datei
 * @returns {THREE.BufferGeometry}
 */
export function erzeugeGeometrie(form) {
  switch (form.typ) {

    case 'kugel': {
      const geo = new THREE.SphereGeometry(form.radius ?? 0.05, 32, 24);
      // Mit "skalierung" wird aus der Kugel ein Ei/Ellipsoid – praktisch für
      // Schädel, Muskelbäuche oder das Becken.
      if (form.skalierung) {
        geo.scale(form.skalierung[0], form.skalierung[1], form.skalierung[2]);
      }
      return geo;
    }

    case 'kapsel': {
      // Eine Kapsel ist ein Zylinder mit runden Enden – die beste einfache
      // Näherung für Röhrenknochen und Muskeln. Sie steht aufrecht (Y-Achse).
      return new THREE.CapsuleGeometry(form.radius ?? 0.02, form.laenge ?? 0.2, 6, 20);
    }

    case 'quader': {
      const [x, y, z] = form.groesse ?? [0.1, 0.1, 0.1];
      return new THREE.BoxGeometry(x, y, z);
    }

    case 'zylinder': {
      const unten = form.radiusUnten ?? form.radius ?? 0.03;
      const oben = form.radiusOben ?? form.radius ?? 0.03;
      return new THREE.CylinderGeometry(oben, unten, form.hoehe ?? 0.1, 24, 1, false);
    }

    case 'pfad': {
      // Für Nerven: eine weiche Linie durch mehrere Punkte, als dünner Schlauch.
      const punkte = (form.punkte ?? []).map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      if (punkte.length < 2) {
        console.warn('Pfad braucht mindestens zwei Punkte:', form);
        return new THREE.SphereGeometry(0.01, 8, 6);
      }
      const kurve = new THREE.CatmullRomCurve3(punkte);
      const segmente = Math.max(24, punkte.length * 12);
      return new THREE.TubeGeometry(kurve, segmente, form.radius ?? 0.006, 10, false);
    }

    default:
      console.warn('Unbekannter Form-Typ:', form.typ, '– es wird eine kleine Kugel gezeigt.');
      return new THREE.SphereGeometry(0.02, 12, 10);
  }
}

/**
 * Erzeugt das Material (die "Oberfläche") einer Struktur.
 * @param {string} farbe – Farbe als Hex-Text, z. B. "#e9e2cf"
 * @param {object} optionen – { durchsichtig: 0..1 }
 */
export function erzeugeMaterial(farbe, optionen = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(farbe),
    roughness: 0.62,
    metalness: 0.05,
    transparent: true,           // immer an, damit der Transparenzregler sofort wirkt
    opacity: optionen.deckkraft ?? 1,
  });
  // Durchsichtige Strukturen dürfen nicht verdecken, was hinter ihnen liegt.
  material.depthWrite = material.opacity > 0.95;
  // Wir merken uns die Ausgangswerte, damit Hervorheben und Transparenz
  // sie später sauber wiederherstellen können.
  material.userData.grundfarbe = material.color.clone();
  material.userData.grunddeckkraft = material.opacity;
  return material;
}

/**
 * Wandelt Grad in Bogenmaß um.
 * In den JSON-Dateien geben wir Winkel in Grad an (verständlicher),
 * three.js rechnet aber mit Bogenmaß.
 */
export function gradZuBogen(grad) {
  return (grad * Math.PI) / 180;
}
