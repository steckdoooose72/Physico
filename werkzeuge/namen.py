#!/usr/bin/env python3
"""
namen.py – erzeugt daten/namen_de.json

Die Modelldaten von BodyParts3D sind englisch benannt ("left biceps brachii").
Dieses Skript macht daraus deutsche Anzeigenamen und hängt unsere eigenen
Lerninhalte aus daten/eigene_inhalte.json an.

Zwei Quellen:
  1. Regeln + Wörterbuch unten  -> Anzeigename ("M. biceps brachii, langer Kopf (links)")
  2. daten/eigene_inhalte.json  -> Ursprung, Ansatz, Funktion, Innervation, Notizen

Aufruf:  .venv/bin/python werkzeuge/namen.py
"""

import json
import os
import re

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- Wörterbuch: englischer Begriff -> (deutscher Name, lateinischer Name) ---
# Ergänze hier, was dir fehlt – das Skript nutzt den längsten passenden Eintrag.
WOERTERBUCH = {
    # Knochen
    'skull': ('Schädel', 'Cranium'),
    'mandible': ('Unterkiefer', 'Mandibula'),
    'maxilla': ('Oberkiefer', 'Maxilla'),
    'frontal bone': ('Stirnbein', 'Os frontale'),
    'parietal bone': ('Scheitelbein', 'Os parietale'),
    'occipital bone': ('Hinterhauptbein', 'Os occipitale'),
    'temporal bone': ('Schläfenbein', 'Os temporale'),
    'sphenoid': ('Keilbein', 'Os sphenoidale'),
    'ethmoid': ('Siebbein', 'Os ethmoidale'),
    'nasal bone': ('Nasenbein', 'Os nasale'),
    'zygomatic bone': ('Jochbein', 'Os zygomaticum'),
    'palatine bone': ('Gaumenbein', 'Os palatinum'),
    'lacrimal bone': ('Tränenbein', 'Os lacrimale'),
    'vomer': ('Pflugscharbein', 'Vomer'),
    'hyoid': ('Zungenbein', 'Os hyoideum'),
    'malleus': ('Hammer', 'Malleus'),
    'incus': ('Amboss', 'Incus'),
    'stapes': ('Steigbügel', 'Stapes'),
    'atlas': ('Atlas (1. Halswirbel)', 'Atlas'),
    'axis': ('Axis (2. Halswirbel)', 'Axis'),
    'cervical vertebra': ('Halswirbel', 'Vertebra cervicalis'),
    'thoracic vertebra': ('Brustwirbel', 'Vertebra thoracica'),
    'lumbar vertebra': ('Lendenwirbel', 'Vertebra lumbalis'),
    'sacrum': ('Kreuzbein', 'Os sacrum'),
    'coccyx': ('Steißbein', 'Os coccygis'),
    'rib': ('Rippe', 'Costa'),
    'costal cartilage': ('Rippenknorpel', 'Cartilago costalis'),
    'sternum': ('Brustbein', 'Sternum'),
    'manubrium': ('Brustbeingriff', 'Manubrium sterni'),
    'xiphoid process': ('Schwertfortsatz', 'Processus xiphoideus'),
    'clavicle': ('Schlüsselbein', 'Clavicula'),
    'scapula': ('Schulterblatt', 'Scapula'),
    'humerus': ('Oberarmknochen', 'Humerus'),
    'radius': ('Speiche', 'Radius'),
    'ulna': ('Elle', 'Ulna'),
    'scaphoid': ('Kahnbein', 'Os scaphoideum'),
    'lunate': ('Mondbein', 'Os lunatum'),
    'triquetral': ('Dreiecksbein', 'Os triquetrum'),
    'pisiform': ('Erbsenbein', 'Os pisiforme'),
    'trapezium': ('Großes Vieleckbein', 'Os trapezium'),
    'trapezoid': ('Kleines Vieleckbein', 'Os trapezoideum'),
    'capitate': ('Kopfbein', 'Os capitatum'),
    'hamate': ('Hakenbein', 'Os hamatum'),
    'metacarpal bone': ('Mittelhandknochen', 'Os metacarpi'),
    'phalanx': ('Fingerglied', 'Phalanx'),
    'hip bone': ('Hüftbein', 'Os coxae'),
    'ilium': ('Darmbein', 'Os ilium'),
    'ischium': ('Sitzbein', 'Os ischii'),
    'pubis': ('Schambein', 'Os pubis'),
    'femur': ('Oberschenkelknochen', 'Femur'),
    'patella': ('Kniescheibe', 'Patella'),
    'tibia': ('Schienbein', 'Tibia'),
    'fibula': ('Wadenbein', 'Fibula'),
    'talus': ('Sprungbein', 'Talus'),
    'calcaneus': ('Fersenbein', 'Calcaneus'),
    'navicular': ('Kahnbein des Fußes', 'Os naviculare'),
    'cuboid': ('Würfelbein', 'Os cuboideum'),
    # Die drei Keilbeine einzeln – längere Einträge werden zuerst geprüft,
    # deshalb greifen sie vor dem allgemeinen 'cuneiform'.
    'medial cuneiform': ('Inneres Keilbein', 'Os cuneiforme mediale'),
    'intermediate cuneiform': ('Mittleres Keilbein', 'Os cuneiforme intermedium'),
    'lateral cuneiform': ('Äußeres Keilbein', 'Os cuneiforme laterale'),
    'cuneiform': ('Keilbein des Fußes', 'Os cuneiforme'),
    'inferior nasal concha': ('Untere Nasenmuschel', 'Concha nasalis inferior'),
    'long plantar ligament': ('Langes Sohlenband', 'Lig. plantare longum'),
    'sesamoid': ('Sesambein', 'Os sesamoideum'),
    'metatarsal bone': ('Mittelfußknochen', 'Os metatarsi'),
    'intervertebral disk': ('Bandscheibe', 'Discus intervertebralis'),
    'interosseous membrane': ('Zwischenknochenmembran', 'Membrana interossea'),

    # Organe und Weichteile (Auswahl)
    'heart': ('Herz', 'Cor'),
    'lung': ('Lunge', 'Pulmo'),
    'liver': ('Leber', 'Hepar'),
    'stomach': ('Magen', 'Gaster'),
    'kidney': ('Niere', 'Ren'),
    'spleen': ('Milz', 'Splen'),
    'pancreas': ('Bauchspeicheldrüse', 'Pancreas'),
    'urinary bladder': ('Harnblase', 'Vesica urinaria'),
    'brain': ('Gehirn', 'Encephalon'),
    'cerebellum': ('Kleinhirn', 'Cerebellum'),
    'spinal cord': ('Rückenmark', 'Medulla spinalis'),
    'trachea': ('Luftröhre', 'Trachea'),
    'esophagus': ('Speiseröhre', 'Oesophagus'),
    'diaphragm': ('Zwerchfell', 'Diaphragma'),
    'aorta': ('Hauptschlagader', 'Aorta'),
    'skin': ('Haut', 'Cutis'),
}

