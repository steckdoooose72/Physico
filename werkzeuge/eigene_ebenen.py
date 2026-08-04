#!/usr/bin/env python3
"""
eigene_ebenen.py – ergänzt, was BodyParts3D nicht enthält:
periphere Nerven und die klinisch wichtigen Gelenke.

Der freie Datensatz bringt Knochen, Muskeln, Organe und Gefäße mit, aber
keine peripheren Nervenbahnen und keine Gelenkkapseln. Diese Ebene bauen wir
selbst – und zwar nicht frei geschätzt, sondern an den echten Knochen
ausgerichtet: Alle Punkte werden aus den tatsächlichen Eckpunkten von Femur,
Humerus, Tibia & Co. berechnet, die im Verzeichnis stehen.

Ergebnis:
  daten/eigene_ebenen.json  – Geometrie und Lerninhalte
  daten/strukturen.json     – wird um diese Strukturen ergänzt

Aufruf:  .venv/bin/python werkzeuge/eigene_ebenen.py
"""

import json
import math
import os

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(BASIS, 'daten', 'strukturen.json')
ZIEL = os.path.join(BASIS, 'daten', 'eigene_ebenen.json')

SYSTEME_NEU = [
    {'id': 'nervenbahnen', 'name': 'Periphere Nerven'},
    {'id': 'gelenkpunkte', 'name': 'Gelenke (klinisch)'},
    {'id': 'baender', 'name': 'Bänder und Menisken (schematisch)'},
]

# Steht in jeder notiz dieser Ebene. Diese Strukturen fehlen in BodyParts3D
# vollständig (geprüft: kein „meniscus", „cruciate ligament", „collateral
# ligament" in parts_list_e.txt) – sie sind hier nachgebaut, nicht gemessen.
SCHEMA_HINWEIS = ('Schematische Näherung, keine anatomisch exakte Form – in den Rohdaten '
                  'nicht als Geometrie enthalten.')


def lade_knochen():
    with open(INDEX, encoding='utf-8') as f:
        verzeichnis = json.load(f)
    nach_name = {e['name']: e for e in verzeichnis['strukturen']}
    return verzeichnis, nach_name


class Anker:
    """Liefert Punkte an echten Knochen – immer für die gewünschte Seite."""

    def __init__(self, knochen, seite):
        self.knochen = knochen
        self.seite = seite            # 'left' oder 'right'

    def _hole(self, name):
        eintrag = self.knochen.get(f'{self.seite} {name}') or self.knochen.get(name)
        if not eintrag:
            raise KeyError(f'Knochen "{name}" ({self.seite}) nicht im Verzeichnis')
        return eintrag

    def mitte(self, name):
        return list(self._hole(name)['mitte'])

    def oben(self, name):
        e = self._hole(name)
        return [e['mitte'][0], e['bis'][1], e['mitte'][2]]

    def unten(self, name):
        e = self._hole(name)
        return [e['mitte'][0], e['von'][1], e['mitte'][2]]

    def aussen(self, name):
        """Der am weitesten von der Körpermitte entfernte Punkt."""
        e = self._hole(name)
        x = e['bis'][0] if self.seite == 'left' else e['von'][0]
        return [x, e['mitte'][1], e['mitte'][2]]

    def innen(self, name):
        """Der der Körpermitte am nächsten liegende Punkt – Spiegelbild zu aussen().

        Achtung: y und z sind wie bei aussen() die Bauteilmitte des ganzen
        Knochens. Für Punkte auf einer bestimmten Höhe (z. B. am Knie) taugt
        davon nur die x-Kante; die Höhe muss von oben()/unten() kommen.
        """
        e = self._hole(name)
        x = e['von'][0] if self.seite == 'left' else e['bis'][0]
        return [x, e['mitte'][1], e['mitte'][2]]

    @property
    def vorzeichen(self):
        return 1 if self.seite == 'left' else -1


def v(punkt, dx=0.0, dy=0.0, dz=0.0, spiegel=1):
    """Punkt verschieben – dx wird zur Körperseite hin gerechnet."""
    return [round(punkt[0] + dx * spiegel, 4), round(punkt[1] + dy, 4), round(punkt[2] + dz, 4)]


# ---------------------------------------------------------------------------
# Gelenke
# ---------------------------------------------------------------------------

