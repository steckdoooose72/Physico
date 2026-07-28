/* ==========================================================================
   ui.js – Bedienleiste: Systeme, Regionen, Suche
   --------------------------------------------------------------------------
   Hier entsteht alles, was links im Fenster steht. Die 3D-Logik bleibt in
   main.js und katalog.js – diese Datei kümmert sich nur um Knöpfe und Listen.
   ========================================================================== */

import { GEWEBE, materialienVon, setzeDeckkraft } from './materialien.js?v=2';

export const REGIONEN = [
  { id: 'alle',   name: 'Ganzer Körper' },
  { id: 'kopf',   name: 'Kopf' },
  { id: 'hals',   name: 'Hals' },
  { id: 'rumpf',  name: 'Rumpf' },
  { id: 'becken', name: 'Becken' },
  { id: 'arm',    name: 'Arm und Schulter' },
  { id: 'bein',   name: 'Bein' },
];

/** Systeme, die beim Start sichtbar sind. */
const START_SICHTBAR = ['skelett'];

export class Bedienleiste {
  constructor({ katalog, beiAuswahl, beiFokus, beiStatus, beiNeuZeichnen }) {
    this.katalog = katalog;
    this.beiNeuZeichnen = beiNeuZeichnen;   // Schatten neu berechnen lassen
    this.beiAuswahl = beiAuswahl;     // Struktur im Panel zeigen
    this.beiFokus = beiFokus;         // Kamera auf Struktur schwenken
    this.beiStatus = beiStatus;       // Ladeanzeige
    this.region = 'alle';
    this.aktiveSysteme = new Set(START_SICHTBAR);
  }

  aufbauen() {
    this._systeme();
    this._regionen();
    this._suche();
    this._regler();
    this._stufeAnzeigen();
  }

  /** Wie viele Strukturen hat ein System (im aktuell gewählten Bereich)? */
  _anzahl(system) {
    return this.katalog.verzeichnis.strukturen.filter(
      (e) => e.system === system && (this.region === 'alle' || e.region === this.region)
    ).length;
  }

  /**
   * Baut die Systemliste einmalig auf. Danach wird sie nie wieder neu gebaut,
   * sondern nur noch über _anwenden() aktualisiert – sonst laufen Häkchen und
   * tatsächliche Sichtbarkeit auseinander.
   */
  _systeme() {
    const behaelter = document.getElementById('system-schalter');
    behaelter.innerHTML = '';
    this.zeilen = new Map();

    for (const system of this.katalog.verzeichnis.systeme) {
      const anzahl = this.katalog.verzeichnis.strukturen.filter((e) => e.system === system.id).length;
      if (anzahl === 0) continue;

      const zeile = document.createElement('label');
      zeile.className = 'ebene-zeile';
      zeile.innerHTML = `
        <span class="mini-schalter">
          <input type="checkbox">
          <span class="mini-schieber"></span>
        </span>
        <span class="ebene-punkt" style="background:${GEWEBE[system.id]?.farbe ?? '#888'}"></span>
        <span class="name">${system.name}</span>
        <span class="anzahl">${anzahl}</span>
      `;

      const kaestchen = zeile.querySelector('input');
      kaestchen.addEventListener('change', async () => {
        if (kaestchen.checked) {
          this.aktiveSysteme.add(system.id);
          this._anwenden();
          await this.ladeSystem(system.id);
        } else {
          this.aktiveSysteme.delete(system.id);
        }
        this._anwenden();
      });

      behaelter.appendChild(zeile);
      this.zeilen.set(system.id, { zeile, kaestchen });
    }
    this._anwenden();
  }

