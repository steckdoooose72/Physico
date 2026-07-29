#!/usr/bin/env python3
"""
knochen_stufen.py – teilt die Knochen in die drei Übungsstufen ein.

Erzeugt daten/knochen_stufen.json für Bone-Prep:

    { "FMA24474": { "region": "bein", "einordnungen": [
        { "stufe": 1, "name": "Oberschenkelknochen", "latein": "Femur" }
    ] } }

Pro Knochen steht eine **Liste** von Einordnungen, meist mit genau einem Eintrag.
Durchnummerierte und gleichartig aufgebaute Gruppen bekommen zwei: generisch in
Praxis ("Rippe", "Grundglied"), genau in Extra ("6. Rippe", "Grundglied · Daumen")
– derselbe physische Knochen taucht so in zwei Stufen mit zwei verschiedenen
Namen auf. "name" ist immer ohne Seitenangabe – links und
rechts sind im Quiz dieselbe Antwort, mehrere Kennungen tragen deshalb denselben
Namen. "latein" ist der medizinische Name aus daten/namen_de.json; er fehlt, wo
das Wörterbuch in werkzeuge/namen.py keinen hinterlegt hat (dann zeigt das Quiz
nur den deutschen Namen – lieber nichts als etwas Erfundenes).

Die Stufen:
  1 Basis  – die großen Leitknochen, die immer sitzen müssen
  2 Praxis – alltagsrelevant und klar unterscheidbar: Wirbeltyp, Rippe,
             Fersenbein, Sprungbein, Mittelhand-/Mittelfußknochen und die
             Gliedtypen (Grund-, Mittel-, Endglied) – jeweils nur die Gruppe,
             ohne genaue Nummer bzw. ohne Finger/Zehe
  3 Extra  – die genaue Nummer bzw. der genaue Finger/die genaue Zehe dieser
             Gruppen, dazu die Hand- und Fußwurzelknochen (die kleinen, ähnlich
             benannten – „Keilbein" ×3, „Vieleckbein" ×2 … sind selbst im
             Lehrbuch die am schwersten zu unterscheidende Gruppe, gehören
             deshalb nicht zu „alltagsrelevant"), einzelne Schädelknochen,
             Rippenknorpel, Bandscheiben

Willst du etwas verschieben, änderst du die Listen unten und lässt das Skript
erneut laufen:

    .venv/bin/python werkzeuge/knochen_stufen.py
"""

import json
import os
import re

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERZEICHNIS = os.path.join(BASIS, 'daten', 'strukturen.json')
NAMEN = os.path.join(BASIS, 'daten', 'namen_de.json')
ZIEL = os.path.join(BASIS, 'daten', 'knochen_stufen.json')

# --- Stufe 1: Basis ---------------------------------------------------------
# Die großen Leitknochen plus die einzeln benannten (nicht nummerierten)
# Kopf-/Halsknochen. Bewusst eng gehalten: das ist der Einstieg.
BASIS_STUFE = [
    'femur', 'tibia', 'fibula', 'patella',
    'humerus', 'radius', 'ulna',
    'scapula', 'clavicle',
    'hip bone', 'sacrum', 'sternum',
    'mandible', 'atlas', 'axis',
    # Absichtlich KEIN 'skull': BodyParts3D hat keinen Schädel als eine
    # Struktur, nur die Einzelknochen (Stirnbein, Scheitelbein, …) – die
    # bleiben in Extra. Ein 'skull'-Eintrag hier würde nie greifen.
]

# --- Stufe 2: Praxis --------------------------------------------------------
# Bewusst eng: nur Knochen, die groß und eindeutig genug sind, um sie nicht mit
# Nachbarn zu verwechseln. Die kleinen Handwurzel-/Fußwurzelknochen (Kahnbein,
# Mondbein, die drei Keilbeine, …) stehen deshalb NICHT hier, sondern fallen
# unten automatisch nach Extra durch – dort sind feine Unterscheidungen richtig
# aufgehoben. Absichtlich auch KEIN 'coccyx': wie 'skull' hat BodyParts3D kein
# Steißbein als eigene Struktur, das Stichwort würde nie greifen.
PRAXIS_STUFE = [
    'calcaneus', 'talus',
]

# Gruppen, die nicht einfach in eine Stufe fallen, sondern zwei Einordnungen
# bekommen: die Gruppe generisch in Praxis, das einzelne Stück genau in Extra.
# Weil die deutschen Namen unterschiedlich aufgebaut sind, bringt jede Liste
# ihre eigene Kürzung mit (siehe ZWEI_STUFEN_GRUPPEN unter den Funktionen).

# Durchnummeriert: "6. Rippe", "3. Mittelhandknochen" -> ohne_nummer()
NUMERIERTE_GRUPPEN = [
    'cervical vertebra', 'thoracic vertebra', 'lumbar vertebra', 'rib',
    'metacarpal bone', 'metatarsal bone',
]

# Gliedtyp und Finger/Zehe: "Grundglied · Daumen" -> ohne_finger_zehe()
GLIED_GRUPPEN = [
    'proximal phalanx', 'middle phalanx', 'distal phalanx',
]

# --- Stufe 3: Extra ---------------------------------------------------------
# Alles Übrige landet automatisch hier – diese Liste dient nur der Dokumentation
# und dazu, Treffer aus Stufe 2 gezielt wieder herauszunehmen. Muss vor
# NUMERIERTE_GRUPPEN geprüft werden: eine Bandscheibe wie "intervertebral disk
# of first lumbar vertebra" enthält sonst fälschlich "lumbar vertebra".
EXTRA_VORRANG = [
    'costal cartilage',          # Rippenknorpel: nicht als "Rippe" zählen
    'intervertebral disk',       # Bandscheiben: kein Knochen im engeren Sinn
]