def gelenke_bauen(a, seite_de):
    s = a.vorzeichen
    schulter = v(a.oben('humerus'), -0.004, -0.012, 0.004, s)
    ellenbogen = v(a.unten('humerus'), 0.006, 0.006, 0.004, s)
    handgelenk = v(a.unten('radius'), -0.004, 0.006, 0.0, s)
    huefte = [round(a.mitte('femur')[0] * 0.74, 4), round(a.oben('femur')[1] - 0.022, 4),
              round(a.mitte('femur')[2] + 0.012, 4)]
    knie = [a.mitte('tibia')[0], round((a.unten('femur')[1] + a.oben('tibia')[1]) / 2, 4),
            round((a.mitte('femur')[2] + a.mitte('tibia')[2]) / 2, 4)]
    osg = v(a.unten('tibia'), 0.004, 0.010, -0.004, s)
    usg = v(a.mitte('talus'), 0.0, -0.008, 0.004, s)
    isg = [round(0.032 * s, 4), round(a.oben('sacrum')[1] - 0.018, 4), round(a.mitte('sacrum')[2] + 0.004, 4)]
    ac = v(a.aussen('clavicle'), -0.006, 0.002, 0.0, s)
    kiefer = [round(0.049 * s, 4), round(a.oben('mandible')[1] - 0.004, 4),
              round(a.mitte('mandible')[2] - 0.046, 4)]

    def g(kennung, name, latein, punkt, radius, region, **rest):
        return dict(
            id=f'PT-G-{kennung}-{"links" if s > 0 else "rechts"}',
            name=f'{name} ({"links" if s > 0 else "rechts"})',
            latein=latein, system='gelenkpunkte', region=region,
            seite='links' if s > 0 else 'rechts',
            form={'typ': 'kugel', 'radius': radius}, position=punkt, deckkraft=0.45, **rest)

    achse_x = {'name': 'Flexion/Extension', 'richtung': [1, 0, 0], 'farbe': '#ff8a5b'}
    achse_z = {'name': 'Ab-/Adduktion', 'richtung': [0, 0, 1], 'farbe': '#6bb8ff'}
    achse_y = {'name': 'Rotation', 'richtung': [0, 1, 0], 'farbe': '#b58bff'}

    return [
        g('schulter', 'Schultergelenk', 'Articulatio glenohumeralis', schulter, 0.036, 'arm',
          gelenktyp='Kugelgelenk (drei Freiheitsgrade)',
          beteiligt=['Oberarmknochen (Humerus)', 'Schulterblatt (Cavitas glenoidalis)'],
          bewegungen=['Anteversion/Retroversion', 'Abduktion/Adduktion', 'Innen-/Außenrotation'],
          normwerte='Ante-/Retroversion 170–0–40°, Ab-/Adduktion 180–0–40°, Außen-/Innenrotation 60–0–95°',
          notiz='Beweglichstes Gelenk des Körpers, wenig knöcherne Führung. Volle Abduktion nur im '
                'Zusammenspiel mit dem Schulterblatt (skapulohumeraler Rhythmus 2:1).',
          achsen=[achse_x, achse_z, achse_y]),
        g('ac', 'Schultereckgelenk', 'Articulatio acromioclavicularis', ac, 0.016, 'arm',
          gelenktyp='Straffes Gelenk (Amphiarthrose)',
          beteiligt=['Schlüsselbein (Clavicula)', 'Schulterdach (Acromion)'],
          bewegungen=['Kleine Dreh- und Kippbewegungen des Schulterblatts'],
          notiz='Bei Sturz auf die Schulter kann die Bandverbindung reißen – dann steht das '
                'Schlüsselbein hoch (Klaviertastenphänomen).'),
        g('ellenbogen', 'Ellenbogengelenk', 'Articulatio cubiti', ellenbogen, 0.030, 'arm',
          gelenktyp='Zusammengesetztes Gelenk aus drei Teilgelenken',
          beteiligt=['Humerus', 'Ulna', 'Radius'],
          bewegungen=['Flexion/Extension', 'Pronation/Supination über die Radioulnargelenke'],
          normwerte='Flexion/Extension 150–0–5°, Pro-/Supination 90–0–90°',
          notiz='Der Ellenbogen positioniert die Hand im Raum. Streckdefizite fallen im Alltag früh auf.',
          achsen=[achse_x, {'name': 'Pro-/Supination', 'richtung': [0.06, 1, 0], 'farbe': '#b58bff'}]),
        g('handgelenk', 'Handgelenk', 'Articulatio radiocarpalis', handgelenk, 0.024, 'arm',
          gelenktyp='Eigelenk plus verzahntes Gelenk',
          beteiligt=['Radius', 'Handwurzelknochen', 'Discus ulnocarpalis'],
          bewegungen=['Palmarflexion/Dorsalextension', 'Radial-/Ulnarabduktion'],
          normwerte='Dorsalextension/Palmarflexion 60–0–60°, Radial-/Ulnarabduktion 20–0–40°',
          notiz='Die Elle hat keinen direkten Kontakt zur Handwurzel – dazwischen liegt der Discus. '
                'Deshalb bricht bei Stürzen fast immer die Speiche.',
          achsen=[achse_x, achse_z]),
        g('isg', 'Iliosakralgelenk (ISG)', 'Articulatio sacroiliaca', isg, 0.022, 'becken',
          gelenktyp='Straffes Gelenk mit sehr kräftigem Bandapparat',
          beteiligt=['Kreuzbein (Os sacrum)', 'Darmbein (Os ilium)'],
          bewegungen=['Nutation', 'Gegennutation'],
          normwerte='Bewegungsausmaß nur wenige Grad bzw. Millimeter',
          notiz='Überträgt die gesamte Rumpflast auf die Beine. Häufige Quelle tiefsitzender '
                'Kreuzschmerzen; in der Schwangerschaft hormonell gelockert.'),
        g('huefte', 'Hüftgelenk', 'Articulatio coxae', huefte, 0.036, 'becken',
          gelenktyp='Nussgelenk (Kugelgelenk mit tiefer Pfanne)',
          beteiligt=['Femur', 'Hüftbein (Acetabulum)'],
          bewegungen=['Flexion/Extension', 'Abduktion/Adduktion', 'Innen-/Außenrotation'],
          normwerte='Flexion/Extension 130–0–10°, Ab-/Adduktion 45–0–30°, Außen-/Innenrotation 45–0–40°',
          notiz='Beim Gehen wirkt bis zum Vierfachen des Körpergewichts – deshalb ist die Kräftigung '
                'der Abduktoren nach Hüft-TEP so wichtig.',
          achsen=[achse_x, achse_z, achse_y]),
        g('knie', 'Kniegelenk', 'Articulatio genus', knie, 0.036, 'bein',
          gelenktyp='Dreh-Scharnier-Gelenk (Trochoginglymus) mit Menisken',
          beteiligt=['Femur', 'Tibia', 'Patella'],
          bewegungen=['Flexion/Extension', 'Rotation nur in Beugestellung'],
          normwerte='Flexion/Extension 140–0–5°, Rotation in 90° Beugung ca. 30° außen / 10° innen',
          notiz='Beim Strecken dreht das Schienbein leicht nach außen (Schlussrotation) und verriegelt '
                'das Gelenk. Die Menisken vergrößern die Kontaktfläche und dämpfen Stöße.',
          achsen=[achse_x, {'name': 'Rotation (nur gebeugt)', 'richtung': [0, 1, 0], 'farbe': '#b58bff'}]),
        g('osg', 'Oberes Sprunggelenk (OSG)', 'Articulatio talocruralis', osg, 0.026, 'bein',
          gelenktyp='Scharniergelenk in der Malleolengabel',
          beteiligt=['Tibia', 'Fibula', 'Talus'],
          bewegungen=['Dorsalextension/Plantarflexion'],
          normwerte='Dorsalextension/Plantarflexion 20–0–50°',
          notiz='Die Achse verläuft schräg durch beide Knöchel. In Dorsalextension ist das Gelenk am '
                'stabilsten – Umknickverletzungen passieren meist in Plantarflexion.',
          achsen=[{'name': 'Dorsalextension/Plantarflexion', 'richtung': [1, -0.08, -0.2], 'farbe': '#ff8a5b'}]),
        g('usg', 'Unteres Sprunggelenk (USG)', 'Articulatio subtalaris', usg, 0.022, 'bein',
          gelenktyp='Zapfengelenk mit schräger Achse',
          beteiligt=['Talus', 'Calcaneus', 'Os naviculare'],
          bewegungen=['Supination (Inversion)', 'Pronation (Eversion)'],
          normwerte='Supination/Pronation ca. 60–0–30°',
          notiz='Hier passieren die klassischen Supinationstraumen mit Riss des Lig. fibulotalare '
                'anterius. Das USG passt den Fuß an unebenen Boden an.',
          achsen=[{'name': 'Supination/Pronation', 'richtung': [0.16, 0.42, 0.89], 'farbe': '#6bb8ff'}]),
        g('kiefer', 'Kiefergelenk', 'Articulatio temporomandibularis', kiefer, 0.013, 'kopf',
          gelenktyp='Kombiniertes Dreh-Gleit-Gelenk mit Diskus',
          beteiligt=['Schläfenbein', 'Unterkiefer'],
          bewegungen=['Mundöffnung (Drehung, dann Gleiten)', 'Vor- und Rückschub', 'Mahlbewegung'],
          normwerte='Mundöffnung ca. 40–50 mm Schneidekantenabstand',
          notiz='Beide Kiefergelenke arbeiten immer gemeinsam. Beschwerden hängen oft mit Nacken- '
                'und Kopfhaltung zusammen (CMD).',
          achsen=[{'name': 'Öffnen/Schließen', 'richtung': [1, 0, 0], 'farbe': '#ff8a5b'}]),
    ]