  /**
   * Wertet die Adresszeile aus, damit sich später gezielte Ansichten verlinken
   * lassen, z. B.
   *   modell.html?bereich=bein&systeme=skelett,muskeln
   *   modell.html?struktur=FMA24474
   */
  async ausAdresse() {
    const p = new URLSearchParams(location.search);

    const systeme = (p.get('systeme') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const gueltige = systeme.filter((s) => this.zeilen.has(s));
    if (gueltige.length) this.aktiveSysteme = new Set(gueltige);

    const bereich = p.get('bereich');
    if (bereich && REGIONEN.some((r) => r.id === bereich)) {
      this.region = bereich;
      this._regionen();
    }

    this._anwenden();
    await this.wechsleRegion();          // lädt die aktiven Systeme in der passenden Stufe

    const struktur = p.get('struktur');
    if (struktur && this.katalog.strukturen.has(struktur)) {
      await this.zeigeStruktur(struktur);
    }
  }

  /**
   * Einzige Wahrheit ist "aktiveSysteme": von dort werden sowohl die Häkchen
   * als auch die Sichtbarkeit im 3D-Bild gesetzt.
   */
  _anwenden() {
    for (const [id, { zeile, kaestchen }] of this.zeilen ?? []) {
      const an = this.aktiveSysteme.has(id);
      kaestchen.checked = an;
      zeile.classList.toggle('aus', !an);
      this.katalog.systemSichtbar(id, an);
    }
  }

  /** Lädt alle Bündel eines Systems für die aktuelle Region. */
  async ladeSystem(system) {
    const schluessel = this.katalog.buendelFuer(system, this.region);
    const offen = schluessel.filter((s) => this.katalog.geladeneBuendel.get(s) !== this.katalog.stufe);
    if (offen.length === 0) return;

    for (let i = 0; i < offen.length; i++) {
      this.beiStatus?.(`Lade ${GEWEBE[system]?.name ?? system} … (${i + 1}/${offen.length})`);
      await this.katalog.ladeBuendel(offen[i]);
    }
    this.katalog.regionFiltern(this.region);
    this.beiStatus?.(null);
  }

  _regionen() {
    const behaelter = document.getElementById('region-schalter');
    behaelter.innerHTML = '';

    for (const region of REGIONEN) {
      const knopf = document.createElement('button');
      knopf.className = 'chip' + (region.id === this.region ? ' aktiv' : '');
      knopf.textContent = region.name;
      knopf.addEventListener('click', async () => {
        this.region = region.id;
        [...behaelter.children].forEach((k) => k.classList.toggle('aktiv', k === knopf));
        await this.wechsleRegion();
      });
      behaelter.appendChild(knopf);
    }
  }

  /**
   * Regionswechsel: Beim ganzen Körper zeigen wir die Übersichtsstufe, bei einer
   * einzelnen Region die feine Stufe – so bleibt der Speicherbedarf im Rahmen
   * und man sieht dort viele Details, wo man gerade hinschaut.
   */
  async wechsleRegion() {
    const gewuenschteStufe = this.region === 'alle' ? 'grob' : 'fein';

    // Bündel außerhalb der Region freigeben (spart Arbeitsspeicher)
    if (this.region !== 'alle') {
      for (const schluessel of [...this.katalog.geladeneBuendel.keys()]) {
        if (schluessel === 'eigene') continue;          // eigene Ebene ist winzig, bleibt geladen
        if (!schluessel.endsWith(`_${this.region}`)) this.katalog.entladeBuendel(schluessel);
      }
    }

    this.katalog.stufe = gewuenschteStufe;
    this._stufeAnzeigen();

    for (const system of this.aktiveSysteme) await this.ladeSystem(system);
    this.katalog.regionFiltern(this.region);
    this._anwenden();
  }

  _stufeAnzeigen() {
    const anzeige = document.getElementById('stufe-anzeige');
    if (!anzeige) return;
    anzeige.textContent = this.katalog.stufe === 'fein'
      ? 'Feine Darstellung (volle Auflösung)'
      : 'Übersicht – wähle einen Körperbereich für volle Auflösung';
  }

  _suche() {
    const feld = document.getElementById('suchfeld');
    const liste = document.getElementById('suchergebnisse');

    const zeigen = () => {
      const treffer = this.katalog.suche(feld.value);
      liste.innerHTML = '';

      if (feld.value.trim().length < 2) {
        liste.classList.remove('offen');
        return;
      }
      if (treffer.length === 0) {
        liste.innerHTML = '<li class="leer">Nichts gefunden</li>';
        liste.classList.add('offen');
        return;
      }

      for (const eintrag of treffer) {
        const zeile = document.createElement('li');
        zeile.innerHTML = `
          <span class="ebene-punkt" style="background:${GEWEBE[eintrag.system]?.farbe ?? '#888'}"></span>
          <span>${this.katalog.anzeige(eintrag.id)}</span>
        `;
        zeile.addEventListener('click', () => this.zeigeStruktur(eintrag.id));
        liste.appendChild(zeile);
      }
      liste.classList.add('offen');
    };

    feld.addEventListener('input', zeigen);
    feld.addEventListener('focus', zeigen);
    document.addEventListener('click', (e) => {
      if (!liste.contains(e.target) && e.target !== feld) liste.classList.remove('offen');
    });
  }

  /** Struktur aus der Suche: notfalls Bündel nachladen, auswählen, hinfliegen. */
  async zeigeStruktur(id) {
    const eintrag = this.katalog.strukturen.get(id);
    if (!eintrag) return;

    if (!this.katalog.geladeneBuendel.has(eintrag.buendel)) {
      this.beiStatus?.('Lade Struktur …');
      await this.katalog.ladeBuendel(eintrag.buendel);
      this.beiStatus?.(null);
    }

    // System einschalten, falls es ausgeblendet war
    if (!this.aktiveSysteme.has(eintrag.system)) {
      this.aktiveSysteme.add(eintrag.system);
      this._anwenden();
    }
    // Region ggf. weiten, damit die Struktur sichtbar ist
    if (this.region !== 'alle' && eintrag.region !== this.region) {
      this.region = eintrag.region;      // direkt in die Region der Struktur wechseln
      this._regionen();
      await this.wechsleRegion();
      this._anwenden();
    }

    const mesh = this.katalog.meshes.get(id);
    if (mesh) {
      mesh.visible = true;
      this.beiAuswahl?.(mesh);
      this.beiFokus?.(mesh);
    }
  }

  _regler() {
    const regler = document.getElementById('regler-transparenz');
    const anzeige = document.getElementById('transparenz-wert');

    const setzen = () => {
      const wert = Number(regler.value);
      const deckkraft = 1 - (wert / 100) * 0.9;
      anzeige.textContent = wert === 0 ? 'aus' : `${wert} %`;

      // Alles außer Skelett wird durchsichtig – so schaut man von außen nach innen.
      for (const system of Object.keys(GEWEBE)) {
        if (system === 'skelett') continue;
        for (const material of materialienVon(system)) setzeDeckkraft(material, deckkraft);
      }
      this.beiNeuZeichnen?.();
    };

    regler.addEventListener('input', setzen);
    setzen();
  }
}