# --- Wortbausteine, die vor oder hinter dem Kern stehen können -------------
ZUSAETZE = [
    (r'^right ',  '', ' (rechts)'),
    (r'^left ',   '', ' (links)'),
    (r'^long head of ',    '', ', langer Kopf'),
    (r'^short head of ',   '', ', kurzer Kopf'),
    (r'^lateral head of ', '', ', lateraler Kopf'),
    (r'^medial head of ',  '', ', medialer Kopf'),
    (r'^deep head of ',    '', ', tiefer Kopf'),
    (r'^superficial head of ', '', ', oberflächlicher Kopf'),
    (r'^upper head of ',   '', ', oberer Kopf'),
    (r'^anterior belly of ',  '', ', vorderer Bauch'),
    (r'^posterior belly of ', '', ', hinterer Bauch'),
    (r'^clavicular part of ',   '', ', Pars clavicularis'),
    (r'^sternocostal part of ', '', ', Pars sternocostalis'),
    (r'^abdominal part of ',    '', ', Pars abdominalis'),
    (r'^acromial part of ',     '', ', Pars acromialis'),
    (r'^spinal part of ',       '', ', Pars spinalis'),
    (r'^descending part of ',   '', ', Pars descendens'),
    (r'^transverse part of ',   '', ', Pars transversa'),
    (r'^ascending part of ',    '', ', Pars ascendens'),
    (r'^deep part of ',         '', ', tiefer Anteil'),
    (r'^superficial part of ',  '', ', oberflächlicher Anteil'),
    (r'^tendon of ',            'Sehne des ', ''),
]