def kopfgelenk(knochen):
    e = knochen['atlas']
    return {
        'id': 'PT-G-kopfgelenk', 'name': 'Oberes Kopfgelenk',
        'latein': 'Articulatio atlantooccipitalis', 'system': 'gelenkpunkte',
        'region': 'kopf', 'seite': 'mitte',
        'form': {'typ': 'kugel', 'radius': 0.024},
        'position': [0.0, round(e['bis'][1] + 0.008, 4), round(e['mitte'][2], 4)],
        'deckkraft': 0.45,
        'gelenktyp': 'Eigelenk (zwei Freiheitsgrade)',
        'beteiligt': ['Hinterhauptbein', 'Atlas (C1)'],
        'bewegungen': ['Nicken: Flexion/Extension ca. 20°', 'Seitneigung ca. 5°'],
        'normwerte': 'Rotation findet fast ausschließlich zwischen C1 und C2 statt: ca. 40° pro Seite',
        'notiz': 'Die Kopfgelenke sind sehr rezeptorreich und melden dem Gleichgewichtssystem '
                 'ständig die Kopfstellung.',
        'achsen': [{'name': 'Flexion/Extension', 'richtung': [1, 0, 0], 'farbe': '#ff8a5b'},
                   {'name': 'Seitneigung', 'richtung': [0, 0, 1], 'farbe': '#6bb8ff'}],
    }


# ---------------------------------------------------------------------------
# Bänder und Menisken des Knies
# ---------------------------------------------------------------------------

def kniebaender_bauen(a, seite_de):
    """Die sechs Kniestrukturen, die BodyParts3D nicht mitbringt.

    Alle Punkte hängen an echten Knochenwerten: die Gelenkmitte `knie` ist
    dieselbe Rechnung wie beim Gelenkpunkt (Mitte zwischen Femurunterkante und
    Tibiaplateau), die seitliche Ausdehnung kommt aus den tatsächlichen
    Knochenkanten über innen()/aussen(). Nur die kleinen Verschiebungen in
    `v()` sind gesetzt – deshalb „schematisch".

    Bewusst NICHT über aussen('femur')/innen('femur') gelöst: diese Methoden
    liefern als Höhe die Mitte des ganzen Knochens, beim Femur also die
    Oberschenkelmitte. Am Knie ist davon nur die x-Kante der kniennahen
    Knochen (Tibia, Fibula) brauchbar.
    """
    s = a.vorzeichen

    # Gelenkmitte – identische Rechnung wie beim Kniegelenk-Punkt in gelenke_bauen
    knie = [a.mitte('tibia')[0], round((a.unten('femur')[1] + a.oben('tibia')[1]) / 2, 4),
            round((a.mitte('femur')[2] + a.mitte('tibia')[2]) / 2, 4)]
    # Wadenbeinköpfchen – wie in nerven_bauen: x/z aus der Mitte, y von oben
    fibula_kopf = [a.mitte('fibula')[0], a._hole('fibula')['bis'][1], a.mitte('fibula')[2]]

    # Halbe Breite des Tibiaplateaus, aus den echten Knochenkanten
    halb_innen = round(abs(knie[0] - a.innen('tibia')[0]), 4)
    halb_aussen = round(abs(a.aussen('tibia')[0] - knie[0]), 4)

    def b(kennung, name, latein, punkte, radius, notiz, **rest):
        return dict(
            id=f'PT-B-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='baender', region='bein', seite=seite_de,
            form={'typ': 'pfad', 'radius': radius, 'punkte': punkte},
            notiz=f'{notiz} {SCHEMA_HINWEIS}', **rest)

    return [
        # Die Kreuzbänder laufen im Inneren des Gelenks gegenläufig übereinander:
        # das vordere von hinten-oben nach vorne-unten, das hintere umgekehrt.
        b('vkb', 'Vorderes Kreuzband', 'Lig. cruciatum anterius', [
            v(knie, 0.008, 0.020, -0.018, s),      # Femur, hinten im Interkondylarraum
            v(knie, 0.002, 0.008, -0.006, s),
            v(knie, -0.004, -0.008, 0.012, s),     # Tibiaplateau, vorne
        ], 0.0045,
          'Verhindert das Vorgleiten des Schienbeins gegen den Oberschenkel und begrenzt die '
          'Innenrotation. Am häufigsten gerissenes Band des Knies, typisch bei '
          'Valgus-Rotations-Trauma.'),

        b('hkb', 'Hinteres Kreuzband', 'Lig. cruciatum posterius', [
            v(knie, -0.006, 0.020, -0.002, s),     # Femur, vorne im Interkondylarraum
            v(knie, -0.002, 0.008, -0.014, s),
            v(knie, 0.002, -0.008, -0.026, s),     # Tibiaplateau, hinten
        ], 0.0050,
          'Verhindert das Zurückgleiten des Schienbeins. Reißt deutlich seltener als das vordere '
          'Kreuzband, typisch beim Anpralltrauma auf das gebeugte Knie.'),

        # Die Seitenbänder liegen außen auf der Kapsel, weitgehend senkrecht.
        b('innenband', 'Innenband', 'Lig. collaterale mediale (tibiale)', [
            [round(knie[0] - 0.86 * halb_innen * s, 4), round(knie[1] + 0.026, 4), round(knie[2] - 0.004, 4)],
            [round(knie[0] - 0.92 * halb_innen * s, 4), round(knie[1], 4), round(knie[2] - 0.004, 4)],
            [round(knie[0] - 0.82 * halb_innen * s, 4), round(knie[1] - 0.034, 4), round(knie[2] - 0.002, 4)],
        ], 0.0040,
          'Sichert das Knie gegen Valgusstress (X-Bein-Belastung). Verwächst mit dem Innenmeniskus '
          'und der Kapsel – zusammen mit vorderem Kreuzband und Innenmeniskus die „unhappy triad".'),

        b('aussenband', 'Außenband', 'Lig. collaterale laterale (fibulare)', [
            [round(knie[0] + 0.90 * halb_aussen * s, 4), round(knie[1] + 0.026, 4), round(knie[2] - 0.008, 4)],
            v(fibula_kopf, 0.004, 0.014, 0.0, s),
            v(fibula_kopf, 0.002, -0.004, 0.002, s),
        ], 0.0040,
          'Sichert das Knie gegen Varusstress (O-Bein-Belastung). Zieht vom äußeren '
          'Oberschenkelknorren zum Wadenbeinköpfchen und ist seltener verletzt als das Innenband.'),

        # Die Menisken liegen als Keile auf dem Tibiaplateau – hier als C-Bogen
        # von Hinterhorn über den Rand zum Vorderhorn, mit größerem Radius.
        b('innenmeniskus', 'Innenmeniskus', 'Meniscus medialis', [
            v(knie, -0.008, 0.0, -0.026, s),       # Hinterhorn
            v(knie, -0.022, 0.0, -0.018, s),
            v(knie, -0.028, 0.0, -0.002, s),       # medialer Rand
            v(knie, -0.022, 0.0, 0.012, s),
            v(knie, -0.008, 0.0, 0.018, s),        # Vorderhorn
        ], 0.0110,
          'Fest mit Innenband und Kapsel verwachsen und dadurch weniger beweglich – deshalb '
          'deutlich häufiger verletzt als der Außenmeniskus.'),

        b('aussenmeniskus', 'Außenmeniskus', 'Meniscus lateralis', [
            v(knie, 0.010, 0.0, -0.024, s),        # Hinterhorn
            v(knie, 0.024, 0.0, -0.016, s),
            v(knie, 0.029, 0.0, -0.002, s),        # lateraler Rand
            v(knie, 0.024, 0.0, 0.010, s),
            v(knie, 0.010, 0.0, 0.016, s),         # Vorderhorn
        ], 0.0110,
          'Beweglicher als der Innenmeniskus und dadurch seltener verletzt. Beide Menisken '
          'vergrößern die Kontaktfläche und dämpfen Stöße beim Gehen.'),
    ]


