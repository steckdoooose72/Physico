#!/usr/bin/env python3
"""
aufbereiten.py – macht aus den BodyParts3D-Rohdaten die Dateien, die Physico lädt.

Was das Skript tut:
  1. liest die OBJ-Dateien (eine Datei = eine anatomische Struktur)
  2. dreht sie in unser Koordinatensystem (Y = oben, +Z = vorne, +X = links, Meter)
  3. bündelt sie nach System und Körperregion zu wenigen .glb-Dateien
  4. schreibt ein Verzeichnis aller Strukturen nach daten/strukturen.json

Aufruf (aus dem Projektordner):
    .venv/bin/python werkzeuge/aufbereiten.py --quelle quelldaten/obj95/... --stufe fein

Quelle: BodyParts3D, (c) The Database Center for Life Science,
lizenziert unter CC Attribution-Share Alike 2.1 Japan.
"""

import argparse
import json
import os
import struct
import sys
from collections import defaultdict

import numpy as np

# ---------------------------------------------------------------------------
# Systeme (Reihenfolge = Priorität, falls eine Struktur zu mehreren gehört)
# ---------------------------------------------------------------------------
SYSTEME = [
    ('skelett',  'FMA23881', 'Skelett'),
    ('muskeln',  'FMA72954', 'Muskulatur'),
    ('gelenke',  'FMA23878', 'Gelenke und Bänder'),
    ('nerven',   'FMA7157',  'Nervensystem'),
    ('gefaesse', 'FMA7161',  'Herz und Gefäße'),
    ('atmung',   'FMA7158',  'Atemwege'),
    ('verdauung', 'FMA7152', 'Verdauung'),
    ('harn',     'FMA7159',  'Harnorgane'),
    ('geschlecht', 'FMA7160', 'Geschlechtsorgane'),
    ('hormone',  'FMA9668',  'Hormondrüsen'),
    ('lymphe',   'FMA74594', 'Lymphsystem'),
    ('sinne',    'FMA78499', 'Sinnesorgane'),
    ('haut',     'FMA72979', 'Haut'),
]

# Körperregionen: Name -> Höhenbereich in Metern (Fallback über den Schwerpunkt)
REGIONEN_HOEHE = [
    ('kopf',    1.45, 9.99),
    ('hals',    1.34, 1.45),
    ('rumpf',   0.85, 1.34),
    ('becken',  0.78, 0.85),
]


def lade_tabellen(quellordner):
    """Liest Namensliste, Teil-von-Beziehungen und zusammengesetzte Strukturen."""
    namen = {}
    with open(os.path.join(quellordner, 'parts_list_e.txt'), encoding='utf-8') as f:
        for zeile in f:
            teile = zeile.rstrip('\n').split('\t')
            if len(teile) >= 2 and teile[0] != '"id"':
                namen[teile[0]] = teile[1]

    kinder = defaultdict(list)
    eltern = defaultdict(list)
    with open(os.path.join(quellordner, 'conventional_part_of.txt'), encoding='utf-8') as f:
        for zeile in f:
            t = zeile.rstrip('\n').split('\t')
            if len(t) < 4 or t[0] == '"id"':
                continue
            namen.setdefault(t[0], t[1])
            namen.setdefault(t[2], t[3])
            kinder[t[0]].append(t[2])
            eltern[t[2]].append(t[0])

    komposit = defaultdict(list)
    with open(os.path.join(quellordner, 'composite_parts.txt'), encoding='utf-8') as f:
        for zeile in f:
            t = zeile.rstrip('\n').split('\t')
            if len(t) >= 4 and t[0] != 'composite id':
                namen.setdefault(t[0], t[1])
                namen.setdefault(t[2], t[3])
                komposit[t[0]].append(t[2])

    return namen, kinder, eltern, komposit


def nachfahren(kinder, start):
    """Alle Strukturen unterhalb eines Knotens."""
    ergebnis = set()
    stapel = [start]
    while stapel:
        k = stapel.pop()
        for kk in kinder.get(k, []):
            if kk not in ergebnis:
                ergebnis.add(kk)
                stapel.append(kk)
    return ergebnis