ORDNUNGSZAHLEN = {
    'first': '1.', 'second': '2.', 'third': '3.', 'fourth': '4.', 'fifth': '5.',
    'sixth': '6.', 'seventh': '7.', 'eighth': '8.', 'ninth': '9.', 'tenth': '10.',
    'eleventh': '11.', 'twelfth': '12.',
}

# Finger, Zehen und Fingerglieder
KOERPERTEILE = {
    'thumb': 'Daumen', 'index finger': 'Zeigefinger', 'middle finger': 'Mittelfinger',
    'ring finger': 'Ringfinger', 'little finger': 'kleiner Finger',
    'great toe': 'Großzehe', 'big toe': 'Großzehe',
    'second toe': '2. Zehe', 'third toe': '3. Zehe',
    'fourth toe': '4. Zehe', 'little toe': 'Kleinzehe',
}
GLIEDER = {
    'distal phalanx': ('Endglied', 'Phalanx distalis'),
    'middle phalanx': ('Mittelglied', 'Phalanx media'),
    'proximal phalanx': ('Grundglied', 'Phalanx proximalis'),
}


# Namen wie "abductor digiti minimi of left foot" – die Seite steht hinten
SEITEN_ANHANG = [
    (' of left foot', ' (linker Fuß)'), (' of right foot', ' (rechter Fuß)'),
    (' of left hand', ' (linke Hand)'), (' of right hand', ' (rechte Hand)'),
    (' of left thigh', ' (linker Oberschenkel)'), (' of right thigh', ' (rechter Oberschenkel)'),
    (' of left leg', ' (linker Unterschenkel)'), (' of right leg', ' (rechter Unterschenkel)'),
    (' of left forearm', ' (linker Unterarm)'), (' of right forearm', ' (rechter Unterarm)'),
    (' of left arm', ' (linker Oberarm)'), (' of right arm', ' (rechter Oberarm)'),
    (' of left', ' (links)'), (' of right', ' (rechts)'),
]


def deutscher_name(englisch, system=None):
    """Baut aus dem englischen Originalnamen einen deutschen Anzeigenamen."""
    rest = englisch.lower().strip()
    vorne, hinten = '', ''

    for muster, ersatz in SEITEN_ANHANG:
        if rest.endswith(muster):
            rest = rest[: -len(muster)]
            hinten = ersatz + hinten
            break

    geaendert = True
    while geaendert:
        geaendert = False
        for muster, prefix, suffix in ZUSAETZE:
            neu = re.sub(muster, '', rest)
            if neu != rest:
                rest = neu
                vorne = prefix + vorne
                hinten = suffix + hinten
                geaendert = True

    # Fingerglieder: "distal phalanx of left thumb" -> "Endglied des Daumens (links)"
    for glied, (deutsch, latein) in GLIEDER.items():
        treffer = re.match(rf'^{glied} of (?:the )?(.+)$', rest)
        if treffer:
            teil = treffer.group(1).strip()
            seite = ''
            if teil.startswith('right '):
                seite, teil = ' (rechts)', teil[6:]
            elif teil.startswith('left '):
                seite, teil = ' (links)', teil[5:]
            teil_de = KOERPERTEILE.get(teil, teil)
            return f'{deutsch} · {teil_de}{seite}{hinten}'.strip(), latein

    # Bandscheiben: "intervertebral disk of third lumbar vertebra"
    # -> "Bandscheibe · 3. Lendenwirbel". Der hintere Teil wird noch einmal
    # durch dieselbe Übersetzung geschickt, damit Wirbelname und Zahl stimmen.
    treffer = re.match(r'^intervertebral disk of (?:the )?(.+)$', rest)
    if treffer:
        wirbel, _ = deutscher_name(treffer.group(1).strip(), system)
        return f'Bandscheibe · {wirbel}{hinten}'.strip(), 'Discus intervertebralis'

    # Ordnungszahlen ("third lumbar vertebra" -> "3. Lendenwirbel")
    zahl = ''
    for wort, ziffer in ORDNUNGSZAHLEN.items():
        if rest.startswith(wort + ' '):
            zahl = ziffer + ' '
            rest = rest[len(wort) + 1:]
            break

    # Wörterbuch nur für Nicht-Muskeln: sonst würde "fibularis brevis" (ein Muskel)
    # fälschlich als "Wadenbein" übersetzt. Gesucht wird immer auf ganze Wörter.
    kern, latein = None, None
    if system != 'muskeln':
        for begriff in sorted(WOERTERBUCH, key=len, reverse=True):
            if re.search(rf'\b{re.escape(begriff)}\b', rest):
                kern, latein = WOERTERBUCH[begriff]
                zusatz = re.sub(rf'\b{re.escape(begriff)}\b', '', rest).strip()
                # "bone" ist im Deutschen schon im Wort enthalten ("Keilbein"),
                # als Zusatz wäre es nur Rauschen: "Keilbein (bone)".
                zusatz = re.sub(r'\bbones?\b', '', zusatz)
                zusatz = re.sub(r'\s+', ' ', zusatz).strip(' ,')
                if zusatz:
                    kern = f'{kern} ({zusatz})'
                break

    if kern is None:
        # Muskeln und Nerven behalten ihren lateinischen Namen – so lernt man ihn ohnehin.
        # Muskeln bekommen das übliche "M." davor.
        kern = rest[0].upper() + rest[1:]
        if system == 'muskeln':
            latein = f'M. {rest}'
            kern = f'M. {rest}'
        else:
            latein = None

    return f'{zahl}{vorne}{kern}{hinten}'.strip(), latein