# ---------------------------------------------------------------------------
# Bänder der Schulter
# ---------------------------------------------------------------------------

def schulterbaender_bauen(a, seite_de):
    """Fünf Schulterstrukturen, die BodyParts3D nicht mitbringt.

    Labrum, Ligg. glenohumeralia und Lig. acromioclaviculare hängen an den
    bewährten Gelenkpunkten aus gelenke_bauen() (hier lokal noch einmal
    berechnet, dieselbe Formel). Acromion und Coracoid sind dagegen KEINE
    eigenen Knochen im Verzeichnis, sondern nur Teile der Scapula als Ganzes
    – ihre Position wird deshalb aus der Scapula-Bounding-Box geschätzt
    (siehe acromion_grob/coracoid_grob unten). Das ist eine gröbere Näherung
    als bei den Kniebändern, wo jeder Ansatzpunkt ein eigener, klar
    abgrenzbarer Knochen war – deshalb der zusätzliche Hinweis in der notiz
    der drei betroffenen Strukturen.
    """
    s = a.vorzeichen
    sca = a._hole('scapula')
    cla = a._hole('clavicle')

    # Dieselben Punkte wie in gelenke_bauen() – dort nicht wiederverwendbar,
    # weil sie lokale Variablen einer anderen Funktion sind.
    schulter = v(a.oben('humerus'), -0.004, -0.012, 0.004, s)
    ac = v(a.aussen('clavicle'), -0.006, 0.002, 0.0, s)

    # Acromion: höchster, seitlichster Punkt der Scapula-Hüllbox, ein Stück
    # nach vorne verschoben (die Scapula ist flach und liegt hinten, das
    # Schulterdach kragt darüber nach vorne aus).
    lateral_x = a.aussen('scapula')[0]
    acromion_grob = [
        round(lateral_x - 0.006 * s, 4),
        round(sca['bis'][1] - 0.006, 4),
        round(sca['bis'][2] + 0.010, 4),
    ]
    # Coracoid: auf halbem Weg zwischen Scapula-Mitte und Außenkante, spürbar
    # unterhalb der Clavicula-Unterkante und noch weiter vorne als das
    # Acromion – der Rabenschnabelfortsatz hakt nach vorne-unten ein.
    coracoid_grob = [
        round(sca['mitte'][0] + 0.55 * (lateral_x - sca['mitte'][0]), 4),
        round(cla['von'][1] - 0.006, 4),
        round(sca['bis'][2] + 0.014, 4),
    ]
    # Unterseite der Clavicula, spürbar medial und unterhalb des AC-Punkts –
    # dort setzt das Lig. coracoclaviculare an, nicht am Gelenk selbst.
    clavicula_unterseite = v(a.aussen('clavicle'), -0.024, -0.010, 0.0, s)

    zusatz_scapula = ('Ansatzpunkt zusätzlich aus der Form des Schulterblatts angenähert, nicht '
                       'aus einem eigenen Knochenpunkt – ungenauer als die Kniebänder.')

    def b(kennung, name, latein, punkte, radius, notiz, ungenauer=False, **rest):
        hinweis = f'{SCHEMA_HINWEIS} {zusatz_scapula}' if ungenauer else SCHEMA_HINWEIS
        return dict(
            id=f'PT-B-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='baender', region='arm', seite=seite_de,
            form={'typ': 'pfad', 'radius': radius, 'punkte': punkte},
            notiz=f'{notiz} {hinweis}', **rest)

    # Labrum: ein Ring aus sechs Punkten um den Gelenkpunkt, leicht medial
    # davon (die Gelenkpfanne liegt hinter dem Humeruskopf-Mittelpunkt). Der
    # erste Punkt wird am Ende wiederholt, damit der offene Pfad optisch zum
    # geschlossenen Ring wird.
    ring_radius = 0.017
    labrum_punkte = []
    for i in range(7):
        winkel = 2 * math.pi * (i % 6) / 6
        labrum_punkte.append(v(schulter, -0.008, ring_radius * math.cos(winkel),
                                ring_radius * math.sin(winkel), s))

    humerus_vorne_oben = v(a.oben('humerus'), 0.014, -0.010, 0.014, s)

    return [
        b('labrum', 'Labrum glenoidale', 'Labrum glenoidale', labrum_punkte, 0.0035,
          'Knorpelring, der die flache Gelenkpfanne vertieft und die Kontaktfläche zum '
          'Humeruskopf vergrößert. Bei vorderen Schulterluxationen häufig mitverletzt '
          '(Bankart-Läsion).'),

        b('ligg-glenohumeralia', 'Ligg. glenohumeralia', 'Ligg. glenohumeralia', [
            schulter,
            v(a.oben('humerus'), 0.005, -0.014, 0.009, s),
            humerus_vorne_oben,
        ], 0.0040,
          'Drei Kapselbänder (oberes, mittleres, unteres) zusammengefasst als eine Struktur – '
          'sie verstärken die Gelenkkapsel vorne und sind die wichtigste passive Sicherung '
          'gegen die vordere Luxation.',
          ungenauer=True),

        b('lig-coracoacromiale', 'Lig. coracoacromiale', 'Lig. coracoacromiale', [
            coracoid_grob,
            v([(coracoid_grob[0] + acromion_grob[0]) / 2, (coracoid_grob[1] + acromion_grob[1]) / 2 + 0.006,
               (coracoid_grob[2] + acromion_grob[2]) / 2], 0, 0, 0, s),
            acromion_grob,
        ], 0.0035,
          'Spannt als „schützendes Dach" zwischen Coracoid und Acromion über dem Humeruskopf '
          'und der Rotatorenmanschette – wichtig beim Impingement-Syndrom.',
          ungenauer=True),

        b('lig-coracoclaviculare', 'Lig. coracoclaviculare', 'Lig. coracoclaviculare', [
            coracoid_grob,
            v([(coracoid_grob[0] + clavicula_unterseite[0]) / 2,
               (coracoid_grob[1] + clavicula_unterseite[1]) / 2,
               (coracoid_grob[2] + clavicula_unterseite[2]) / 2 + 0.006], 0, 0, 0, s),
            clavicula_unterseite,
        ], 0.0040,
          'Hält die Clavicula am Coracoid und sichert das Schultereckgelenk zusätzlich zu '
          'dessen eigener Kapsel – reißt bei höhergradiger AC-Gelenk-Sprengung mit.',
          ungenauer=True),

        b('lig-acromioclaviculare', 'Lig. acromioclaviculare', 'Lig. acromioclaviculare', [
            acromion_grob, ac,
        ], 0.0035,
          'Kurzes, straffes Kapselband direkt über dem Schultereckgelenk – hält Clavicula und '
          'Acromion in der Fläche zusammen; Riss zeigt sich als Stufenbildung.'),
    ]


# ---------------------------------------------------------------------------
# Bänder des Ellenbogens
# ---------------------------------------------------------------------------

