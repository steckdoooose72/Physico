/* ==========================================================================
   lernstand.js – Persistenter Lernstand (Spaced Repetition)
   --------------------------------------------------------------------------
   Erster Baustein einer größeren Umstellung: bisher hat jedes Pilotmodul
   (z. B. js/schulter-struktur.js) keinen Lernstand über die aktuelle Runde
   hinaus – jeder Aufruf beginnt bei null. Dieses Modul speichert stattdessen
   je Frage-Item (über eine stabile `id`, siehe STRUKTUREN in den einzelnen
   Modulen) einen einfachen Leitner-artigen Fortschritt in `localStorage`,
   damit ein Modul beim nächsten Besuch nur noch das abfragt, was wirklich
   fällig ist.

   Bewusst absichtlich MODUL-UNABHÄNGIG gehalten: keine Kenntnis von
   „Struktur", „Bewegung" o. Ä., nur generische Item-IDs. So lässt sich
   dieselbe Datei später ohne Änderung auf alle anderen Module übertragen –
   jedes Modul bringt nur seine eigenen IDs mit.

   Schema pro Item: { stufe, faelligAm, letzteAntwortRichtig,
   zuletztBeantwortetAm }. `stufe` zählt, wie oft ein Item AM STÜCK richtig
   saß (0 = noch nie oder zuletzt falsch). Die Wartezeit bis zur nächsten
   Fälligkeit steht in INTERVALLE an der Stelle `stufe - 1` – bei stufe 1
   sind das also INTERVALLE[0] = 1 Tag, bei stufe 5 (Obergrenze)
   INTERVALLE[4] = 35 Tage.
   ========================================================================== */

const SCHLUESSEL = 'membra:lernstand';

// Tage bis zur nächsten Fälligkeit, indiziert über (stufe - 1).
const INTERVALLE = [1, 3, 7, 16, 35];

/**
 * Liest den gesamten Lernstand aus localStorage. Liefert ein leeres Objekt,
 * wenn noch nichts gespeichert ist oder der gespeicherte Wert kein gültiges
 * JSON-Objekt ist – ein Modul kann sich also immer auf ein Objekt verlassen,
 * ohne selbst auf Fehler prüfen zu müssen.
 */
export function ladeLernstand() {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return {};
    const geparst = JSON.parse(roh);
    return geparst && typeof geparst === 'object' ? geparst : {};
  } catch {
    return {};
  }
}

/** Schreibt den übergebenen Lernstand vollständig zurück nach localStorage. */
export function speichereLernstand(lernstand) {
  localStorage.setItem(SCHLUESSEL, JSON.stringify(lernstand));
}

/** Ein Datum ohne Uhrzeit-Anteil – für den reinen Tagesvergleich in faelligeItems(). */
function ohneZeit(datum) {
  const d = new Date(datum);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Aktualisiert den Eintrag EINES Items nach Antwort und gibt ein NEUES
 * lernstand-Objekt zurück (die Eingabe bleibt unverändert – wie die übrigen
 * Zustands-Funktionen im Projekt, die auch nie ihr Eingabe-Objekt mutieren).
 *
 * Richtig beantwortet: Stufe steigt um 1 (nicht über die letzte Stufe
 * hinaus), Fälligkeit rückt um das zur neuen Stufe gehörige Intervall nach
 * hinten. Falsch beantwortet: Stufe fällt auf 0 zurück, schon morgen wieder
 * fällig – kein langes Vergessen-Risiko nach einem Ausrutscher.
 */
export function aktualisiereItem(lernstand, itemId, warRichtig) {
  const bisherigeStufe = lernstand[itemId]?.stufe ?? 0;
  const stufe = warRichtig ? Math.min(bisherigeStufe + 1, INTERVALLE.length) : 0;
  const tage = warRichtig ? INTERVALLE[stufe - 1] : 1;

  const jetzt = new Date();
  const faelligAm = new Date(jetzt);
  faelligAm.setDate(faelligAm.getDate() + tage);

  return {
    ...lernstand,
    [itemId]: {
      stufe,
      faelligAm: faelligAm.toISOString(),
      letzteAntwortRichtig: warRichtig,
      zuletztBeantwortetAm: jetzt.toISOString(),
    },
  };
}

/**
 * Welche der übergebenen Item-IDs sind heute dran? Fällig ist ein Item,
 * wenn sein `faelligAm` auf heute oder früher fällt – oder wenn es noch gar
 * keinen Eintrag im Lernstand hat (neu, also sofort fällig).
 */
export function faelligeItems(lernstand, alleItemIds) {
  const heute = ohneZeit(new Date());
  return alleItemIds.filter((id) => {
    const eintrag = lernstand[id];
    if (!eintrag) return true;
    return ohneZeit(eintrag.faelligAm) <= heute;
  });
}