def main():
    quelle = os.path.join(BASIS, 'quelldaten', 'parts_list_e.txt')
    verzeichnis_pfad = os.path.join(BASIS, 'daten', 'strukturen.json')
    eigene_pfad = os.path.join(BASIS, 'daten', 'eigene_inhalte.json')
    ziel = os.path.join(BASIS, 'daten', 'namen_de.json')

    with open(verzeichnis_pfad, encoding='utf-8') as f:
        verzeichnis = json.load(f)
    with open(eigene_pfad, encoding='utf-8') as f:
        eigene = {k: v for k, v in json.load(f).items() if not k.startswith('_')}

    ergebnis = {}
    mit_inhalt = 0
    for eintrag in verzeichnis['strukturen']:
        englisch = eintrag['name']
        de, latein = deutscher_name(englisch, eintrag.get('system'))
        datensatz = {'de': de}
        if latein:
            datensatz['latein'] = latein

        # Eigene Lerninhalte anhängen (längster passender Schlüssel gewinnt).
        # Auf ganze Wörter prüfen, sonst würde der Schlüssel "fibula" auch den
        # Muskel "fibularis brevis" treffen.
        passende = [s for s in eigene if re.search(rf'\b{re.escape(s)}\b', englisch.lower())]
        if passende:
            schluessel = max(passende, key=len)
            inhalt = dict(eigene[schluessel])
            # der deutsche Name aus den eigenen Inhalten ersetzt den automatischen
            eigener_name = inhalt.pop('de', None)
            if eigener_name:
                zusatz = de[de.find(',') :] if ',' in de else ''
                seite = ' (rechts)' if 'right' in englisch.lower() else (' (links)' if 'left' in englisch.lower() else '')
                datensatz['de'] = f'{eigener_name}{zusatz.replace(seite, "")}{seite}'
            datensatz.update(inhalt)
            mit_inhalt += 1

        ergebnis[eintrag['id']] = datensatz

    # Unsere eigenen Ebenen (periphere Nerven, Gelenke) bringen ihre Inhalte selbst mit
    eigene_ebenen = os.path.join(BASIS, 'daten', 'eigene_ebenen.json')
    if os.path.exists(eigene_ebenen):
        with open(eigene_ebenen, encoding='utf-8') as f:
            for s in json.load(f)['strukturen']:
                datensatz = {k: v for k, v in s.items()
                             if k not in ('id', 'name', 'system', 'region', 'seite', 'form',
                                          'position', 'deckkraft', 'achsen')}
                datensatz['de'] = s['name']
                ergebnis[s['id']] = datensatz

    with open(ziel, 'w', encoding='utf-8') as f:
        json.dump(ergebnis, f, ensure_ascii=False, indent=0)

    print(f'{len(ergebnis)} Namen geschrieben nach {ziel}')
    print(f'davon {mit_inhalt} mit eigenen Lerninhalten (Ursprung/Ansatz/Funktion …)')
    beispiele = list(ergebnis.items())[:6]
    for kennung, d in beispiele:
        print(f'  {kennung:10s} {d["de"]}')


if __name__ == '__main__':
    main()
