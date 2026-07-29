# Physico – Projektkontext für Claude Code

Interaktives 3D-Anatomiemodell zum Lernen (Vorbereitung Physiotherapie-Ausbildung).
Der Nutzer hat **keine Programmiererfahrung** und baut das Projekt langfristig selbst weiter.

## Arbeitsweise in diesem Projekt

- Alles auf **Deutsch**: Code-Kommentare, Variablennamen, Oberfläche, Dokumentation.
- **Kein Build-Schritt.** Node.js/npm sind nicht installiert. Reine HTML/CSS/JS-Dateien,
  three.js per Import-Map vom CDN. Python-Werkzeuge laufen über `.venv` (nur numpy).
- Inhalte gehören in `daten/`, nicht in den Code.
- **Anatomische Sorgfalt geht vor Vollständigkeit**: keine Fakten erfinden. Unsichere
  Angaben weglassen und den Nutzer bitten, sie aus dem Lehrbuch zu ergänzen. Automatisch
  erzeugte deutsche Namen immer auf Fehlübersetzungen prüfen (siehe unten).
- Vor dem Abschluss im Browser prüfen: `preview_start` mit dem Namen `physico`
  (`.claude/launch.json`), Konsole auf Fehler ansehen.

## Datenherkunft

**BodyParts3D** (© Database Center for Life Science, CC BY-SA 2.1 JP), Version 3.0:
934 OBJ-Dateien, benannt nach FMA-Kennungen, liegen unangetastet in `quelldaten/`. Zwei
Auflösungen (95 % und 99 % polygonreduziert). Der Lizenzhinweis muss überall erhalten bleiben.

