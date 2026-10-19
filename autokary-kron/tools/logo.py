"""Generuje logo Autokary Kron (SVG z tekstem zamienionym na krzywe) + favicon.

Uruchom: python3 tools/logo.py   (wymaga: pip install fonttools)
"""
import math
import pathlib

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.varLib.instancer import OverlapMode, instantiateVariableFont

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT.parent / "public_html" / "assets" / "img"

PHONE = "505 434 624"

font = instantiateVariableFont(TTFont(ROOT / "fonts" / "Cinzel.ttf"), {"wght": 900}, overlap=OverlapMode.REMOVE)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font["head"].unitsPerEm
CAP = font["OS/2"].sCapHeight or 700


def text_path(text, size, cx, baseline, tracking=0.0):
    """Ścieżka SVG dla tekstu wyśrodkowanego w poziomie na cx."""
    scale = size / UPM
    names = [cmap[ord(c)] for c in text]
    widths = [glyphs[n].width * scale for n in names]
    total = sum(widths) + tracking * size * (len(names) - 1)
    x = cx - total / 2
    pen = SVGPathPen(glyphs)
    for name, w in zip(names, widths):
        tpen = TransformPen(pen, (scale, 0, 0, -scale, x, baseline))
        glyphs[name].draw(tpen)
        x += w + tracking * size
    return pen.getCommands(), total


def star(cx, cy, r, inner=0.42):
    """Gwiazda z fazowaniem: 10 trójkątów naprzemiennie jasnych i ciemnych."""
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    facets = []
    for i in range(10):
        p1, p2 = pts[i], pts[(i + 1) % 10]
        # lewa strona każdego ramienia jasna, prawa ciemna
        fill = "url(#gStarL)" if i % 2 == 1 else "url(#gStarD)"
        facets.append(
            f'<path d="M{cx:.1f} {cy:.1f}L{p1[0]:.1f} {p1[1]:.1f}L{p2[0]:.1f} {p2[1]:.1f}Z" fill="{fill}"/>'
        )
    outline = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
    return (
        f'<g><path d="{outline}" fill="#3b2504" transform="translate(0 3)"/>'
        + "".join(facets)
        + f'<path d="{outline}" fill="none" stroke="#5a3a07" stroke-width="1.6" stroke-linejoin="round"/></g>'
    )


DEFS = """<defs>
  <linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff3c4"/>
    <stop offset=".18" stop-color="#f6d77a"/>
    <stop offset=".42" stop-color="#d9a532"/>
    <stop offset=".5" stop-color="#9c6a12"/>
    <stop offset=".58" stop-color="#c8901f"/>
    <stop offset=".8" stop-color="#f3d27a"/>
    <stop offset="1" stop-color="#a87518"/>
  </linearGradient>
  <linearGradient id="gRing" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fbe7a1"/>
    <stop offset=".25" stop-color="#c8901f"/>
    <stop offset=".5" stop-color="#fff1bd"/>
    <stop offset=".75" stop-color="#a87518"/>
    <stop offset="1" stop-color="#f3d27a"/>
  </linearGradient>
  <linearGradient id="gStarL" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff6d2"/><stop offset="1" stop-color="#e9b94a"/>
  </linearGradient>
  <linearGradient id="gStarD" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d79d2a"/><stop offset="1" stop-color="#8c5c0f"/>
  </linearGradient>
</defs>"""


def gold_text(d):
    """Złoty tekst z ciemną 'grubością' pod spodem i cienkim konturem."""
    return (
        f'<path d="{d}" fill="#2e1d03" transform="translate(0 5)"/>'
        f'<path d="{d}" fill="url(#gGold)" stroke="#4a2f05" stroke-width="2.2" stroke-linejoin="round"/>'
        f'<path d="{d}" fill="none" stroke="#fff4c8" stroke-opacity=".35" stroke-width=".9" transform="translate(0 -1.2)"/>'
    )


def build_logo():
    W, H = 1000, 640
    cx, cy = W / 2, H / 2 + 6
    parts = []
    # owal: gruby pierścień + cienka wewnętrzna linia
    parts.append(f'<ellipse cx="{cx}" cy="{cy + 4}" rx="478" ry="292" fill="none" stroke="#2e1d03" stroke-width="18"/>')
    parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="478" ry="292" fill="none" stroke="url(#gRing)" stroke-width="15"/>')
    parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="478" ry="292" fill="none" stroke="#4a2f05" stroke-width="1.4" stroke-opacity=".7"/>')
    parts.append(f'<ellipse cx="{cx}" cy="{cy}" rx="452" ry="268" fill="none" stroke="url(#gRing)" stroke-width="4"/>')
    # gwiazdki na łuku
    for x, y, r in [(305, 150, 30), (400, 124, 40), (500, 112, 52), (600, 124, 40), (695, 150, 30)]:
        parts.append(star(x, y, r))
    # AUTOKARY z ornamentami
    d, w = text_path("AUTOKARY", 58, cx, 238, tracking=0.32)
    parts.append(gold_text(d))
    for side in (-1, 1):
        x1 = cx + side * (w / 2 + 22)
        x2 = cx + side * (w / 2 + 120)
        parts.append(f'<path d="M{x1:.1f} 218L{x2:.1f} 218" stroke="url(#gRing)" stroke-width="3" stroke-linecap="round"/>')
        parts.append(f'<circle cx="{x1:.1f}" cy="218" r="5" fill="url(#gStarL)" stroke="#4a2f05" stroke-width="1"/>')
    # KRON
    d, _ = text_path("KRON", 212, cx, 440, tracking=0.03)
    parts.append(gold_text(d))
    # telefon
    d, _ = text_path(PHONE, 66, cx, 532, tracking=0.05)
    parts.append(gold_text(d))
    body = "\n".join(parts)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Autokary Kron, tel. {PHONE}">'
        f"<title>Autokary Kron — {PHONE}</title>{DEFS}{body}</svg>"
    )


def build_mark():
    """Mały znak (favicon / ikona): owal, gwiazdki i litera K."""
    W = H = 256
    parts = [
        f'<rect width="{W}" height="{H}" rx="56" fill="#0b0a08"/>',
        '<ellipse cx="128" cy="134" rx="108" ry="92" fill="none" stroke="url(#gRing)" stroke-width="9"/>',
    ]
    for x, y, r in [(82, 78, 10), (104, 68, 13), (128, 63, 17), (152, 68, 13), (174, 78, 10)]:
        parts.append(star(x, y, r))
    d, _ = text_path("K", 112, 128, 196)
    parts.append(gold_text(d))
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">{DEFS}{"".join(parts)}</svg>'
    )


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "logo.svg").write_text(build_logo(), encoding="utf-8")
    (OUT / "favicon.svg").write_text(build_mark(), encoding="utf-8")
    print("OK:", OUT / "logo.svg", OUT / "favicon.svg")