def ellenbogenbaender_bauen(a, seite_de):
    """Innenband, Außenband und Ringband des Ellenbogens, die BodyParts3D
    nicht mitbringt (geprüft: kein „collateral ligament", kein „annular
    ligament" in parts_list_e.txt).

    Gleiche Technik wie bei den Kniebändern: aussen()/innen() liefern nur
    eine brauchbare x-Kante (Körpermitte-Richtung), die Höhe (y) und die
    Tiefe (z) müssen von oben()/unten() der jeweiligen Knochenmitte kommen
    – deshalb werden die Epikondylen-Punkte aus beiden Anker-Methoden
    zusammengesetzt statt direkt aussen()/innen() zu verwenden.

    Ulna ist der körpernahe (mediale), Radius der körperferne (laterale)
    Unterarmknochen – bestätigt an den echten Koordinaten (Radius-Mitte
    liegt weiter außen als Ulna-Mitte). Das Innenband zieht deshalb vom
    medialen Humerusepikondylus zur Ulna, das Außenband vom lateralen
    Epikondylus zum Radius – anatomisch korrekt (Lig. collaterale ulnare
    bzw. radiale).
    """
    s = a.vorzeichen
    humerus_unten = a.unten('humerus')
    ulna_oben = a.oben('ulna')
    radius_oben = a.oben('radius')

    epi_medial = [a.innen('humerus')[0], humerus_unten[1], humerus_unten[2]]
    epi_lateral = [a.aussen('humerus')[0], humerus_unten[1], humerus_unten[2]]
    ulna_medial = [a.innen('ulna')[0], ulna_oben[1], ulna_oben[2]]
    radius_lateral = [a.aussen('radius')[0], radius_oben[1], radius_oben[2]]

    def mitte_zwei(p1, p2):
        return [round((p1[i] + p2[i]) / 2, 4) for i in range(3)]

    def b(kennung, name, latein, punkte, radius, notiz, **rest):
        return dict(
            id=f'PT-B-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='baender', region='arm', seite=seite_de,
            form={'typ': 'pfad', 'radius': radius, 'punkte': punkte},
            notiz=f'{notiz} {SCHEMA_HINWEIS}', **rest)

    # Kleiner Ring aus sechs Punkten um den Radiusköpfchen-Punkt, gleiche
    # Technik wie das Labrum glenoidale bei der Schulter bzw. der Discus
    # articularis am Kiefer – nur um die y-Achse statt um die x-Achse
    # (der Radiusschaft verläuft senkrecht, das Ringband umschließt ihn
    # quer dazu).
    ring_radius = 0.010
    ringband_punkte = []
    for i in range(7):
        winkel = 2 * math.pi * (i % 6) / 6
        ringband_punkte.append(v(radius_oben, ring_radius * math.cos(winkel), 0,
                                  ring_radius * math.sin(winkel), s))

    return [
        b('innenband-ellenbogen', 'Innenband', 'Lig. collaterale ulnare', [
            epi_medial, mitte_zwei(epi_medial, ulna_medial), ulna_medial,
        ], 0.0035,
          'Sichert den Ellenbogen gegen Valgusstress (Aufklappen nach innen). Zieht vom medialen '
          'Humerusepikondylus zur Ulna; bei Wurfsportarten durch wiederholte Valgusbelastung '
          'besonders gefährdet.'),

        b('aussenband-ellenbogen', 'Außenband', 'Lig. collaterale radiale', [
            epi_lateral, mitte_zwei(epi_lateral, radius_lateral), radius_lateral,
        ], 0.0035,
          'Sichert den Ellenbogen gegen Varusstress (Aufklappen nach außen) und strahlt in das '
          'Ringband ein. Zieht vom lateralen Humerusepikondylus zum Radius.'),

        b('ringband', 'Ringband', 'Lig. anulare radii', ringband_punkte, 0.0030,
          'Umschließt das Speichenköpfchen und hält es am Ellenbogen in Position, ohne die '
          'Dreh­bewegung (Pro-/Supination) zu behindern – reißt typischerweise bei der '
          'kindlichen „Radiusköpfchen-Subluxation" (Chassaignac-Lähmung) durch Achsenzug am Arm.'),
    ]


# ---------------------------------------------------------------------------
# Bänder des Handgelenks
# ---------------------------------------------------------------------------

def handgelenkbaender_bauen(a, seite_de):
    """Retinaculum flexorum, Retinaculum extensorum und Ligg. intercarpalia,
    die BodyParts3D nicht mitbringt (geprüft: kein „retinaculum", kein
    „intercarpal ligament" in parts_list_e.txt).

    Die Handwurzelknochen sind im Verzeichnis einzeln benannt (englische
    Bezeichner, siehe unten) – anders als bei den übrigen `baender`-
    Strukturen braucht es hier keine aussen()/innen()-Konstruktion, weil
    schon die echten Knochenmitten radial (Kahnbein/großes Vieleckbein)
    bzw. ulnar (Erbsenbein/Hakenbein) liegen. Bestätigt an den echten
    Koordinaten: Kahnbein/Vieleckbein-x liegt weiter außen (radial), Erbsen-
    /Hakenbein-x weiter innen (ulnar) – passend zur Vorgabe.

    Tatsächliche Bezeichner im Verzeichnis (abweichend von der Vermutung
    nur beim Dreiecksbein): 'scaphoid', 'trapezium', 'pisiform', 'hamate',
    'lunate', 'triquetral' (nicht „triquetrum").

    Flexor- und Extensor-Retinaculum unterscheiden sich nur durch die
    Vorne-Hinten-Verschiebung (dz) – gleiche Achsen-Konvention wie in
    wirbelsaeulenbaender_bauen() begründet: +z vorne (palmar), −z hinten
    (dorsal).
    """
    scaphoid = a.mitte('scaphoid')
    trapezium = a.mitte('trapezium')
    pisiform = a.mitte('pisiform')
    hamate = a.mitte('hamate')
    lunate = a.mitte('lunate')
    triquetral = a.mitte('triquetral')

    def mitte_zwei(p1, p2):
        return [round((p1[i] + p2[i]) / 2, 4) for i in range(3)]

    radial_punkt = mitte_zwei(scaphoid, trapezium)
    ulnar_punkt = mitte_zwei(pisiform, hamate)

    vorne_versatz = 0.006    # palmar – unter dem Retinaculum flexorum liegt der Karpaltunnel
    hinten_versatz = -0.006  # dorsal

    def b(kennung, name, latein, punkte, radius, notiz, **rest):
        return dict(
            id=f'PT-B-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='baender', region='arm', seite=seite_de,
            form={'typ': 'pfad', 'radius': radius, 'punkte': punkte},
            notiz=f'{notiz} {SCHEMA_HINWEIS}', **rest)

    flexor_radial = v(radial_punkt, 0, 0, vorne_versatz)
    flexor_ulnar = v(ulnar_punkt, 0, 0, vorne_versatz)
    flexor_mitte = v(mitte_zwei(flexor_radial, flexor_ulnar), 0, 0.003, 0)

    extensor_radial = v(radial_punkt, 0, 0, hinten_versatz)
    extensor_ulnar = v(ulnar_punkt, 0, 0, hinten_versatz)
    extensor_mitte = v(mitte_zwei(extensor_radial, extensor_ulnar), 0, 0.003, 0)

    return [
        b('retinaculum-flexorum', 'Retinaculum flexorum', 'Retinaculum musculorum flexorum', [
            flexor_radial, flexor_mitte, flexor_ulnar,
        ], 0.0030,
          'Straffes Band quer über die Handinnenseite, spannt von Kahnbein/großem Vieleckbein zu '
          'Erbsenbein/Hakenbein und bildet das Dach des Karpaltunnels. Unter diesem Band verläuft '
          'der N. medianus – bei Druck entsteht das Karpaltunnelsyndrom.'),

        b('retinaculum-extensorum', 'Retinaculum extensorum', 'Retinaculum musculorum extensorum', [
            extensor_radial, extensor_mitte, extensor_ulnar,
        ], 0.0030,
          'Straffes Band quer über den Handrücken, hält die Strecksehnen in ihren Fächern nah am '
          'Knochen, damit sie beim Strecken der Hand nicht wie eine Bogensehne abheben.'),

        b('ligg-intercarpalia', 'Ligg. intercarpalia', 'Ligg. intercarpalia', [
            scaphoid, lunate, triquetral,
        ], 0.0025,
          'Kurze Bänder zwischen den Handwurzelknochen der körpernahen Reihe, hier als eine '
          'zusammenfassende Struktur statt einzelner Bänder pro Knochenpaar. Halten die Handwurzel '
          'als funktionelle Einheit zusammen und sichern die komplexe Bewegungskopplung beim '
          'Greifen.'),
    ]


