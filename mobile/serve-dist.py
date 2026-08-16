#!/usr/bin/env python3
"""Kleiner Auslieferer für den statischen Web-Export.

Expo legt pro Route eine eigene HTML-Datei ab (/onboarding.html). Ein Aufruf von
/onboarding muss deshalb auf die Datei mit Endung fallen, sonst gibt es 404.
"""
import os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

WURZEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WURZEL, **kw)

    def translate_path(self, path):
        ziel = super().translate_path(path)
        if os.path.isdir(ziel):
            return ziel
        if not os.path.exists(ziel):
            mit_endung = ziel + '.html'
            if os.path.exists(mit_endung):
                return mit_endung
            return os.path.join(WURZEL, 'index.html')
        return ziel

    def log_message(self, *args):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
print(f'App läuft auf http://localhost:{port}', flush=True)
ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()
