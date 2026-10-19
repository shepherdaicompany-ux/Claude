"""Tworzy jednoplikowy podgląd strony głównej (CSS, JS i logo wbudowane w HTML).

Uruchom: python3 tools/preview.py  ->  podglad-strony-glownej.html
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / "public_html"

html = (PUB / "index.html").read_text(encoding="utf-8")
css = (PUB / "assets/css/style.css").read_text(encoding="utf-8")
js = (PUB / "assets/js/main.js").read_text(encoding="utf-8")


def data_uri(rel):
    return "data:image/svg+xml;base64," + base64.b64encode((PUB / rel).read_bytes()).decode()


html = html.replace('<link rel="stylesheet" href="assets/css/style.css?v=1">', f"<style>{css}</style>")
html = html.replace('<script src="assets/js/main.js?v=1" defer></script>', f"<script>{js}</script>")
html = html.replace("assets/img/logo.svg", data_uri("assets/img/logo.svg"))
html = html.replace("assets/img/favicon.svg", data_uri("assets/img/favicon.svg"))
out = ROOT / "podglad-strony-glownej.html"
out.write_text(html, encoding="utf-8")
print("OK:", out, f"{out.stat().st_size // 1024} KB")
