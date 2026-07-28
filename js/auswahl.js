/* ==========================================================================
   auswahl.js – Anklicken und Hervorheben von Strukturen
   --------------------------------------------------------------------------
   Technik dahinter: der "Raycaster". Man kann sich das wie einen Laserstrahl
   vorstellen, der von der Kamera durch den Mauszeiger in die Szene schießt.
   Das erste Objekt, das er trifft, liegt unter der Maus.

   Weil sich alle Strukturen eines Gewebes ein Material teilen (das spart
   Rechenleistung), wird zum Hervorheben das Material getauscht und beim
   Abwählen wieder zurückgesetzt.
   ========================================================================== */

import * as THREE from 'three';
import { hervorhebungsMaterial } from './materialien.js?v=2';

export class Auswahl {
  constructor({ kamera, renderer, katalog, beiAuswahl, beiSchweben }) {
    this.kamera = kamera;
    this.renderer = renderer;
    this.katalog = katalog;
    this.beiAuswahl = beiAuswahl;
    this.beiSchweben = beiSchweben;

    this.raycaster = new THREE.Raycaster();
    this.maus = new THREE.Vector2();
    this.gewaehlt = null;
    this.beschwebt = null;
    this._start = null;

    const flaeche = renderer.domElement;
    flaeche.addEventListener('pointermove', (e) => this._bewegung(e));
    flaeche.addEventListener('pointerdown', (e) => { this._start = { x: e.clientX, y: e.clientY }; });
    flaeche.addEventListener('pointerup', (e) => {
      if (!this._start) return;
      const weg = Math.hypot(e.clientX - this._start.x, e.clientY - this._start.y);
      this._start = null;
      if (weg > 5 || e.button !== 0) return;    // war ein Drehen, kein Klick
      this.waehle(this._treffer(e));
    });
    flaeche.addEventListener('pointerleave', () => this._schweben(null, 0, 0));
  }

  _treffer(e) {
    const feld = this.renderer.domElement.getBoundingClientRect();
    this.maus.x = ((e.clientX - feld.left) / feld.width) * 2 - 1;
    this.maus.y = -((e.clientY - feld.top) / feld.height) * 2 + 1;
    this.raycaster.setFromCamera(this.maus, this.kamera);
    const treffer = this.raycaster.intersectObjects(this.katalog.sichtbareMeshes(), false);
    return treffer.length > 0 ? treffer[0].object : null;
  }

  _bewegung(e) {
    const objekt = this._treffer(e);
    this._schweben(objekt, e.clientX, e.clientY);
    this.renderer.domElement.style.cursor = objekt ? 'pointer' : 'grab';
  }

  /** Wählt ein Mesh aus – null hebt die Auswahl auf. */
  waehle(mesh) {
    if (this.gewaehlt === mesh) return;

    if (this.gewaehlt) {
      this._zuruecksetzen(this.gewaehlt);
      this._achsen(this.gewaehlt, false);
    }
    this.gewaehlt = mesh;

    if (mesh) {
      mesh.userData.grundmaterial = mesh.userData.grundmaterial ?? mesh.material;
      mesh.material = hervorhebungsMaterial();
      mesh.renderOrder = 2;
      this._achsen(mesh, true);       // Bewegungsachsen bei Gelenken einblenden
    }
    this.beiAuswahl?.(mesh ? mesh.userData.id : null);
  }

  /** Blendet die Bewegungsachsen eines Gelenks ein oder aus. */
  _achsen(mesh, an) {
    for (const linie of mesh.userData.achsen ?? []) linie.visible = an;
  }

  _zuruecksetzen(mesh) {
    if (mesh.userData.grundmaterial) mesh.material = mesh.userData.grundmaterial;
    mesh.renderOrder = 0;
  }

  _schweben(mesh, x, y) {
    if (this.beschwebt === mesh) {
      if (mesh) this.beiSchweben?.(mesh.userData.id, x, y);
      return;
    }
    if (this.beschwebt && this.beschwebt !== this.gewaehlt) {
      this._zuruecksetzen(this.beschwebt);
    }
    this.beschwebt = mesh;
    if (mesh && mesh !== this.gewaehlt) {
      mesh.userData.grundmaterial = mesh.userData.grundmaterial ?? mesh.material;
      // Zum Überfahren reicht eine hellere Kopie des Gewebematerials.
      const hell = mesh.userData.grundmaterial.clone();
      hell.emissive = new THREE.Color('#7A5A1E');
      hell.emissiveIntensity = 1;
      hell.opacity = Math.max(mesh.userData.grundmaterial.opacity, 0.6);
      hell.transparent = hell.opacity < 0.999;
      hell.depthWrite = !hell.transparent;
      mesh.material = hell;
    }
    this.beiSchweben?.(mesh ? mesh.userData.id : null, x, y);
  }
}
