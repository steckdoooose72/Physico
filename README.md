# Physico

Ein interaktives 3D-Anatomiemodell des Menschen zum Lernen – gebaut für die Vorbereitung
auf die Physiotherapie-Ausbildung.

Das Modell besteht aus **echten, einzeln benannten anatomischen Strukturen** (nicht aus
Platzhalterformen): 858 Meshes aus dem Datensatz BodyParts3D plus eine eigene Ebene für
periphere Nerven und Gelenke. Enthalten ist, was für die Physiotherapie-Ausbildung zählt –
Verdauung, Harn- und Geschlechtsorgane sowie Haut sind komplett nicht Teil des Modells,
ebenso Hormondrüsen, Milz/Thymus, das äußere Ohr, Zähne und Haare (Begründung unter
„Was fehlt und warum").

| System | Strukturen |
|---|---|
| Skelett | 249 – jeder Wirbel, jede Rippe, jeder Hand- und Fußknochen einzeln |
| Muskulatur | 437 – bis hinunter zu einzelnen Muskelköpfen und -anteilen |
| Gehirn und Rückenmark | 99 |
| Herz und Gefäße | 65 |
| Atemwege | 8 (Lunge, Luftröhre, Bronchien, Schildknorpel) |
| **Periphere Nerven** (eigene Ebene) | 18 – Ischias, Medianus, Radialis, Ulnaris u. a. |
| **Gelenke klinisch** (eigene Ebene) | 21 – mit Gelenktyp, Normwerten und Bewegungsachsen |

---

## 1. Starten

**Doppelklick auf `start.command`.** Der Browser öffnet die **Startseite**.
Das Terminal-Fenster dabei offen lassen – dort läuft der kleine Webserver.
Beenden mit `Strg + C` oder Fenster schließen.

Die Startseite (`index.html`) hat drei Einstiege:

1. **Modell ansehen** – das 3D-Modell zum freien Erkunden (`modell.html`)
2. **Vorbereitung** – noch nicht eingerichtet
3. **Prüfungen** – noch nicht eingerichtet

Im Modell führt oben links „← Startseite" zurück.

> Kommt eine Änderung an HTML oder CSS im Browser nicht an, hat er die alte Fassung noch
> im Zwischenspeicher: mit **Cmd + Shift + R** hart neu laden.

Alternativ im Terminal:

```bash
cd ~/Physicoo && python3 -m http.server 8000
```

Dann `http://localhost:8000` aufrufen.

> Warum ein Server? Der Browser darf beim direkten Doppelklick auf `index.html` keine
> Modelldateien nachladen. Python bringt der Mac schon mit – mehr braucht es nicht.
> Beim ersten Start wird die 3D-Bibliothek three.js aus dem Internet geladen.

## 2. Bedienung

| Aktion | Wirkung |
|---|---|
| Linke Maustaste ziehen | drehen (360°) |
| Scrollen / Pinch | zoomen |
| Rechte Maustaste ziehen | verschieben |
| Maus über eine Struktur | Name erscheint an der Maus |
| Klick auf Struktur | Struktur leuchtet auf, rechts erscheinen alle Angaben |
| Taste `R` | Startansicht wiederherstellen |
| Suchfeld | deutsch oder lateinisch suchen, Klick fliegt hin |
| Systeme (Häkchen) | System ein-/ausblenden, wird bei Bedarf nachgeladen |
| Körperbereich | auf eine Region beschränken – dann in voller Auflösung |
| Regler | alles außer dem Skelett durchsichtig schalten |

Bei einem Gelenk erscheinen zusätzlich die **Bewegungsachsen** als farbige Linien:
orange = Flexion/Extension, blau = Ab-/Adduktion, violett = Rotation.

### Vorbereitung: Bone-Prep

Über **Vorbereitung → Bone-Prep** übst du Knochennamen. Auf der Karte wählst du
**Stufe** und **Modus**; beides lässt sich frei kombinieren und wird für das nächste Mal
gemerkt.

| Stufe | Antworten | Was drankommt |
|---|---|---|
| Basis | 15 | die großen Leitknochen plus Unterkiefer/Atlas/Axis – leuchtet im ganzen Skelett auf |
| Praxis | 19 | Wirbeltyp und Rippe **generisch** („Rippe", nicht „6. Rippe"), Hand- und Fußwurzel – schwebt allein, drehbar |
| Extra | 119 | dieselben Wirbel/Rippen jetzt mit **genauer Nummer**, einzelne Schädelknochen, Finger-/Zehenglieder, Rippenknorpel, Bandscheiben |

Eine Runde sind 10 Fragen. **Während der Runde erfährst du nicht, ob eine Antwort
stimmte** – erst am Ende kommt die Auswertung mit der Trefferzahl und der Liste dessen,
was noch nicht saß. Von dort führt „Fehler üben" direkt eine kurze Runde mit genau diesen
Knochen. Links und rechts zählen als dieselbe Antwort.

Jede Antwort zeigt zuerst nur den **medizinischen Namen** („Femur"); der umgangssprachliche
Name darunter ist verschwommen. Ein Klick deckt ihn auf („Oberschenkelknochen") – du darfst
dabei mehrere Antworten ansehen. Erst ein **zweiter Klick auf dieselbe, schon aufgedeckte**
Antwort wählt sie als deine Antwort.

### Detailstufen

Der volle Datensatz ist über 600 MB groß – zu viel, um ihn auf einmal zu laden.
Deshalb gibt es zwei Stufen, zwischen denen automatisch gewechselt wird:

- **Ganzer Körper** → Übersichtsstufe (147 MB, schnell)
- **Ein Körperbereich gewählt** → feine Stufe für diesen Bereich (volle Auflösung)

## 3. Was echt ist, was fehlt und was nicht

Ehrlich getrennt, damit du beim Lernen weißt, worauf du dich verlassen kannst:

**Echte Messdaten** (BodyParts3D, aus einem realen Körperscan abgeleitet):
Knochen, Muskeln, Organe, große Gefäße, Gehirn. Form, Größe und Lage stimmen.

**Was fehlt und warum**: BodyParts3D enthält ursprünglich 934 Strukturen. 76 davon sind
dauerhaft nicht Teil des Modells. Vier ganze Systeme fehlen komplett, ausnahmslos:
**Verdauung** (Leber, Magen, Darm, Gallenblase, Pankreas, Speiseröhre), **Harnorgane**
(Nieren, Harnleiter, Harnblase), **Geschlechtsorgane** und **Haut**. Dazu weitere
Einzelstrukturen ohne Belang für die Ausbildung: Hormondrüsen, Milz und Thymus, das äußere
Ohr, alle 32 Zähne, Zahnfleisch und Haare. Bewusst **behalten** wurden dagegen Herz, Gefäße,
Lunge und Luftröhre (Kreislauf, Atemtherapie, kardiale Reha) sowie Gehirn und Rückenmark
(neurologische Reha).

Das ist meine fachliche Einschätzung, kein Lehrplan. Vermisst du etwas, sag Bescheid oder
ergänze es direkt: Die betroffenen OBJ-Dateien liegen weiterhin unangetastet in
`quelldaten/obj95` bzw. `quelldaten/obj99` – siehe „Entfernte Strukturen wieder ergänzen".

**Von uns ergänzt** (Kennung beginnt mit `PT-`): periphere Nerven und Gelenke.
Diese fehlen im freien Datensatz vollständig. Ihre Punkte sind **an den echten Knochen
ausgerichtet** (berechnet aus den tatsächlichen Koordinaten von Femur, Humerus & Co.),
der Verlauf dazwischen ist aber **schematisch** – gut zum Verstehen von Verlauf und
Engstellen, nicht als anatomischer Beleg.

**Die Texte** (Ursprung, Ansatz, Funktion, Innervation, Palpation, Normwerte) sind
Lernnotizen zur Prüfungsvorbereitung. Prüfe sie gegen dein Lehrbuch und korrigiere
direkt in `daten/eigene_inhalte.json` – genau dafür ist das Projekt da.

## 4. Selbst erweitern

### Eigene Lerninhalte ergänzen (der häufigste Fall)

Öffne `daten/eigene_inhalte.json`. Schlüssel ist ein Stück aus dem englischen
Originalnamen; jede Struktur, die diesen Namen enthält, bekommt die Angaben:

```json
"gracilis": {
  "de": "Schlanker Muskel",
  "latein": "M. gracilis",
  "ursprung": "Unterer Schambeinast",
  "ansatz": "Pes anserinus superficialis an der Tibia",
  "funktion": "Adduktion der Hüfte, Beugung und Innenrotation im Knie",
  "innervation": "N. obturatorius (L2–L4)",
  "notiz": "Zweigelenkig – bei Adduktorenzerrungen immer mit prüfen."
}
```

Danach einmal die Namensdatei neu erzeugen:

```bash
cd ~/Physicoo && .venv/bin/python werkzeuge/namen.py && .venv/bin/python werkzeuge/knochen_stufen.py
```

Seite im Browser neu laden – fertig. `"gracilis"` trifft dann automatisch
„left gracilis" und „right gracilis". Das zweite Skript baut die Übungsstufen von
Bone-Prep neu; ohne den Schritt stünden dort noch die alten Namen.

### Bone-Prep umsortieren

Welcher Knochen in welcher Stufe abgefragt wird, steht in den Stichwortlisten oben in
`werkzeuge/knochen_stufen.py` (`BASIS_STUFE`, `PRAXIS_STUFE`, …) – englische Namen, weil
die Originaldaten englisch sind. Verschiebe einen Eintrag zwischen den Listen und lass das
Skript neu laufen; es zeigt danach alle Antworten je Stufe an, sodass du das Ergebnis
gleich prüfen kannst.

### Nerven und Gelenke anpassen

Die eigene Ebene wird in `werkzeuge/eigene_ebenen.py` berechnet – dort stehen die
Verläufe als Punkte relativ zu echten Knochen (`a.oben('humerus')`, `a.mitte('femur')` …).
Nach einer Änderung:

```bash
cd ~/Physicoo && .venv/bin/python werkzeuge/eigene_ebenen.py && .venv/bin/python werkzeuge/namen.py
```

### Direkt in eine bestimmte Ansicht springen

Das Modell versteht Vorgaben in der Adresszeile. Damit lassen sich später aus
„Vorbereitung" und „Prüfungen" heraus gezielte Ansichten öffnen – und du kannst dir
Lesezeichen auf deine Lernthemen legen:

| Parameter | Bedeutung | Beispiel |
|---|---|---|
| `bereich` | Körperbereich | `kopf`, `hals`, `rumpf`, `becken`, `arm`, `bein` |
| `systeme` | eingeschaltete Systeme, mit Komma | `skelett,muskeln,nervenbahnen` |
| `struktur` | Struktur auswählen und hinfliegen | `FMA24474` (rechter Femur) |

Beispiel: `modell.html?bereich=becken&systeme=skelett,muskeln,gelenkpunkte`

Die Kennung einer Struktur steht im Info-Panel ganz unten unter „Kennung / Quelle".

### Entfernte Strukturen wieder ergänzen

76 Strukturen (siehe oben) sind nicht Teil des Modells. Die Rohdaten dazu liegen weiterhin
unangetastet in `quelldaten/obj95` und `quelldaten/obj99` – nichts wurde gelöscht, nur beim
Aufbau der `.glb`-Dateien ausgelassen. Um z. B. die Milz zurückzuholen:

1. In `werkzeuge/aufbereiten.py` das Skript einmal **ohne** `--nurIds` laufen lassen (baut
   wieder den vollen Datensatz aus 934 Strukturen), oder gezielt eine eigene Liste mit
   Kennungen bauen, die du behalten willst, und mit `--nurIds meine_liste.txt` übergeben.
2. Für beide Detailstufen wiederholen (`obj95` für fein, `obj99` für grob),
   jeweils mit `--wieIndex daten/strukturen.json`, damit die Bündelaufteilung erhalten bleibt.
3. Danach `werkzeuge/eigene_ebenen.py` und `werkzeuge/namen.py` neu laufen lassen.

Betrifft es eine Struktur, die (wie zuletzt Haut, Verdauung, Harn- und Geschlechtsorgane)
ein ganzes, eigenes Bündel für sich allein war, geht es schneller: die `.glb`-Datei in
`modelle/` und `modelle_grob/` existiert dann noch gar nicht (sie wurde gelöscht) – einfach
den Bündel-Eintrag wieder in `daten/strukturen.json` ergänzen und Schritt 2 nur für dieses
eine Bündel ausführen.

Die genauen Aufrufe stehen in `CLAUDE.md` unter „Pipeline".

### Deutsche Namen verbessern

Rund 400 Strukturen tragen noch ihren lateinisch-englischen Originalnamen (z. B.
„M. flexor digitorum profundus"). Das ist für die Ausbildung meist sogar richtig so.
Willst du mehr eindeutschen, ergänze das Wörterbuch oben in `werkzeuge/namen.py`
und lass das Skript neu laufen.

## 5. Aufbau

```
index.html         Startseite (drei Einstiege, sonst nichts)
modell.html        das 3D-Modell
vorbereitung.html  Übungsauswahl (Bone-Prep, Muscle-Prep, Joint-Prep)
bone-prep.html     die Knochenübung
start.command      Startknopf
css/farben.css     die Farbpalette – von allen Seiten geladen
css/start.css      Aussehen von Startseite und Vorbereitung
css/style.css      Aussehen des Modells
css/quiz.css       Aussehen der Übungsseiten
js/buehne.js       Szene, Licht, Kamera, Kameraflug – von allen 3D-Seiten geteilt
js/main.js         setzt den Modell-Viewer zusammen
js/bone-prep.js    die Knochenübung: Runde, Fragen, Auswertung
js/katalog.js      lädt Verzeichnis und Modellbündel, Detailstufen, eigene Ebenen
js/materialien.js  Aussehen der Gewebe (Knochen, Muskel, Nerv …)
js/ui.js           Bedienleiste: Systeme, Körperbereiche, Suche
js/auswahl.js      Anklicken und Hervorheben
js/panel.js        Info-Panel rechts
js/formen.js       Grundformen für die eigene Ebene (Kugel, Pfad …)

daten/strukturen.json     Verzeichnis aller Strukturen (Lage, System, Region)
daten/namen_de.json       deutsche Namen + Lerninhalte  ← erzeugt
daten/knochen_stufen.json Übungsstufen für Bone-Prep    ← erzeugt
daten/eigene_inhalte.json deine Lerninhalte             ← hier schreibst du
daten/eigene_ebenen.json  Nerven und Gelenke            ← erzeugt

modelle/           feine Modellbündel (.glb, 610 MB)
modelle_grob/      Übersichtsbündel (.glb, 147 MB)
quelldaten/        Rohdaten von BodyParts3D (2,9 GB, nur zum Neuerzeugen nötig)
werkzeuge/         Python-Skripte für die Aufbereitung
```

Wenn du Platz brauchst: die entpackten Ordner `quelldaten/obj95` und `quelldaten/obj99`
(zusammen 2,2 GB) kannst du löschen – die ZIP-Dateien daneben genügen, um alles neu zu
erzeugen.

## 6. Nächste Ausbaustufen

1. Weitere Bone-Prep-Modi (z. B. „Klicke auf den Kalkaneus", Tastfragen)
2. Muscle-Prep und Joint-Prep nach demselben Muster
3. Lernstatistik über mehrere Runden hinweg
4. Eigene Notizen im Browser speichern
5. Bewegungen animieren (Flexion im Knie durchspielen)
6. Muskelgruppen als Ganzes auswählen (alle Anteile des Deltoideus zusammen)
7. Weitere Nerven ergänzen (N. obturatorius, N. suralis, Interkostalnerven)

## Quellen und Lizenz

Modelldaten: **BodyParts3D**, © The Database Center for Life Science,
lizenziert unter [CC Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.de).
Bei Weitergabe des Projekts muss dieser Hinweis erhalten bleiben und die Weitergabe
unter derselben Lizenz erfolgen.

3D-Darstellung: [three.js](https://threejs.org) (MIT-Lizenz).