def lies_obj(pfad):
    """
    Liest eine OBJ-Datei von BodyParts3D.
    Aufbau dort: abwechselnd 'vn' und 'v', Flächen als 'f a//a b//b c//c'.
    Rückgabe: (punkte Nx3, normalen Nx3, dreiecke Mx3) – noch in Millimetern.
    """
    punkte, normalen, flaechen = [], [], []
    with open(pfad, 'r', encoding='utf-8', errors='ignore') as f:
        for zeile in f:
            if zeile.startswith('v '):
                punkte.append(zeile.split()[1:4])
            elif zeile.startswith('vn '):
                normalen.append(zeile.split()[1:4])
            elif zeile.startswith('f '):
                ecken = zeile.split()[1:]
                idx = [int(e.split('/')[0]) - 1 for e in ecken]
                # Vielecke in Dreiecke zerlegen (kommt selten vor)
                for i in range(1, len(idx) - 1):
                    flaechen.append((idx[0], idx[i], idx[i + 1]))

    p = np.array(punkte, dtype=np.float32)
    n = np.array(normalen, dtype=np.float32) if len(normalen) == len(punkte) else None
    d = np.array(flaechen, dtype=np.uint32)
    return p, n, d


def in_unser_system(punkte, normalen, bodenhoehe, mitte_x, mitte_z):
    """
    BodyParts3D: X = seitlich (+ = links), Y = Tiefe (- = vorne), Z = Höhe, Millimeter.
    Physico:     X = seitlich (+ = links), Y = Höhe,             Z = Tiefe (+ = vorne), Meter.
    """
    p = np.empty_like(punkte)
    p[:, 0] = (punkte[:, 0] - mitte_x) / 1000.0
    p[:, 1] = (punkte[:, 2] - bodenhoehe) / 1000.0
    p[:, 2] = -(punkte[:, 1] - mitte_z) / 1000.0

    n = None
    if normalen is not None:
        n = np.empty_like(normalen)
        n[:, 0] = normalen[:, 0]
        n[:, 1] = normalen[:, 2]
        n[:, 2] = -normalen[:, 1]
        laenge = np.linalg.norm(n, axis=1, keepdims=True)
        laenge[laenge == 0] = 1.0
        n = n / laenge
    return p, n


def normalen_berechnen(punkte, dreiecke):
    """Weiche Normalen aus den Flächen mitteln – nötig für eine glatte Oberfläche."""
    n = np.zeros_like(punkte)
    a, b, c = punkte[dreiecke[:, 0]], punkte[dreiecke[:, 1]], punkte[dreiecke[:, 2]]
    flaechennormale = np.cross(b - a, c - a)
    for i in range(3):
        np.add.at(n, dreiecke[:, i], flaechennormale)
    laenge = np.linalg.norm(n, axis=1, keepdims=True)
    laenge[laenge == 0] = 1.0
    return (n / laenge).astype(np.float32)


# ---------------------------------------------------------------------------
# GLB schreiben (glTF 2.0 – Binärformat, das three.js direkt laden kann)
# ---------------------------------------------------------------------------

def schreibe_glb(pfad, strukturen):
    """
    strukturen: Liste von (id, punkte Nx3 float32, normalen Nx3 float32, dreiecke Mx3 uint32)
    Jede Struktur wird ein eigener Knoten mit ihrer FMA-Kennung als Namen.
    """
    puffer = bytearray()
    accessoren, bufferviews, meshes, nodes = [], [], [], []

    def anhaengen(daten, ziel):
        """Daten in den Binärpuffer legen und einen BufferView anlegen."""
        while len(puffer) % 4:
            puffer.append(0)
        offset = len(puffer)
        puffer.extend(daten.tobytes())
        bufferviews.append({
            'buffer': 0, 'byteOffset': offset, 'byteLength': len(daten.tobytes()), 'target': ziel
        })
        return len(bufferviews) - 1

    for kennung, p, n, d in strukturen:
        bv_p = anhaengen(p, 34962)
        bv_n = anhaengen(n, 34962)
        bv_i = anhaengen(d.reshape(-1), 34963)

        accessoren.append({'bufferView': bv_p, 'componentType': 5126, 'count': int(len(p)),
                           'type': 'VEC3',
                           'min': [float(x) for x in p.min(axis=0)],
                           'max': [float(x) for x in p.max(axis=0)]})
        a_p = len(accessoren) - 1
        accessoren.append({'bufferView': bv_n, 'componentType': 5126, 'count': int(len(n)), 'type': 'VEC3'})
        a_n = len(accessoren) - 1
        accessoren.append({'bufferView': bv_i, 'componentType': 5125, 'count': int(d.size), 'type': 'SCALAR'})
        a_i = len(accessoren) - 1

        meshes.append({'primitives': [{'attributes': {'POSITION': a_p, 'NORMAL': a_n},
                                       'indices': a_i, 'mode': 4}]})
        nodes.append({'mesh': len(meshes) - 1, 'name': kennung})

    gltf = {
        'asset': {'version': '2.0', 'generator': 'Physico aufbereiten.py',
                  'copyright': 'BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 JP'},
        'scene': 0,
        'scenes': [{'nodes': list(range(len(nodes)))}],
        'nodes': nodes,
        'meshes': meshes,
        'accessors': accessoren,
        'bufferViews': bufferviews,
        'buffers': [{'byteLength': len(puffer)}],
    }

    json_bytes = json.dumps(gltf, separators=(',', ':')).encode('utf-8')
    json_bytes += b' ' * ((4 - len(json_bytes) % 4) % 4)
    bin_bytes = bytes(puffer) + b'\x00' * ((4 - len(puffer) % 4) % 4)

    with open(pfad, 'wb') as f:
        f.write(b'glTF')
        f.write(struct.pack('<II', 2, 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)))
        f.write(struct.pack('<I', len(json_bytes)) + b'JSON' + json_bytes)
        f.write(struct.pack('<I', len(bin_bytes)) + b'BIN\x00' + bin_bytes)


