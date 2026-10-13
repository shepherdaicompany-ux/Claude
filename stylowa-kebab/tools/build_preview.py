"""Buduje folder podglądu (bez PHP) do publikacji jako Artifact: dist/preview/."""
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "public_html"
OUT = ROOT / "dist" / "preview"

shutil.rmtree(OUT, ignore_errors=True)
OUT.mkdir(parents=True)
shutil.copytree(SRC / "assets", OUT / "assets")
shutil.copytree(SRC / "panel", OUT / "panel")

html = (SRC / "index.html").read_text(encoding="utf-8")
# Podgląd jest owijany we własny szkielet dokumentu — usuwamy nasz.
for pat in [r"<!doctype html>\s*", r'<html lang="pl">\s*', r"<head>\s*", r'<meta charset="utf-8">\s*',
            r'<meta name="viewport"[^>]*>\s*', r"</head>\s*", r"<body>\s*", r"</body>\s*", r"</html>\s*"]:
    html = re.sub(pat, "", html, count=1, flags=re.I)
(OUT / "index.html").write_text(html, encoding="utf-8")
print("\n".join(str(p.relative_to(OUT)) for p in sorted(OUT.rglob("*")) if p.is_file()))
