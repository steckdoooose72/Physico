#!/bin/bash
# ---------------------------------------------------------------
# Physico starten – einfach doppelklicken.
#
# Was hier passiert:
#   1. In den Projektordner wechseln
#   2. Einen kleinen Webserver starten (gehört zu macOS dazu)
#   3. Den Browser auf http://localhost:8000 öffnen
#
# Zum Beenden: dieses Terminal-Fenster schließen oder Strg + C drücken.
# ---------------------------------------------------------------

cd "$(dirname "$0")" || exit 1

PORT=8000

echo "Physico startet …"
echo "Adresse: http://localhost:$PORT"
echo "Zum Beenden: Strg + C"
echo

# Browser kurz verzögert öffnen, damit der Server schon läuft
( sleep 1 && open "http://localhost:$PORT/" ) &

# Eigener kleiner Server statt "python3 -m http.server": er weist den Browser an,
# nichts zwischenzuspeichern. Sonst zeigt der Browser nach Änderungen an den
# Dateien manchmal noch den alten Stand.
python3 werkzeuge/server.py "$PORT"
