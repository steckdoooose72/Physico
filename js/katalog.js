/* ==========================================================================
   katalog.js – lädt das Strukturverzeichnis und die 3D-Bündel
   --------------------------------------------------------------------------
   Der ganze Körper besteht aus rund 930 einzelnen Meshes. Sie alle auf einmal
   zu laden würde den Rechner überfordern, deshalb sind sie in Bündel
   aufgeteilt (z. B. "muskeln_bein") und werden erst geladen, wenn sie
   gebraucht werden.

   Herkunft der Daten: BodyParts3D, (c) The Database Center for Life Science,
   lizenziert unter CC Attribution-Share Alike 2.1 Japan.
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { materialFuer } from './materialien.js?v=2';
import { erzeugeGeometrie } from './formen.js';

export class Katalog {
  constructor(szene) {
    this.szene = szene;
    this.lader = new GLTFLoader();

    this.verzeichnis = null;          // Inhalt von daten/strukturen.json
    this.strukturen = new Map();      // id -> Verzeichniseintrag
    this.namenDe = {};                // id -> { de, latein, notiz … }
    this.meshes = new Map();          // id -> THREE.Mesh (nur geladene)
    this.gruppen = new Map();         // system -> THREE.Group
    this.geladeneBuendel = new Map(); // buendel -> Detailstufe ('grob' | 'fein')
    this.laufende = new Map();        // buendel -> Promise (kein doppeltes Laden)
    this.stufe = 'grob';              // aktuelle Detailstufe
    this.beiNeuZeichnen = null;       // wird von main.js gesetzt

    this.region = 'alle';             // aktuell gewählter Körperbereich
  }

  /** Liest Verzeichnis und deutsche Namen ein. */
  async starten(indexPfad = 'daten/strukturen.json') {
    this.verzeichnis = await hole(indexPfad);
    for (const eintrag of this.verzeichnis.strukturen) {
      this.strukturen.set(eintrag.id, eintrag);
    }
    try {
      this.namenDe = await hole('daten/namen_de.json');
    } catch {
      this.namenDe = {};   // optional – ohne deutsche Namen läuft es auch
    }
    for (const system of this.verzeichnis.systeme) {
      const gruppe = new THREE.Group();
      gruppe.name = system.id;
      this.szene.add(gruppe);
      this.gruppen.set(system.id, gruppe);
    }
    return this.verzeichnis;
  }

  /** Anzeigename: deutsch, wenn vorhanden, sonst der englische Originalname. */
  anzeige(id) {
    const eintrag = this.strukturen.get(id);
    const de = this.namenDe[id];
    if (!eintrag) return de?.de ?? id;
    return de?.de ?? grossAnfang(eintrag.name);
  }

  /** Alle Bündel, die zu System und Region passen. */
  buendelFuer(system, region = 'alle') {
    // Unsere eigenen Ebenen liegen nicht als Modelldatei vor
    if (system === 'nervenbahnen' || system === 'gelenkpunkte' || system === 'baender') return ['eigene'];
    return this.verzeichnis.buendel
      .filter((b) => b.buendel.startsWith(`${system}_`))
      .filter((b) => region === 'alle' || b.buendel === `${system}_${region}`)
      .map((b) => b.buendel);
  }

  /**
   * Lädt ein Bündel, falls noch nicht geschehen.
   * @param {(anteil:number)=>void} beiFortschritt
   */
  ladeBuendel(schluessel, beiFortschritt) {
    // "eigene" ist kein Modellbündel, sondern unsere selbst gebaute Ebene
    if (schluessel === 'eigene') return this.ladeEigeneEbenen();

    const stufe = this.stufe;
    if (this.geladeneBuendel.get(schluessel) === stufe) return Promise.resolve();
    if (this.laufende.has(schluessel)) return this.laufende.get(schluessel);

    const eintrag = this.verzeichnis.buendel.find((b) => b.buendel === schluessel);
    if (!eintrag) return Promise.resolve();

    // Liegt das Bündel in der anderen Detailstufe im Speicher? Dann erst freigeben.
    if (this.geladeneBuendel.has(schluessel)) this.entladeBuendel(schluessel);

    const versprechen = new Promise((fertig, fehler) => {
      this.lader.load(
        (eintrag[stufe] ?? eintrag.grob ?? eintrag).datei,
        (gltf) => {
          const system = schluessel.split('_')[0];
          const gruppe = this.gruppen.get(system) ?? this.szene;

          // Die Knoten aus der glb-Datei heißen wie die FMA-Kennung.
          for (const knoten of [...gltf.scene.children]) {
            const mesh = knoten.isMesh ? knoten : knoten.children.find((k) => k.isMesh);
            if (!mesh) continue;
            const id = knoten.name || mesh.name;
            const daten = this.strukturen.get(id);

            mesh.name = id;
            mesh.material = materialFuer(system, daten?.name ?? '');
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.userData.id = id;
            mesh.userData.system = system;
            mesh.userData.eintrag = daten;
            mesh.userData.buendel = schluessel;
            mesh.frustumCulled = true;

            gruppe.add(mesh);
            this.meshes.set(id, mesh);
          }

          this.geladeneBuendel.set(schluessel, stufe);
          this.beiNeuZeichnen?.();
          this.laufende.delete(schluessel);
          fertig();
        },
        (ereignis) => {
          if (ereignis.lengthComputable && beiFortschritt) {
            beiFortschritt(ereignis.loaded / ereignis.total);
          }
        },
        (f) => { this.laufende.delete(schluessel); fehler(f); }
      );
    });

    this.laufende.set(schluessel, versprechen);
    return versprechen;
  }

  /**
   * Baut unsere eigenen Ebenen auf: periphere Nerven als Verlaufslinien und
   * Gelenke als halbdurchsichtige Kugeln mit ihren Bewegungsachsen.
   * Diese Strukturen fehlen in BodyParts3D – ihre Punkte sind in
   * werkzeuge/eigene_ebenen.py aus den echten Knochenkoordinaten berechnet.
   */
  async ladeEigeneEbenen() {
    if (this.geladeneBuendel.has('eigene')) return;
    const daten = await hole('daten/eigene_ebenen.json');

    for (const struktur of daten.strukturen) {
      const geometrie = erzeugeGeometrie(struktur.form);
      const material = materialFuer(struktur.system, struktur.name).clone();
      if (struktur.deckkraft) {
        material.opacity = struktur.deckkraft;
        material.depthWrite = false;
        material.userData = { ...material.userData, grunddeckkraft: struktur.deckkraft };
      }

      const mesh = new THREE.Mesh(geometrie, material);
      mesh.name = struktur.id;
      if (struktur.form.typ !== 'pfad' && struktur.position) {
        mesh.position.set(...struktur.position);
      }
      mesh.userData.id = struktur.id;
      mesh.userData.system = struktur.system;
      mesh.userData.buendel = 'eigene';
      mesh.userData.eintrag = this.strukturen.get(struktur.id);
      mesh.castShadow = false;

      // Bewegungsachsen als farbige Linien – sichtbar, sobald das Gelenk gewählt ist
      if (struktur.achsen?.length) {
        mesh.userData.achsen = struktur.achsen.map((achse) => {
          const richtung = new THREE.Vector3(...achse.richtung).normalize()
            .multiplyScalar(struktur.achsenLaenge ?? 0.11);
          const linie = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([richtung.clone().negate(), richtung]),
            new THREE.LineBasicMaterial({ color: new THREE.Color(achse.farbe ?? '#5ec8d8') })
          );
          linie.visible = false;
          linie.userData.name = achse.name;
          mesh.add(linie);
          return linie;
        });
      }

      (this.gruppen.get(struktur.system) ?? this.szene).add(mesh);
      this.meshes.set(struktur.id, mesh);
    }

    this.geladeneBuendel.set('eigene', 'eigene');
    this.beiNeuZeichnen?.();
  }

  /**
   * Gibt ein Bündel wieder frei – wichtig auf Rechnern mit wenig Arbeitsspeicher.
   * Die Geometrie wird dabei aus dem Grafikspeicher gelöscht.
   */
  entladeBuendel(schluessel) {
    for (const [id, mesh] of [...this.meshes]) {
      if (mesh.userData.buendel !== schluessel) continue;
      mesh.parent?.remove(mesh);
      mesh.geometry.dispose();
      this.meshes.delete(id);
    }
    this.geladeneBuendel.delete(schluessel);
  }

  /**
   * Wechselt die Detailstufe. Bereits geladene Bündel werden in der neuen
   * Stufe nachgeladen, damit Anzeige und Speicherverbrauch zusammenpassen.
   */
  async setzeStufe(stufe, beiStatus) {
    if (stufe === this.stufe) return;
    const betroffen = [...this.geladeneBuendel.keys()];
    this.stufe = stufe;
    for (let i = 0; i < betroffen.length; i++) {
      beiStatus?.(`Detailstufe wird umgestellt … (${i + 1}/${betroffen.length})`);
      await this.ladeBuendel(betroffen[i]);
    }
    beiStatus?.(null);
  }

  /** Sichtbarkeit eines ganzen Systems. */
  systemSichtbar(system, sichtbar) {
    const gruppe = this.gruppen.get(system);
    if (gruppe) gruppe.visible = sichtbar;
    this.beiNeuZeichnen?.();
  }

  /** Nur Strukturen einer Region zeigen ("alle" = keine Einschränkung). */
  regionFiltern(region) {
    if (region !== undefined) this.region = region;
    this.sichtbarkeitAnwenden();
  }

  /** Setzt die Sichtbarkeit aller geladenen Strukturen anhand des Körperbereichs neu. */
  sichtbarkeitAnwenden() {
    for (const [id, mesh] of this.meshes) {
      const eintrag = this.strukturen.get(id);
      mesh.visible = this.region === 'alle' || eintrag?.region === this.region;
    }
    this.beiNeuZeichnen?.();
  }

  /** Alle aktuell sichtbaren Meshes – Grundlage fürs Anklicken. */
  sichtbareMeshes() {
    const liste = [];
    for (const mesh of this.meshes.values()) {
      const gruppe = this.gruppen.get(mesh.userData.system);
      if (mesh.visible && gruppe?.visible) liste.push(mesh);
    }
    return liste;
  }

  /** Sucht in deutschen und englischen Namen. */
  suche(text, grenze = 40) {
    const begriff = text.trim().toLowerCase();
    if (begriff.length < 2) return [];
    const treffer = [];
    for (const eintrag of this.verzeichnis.strukturen) {
      const de = this.namenDe[eintrag.id]?.de ?? '';
      const latein = this.namenDe[eintrag.id]?.latein ?? '';
      const heuhaufen = `${eintrag.name} ${de} ${latein}`.toLowerCase();
      const stelle = heuhaufen.indexOf(begriff);
      if (stelle >= 0) treffer.push({ eintrag, rang: stelle });
      if (treffer.length > 400) break;
    }
    treffer.sort((a, b) => a.rang - b.rang || a.eintrag.name.length - b.eintrag.name.length);
    return treffer.slice(0, grenze).map((t) => t.eintrag);
  }
}

async function hole(pfad) {
  const antwort = await fetch(pfad);
  if (!antwort.ok) throw new Error(`Datei "${pfad}" nicht gefunden (Status ${antwort.status}).`);
  return antwort.json();
}

function grossAnfang(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