# ---------------------------------------------------------------------------
# Discus articularis des Kiefergelenks
# ---------------------------------------------------------------------------

def kieferbaender_bauen(a, seite_de):
    """Discus articularis, den BodyParts3D nicht mitbringt.

    Hängt am selben `kiefer`-Punkt wie das Kiefergelenk aus gelenke_bauen()
    (hier lokal noch einmal berechnet, dieselbe Formel – siehe Kommentar
    dort). Wie beim Labrum glenoidale in schulterbaender_bauen() ist der
    Diskus ein kleiner Ring-Pfad um den Gelenkpunkt, hier aber deutlich
    kleiner: das Kiefergelenk selbst hat schon nur 0.013 Radius, der Diskus
    liegt als dünne Scheibe direkt im Gelenkspalt.
    """
    s = a.vorzeichen
    kiefer = [round(0.049 * s, 4), round(a.oben('mandible')[1] - 0.004, 4),
              round(a.mitte('mandible')[2] - 0.046, 4)]

    def b(kennung, name, latein, punkte, radius, notiz, **rest):
        return dict(
            id=f'PT-B-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='baender', region='kopf', seite=seite_de,
            form={'typ': 'pfad', 'radius': radius, 'punkte': punkte},
            notiz=f'{notiz} {SCHEMA_HINWEIS}', **rest)

    # Ring aus sechs Punkten um den Kiefergelenk-Punkt, grob halb so groß
    # wie dessen eigener Radius (0.013). Erster Punkt am Ende wiederholt,
    # damit der offene Pfad optisch zum geschlossenen Ring wird – gleiches
    # Muster wie beim Labrum.
    ring_radius = 0.007
    discus_punkte = []
    for i in range(7):
        winkel = 2 * math.pi * (i % 6) / 6
        discus_punkte.append(v(kiefer, 0, ring_radius * math.cos(winkel),
                                ring_radius * math.sin(winkel), s))

    return [
        b('discus', 'Discus articularis', 'Discus articularis', discus_punkte, 0.0035,
          'Faserknorpelscheibe zwischen Kondylus und Gelenkpfanne, wirkt als Stoßdämpfer '
          'zwischen beiden; häufigste Ursache für Kiefergelenkknacken ist eine Verlagerung '
          'dieser Struktur.'),
    ]


# ---------------------------------------------------------------------------
# Dens-Stabilisierungsbänder der HWS
# ---------------------------------------------------------------------------

def halsbaender_bauen(a):
    """Lig. cruciforme atlantis (Lig. transversum atlantis + Ligg. alaria)
    zusammengefasst, das BodyParts3D nicht mitbringt.

    Atlas und Axis sind unpaarige, mittige Knochen – anders als bei Knie,
    Schulter und Kiefer entsteht hier deshalb nur EINE Struktur, nicht eine
    pro Seite. `a` kann mit einer beliebigen Seite gebaut sein: die Anker-
    Methoden fallen für unpaarige Knochen ohnehin auf den seitenlosen
    Verzeichniseintrag zurück (siehe Anker._hole()).

    Die Punkte hängen an echten Knochenwerten: die Denspitze über
    oben('axis'), die Atlasring-Mitte über mitte('atlas') als Stützpunkt für
    das querverlaufende Lig. transversum, der vordere Atlasbogen über
    unten('atlas') leicht nach vorne verschoben – zusammen ergibt der Pfad
    eine grob kreuzförmige Fläche um den Dens.
    """
    dens_spitze = a.oben('axis')
    atlas_mitte = a.mitte('atlas')
    atlas_vorne = v(a.unten('atlas'), 0, 0.006, 0.014)

    punkte = [dens_spitze, atlas_mitte, atlas_vorne, dens_spitze]

    return [dict(
        id='PT-B-dens-stabilisierung',
        name='Dens-Stabilisierungsbänder',
        latein='Lig. cruciforme atlantis',
        system='baender', region='hals', seite='mitte',
        form={'typ': 'pfad', 'radius': 0.0035, 'punkte': punkte},
        notiz='Hält den Zahnfortsatz des Axis in Position; wird vor Manipulationen der oberen '
              f'Halswirbelsäule auf Stabilität geprüft. {SCHEMA_HINWEIS}',
    )]


# ---------------------------------------------------------------------------
# Längsbänder der Brust- und Lendenwirbelsäule
# ---------------------------------------------------------------------------

