/* ==========================================================================
   buehne.js – die 3D-Bühne, die sich mehrere Seiten teilen
   --------------------------------------------------------------------------
   Szene, Licht, Kamera, Steuerung und Bildschleife sind auf jeder Seite mit
   3D-Ansicht gleich – im Modell-Viewer (modell.html) genauso wie in den
   Übungen (bone-prep.html). Deshalb steht der Aufbau hier einmal zentral,
   statt in jeder Seite noch einmal.

   Für ein realistisches Bild sorgen drei Dinge:
     • Umgebungslicht aus einer virtuellen Studioumgebung (RoomEnvironment),
       damit die Oberflächen realistisch reflektieren
     • ACES-Tone-Mapping – dieselbe Farbkurve, die Filmstudios verwenden
     • ein weiches Schlagschatten-Licht plus Gegenlicht für plastische Tiefe

   Benutzung:
       const buehne = erzeugeBuehne({ behaelter: document.getElementById('buehne') });
       buehne.szene.add(…);
       buehne.starteSchleife();
   ========================================================================== */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Grundton der Bühne: dunkles Olive-Anthrazit statt reinem Schwarz. */
export const BUEHNEN_GRUNDTON = '#26241b';

/**
 * Malt den Hintergrund der 3D-Bühne: den dunklen Grundton mit ein paar sehr
 * leisen, fließenden Flecken in Creme/Beige – die Umkehrung der hellen Seiten
 * (dort Olive/Graugrün auf Creme, hier Creme auf Dunkel). Mehrere Farbtöne
 * sorgen dafür, dass der Übergang nicht einseitig wirkt. Wird einmalig beim
 * Start gemalt, kein Live-Rendering.
 */
function erzeugeHintergrund() {
  const groesse = 1024;
  const leinwand = document.createElement('canvas');
  leinwand.width = leinwand.height = groesse;
  const ctx = leinwand.getContext('2d');

  ctx.fillStyle = BUEHNEN_GRUNDTON;
  ctx.fillRect(0, 0, groesse, groesse);

  const flecken = [
    { x: 0.78, y: 0.14, r: 0.55, farbe: '241, 231, 213', deckkraft: 0.10 },  // Creme
    { x: 0.12, y: 0.82, r: 0.50, farbe: '250, 244, 232', deckkraft: 0.08 },  // Papier/Beige
    { x: 0.85, y: 0.80, r: 0.42, farbe: '196, 195, 168', deckkraft: 0.06 },  // Hauch Graugrün
    { x: 0.20, y: 0.20, r: 0.36, farbe: '140, 129, 90', deckkraft: 0.05 },   // Hauch Olive-Hell
  ];

  ctx.globalCompositeOperation = 'lighter';
  for (const { x, y, r, farbe, deckkraft } of flecken) {
    const cx = x * groesse;
    const cy = y * groesse;
    const radius = r * groesse;
    const verlauf = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    verlauf.addColorStop(0, `rgba(${farbe}, ${deckkraft})`);
    verlauf.addColorStop(1, `rgba(${farbe}, 0)`);
    ctx.fillStyle = verlauf;
    ctx.fillRect(0, 0, groesse, groesse);
  }

  const textur = new THREE.CanvasTexture(leinwand);
  textur.colorSpace = THREE.SRGBColorSpace;
  return textur;
}

/**
 * Baut eine vollständige 3D-Bühne im angegebenen Element auf.
 *
 * @param {object} k
 * @param {HTMLElement} k.behaelter   Element, in das gezeichnet wird
 * @param {THREE.Vector3} [k.kameraStart]  Startposition der Kamera
 * @param {THREE.Vector3} [k.blickZiel]    Punkt, auf den die Kamera schaut
 * @param {boolean} [k.mitBoden]      Schattenfläche am Boden (im Quiz unnötig,
 *                                    wenn ein einzelner Knochen frei schwebt)
 */
