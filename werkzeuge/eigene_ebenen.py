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
import os

BASIS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(BASIS, 'daten', 'strukturen.json')
ZIEL = os.path.join(BASIS, 'daten', 'eigene_ebenen.json')

SYSTEME_NEU = [
    {'id': 'nervenbahnen', 'name': 'Periphere Nerven'},
    {'id': 'gelenkpunkte', 'name': 'Gelenke (klinisch)'},
]


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
        strukturen += gelenke_bauen(a, 'links' if seite == 'left' else 'rechts')
        strukturen += nerven_bauen(a, knochen)
    strukturen.append(kopfgelenk(knochen))

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
    print(f'{gelenke} Gelenke und {nerven} Nervenbahnen an den echten Knochen ausgerichtet.')
    print(f'geschrieben: {ZIEL} und {INDEX}')


if __name__ == '__main__':
    main()
