/* ==========================================================================
   panel.js – das Info-Panel rechts
   --------------------------------------------------------------------------
   Zeigt die angeklickte Struktur: Name (deutsch, falls hinterlegt), der
   englische Originalname aus BodyParts3D, System, Region, Seite – und, wo wir
   sie selbst ergänzt haben, die physiotherapeutisch wichtigen Angaben
   (Ursprung, Ansatz, Funktion, Innervation, Palpation).

   Eigene Inhalte werden in daten/namen_de.json gepflegt, Schlüssel ist die
   FMA-Kennung der Struktur.
   ========================================================================== */

import { GEWEBE } from './materialien.js?v=2';

const FELDER = [
  // Muskeln
  ['ursprung', 'Ursprung'],
  ['ansatz', 'Ansatz'],
  ['funktion', 'Funktion'],
  ['innervation', 'Innervation'],
  // Gelenke
  ['gelenktyp', 'Gelenktyp'],
  ['beteiligt', 'Beteiligte Knochen'],
  ['bewegungen', 'Bewegungen'],
  ['normwerte', 'Normwerte (Neutral-Null)'],
  // Nerven
  ['segmente', 'Rückenmarkssegmente'],
  ['versorgt', 'Versorgt (motorisch)'],
  ['sensibel', 'Versorgt (sensibel)'],
  // Knochen
  ['gelenke', 'Beteiligt an Gelenken'],
  ['tastbar', 'Tastbar (Palpation)'],
  ['notiz', 'Für die Praxis'],
];

export class Panel {
  constructor({ inhalt, panel, schwebeName, katalog }) {
    this.inhalt = inhalt;
    this.panel = panel ?? inhalt.parentElement;   // die ganze Fläche, nicht nur der Text darin
    this.schwebeName = schwebeName;
    this.katalog = katalog;
  }

  /**
   * Ohne Auswahl bleibt die Fläche rechts komplett weg (nicht nur leer) –
   * sie poppt erst auf, sobald eine Struktur angeklickt wird.
   */
  zeige(id) {
    if (!id) {
      this.panel.classList.add('leer');
      this.panel.setAttribute('aria-hidden', 'true');
      this.inhalt.innerHTML = '';
      return;
    }
    this.panel.classList.remove('leer');
    this.panel.removeAttribute('aria-hidden');

    const eintrag = this.katalog.strukturen.get(id);
    const eigen = this.katalog.namenDe[id] ?? {};
    const gewebe = GEWEBE[eintrag?.system] ?? GEWEBE.sonstiges;
    const seite = { links: 'linke Seite', rechts: 'rechte Seite', mitte: 'Mitte' }[eintrag?.seite] ?? '';
    const region = { kopf: 'Kopf', hals: 'Hals', rumpf: 'Rumpf', becken: 'Becken', arm: 'Arm', bein: 'Bein' };

    let html = `
      <span class="info-etikett" style="background:${gewebe.farbe}">${gewebe.name}</span>
      <h3>${text(this.katalog.anzeige(id))}</h3>
      ${eigen.latein ? `<p class="latein">${text(eigen.latein)}</p>` : ''}
      ${eintrag && eintrag.name !== this.katalog.anzeige(id)
        ? `<p class="original">${text(eintrag.name)}</p>` : ''}
      <div class="marken">
        ${eintrag?.region ? `<span class="marke">${region[eintrag.region] ?? eintrag.region}</span>` : ''}
        ${seite ? `<span class="marke">${seite}</span>` : ''}
      </div>
    `;

    for (const [schluessel, titel] of FELDER) {
      const wert = eigen[schluessel];
      if (!wert || (Array.isArray(wert) && wert.length === 0)) continue;
      html += `<div class="info-feld"><span class="titel">${titel}</span>${wertHtml(wert)}</div>`;
    }

    if (!FELDER.some(([s]) => eigen[s])) {
      html += `<div class="info-feld hinweis-feld">
        <span class="titel">Noch keine eigenen Notizen</span>
        <div class="wert">Trage sie in <code>daten/namen_de.json</code> unter der Kennung
        <code>${text(id)}</code> ein – Ursprung, Ansatz, Funktion, Innervation, Palpation.</div>
      </div>`;
    }

    // Eigene Strukturen (Kennung "PT-…") stammen nicht aus BodyParts3D
    const quelle = id.startsWith('PT-')
      ? 'eigene Ebene – an den echten Knochen ausgerichtet, Verlauf schematisch'
      : 'BodyParts3D (CC BY-SA 2.1 JP)';
    html += `<div class="info-feld quelle">
      <span class="titel">Kennung / Quelle</span>
      <div class="wert">${text(id)} · ${quelle}</div>
    </div>`;

    this.inhalt.innerHTML = html;
    this.inhalt.scrollTop = 0;
  }

  schwebe(id, x, y) {
    if (!id) {
      this.schwebeName.classList.remove('sichtbar');
      return;
    }
    this.schwebeName.textContent = this.katalog.anzeige(id);
    this.schwebeName.style.left = `${x + 14}px`;
    this.schwebeName.style.top = `${y + 16}px`;
    this.schwebeName.classList.add('sichtbar');
  }
}

function wertHtml(wert) {
  if (Array.isArray(wert)) return `<ul>${wert.map((z) => `<li>${text(z)}</li>`).join('')}</ul>`;
  return `<div class="wert">${text(wert)}</div>`;
}

function text(wert) {
  return String(wert).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
