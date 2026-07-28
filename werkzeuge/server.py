#!/usr/bin/env python3
"""
server.py – Webserver für die Entwicklung, ohne Zwischenspeicherung.

Der eingebaute Server von Python (`python3 -m http.server`) sagt dem Browser
nicht, dass er Dateien nicht zwischenspeichern soll. Weil sich in diesem
Projekt CSS, JavaScript und die JSON-Dateien ständig ändern, führte das dazu,
dass der Browser nach einer Änderung weiterhin die alte Fassung zeigte, obwohl
die Datei auf der Festplatte längst neu war.

Dieser Server macht dasselbe wie `python3 -m http.server`, schickt aber bei
jeder Antwort zusätzlich "Cache-Control: no-store" – der Browser fragt dann
bei jedem Laden neu nach.

Aufruf: .venv/bin/python werkzeuge/server.py [PORT]
"""

import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler


class OhneZwischenspeicher(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, format, *args):
        # Etwas ruhiger als die Standardausgabe, aber Fehler weiterhin zeigen.
        if '" 200' not in (args[0] if args else ''):
            super().log_message(format, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(('', port), OhneZwischenspeicher)
    print(f'Physico läuft auf http://localhost:{port} (ohne Zwischenspeicherung)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nBeendet.')


if __name__ == '__main__':
    main()