def wirbelsaeulenbaender_bauen(a):
    """Lig. longitudinale anterius/posterius, die BodyParts3D nicht mitbringt.

    Anders als die bisherigen `baender`-Strukturen (Ring/kurzer Pfad an
    einem einzelnen Gelenk) ziehen sich diese beiden Bänder über die ganze
    Brust- und Lendenwirbelsäule (Th1 bis L5). Vier Stützpunkte genügen,
    weil `formen.js` den Pfad ohnehin über CatmullRomCurve3 weich
    interpoliert – mehr Zwischenpunkte würden hier keinen sichtbaren
    Unterschied machen.

    Th1/Th12/L1/L5 sind wie Atlas/Axis unpaarige, mittige Wirbel – auch
    hier deshalb nur je EINE Struktur, nicht eine pro Seite (siehe
    halsbaender_bauen() für die Begründung zur Anker-Seite).

    Die Anker-Klasse kennt nur mitte/oben/unten/aussen/innen (Kopf-Fuß-
    bzw. Links-Rechts-Achse), keine Vorne-Hinten-Unterscheidung – die
    liefert v()s dritter Versatz-Parameter (dz). Verbindliche Achsen aus
    CLAUDE.md, hier am bestehenden `atlas_vorne`-Punkt in
    halsbaender_bauen() bestätigt (dz=+0.014 dort als „nach vorne
    verschoben" kommentiert): **+z = vorne (anterior), −z = hinten
    (posterior)**. Der vordere Wirbelkörperrand bekommt deshalb ein
    positives dz, der hintere (zum Wirbelkanal hin) ein negatives – mit
    unterschiedlichem Betrag, weil die Wirbelkörper-Vorderkante weiter von
    der Wirbelmitte entfernt liegt als die Hinterkante zum Wirbelkanal.
    """
    th1 = a.mitte('first thoracic vertebra')
    th12 = a.mitte('twelfth thoracic vertebra')
    l1 = a.mitte('first lumbar vertebra')
    l5 = a.mitte('fifth lumbar vertebra')

    vorne_versatz = 0.016
    hinten_versatz = -0.012

    def b(kennung, name, latein, punkte, notiz, **rest):
        return dict(
            id=f'PT-B-{kennung}',
            name=name,
            latein=latein, system='baender', region='rumpf', seite='mitte',
            form={'typ': 'pfad', 'radius': 0.002, 'punkte': punkte},
            notiz=f'{notiz} {SCHEMA_HINWEIS}', **rest)

    vorne_punkte = [v(p, 0, 0, vorne_versatz) for p in (th1, th12, l1, l5)]
    hinten_punkte = [v(p, 0, 0, hinten_versatz) for p in (th1, th12, l1, l5)]

    return [
        b('laengsband-vorne', 'Lig. longitudinale anterius', 'Lig. longitudinale anterius',
          vorne_punkte,
          'Verläuft über die Vorderseite der Wirbelkörper von der Halswirbelsäule bis zum '
          'Kreuzbein, verhindert übermäßige Streckung.'),
        b('laengsband-hinten', 'Lig. longitudinale posterius', 'Lig. longitudinale posterius',
          hinten_punkte,
          'Verläuft über die Rückseite der Wirbelkörper, verhindert übermäßige Beugung; ein '
          'Bandscheibenvorfall drückt häufig gegen dieses Band bzw. die dahinterliegenden '
          'Nervenstrukturen.'),
    ]


# ---------------------------------------------------------------------------
# Periphere Nerven
# ---------------------------------------------------------------------------

def nerven_bauen(a, knochen):
    s = a.vorzeichen
    seite_de = 'links' if s > 0 else 'rechts'
    hws = knochen['seventh cervical vertebra']
    lws = knochen['fifth lumbar vertebra']
    sacrum = knochen['sacrum']

    schulter = v(a.oben('humerus'), -0.004, -0.012, 0.004, s)
    humerus = a.mitte('humerus')
    ellenbogen = v(a.unten('humerus'), 0.006, 0.006, 0.004, s)
    radius = a.mitte('radius')
    ulna = a.mitte('ulna')
    handgelenk = v(a.unten('radius'), -0.004, 0.006, 0.0, s)
    huefte = [round(a.mitte('femur')[0] * 0.74, 4), round(a.oben('femur')[1] - 0.022, 4),
              round(a.mitte('femur')[2] + 0.012, 4)]
    femur = a.mitte('femur')
    knie = [a.mitte('tibia')[0], round((a.unten('femur')[1] + a.oben('tibia')[1]) / 2, 4),
            round((a.mitte('femur')[2] + a.mitte('tibia')[2]) / 2, 4)]
    tibia = a.mitte('tibia')
    fibula_kopf = [a.mitte('fibula')[0], a._hole('fibula')['bis'][1], a.mitte('fibula')[2]]
    osg = v(a.unten('tibia'), 0.004, 0.010, -0.004, s)
    ferse = a.mitte('calcaneus')

    def n(kennung, name, latein, punkte, radius_mm, region, **rest):
        return dict(
            id=f'PT-N-{kennung}-{seite_de}',
            name=f'{name} ({seite_de})',
            latein=latein, system='nervenbahnen', region=region, seite=seite_de,
            form={'typ': 'pfad', 'radius': radius_mm, 'punkte': punkte}, **rest)

    return [
        n('plexus-brachialis', 'Armgeflecht', 'Plexus brachialis', [
            v([0.0, hws['mitte'][1] + 0.03, hws['mitte'][2] + 0.02], 0.015, 0, 0, s),
            v(schulter, -0.075, 0.035, 0.020, s),
            v(schulter, -0.035, 0.012, 0.022, s),
            v(schulter, -0.008, -0.015, 0.018, s),
        ], 0.006, 'hals',
          segmente='C5–Th1',
          versorgt=['Schultergürtel- und Armmuskulatur über seine Endäste'],
          notiz='Zieht zwischen den Skalenusmuskeln und unter dem Schlüsselbein hindurch zur '
                'Achselhöhle. Engstellen dort können bei Überkopfarbeit Kribbeln auslösen '
                '(Thoracic-Outlet-Syndrom).'),

        n('axillaris', 'Achselnerv', 'N. axillaris', [
            v(schulter, -0.02, -0.01, 0.005, s),
            v(schulter, 0.005, -0.028, -0.030, s),
            v(schulter, 0.018, -0.055, -0.012, s),
        ], 0.0045, 'arm',
          segmente='C5–C6', versorgt=['M. deltoideus', 'M. teres minor'],
          sensibel='Haut über der seitlichen Schulter',
          notiz='Läuft eng um den Oberarmhals. Nach Schulterluxation oder Oberarmkopfbruch immer die '
                'Sensibilität über der seitlichen Schulter prüfen.'),

        n('medianus', 'Mittelnerv', 'N. medianus', [
            v(schulter, -0.030, -0.020, 0.022, s),
            v(humerus, -0.012, 0.02, 0.026, s),
            v(ellenbogen, -0.010, 0.020, 0.028, s),
            v(ulna, 0.010, 0.0, 0.030, s),
            v(handgelenk, 0.002, 0.015, 0.022, s),
            v(handgelenk, 0.004, -0.020, 0.018, s),
        ], 0.0045, 'arm',
          segmente='C6–Th1',
          versorgt=['Die meisten Unterarmbeuger', 'Daumenballenmuskulatur'],
          sensibel='Handfläche Daumen bis halber Ringfinger',
          notiz='Läuft durch den Karpaltunnel. Wird er dort eingeengt, kribbeln nachts die ersten drei '
                'Finger – das häufigste Nervenengpasssyndrom überhaupt.'),

        n('ulnaris', 'Ellennerv', 'N. ulnaris', [
            v(schulter, -0.034, -0.022, 0.008, s),
            v(humerus, -0.020, 0.0, 0.005, s),
            v(ellenbogen, -0.022, 0.012, -0.022, s),
            v(ulna, -0.006, 0.0, -0.005, s),
            v(handgelenk, -0.018, 0.012, 0.012, s),
            v(handgelenk, -0.020, -0.022, 0.012, s),
        ], 0.0045, 'arm',
          segmente='C8–Th1',
          versorgt=['Kleine Handmuskeln', 'M. flexor carpi ulnaris'],
          sensibel='Kleinfinger und halber Ringfinger',
          notiz='Zieht offen durch den Sulcus hinter dem inneren Ellenbogenhöcker – der '
                '„Musikantenknochen". Dauerdruck schwächt die Feinmotorik der Hand.'),

        n('radialis', 'Speichennerv', 'N. radialis', [
            v(schulter, -0.030, -0.030, -0.018, s),
            v(humerus, -0.004, 0.02, -0.030, s),
            v(humerus, 0.014, -0.03, -0.022, s),
            v(ellenbogen, 0.022, 0.015, 0.014, s),
            v(radius, 0.014, 0.02, -0.014, s),
            v(handgelenk, 0.016, 0.015, -0.012, s),
        ], 0.0045, 'arm',
          segmente='C5–Th1',
          versorgt=['M. triceps brachii', 'Handgelenks- und Fingerstrecker', 'M. brachioradialis'],
          sensibel='Handrücken auf der Daumenseite',
          notiz='Windet sich in der Radialisrinne direkt um den Oberarmknochen. Druck dort '
                '(z. B. Arm über der Stuhllehne) führt zur „Fallhand".'),

        n('femoralis', 'Oberschenkelnerv', 'N. femoralis', [
            v([0.0, lws['mitte'][1] + 0.02, lws['mitte'][2] + 0.03], 0.030, 0, 0, s),
            v(huefte, -0.022, 0.055, 0.045, s),
            v(huefte, -0.004, 0.012, 0.052, s),
            v(femur, -0.004, 0.085, 0.048, s),
            v(femur, 0.0, 0.02, 0.042, s),
        ], 0.0045, 'becken',
          segmente='L2–L4',
          versorgt=['M. quadriceps femoris', 'M. iliopsoas', 'M. sartorius'],
          sensibel='Vorderseite des Oberschenkels, über den N. saphenus die Unterschenkelinnenseite',
          notiz='Bei Ausfall ist die Kniestreckung nicht möglich und der Patellarsehnenreflex fehlt – '
                'Treppensteigen wird unmöglich.'),

        n('ischiadicus', 'Ischiasnerv', 'N. ischiadicus', [
            v([0.0, sacrum['mitte'][1] + 0.01, sacrum['mitte'][2] - 0.005], 0.030, 0, 0, s),
            v(huefte, 0.012, -0.010, -0.055, s),
            v(femur, 0.004, 0.075, -0.052, s),
            v(femur, 0.0, -0.02, -0.050, s),
            v(knie, 0.004, 0.055, -0.048, s),
        ], 0.0065, 'becken',
          segmente='L4–S3',
          versorgt=['Ischiocrurale Muskulatur', 'über die Endäste die gesamte Unterschenkel- und Fußmuskulatur'],
          notiz='Dickster Nerv des Körpers. Er tritt unter dem M. piriformis aus dem Becken – ist '
                'dieser verspannt, kann das ischiasähnliche Beschwerden machen (Piriformis-Syndrom).'),

        n('tibialis', 'Schienbeinnerv', 'N. tibialis', [
            v(knie, 0.004, 0.045, -0.046, s),
            v(knie, 0.0, -0.020, -0.044, s),
            v(tibia, -0.004, 0.030, -0.042, s),
            v(tibia, -0.006, -0.060, -0.030, s),
            v(osg, -0.016, 0.012, -0.020, s),
            v(ferse, -0.006, 0.004, 0.020, s),
        ], 0.0045, 'bein',
          segmente='L4–S3',
          versorgt=['Wadenmuskulatur', 'Zehenbeuger', 'kurze Fußmuskeln'],
          sensibel='Fußsohle',
          notiz='Endast des Ischiasnervs für die Rückseite. Fällt er aus, ist der Zehenstand nicht '
                'mehr möglich.'),

        n('fibularis-communis', 'Gemeinsamer Wadenbeinnerv', 'N. fibularis (peroneus) communis', [
            v(knie, 0.016, 0.042, -0.046, s),
            v(fibula_kopf, 0.008, 0.006, -0.018, s),
            v(fibula_kopf, 0.010, -0.030, 0.006, s),
            v(tibia, 0.020, 0.020, 0.014, s),
            v(osg, 0.010, 0.030, 0.018, s),
        ], 0.0045, 'bein',
          segmente='L4–S2',
          versorgt=['M. tibialis anterior', 'Zehenstrecker', 'Mm. fibulares'],
          sensibel='Fußrücken und Außenseite des Unterschenkels',
          notiz='Läuft ungeschützt um das Fibulaköpfchen. Druck durch Gips, Lagerung oder '
                'übereinandergeschlagene Beine kann eine Fallfuß-Parese auslösen.'),
    ]