**Dauerhaft nicht ins Modell übernommen**: 76 Strukturen, die für die Physiotherapie-Ausbildung
ohne Belang sind – auf Nutzerwunsch entfernt, nicht nur ausgeblendet, es gibt **keinen
Laufzeit-Schalter** dafür. Vier Systeme fehlen komplett, ausnahmslos: **Verdauung, Harnorgane,
Geschlechtsorgane, Haut**. Dazu einzeln entfernt: Hormondrüsen, Milz/Thymus, äußeres Ohr,
Zähne, Haare. Übrig bleiben 858 BodyParts3D-Strukturen. Die Rohdaten (`quelldaten/obj95`,
`quelldaten/obj99`) sind dabei unverändert geblieben; die Auswahl steckt in
`werkzeuge/aufbereiten.py --nurIds` (siehe „Pipeline" unten) bzw. – bei ganzen Ein-Struktur-
Bündeln wie zuletzt Haut/Verdauung/Harn/Geschlecht – im direkten Löschen der `.glb`-Datei plus
Entfernen des Eintrags aus `daten/strukturen.json`. Die Entscheidung steckt fest in den
Modelldateien und `daten/strukturen.json`.

**Nicht enthalten und deshalb selbst gebaut** (`werkzeuge/eigene_ebenen.py`):
periphere Nerven und Gelenke. Kennungen beginnen mit `PT-`. Ihre Koordinaten werden aus
den echten Knochen-Eckpunkten im Verzeichnis berechnet – niemals feste Zahlen eintragen,
sondern immer über die Anker-Klasse (`a.oben('humerus')`, `a.mitte('femur')` …).
Im Info-Panel werden sie als „eigene Ebene, Verlauf schematisch" gekennzeichnet.

## Koordinatensystem (verbindlich)

- Einheit **Meter**, Modellgröße ca. **1,63 m**, Boden = `y = 0`.
- `y` nach oben, `+z` nach vorne, **`+x` = linke Körperseite**.
- BodyParts3D liefert Millimeter mit Z = Höhe und −Y = vorne; die Umrechnung steckt in
  `in_unser_system()` in `werkzeuge/aufbereiten.py`.

## Erscheinungsbild (Design)

Wabi-Sabi-Anmutung, auf Nutzerwunsch: warmes Papier statt Bildschirm-Schwarz, gebranntes
Olive als Akzent, ein gedecktes Graugrün als zweite Stimme. Alle Farbvariablen stehen an
**einer** Stelle: `css/farben.css` (`--creme`, `--papier`, `--olive*`, `--graugruen*`,
`--rand`, `--stufe-*`, `--richtig`/`--falsch`). Jede Seite lädt diese Datei zusätzlich zu
ihrem eigenen Stylesheet – ein `<link>` mehr, dafür keine doppelte Palette. (Früher führten
`start.css` und `style.css` dieselben Werte doppelt; das ist erledigt.)

- Schrift: **Fraunces** (Google Fonts, per `<link>` in `index.html`/`modell.html`) für
  Überschriften und Strukturnamen; Fließtext/UI bleibt bei der System-Schriftart.
- Die **3D-Bühne bleibt bewusst dunkel** (warmes Olive-Anthrazit `#26241b`, `BUEHNEN_GRUNDTON`
  in `js/buehne.js`, nicht Creme) – wie ein Museumssockel im Spotlight, damit Knochen/Muskeln
  vor dem Hintergrund gut zu erkennen bleiben. Nur die Bedienleisten drumherum sind hell.
- **Anatomische Gewebefarben** (`js/materialien.js`, `GEWEBE`) sind bewusst unangetastet:
  Knochen elfenbein, Muskeln dunkelrot, Arterien rot/Venen blau usw. folgen medizinischer
  Konvention, nicht der Deko-Palette. Nur die **Auswahl-Hervorhebung** (vorher Cyan, jetzt
  warmes Gold-Olive `#D9B24C`, in `hervorhebungsMaterial()` und `auswahl.js`) gehört zur
  UI-Palette und darf mitgehen.
- Bewegungsachsen der Gelenke (orange/blau/violett, `werkzeuge/eigene_ebenen.py`) bleiben
  ebenfalls unverändert – sie brauchen maximale Unterscheidbarkeit, nicht Stimmigkeit mit
  der Palette.
- **Dekorative Hintergrundgrafiken** (rein schmückend, ohne Bedeutung, `pointer-events:none`,
  auf hellem Grund `z-index:0`/`-1` immer hinter dem eigentlichen Inhalt): fließende, weich
  ausgeblurte Flächen in Olive/Graugrün auf Creme (inline `<svg>` in `index.html`, Farbstopps
  als Klassen `.deko-stop-*` in `start.css` – lesen `var(--olive-hell)` etc., ziehen also mit,
  wenn sich die Palette ändert) bzw. `::before`-Pseudoelemente mit Daten-URI-SVG hinter
  `#bedienleiste`/`#info-panel` in `style.css` (dort **feste** Hex-Werte, da Daten-URIs keine
  CSS-Variablen lesen können – bei Palettenänderung von Hand nachziehen). Auf der dunklen
  3D-Bühne die Umkehrung: `erzeugeHintergrund()` in `js/buehne.js` malt per Canvas 2D ein
  paar sehr leise Creme-/Beige-/Graugrün-Flecken (radiale Verläufe, `globalCompositeOperation
  = 'lighter'`, Deckkraft 0.05–0.10) auf den Olive-Anthrazit-Grundton und liefert das Ergebnis
  als `THREE.CanvasTexture` für `szene.background` – kein Live-Rendering, einmalig beim Start.
- Wird eine CSS- oder JS-Datei angefasst: Versionsquery **in der ladenden Datei** hochzählen
  (`?v=N`), sonst zeigt der Browser wegen des harten `no-store`-Servers zwar meist die neue
  Fassung, aber ältere, schon vor dem Cache-Fix geladene Tabs können noch eine alte Kopie im
  Speicher haben. Achtung bei `js/buehne.js`: die Nummer steht nicht in einer HTML-Datei,
  sondern in den `import`-Zeilen von `js/main.js` **und** `js/bone-prep.js` – beide nachziehen.

## Pipeline (Python, in `werkzeuge/`)

```bash
# --nurIds ist optional: Textdatei mit einer Kennung pro Zeile, beschränkt die Verarbeitung
# auf genau diese Strukturen (so wurden die 72 irrelevanten dauerhaft ausgeschlossen).
# --wieIndex übernimmt System/Region aus einem vorhandenen Verzeichnis, damit beide
# Detailstufen identisch aufgeteilt sind – bei Änderungen an der Auswahl immer
# daten/strukturen.json (das aktuelle, kombinierte Verzeichnis) als --wieIndex verwenden.
.venv/bin/python werkzeuge/aufbereiten.py --obj quelldaten/obj95/BodyParts3D_3.0_obj_95 \
    --ziel modelle --index daten/strukturen_fein.json --stufe fein \
    --wieIndex daten/strukturen.json [--nurIds datei.txt]
.venv/bin/python werkzeuge/aufbereiten.py --obj quelldaten/obj99/BodyParts3D_3.0_obj_99 \
    --ziel modelle_grob --index daten/strukturen_grob.json --stufe grob \
    --wieIndex daten/strukturen.json [--nurIds datei.txt]
# danach beide Indizes zu daten/strukturen.json zusammenführen (siehe README)
# und verwaiste .glb-Dateien in modelle/ und modelle_grob/ löschen, deren Bündel
# nicht mehr in daten/strukturen.json vorkommen.
.venv/bin/python werkzeuge/eigene_ebenen.py        # Nerven und Gelenke
.venv/bin/python werkzeuge/namen.py                # deutsche Namen + Lerninhalte
.venv/bin/python werkzeuge/knochen_stufen.py       # Übungsstufen für Bone-Prep
```

`aufbereiten.py` schreibt GLB-Dateien selbst (kein Fremdpaket) und arbeitet bündelweise,
damit der Speicher auf dem 8-GB-Rechner reicht. Bündel = `{system}_{region}`. Wird durch
`--nurIds` ein ganzes Bündel leer, taucht es im neuen Verzeichnis einfach nicht mehr auf –
die zugehörige alte `.glb`-Datei danach von Hand löschen.

`knochen_stufen.py` liest `daten/strukturen.json` + `daten/namen_de.json` und schreibt
`daten/knochen_stufen.json` – die Einteilung der Knochen in die drei Übungsstufen von
Bone-Prep. **Pro Knochen steht dort eine Liste von Einordnungen**, nicht ein einzelnes
`stufe`-Feld: `{ FMA-Kennung: { region, einordnungen: [{ stufe, name, latein }, …] } }`,
Name **ohne** Seitenangabe. Meist genau ein Eintrag – **gleichartig aufgebaute Gruppen
bekommen zwei**: generisch bei Praxis, genau bei Extra. Derselbe physische Knochen taucht so
unter zwei verschiedenen Namen in zwei Stufen auf; die Antwort-Gruppierung in
`js/bone-prep.js` (`ladeKnochen()`) iteriert entsprechend über `einordnungen`, nicht über ein
einzelnes Feld. Welche Gruppe wie gekürzt wird, steht in `ZWEI_STUFEN_GRUPPEN` – jede
Gruppenliste bringt ihre eigene Kürzungsfunktion mit, weil die deutschen Namen verschieden
aufgebaut sind: `NUMERIERTE_GRUPPEN` (Wirbel, Rippen, Mittelhand-/Mittelfußknochen) →
`ohne_nummer()` schneidet „6. " ab, `GLIED_GRUPPEN` (Finger-/Zehenglieder) →
`ohne_finger_zehe()` schneidet alles ab „ · " ab („Grundglied · Daumen" → „Grundglied").
`EXTRA_VORRANG` wird **vor** beiden geprüft, sonst würden Bandscheiben („Bandscheibe · 3.
Lendenwirbel") fälschlich gekürzt und in Praxis auftauchen.
Stand heute 240 Knochen: **Basis 15 / Praxis 11 / Extra 132 verschiedene Antworten**.
Die Zuordnung steckt in den Stichwortlisten oben in der Datei; nach jedem Lauf von
`namen.py` erneut laufen lassen, sonst passen deutsche Namen und Stufen nicht zusammen.
Bänder und Membranen sind ausgeschlossen (sind keine Knochen), Bandscheiben und
Rippenknorpel bleiben dagegen bewusst in Stufe 3. Kein `'skull'`- und kein `'coccyx'`-
Stichwort: BodyParts3D hat weder Schädel noch Steißbein als eigene Struktur, nur die
Einzelknochen bzw. gar nichts – diese Stichwörter würden nie greifen. **Praxis ist bewusst
eng gehalten** (nur `calcaneus`, `talus` plus die generischen Wirbel/Rippen-Gruppen): die
kleinen Handwurzel-/Fußwurzelknochen (Kahnbein, Mondbein, die drei Keilbeine, …) sind selbst
im Lehrbuch die am schwersten zu unterscheidende Gruppe und fallen deshalb automatisch nach
Extra durch, statt als eigenes Stichwort in `PRAXIS_STUFE` zu stehen.

## Architektur (JavaScript)

Vier Seiten: `index.html` ist die **Startseite** (reines HTML/CSS ohne Skript,
`css/start.css`), `modell.html` das **3D-Modell** (bildschirmfüllend, `css/style.css`,
`js/main.js`), `vorbereitung.html` die **Übungsauswahl** (nutzt ebenfalls `css/start.css`)
und `bone-prep.html` die **erste Übung** (`css/quiz.css`, `js/bone-prep.js`).

Die Startseite hat bewusst nur drei Einstiege: **Modell ansehen** (führt nach
`modell.html`), **Vorbereitung** (führt nach `vorbereitung.html`) und **Prüfungen**.
Der letzte ist noch nicht ausgearbeitet und als `.wahl.bald` markiert (gestrichelter Rand,
Marke „folgt", kein Link). Nichts anderes gehört auf diese Seite – Zahlen, Statistiken und
Erklärtexte wurden bewusst entfernt.

| Datei | Aufgabe |
|---|---|
| `js/buehne.js` | Szene, Licht, Umgebungslicht (RoomEnvironment), Tone Mapping, Steuerung, Kameraflug, Bildschleife – **von allen 3D-Seiten geteilt** |
| `js/main.js` | Modell-Viewer: setzt Bühne, Katalog, Bedienleiste, Auswahl und Panel zusammen; `window.physico` zum Nachsehen |
| `js/bone-prep.js` | Übung „Erkennen": Runde bauen, Knochen zeigen, Antworten prüfen, Auswertung |
| `js/katalog.js` | Verzeichnis, Bündel laden/entladen, Detailstufen, eigene Ebenen |
| `js/materialien.js` | Gewebematerialien; `setzeDeckkraft()` schaltet Transparenz nur bei Bedarf ein |
| `js/ui.js` | Systeme, Körperbereiche, Suche, Transparenzregler |
| `js/auswahl.js` | Raycasting, Materialtausch beim Hervorheben, Gelenkachsen |
| `js/panel.js` | Info-Panel; `FELDER` legt fest, welche Angaben erscheinen |
| `js/formen.js` | Grundformen für die eigene Ebene |

| Stylesheet | Für |
|---|---|
| `css/farben.css` | die Palette – von **allen** Seiten zusätzlich geladen |
| `css/start.css` | Startseite und Vorbereitung (heller Grund, Karten, Klappmenüs `.klapp-*`) |
| `css/style.css` | Modell-Viewer |
| `css/quiz.css` | Übungsseiten |

Wichtige Konventionen:

- **Sichtbarkeit hat genau einen Ort**: `katalog.sichtbarkeitAnwenden()` filtert nach
  Körperbereich (`katalog.region`). Nie direkt `mesh.visible` von außen setzen. Ebenso ist
  `bedienleiste.aktiveSysteme` die einzige Wahrheit für die Systemhäkchen, angewandt über
  `_anwenden()` – die Liste wird nach dem Aufbau nie neu gebaut, sonst laufen Häkchen und
  Sichtbarkeit auseinander.
- Es gibt bewusst **keinen Laufzeit-Filter** für „was ist physio-relevant" mehr (gab es
  früher als Schalter über `daten/relevanz.json`) – auf Nutzerwunsch dauerhaft in die Daten
  eingebacken, siehe „Datenherkunft". Neue Wünsche dieser Art nicht als Toggle nachbauen,
  sondern mit dem Nutzer klären, ob wieder dauerhaft entfernt/ergänzt werden soll.
- Das Modell lässt sich über die Adresszeile vorbelegen; ausgewertet wird sie einmalig in
  `bedienleiste.ausAdresse()` (`bereich`, `systeme`, `struktur`). Neue Parameter gehören
  dorthin, nicht verstreut in andere Module. Für „Vorbereitung" und „Prüfungen" ist das der
  vorgesehene Weg, gezielte Ansichten zu öffnen.
- Die zuletzt gewählte Struktur wird weiterhin unter dem `localStorage`-Schlüssel
  `physico:zuletzt` (`{id, name, zeit}`) abgelegt – aktuell zeigt sie niemand an, für
  „Vorbereitung" ist sie aber schon da.
- Jedes Mesh trägt `userData.id`, `userData.system`, `userData.buendel`.
- Materialien sind **geteilt** (ein Material pro Gewebe). Hervorheben tauscht deshalb das
  Material aus und legt das Original in `userData.grundmaterial` ab.
- Ein neues Anzeigefeld = Eintrag in `FELDER` (`js/panel.js`) + Feld in `eigene_inhalte.json`.
- `fliegeZu(objekt, sofort, bildfeld)` in `buehne.js` rahmt ein Objekt ein und rechnet dabei
  das **Seitenverhältnis** mit (schmales Fenster = Kamera weiter weg) sowie die Flächen, die
  über der Bühne liegen (`nutzHoehe`, `versatzHoch`, `rand`). Im Quiz misst
  `freiesBildfeld()` diese Werte aus dem echten Layout aus – keine festen Zahlen eintragen.
- Die Größe der Bühne hängt an einem `ResizeObserver` auf dem Behälter, nicht nur am
  `resize`-Ereignis des Fensters – das kommt im eingebetteten Browser nicht zuverlässig.

## Übungen (Vorbereitung)

`vorbereitung.html` zeigt je Prep-Modul eine Karte mit zwei Klappmenüs: **Stufe**
(Basis / Praxis / Extra) und **Modus**. Beide sind frei kombinierbar; die Auswahl landet in
der Adresszeile des Links (`bone-prep.html?stufe=1&modus=erkennen`) und wird unter
`localStorage['physico:vorbereitung']` gemerkt (`{"bone:stufe":"1","bone:modus":"erkennen"}`).
Ein neues Modul oder ein neuer Modus = `.vorbereitung-eintrag[data-prep]` mit `.klapp`-Menüs
in der Seite; das Skript unten in der Datei bedient jedes davon automatisch.

Regeln für die Übungen selbst (Nutzerwunsch, gilt für alle kommenden Modi):

- **Kein fester Fragenzähler.** Ein Durchlauf fragt **alle** Knochen der gewählten Stufe ab,
  bei jedem Durchlauf neu gemischt (`baueLauf()` in `js/bone-prep.js`). Kommt man ohne
  „Beenden" bis zum Schluss, werden alle dabei falsch beantworteten Knochen automatisch in
  einem neuen, wieder gemischten Lauf noch einmal gefragt (`naechsterLaufOderEnde()`) – so
  lange, bis ein Lauf ganz ohne Fehler durchlief. Erst dann erscheint die Auswertung
  („Alles gelernt.", mit Trefferquote des ersten Versuchs je Knochen). Der Fortschritt zeigt
  bei diesen Wiederholungsläufen zusätzlich „Wiederholung · " vor der Fragennummer.
- **„Beenden"-Knopf jederzeit** (`#beenden-knopf` im Kopf) bricht sofort ab. Die Auswertung
  zeigt dann **nur** die aktuell noch offenen Fehler, ohne Trefferquote – die Runde wurde ja
  nicht zu Ende gespielt. Aktueller Stand je Knochen steckt in der Map `stand` (Name →
  `{ loesung, gewaehlt, richtig }`, überschreibt sich bei jedem neuen Versuch); `jeFalsch`
  merkt sich zusätzlich, welche Knochen *irgendwann* falsch waren, für die Statistik am Ende.
  „Fehler üben" auf der Auswertung startet einen neuen, kompletten Mini-Durchlauf mit genau
  den noch offenen Knochen (ruft `startLauf()` erneut auf).
- **Während der Runde keine Rückmeldung.** Nach dem Klick wird die gewählte Antwort nur
  neutral markiert (`.gewaehlt`, olive – kein Grün, kein Rot), dann kommt sofort die nächste
  Frage. Ob es stimmte, steht **erst in der jeweiligen Auswertung**.
- **Antworten zeigen zuerst nur den medizinischen Namen** (kursiv, „Femur"). Der
  umgangssprachliche Name („Oberschenkelknochen") steht darunter, aber verschwommen
  (`.antwort-verdeckt`, CSS `filter: blur()`) – das ist die eigentliche Herausforderung.
  **Zwei Klicks pro Wahl**: der erste auf eine Antwort deckt nur **deren eigenen**
  umgangssprachlichen Namen auf (`klickAntwort()` in `js/bone-prep.js`, setzt zusätzlich
  zur `.aufgedeckt`-Klasse direkt `element.style.filter = 'none'` – nicht nur auf die
  CSS-Klasse verlassen), ohne zu wählen; man darf dabei mehrere Antworten ansehen. Erst ein
  zweiter Klick auf eine **bereits aufgedeckte** Antwort wählt sie (`nimmAntwort()`). Fehlt
  der lateinische Name im Wörterbuch (aktuell nur Atlas/Axis, die ihn schon im Namen
  tragen), entfällt die Verdeckung und ein einziger Klick wählt direkt.
- Links und rechts sind **dieselbe Antwort**; gefragt wird nach dem Namen, nicht nach der Seite.
- Ablenker kommen aus derselben Stufe, bevorzugt aus derselben Körperregion.
- **Alle drei Stufen zeigen den Knochen im ganzen Skelett**, nie isoliert – die Lage im
  Körper gehört zum Erkennen dazu. Deshalb lädt `bone-prep.js` beim Start einmalig alle
  Skelett-Bündel in grober Auflösung (wie zuvor nur die Basis-Stufe) und schaltet je Frage
  nur Material/Hervorhebung um (`zeigeKnochen()`), statt pro Frage einzelne Bündel nach- und
  wieder abzuladen. `fliegeZu()` rahmt dabei nur den gesuchten Knochen samt etwas Umgebung
  ein (`rand: 2.2` in `freiesBildfeld()`), nicht das ganze Skelett.

## Leistung (auf 8 GB RAM / M2 geprüft)

- Skelett + Muskeln geladen (nach Entfernen der 76 irrelevanten Strukturen): 686 Meshes,
  4,4 Mio. Dreiecke, ~7–38 ms pro Bild, ~140 MB JS-Speicher.
- Drei Dinge halten das schnell und dürfen nicht ohne Grund geändert werden:
  `renderer.shadowMap.autoUpdate = false` (Schatten nur nach Änderungen neu berechnen),
  Materialien standardmäßig `transparent: false`, und `side: FrontSide`.
- Beim Regionswechsel werden Bündel außerhalb der Region entladen (`entladeBuendel`).

## Typische Fallen

- **Namensautomatik**: `werkzeuge/namen.py` übersetzt über ein Wörterbuch. Nur ganze Wörter
  matchen (`\b…\b`) und für Muskeln wird das Knochenwörterbuch **nicht** benutzt – sonst
  wurde aus „fibularis brevis" schon einmal „Wadenbein". Nach Änderungen Stichprobe prüfen.
- **Beide Detailstufen** müssen dieselbe Bündelaufteilung haben, sonst fehlen beim
  Umschalten Strukturen (`--wieIndex`).
- Nach einem Lauf mit `--nurIds`: alte `.glb`-Dateien in `modelle/` und `modelle_grob/`,
  deren Bündel im neuen `daten/strukturen.json` nicht mehr vorkommen, von Hand löschen –
  sonst bleiben verwaiste, nie mehr referenzierte Dateien liegen.
- Beim Messen der Bildrate im eingebetteten Browser: `requestAnimationFrame` wird
  gedrosselt, wenn die Vorschau ausgeblendet ist. Stattdessen `renderer.render` direkt
  messen. **Auch der Kameraflug steht dann still** (`flugSchritt` hängt an derselben
  Schleife) – nicht mit einem Fehler verwechseln: Vorschau einblenden, dann läuft er.
- **`getComputedStyle()` im eingebetteten Browser kann veraltete Werte liefern**, auch für
  Inline-Styles, die gerade eben per JS gesetzt wurden (beobachtet bei CSS-`filter`-
  Übergängen). Ein Screenshot nach dem Klick zeigt den echten Zustand zuverlässiger als
  ein sofortiges `getComputedStyle`-Auslesen über den JS-Kanal des Tools.
- `daten/knochen_stufen.json` wird aus `daten/namen_de.json` gebaut. Nach jeder Änderung an
  `namen.py` **beide** Skripte laufen lassen, sonst stehen im Quiz alte Namen.

## Sinnvolle nächste Schritte

1. **Weitere Bone-Prep-Modi** (der Modus-Schalter ist schon da, bisher nur „Erkennen"):
   z. B. Name gegeben → Knochen anklicken; Tastfrage (Palpation); Nachbarschaft/Gelenkpartner.
2. **Muscle-Prep und Joint-Prep** nach demselben Muster – Karten und Klappmenüs stehen bereit.
3. **Lernstatistik über Runden hinweg** in `localStorage` (Fehlerliste, Wiederholung nach
   Zeitabstand à la Leitner).
4. **Gruppen**: `verzeichnis.gruppen` (aus `composite_parts.txt`) nutzen, damit „Deltoideus"
   alle drei Anteile gemeinsam auswählt.
5. **Eigene Notizen** je Struktur im Browser speichern.
6. **Bewegung animieren**: Knochen in eine Eltern-Kind-Kette hängen und um die in
   `eigene_ebenen.py` definierten Achsen drehen.
7. Weitere periphere Nerven ergänzen (N. obturatorius, N. suralis, Interkostalnerven).