# Strukturen, die gar nicht abgefragt werden sollen.
AUSSCHLUSS = [
    'eyeball',                   # in BodyParts3D fälschlich unter Skelett einsortiert
    'set of',                    # Sammelbegriffe ("set of …") sind keine Einzelknochen
    # Bänder und Membranen liegen zwar im Skelett-System, sind aber keine Knochen –
    # sie gehören zu Joint-Prep. Bandscheiben und Rippenknorpel bleiben dagegen
    # bewusst in Stufe 3 (siehe EXTRA_VORRANG): beides ist im Alltag ständig Thema.
    'ligament',
    'membrane',
]

# Ganze Namen, die genau so ausgeschlossen werden (nicht als Wortsuche).
# „left costal cartilage" ist der Rippenknorpel als Sammelstück – als Antwort
# wäre er neben „3. Rippenknorpel" nicht eindeutig, beides wäre richtig.
AUSSCHLUSS_GENAU = [
    'left costal cartilage',
    'right costal cartilage',
]


def enthaelt(name, begriffe):
    """Prüft auf ganze Wörter – sonst träfe 'rib' auch 'cribriform'."""
    return any(re.search(rf'\b{re.escape(b)}\b', name) for b in begriffe)


def ohne_seite(name):
    """'Oberschenkelknochen (links)' -> 'Oberschenkelknochen'."""
    name = re.sub(r'\s*\((links|rechts|linker|rechter|linke)[^)]*\)\s*$', '', name)
    return name.strip()


def ohne_nummer(name):
    """'6. Rippe' -> 'Rippe' – die generische Antwort für Praxis."""
    return re.sub(r'^\d+\.\s+', '', name)


def ohne_finger_zehe(name):
    """'Grundglied · Daumen' -> 'Grundglied' – die generische Antwort für Praxis."""
    return name.split(' · ')[0].strip()


# Welche Gruppe wird womit gekürzt. Der Reihe nach geprüft; die Listen
# überschneiden sich nicht, die Reihenfolge ist also unkritisch.
ZWEI_STUFEN_GRUPPEN = [
    (NUMERIERTE_GRUPPEN, ohne_nummer),
    (GLIED_GRUPPEN, ohne_finger_zehe),
]


def main():
    with open(VERZEICHNIS, encoding='utf-8') as f:
        verzeichnis = json.load(f)
    with open(NAMEN, encoding='utf-8') as f:
        namen_de = json.load(f)

    ergebnis = {}
    uebersprungen = []

    for eintrag in verzeichnis['strukturen']:
        if eintrag['system'] != 'skelett':
            continue

        englisch = eintrag['name'].lower()
        if englisch in AUSSCHLUSS_GENAU or enthaelt(englisch, AUSSCHLUSS):
            uebersprungen.append(eintrag['name'])
            continue

        namen = namen_de.get(eintrag['id'], {})
        anzeige = ohne_seite(namen.get('de', eintrag['name']))

        # Nur übernehmen, wenn wirklich einer hinterlegt ist – und nicht, wenn er
        # ohnehin schon im deutschen Namen steht ("Atlas (1. Halswirbel)").
        latein = namen.get('latein')
        if latein and latein.lower() in anzeige.lower():
            latein = None

        def einordnung(stufe, name):
            wert = {'stufe': stufe, 'name': name}
            if latein:
                wert['latein'] = latein
            return wert

        # Gehört der Knochen zu einer Gruppe mit zwei Einordnungen? Dann steht
        # hier die passende Kürzung, sonst None.
        kuerzen = next(
            (k for begriffe, k in ZWEI_STUFEN_GRUPPEN if enthaelt(englisch, begriffe)),
            None,
        )

        if enthaelt(englisch, EXTRA_VORRANG):
            einordnungen = [einordnung(3, anzeige)]
        elif kuerzen:
            # Praxis fragt nur die Gruppe ab, Extra das genaue Stück.
            einordnungen = [einordnung(2, kuerzen(anzeige)), einordnung(3, anzeige)]
        elif enthaelt(englisch, BASIS_STUFE):
            einordnungen = [einordnung(1, anzeige)]
        elif enthaelt(englisch, PRAXIS_STUFE):
            einordnungen = [einordnung(2, anzeige)]
        else:
            einordnungen = [einordnung(3, anzeige)]

        ergebnis[eintrag['id']] = {
            'region': eintrag['region'],
            'einordnungen': einordnungen,
        }

    with open(ZIEL, 'w', encoding='utf-8') as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=0)

    # --- Kurzbericht, damit Fehleinordnungen sofort auffallen ---------------
    print(f'{len(ergebnis)} Knochen eingeteilt, {len(uebersprungen)} übersprungen '
          f'({", ".join(uebersprungen) if uebersprungen else "keine"})\n')

    for stufe, titel in [(1, 'Basis'), (2, 'Praxis'), (3, 'Extra')]:
        antworten = sorted({
            e['name'] + (f' ({e["latein"]})' if e.get('latein') else '')
            for w in ergebnis.values() for e in w['einordnungen'] if e['stufe'] == stufe
        })
        print(f'--- {titel}: {len(antworten)} verschiedene Antworten')
        print('    ' + '; '.join(antworten[:24]))
        if len(antworten) > 24:
            print(f'    … und {len(antworten) - 24} weitere')
        print()

    ohne_latein = sorted({
        e['name'] for w in ergebnis.values() for e in w['einordnungen'] if not e.get('latein')
    })
    print(f'--- ohne medizinischen Namen: {len(ohne_latein)}')
    if ohne_latein:
        print('    ' + '; '.join(ohne_latein))


if __name__ == '__main__':
    main()