# ---------------------------------------------------------------------------

def region_bestimmen(mitte, system):
    """Grobe Körperregion aus der Lage des Schwerpunkts."""
    x, y, z = mitte
    if y >= 1.45:
        return 'kopf'
    if y >= 1.33:
        return 'hals'
    if system in ('skelett', 'muskeln', 'gelenke') and abs(x) > 0.14 and y > 0.7:
        return 'arm'
    if y >= 0.86:
        return 'rumpf'
    if y >= 0.78 and abs(x) < 0.13:
        return 'becken'
    if abs(x) > 0.13 and y > 0.75:
        return 'arm'
    return 'bein'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--obj', required=True, help='Ordner mit den .obj-Dateien')
    ap.add_argument('--tabellen', default='quelldaten', help='Ordner mit parts_list_e.txt usw.')
    ap.add_argument('--ziel', default='modelle', help='Zielordner für die .glb-Dateien')
    ap.add_argument('--index', default='daten/strukturen.json', help='Zieldatei für das Verzeichnis')
    ap.add_argument('--stufe', default='fein', help='Bezeichnung der Detailstufe (fein/grob)')
    ap.add_argument('--wieIndex', default=None,
                    help='Vorhandenes Verzeichnis, dessen Bündel-Zuordnung übernommen wird '
                         '(damit beide Detailstufen identisch aufgeteilt sind)')
    ap.add_argument('--nurIds', default=None,
                    help='Textdatei mit einer FMA-Kennung pro Zeile. Ist sie angegeben, werden '
                         'nur diese Strukturen verarbeitet – alle anderen OBJ-Dateien werden '
                         'ignoriert. Damit lassen sich Strukturen dauerhaft aus dem Modell '
                         'entfernen, ohne die Rohdaten in quelldaten/ zu verändern.')
    args = ap.parse_args()

    erlaubt = None
    if args.nurIds:
        with open(args.nurIds, encoding='utf-8') as f:
            erlaubt = {z.strip() for z in f if z.strip()}
        print(f'Nur {len(erlaubt)} erlaubte Kennungen aus {args.nurIds} werden verarbeitet.')

    vorgabe = {}
    if args.wieIndex:
        with open(args.wieIndex, encoding='utf-8') as f:
            for e in json.load(f)['strukturen']:
                vorgabe[e['id']] = (e['system'], e['region'])
        print(f'Bündel-Zuordnung wird aus {args.wieIndex} übernommen ({len(vorgabe)} Strukturen).')

    namen, kinder, eltern, komposit = lade_tabellen(args.tabellen)

    dateien = sorted(f for f in os.listdir(args.obj) if f.endswith('.obj'))
    if erlaubt is not None:
        dateien = [d for d in dateien if os.path.splitext(d)[0] in erlaubt]
    print(f'{len(dateien)} OBJ-Dateien gefunden.')

    # System jeder Struktur bestimmen
    system_von = {}
    for schluessel, wurzel, _ in SYSTEME:
        for kennung in nachfahren(kinder, wurzel):
            system_von.setdefault(kennung, schluessel)

    # --- 1. Durchgang: nur Eckwerte lesen (spart Arbeitsspeicher) ----------
    # Wir merken uns pro Datei nur Schwerpunkt und tiefsten Punkt, nicht die
    # ganze Geometrie – sonst läuft bei der feinen Stufe der Speicher voll.
    print('Durchgang 1: Lage der Strukturen bestimmen …')
    eckwerte = {}
    min_z = 1e9
    summe_x = summe_y = 0.0
    for i, datei in enumerate(dateien):
        kennung = os.path.splitext(datei)[0]
        punkte = []
        with open(os.path.join(args.obj, datei), encoding='utf-8', errors='ignore') as f:
            for zeile in f:
                if zeile.startswith('v '):
                    punkte.append(zeile.split()[1:4])
        if not punkte:
            continue
        p = np.array(punkte, dtype=np.float32)
        eckwerte[kennung] = (p.mean(axis=0), float(p[:, 2].min()))
        min_z = min(min_z, eckwerte[kennung][1])
        summe_x += float(p[0:, 0].mean()); summe_y += float(p[:, 1].mean())
        if (i + 1) % 200 == 0:
            print(f'  {i + 1}/{len(dateien)}')
    mitte_x = summe_x / max(len(eckwerte), 1)
    mitte_z = summe_y / max(len(eckwerte), 1)
    print(f'Boden bei z={min_z:.0f} mm, Mitte x={mitte_x:.0f} mm, Tiefe y={mitte_z:.0f} mm')

    # --- 2. Durchgang: Bündel zuordnen -------------------------------------
    zuordnung = defaultdict(list)
    for kennung, (mittelwert, _) in eckwerte.items():
        system = system_von.get(kennung, 'sonstiges')
        mitte = [float(mittelwert[0] - mitte_x) / 1000.0,
                 float(mittelwert[2] - min_z) / 1000.0,
                 float(-(mittelwert[1] - mitte_z)) / 1000.0]
        region = region_bestimmen(mitte, system)
        if kennung in vorgabe:                      # beide Detailstufen gleich aufteilen
            system, region = vorgabe[kennung]
        zuordnung[f'{system}_{region}'].append((kennung, mitte, system, region))

    # --- 3. Bündel einzeln bauen und sofort wegschreiben -------------------
    print('Durchgang 2: Bündel schreiben …')
    os.makedirs(args.ziel, exist_ok=True)
    uebersicht = []
    verzeichnis = []
    for schluessel, eintraege in sorted(zuordnung.items()):
        strukturen = []
        for kennung, mitte, system, region in eintraege:
            p, n, d = lies_obj(os.path.join(args.obj, f'{kennung}.obj'))
            if len(p) == 0 or len(d) == 0:
                continue
            p2, n2 = in_unser_system(p, n, min_z, mitte_x, mitte_z)
            if n2 is None:
                n2 = normalen_berechnen(p2, d)
            strukturen.append((kennung, p2, n2, d))
            verzeichnis.append({
                'id': kennung,
                'name': namen.get(kennung, kennung),
                'system': system,
                'region': region,
                'seite': 'links' if mitte[0] > 0.02 else ('rechts' if mitte[0] < -0.02 else 'mitte'),
                'buendel': schluessel,
                'mitte': [round(v, 4) for v in mitte],
                'von': [round(float(v), 4) for v in p2.min(axis=0)],   # Eckpunkte der Struktur
                'bis': [round(float(v), 4) for v in p2.max(axis=0)],
                'groesse': round(float(np.linalg.norm(p2.max(axis=0) - p2.min(axis=0))), 4),
                'dreiecke': int(len(d)),
            })

        pfad = os.path.join(args.ziel, f'{schluessel}.glb')
        schreibe_glb(pfad, strukturen)
        groesse = os.path.getsize(pfad)
        uebersicht.append({'buendel': schluessel, 'datei': f'{args.ziel}/{schluessel}.glb',
                           'strukturen': len(strukturen), 'bytes': groesse})
        print(f'  {schluessel:24s} {len(strukturen):4d} Strukturen  {groesse/1e6:6.1f} MB')
        strukturen.clear()

    # --- 4. Verzeichnis schreiben ------------------------------------------
    zusammengesetzt = {}
    vorhanden = {e['id'] for e in verzeichnis}
    for kennung, teile in komposit.items():
        echte = [t for t in teile if t in vorhanden]
        if len(echte) > 1 and kennung not in vorhanden:
            zusammengesetzt[kennung] = {'name': namen.get(kennung, kennung), 'teile': echte}

    os.makedirs(os.path.dirname(args.index), exist_ok=True)
    with open(args.index, 'w', encoding='utf-8') as f:
        json.dump({
            'stufe': args.stufe,
            'quelle': 'BodyParts3D, (c) The Database Center for Life Science, CC BY-SA 2.1 Japan',
            'systeme': [{'id': s, 'name': n} for s, _, n in SYSTEME],
            'buendel': uebersicht,
            'strukturen': sorted(verzeichnis, key=lambda e: e['name']),
            'gruppen': zusammengesetzt,
        }, f, ensure_ascii=False)

    print(f'\nFertig: {len(verzeichnis)} Strukturen in {len(uebersicht)} Bündeln.')
    print(f'Verzeichnis: {args.index}')


if __name__ == '__main__':
    sys.exit(main())