# ---------------------------------------------------------------------------

def eckwerte(struktur):
    """Mittelpunkt und Eckpunkte – damit Suche und Kameraflug funktionieren."""
    if struktur['form']['typ'] == 'pfad':
        punkte = struktur['form']['punkte']
    else:
        punkte = [struktur['position']]
    xs, ys, zs = zip(*punkte)
    puffer = struktur['form'].get('radius', 0.02)
    return (
        [round(sum(xs) / len(xs), 4), round(sum(ys) / len(ys), 4), round(sum(zs) / len(zs), 4)],
        [round(min(xs) - puffer, 4), round(min(ys) - puffer, 4), round(min(zs) - puffer, 4)],
        [round(max(xs) + puffer, 4), round(max(ys) + puffer, 4), round(max(zs) + puffer, 4)],
    )


def main():
    verzeichnis, knochen = lade_knochen()

    strukturen = []
    for seite in ('left', 'right'):
        a = Anker(knochen, seite)
        seite_de = 'links' if seite == 'left' else 'rechts'
        strukturen += gelenke_bauen(a, seite_de)
        strukturen += kniebaender_bauen(a, seite_de)
        strukturen += schulterbaender_bauen(a, seite_de)
        strukturen += ellenbogenbaender_bauen(a, seite_de)
        strukturen += handgelenkbaender_bauen(a, seite_de)
        strukturen += kieferbaender_bauen(a, seite_de)
        strukturen += nerven_bauen(a, knochen)
    strukturen.append(kopfgelenk(knochen))
    strukturen += halsbaender_bauen(Anker(knochen, 'left'))
    strukturen += wirbelsaeulenbaender_bauen(Anker(knochen, 'left'))

    with open(ZIEL, 'w', encoding='utf-8') as f:
        json.dump({'strukturen': strukturen}, f, ensure_ascii=False, indent=1)

    # Verzeichnis ergänzen (alte eigene Einträge vorher entfernen)
    verzeichnis['strukturen'] = [e for e in verzeichnis['strukturen'] if not e['id'].startswith('PT-')]
    for s in strukturen:
        mitte, von, bis = eckwerte(s)
        verzeichnis['strukturen'].append({
            'id': s['id'], 'name': s['name'], 'system': s['system'], 'region': s['region'],
            'seite': s['seite'], 'buendel': 'eigene', 'mitte': mitte, 'von': von, 'bis': bis,
            'groesse': round(max(bis[i] - von[i] for i in range(3)), 4), 'dreiecke': 0,
        })
    verzeichnis['strukturen'].sort(key=lambda e: e['name'])

    vorhandene = {s['id'] for s in verzeichnis['systeme']}
    for s in SYSTEME_NEU:
        if s['id'] not in vorhandene:
            verzeichnis['systeme'].append(s)

    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump(verzeichnis, f, ensure_ascii=False)

    gelenke = sum(1 for s in strukturen if s['system'] == 'gelenkpunkte')
    nerven = sum(1 for s in strukturen if s['system'] == 'nervenbahnen')
    baender = sum(1 for s in strukturen if s['system'] == 'baender')
    print(f'{gelenke} Gelenke, {nerven} Nervenbahnen und {baender} Bänder/Menisken '
          f'an den echten Knochen ausgerichtet.')
    print(f'geschrieben: {ZIEL} und {INDEX}')


if __name__ == '__main__':
    main()