export function erzeugeBuehne({
  behaelter,
  kameraStart = new THREE.Vector3(0.75, 1.05, 3.05),
  blickZiel = new THREE.Vector3(0, 0.88, 0),
  mitBoden = true,
} = {}) {

  // --- Szene --------------------------------------------------------------
  const szene = new THREE.Scene();
  szene.background = erzeugeHintergrund();
  szene.fog = new THREE.Fog(BUEHNEN_GRUNDTON, 4.5, 11);

  const kamera = new THREE.PerspectiveCamera(38, 1, 0.02, 100);
  kamera.position.copy(kameraStart);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Der Schatten wird nur neu berechnet, wenn sich wirklich etwas ändert –
  // bei fast 1000 Strukturen wäre jedes Bild neu zu schatten viel zu teuer.
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  behaelter.appendChild(renderer.domElement);

  // --- Umgebungslicht (macht die Materialien erst realistisch) ------------
  const pmrem = new THREE.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  szene.environmentIntensity = 0.55;

  // --- Direktes Licht -----------------------------------------------------
  const hauptlicht = new THREE.DirectionalLight('#fff4e6', 2.2);
  hauptlicht.position.set(2.2, 3.4, 2.6);
  hauptlicht.castShadow = true;
  hauptlicht.shadow.mapSize.set(2048, 2048);
  hauptlicht.shadow.camera.near = 0.5;
  hauptlicht.shadow.camera.far = 10;
  hauptlicht.shadow.camera.left = -1.2;
  hauptlicht.shadow.camera.right = 1.2;
  hauptlicht.shadow.camera.top = 2.2;
  hauptlicht.shadow.camera.bottom = -0.2;
  hauptlicht.shadow.bias = -0.0008;
  hauptlicht.shadow.normalBias = 0.004;
  szene.add(hauptlicht);

  const fuelllicht = new THREE.DirectionalLight('#c9d2c0', 0.6);   // kühles Graugrün als Gegenstimme
  fuelllicht.position.set(-2.5, 1.4, 1.5);
  szene.add(fuelllicht);

  const gegenlicht = new THREE.DirectionalLight('#ffffff', 0.9);
  gegenlicht.position.set(-1.2, 2.0, -3.0);
  szene.add(gegenlicht);

  // --- Boden: fängt nur den Schatten auf, ist selbst unsichtbar -----------
  if (mitBoden) {
    const boden = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64).rotateX(-Math.PI / 2),
      new THREE.ShadowMaterial({ color: new THREE.Color('#1a1810'), opacity: 0.32 })
    );
    boden.receiveShadow = true;
    szene.add(boden);
  }

  // --- Steuerung ----------------------------------------------------------
  const steuerung = new OrbitControls(kamera, renderer.domElement);
  steuerung.target.copy(blickZiel);
  steuerung.enableDamping = true;
  steuerung.dampingFactor = 0.08;
  steuerung.minDistance = 0.08;
  steuerung.maxDistance = 6;
  steuerung.maxPolarAngle = Math.PI * 0.95;
  steuerung.update();

  // --- Größe an den Behälter anpassen ------------------------------------
  function passeGroesseAn() {
    const breite = behaelter.clientWidth || window.innerWidth;
    const hoehe = behaelter.clientHeight || window.innerHeight;
    kamera.aspect = breite / hoehe;
    kamera.updateProjectionMatrix();
    renderer.setSize(breite, hoehe);
  }
  passeGroesseAn();
  window.addEventListener('resize', passeGroesseAn);
  // Zusätzlich am Element selbst horchen: nicht jede Größenänderung des
  // Fensters löst ein resize-Ereignis aus (im eingebetteten Browser etwa nicht).
  new ResizeObserver(passeGroesseAn).observe(behaelter);

  /** Einmalig den Schatten neu berechnen lassen. */
  function schattenAuffrischen() {
    renderer.shadowMap.needsUpdate = true;
  }

  // --- Sanfter Kameraflug zu einem Objekt --------------------------------
  let flug = null;

  /**
   * Fährt die Kamera so heran, dass das Objekt formatfüllend zu sehen ist.
   *
   * Der Abstand berücksichtigt beide Richtungen: bei einem schmalen, hohen
   * Fenster muss die Kamera weiter weg, sonst wird links und rechts abgeschnitten.
   *
   * @param {THREE.Object3D} objekt
   * @param {boolean} sofort  ohne Animation (z. B. beim Aufbau einer Frage)
   * @param {object} [bildfeld]  wenn nur ein Teil des Bildes frei ist, weil
   *        Bedienflächen darüberliegen (im Quiz die Antworten):
   *        `nutzHoehe` = frei nutzbarer Anteil der Bildhöhe (1 = alles),
   *        `versatzHoch` = um wie viel das Objekt nach oben rückt (Anteil der Bildhöhe),
   *        `rand` = Luft ringsum (1.0 = randlos, 1.3 = spürbarer Abstand).
   */
  function fliegeZu(objekt, sofort = false, { nutzHoehe = 1, versatzHoch = 0, rand = 1.3 } = {}) {
    const box = new THREE.Box3().setFromObject(objekt);
    if (box.isEmpty()) return;
    const mitte = box.getCenter(new THREE.Vector3());

    // Aus der aktuellen Blickrichtung heranfahren, damit die Orientierung bleibt.
    const richtung = kamera.position.clone().sub(steuerung.target).normalize();

    // Die drei Achsen des Bildes: nach rechts, nach oben, zur Kamera hin.
    // „Oben" ist der Teil der Welt-Senkrechten, der quer zur Blickrichtung steht.
    let bildOben = new THREE.Vector3(0, 1, 0).addScaledVector(richtung, -richtung.y);
    if (bildOben.lengthSq() < 1e-6) bildOben = new THREE.Vector3(0, 0, 1);   // Blick von oben
    bildOben.normalize();
    const bildRechts = new THREE.Vector3().crossVectors(bildOben, richtung).normalize();

    // Wie groß das Objekt aus dieser Richtung wirklich erscheint: die acht Ecken
    // der Box auf die Bildachsen legen. Die Diagonale allein wäre viel zu
    // vorsichtig – flache oder längliche Knochen würden winzig gerahmt.
    let halbBreite = 0, halbHoehe = 0, halbTiefe = 0;
    const ecke = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      ecke.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      ).sub(mitte);
      halbBreite = Math.max(halbBreite, Math.abs(ecke.dot(bildRechts)));
      halbHoehe = Math.max(halbHoehe, Math.abs(ecke.dot(bildOben)));
      halbTiefe = Math.max(halbTiefe, Math.abs(ecke.dot(richtung)));
    }

    // Halbe Bildhöhe je Meter Abstand – daraus folgt der nötige Abstand.
    const proMeter = Math.tan((kamera.fov * Math.PI) / 360);
    const fuerHoehe = halbHoehe / (proMeter * Math.max(0.2, nutzHoehe));
    const fuerBreite = halbBreite / (proMeter * Math.max(0.2, kamera.aspect));
    // Untergrenze knapp über steuerung.minDistance (0.08): näher lässt die
    // Steuerung ohnehin nicht heran, und die Nahebene liegt bei 0.02.
    const abstand = Math.max(0.09, rand * Math.max(fuerHoehe, fuerBreite) + halbTiefe);

    // Blickpunkt unter das Objekt legen – dadurch wandert es im Bild nach oben.
    const zielMitte = mitte.clone();
    if (versatzHoch) {
      zielMitte.addScaledVector(bildOben, -versatzHoch * 2 * abstand * proMeter);
    }

    const zielPos = zielMitte.clone().add(richtung.multiplyScalar(abstand));

    if (sofort) {
      flug = null;
      steuerung.target.copy(zielMitte);
      kamera.position.copy(zielPos);
      steuerung.update();
      return;
    }

    flug = {
      vonZiel: steuerung.target.clone(), nachZiel: zielMitte,
      vonPos: kamera.position.clone(), nachPos: zielPos,
      t: 0,
    };
  }

  function flugSchritt(delta) {
    if (!flug) return;
    flug.t = Math.min(1, flug.t + delta * 1.8);
    // weiches Ein- und Ausgleiten
    const s = flug.t < 0.5 ? 2 * flug.t * flug.t : 1 - Math.pow(-2 * flug.t + 2, 2) / 2;
    steuerung.target.lerpVectors(flug.vonZiel, flug.nachZiel, s);
    kamera.position.lerpVectors(flug.vonPos, flug.nachPos, s);
    if (flug.t >= 1) flug = null;
  }

  /** Setzt die Ansicht auf den Ausgangspunkt zurück. */
  function ansichtZuruecksetzen() {
    flug = null;
    kamera.position.copy(kameraStart);
    steuerung.target.copy(blickZiel);
    steuerung.update();
  }

  // --- Bildschleife -------------------------------------------------------
  const uhr = new THREE.Clock();
  let laeuft = false;

  function starteSchleife() {
    if (laeuft) return;
    laeuft = true;
    (function zeichne() {
      requestAnimationFrame(zeichne);
      flugSchritt(uhr.getDelta());
      steuerung.update();
      renderer.render(szene, kamera);
    })();
  }

  return {
    szene, kamera, renderer, steuerung,
    fliegeZu, ansichtZuruecksetzen, schattenAuffrischen,
    passeGroesseAn, starteSchleife,
    get flug() { return flug; },
  };
}
