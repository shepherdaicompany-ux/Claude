"""Build a self-contained preview of the storefront (no shop CDN, no rewrite rules).

Product photos are packed into binary bundles (assets/pack/*.bin + index.json) and served as blob: URLs,
routing switches to #/hash URLs. Used for the shareable preview link; production uses public_html as is.

Usage: python3 build_preview.py <public_html> <product_imgs_dir> <rich_imgs_dir> <out_dir>
"""
import json, os, re, shutil, sys, glob

SRC, IMGS, RICH, OUT = sys.argv[1:5]
CARD_PACK = 1_000_000
GAL_PACK = 2_000_000

if os.path.exists(OUT):
    shutil.rmtree(OUT)
shutil.copytree(SRC, OUT, ignore=shutil.ignore_patterns('.htaccess', 'hero.mp4'))

# ---- page: the artifact host supplies doctype/head/body; switch to bundle + hash routing
html = open(os.path.join(OUT, 'index.html'), encoding='utf-8').read()
for pat in [r'<!doctype html>\s*', r'<html[^>]*>\s*', r'</?head>\s*', r'<body>\s*', r'</body>\s*', r'</html>\s*',
            r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*', r'<base href="/">\s*']:
    html = re.sub(pat, '', html, flags=re.I)
html = html.replace('<script src="assets/js/core.js"></script>',
                    '<script>window.TR_CFG = { BUNDLE: true, HASH: true };</script>\n<script src="assets/js/core.js"></script>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

# ---- packs
data = os.path.join(OUT, 'assets', 'data')
cat = json.load(open(os.path.join(data, 'catalog.json')))
det = {}
for f in glob.glob(os.path.join(data, 'details', '*.json')):
    det.update(json.load(open(f)))
have = {f[:-5] for f in os.listdir(IMGS) if f.endswith('.webp')}
pack_dir = os.path.join(OUT, 'assets', 'pack')
os.makedirs(pack_dir, exist_ok=True)
index, packs = {}, []


class Packer:
    def __init__(self, prefix, limit):
        self.prefix, self.limit, self.buf, self.n = prefix, limit, bytearray(), 0

    def add(self, key, path):
        if key in index:
            return
        b = open(path, 'rb').read()
        if self.buf and len(self.buf) + len(b) > self.limit:
            self.flush()
        name = '%s%d' % (self.prefix, self.n)
        index[key] = [name, len(self.buf), len(b)]
        self.buf += b

    def flush(self):
        if not self.buf:
            return
        name = '%s%d' % (self.prefix, self.n)
        open(os.path.join(pack_dir, name + '.bin'), 'wb').write(self.buf)
        packs.append((name, len(self.buf)))
        self.buf, self.n = bytearray(), self.n + 1


cards = Packer('c', CARD_PACK)
for p in cat['products']:
    for im in p['im']:
        if str(im[0]) in have:
            cards.add(str(im[0]), os.path.join(IMGS, '%s.webp' % im[0]))
for im in cat['home'].get('hero', []) + [x[1] for x in cat['home'].get('ig', [])]:
    if str(im[0]) in have:
        cards.add(str(im[0]), os.path.join(IMGS, '%s.webp' % im[0]))
cards.flush()
gal = Packer('g', GAL_PACK)
for p in cat['products']:
    for im in det[str(p['id'])]['img'][:6]:
        if str(im[0]) in have:
            gal.add(str(im[0]), os.path.join(IMGS, '%s.webp' % im[0]))
rich_idx = os.path.join(RICH, 'index.json')
if os.path.exists(rich_idx):
    for url, h in json.load(open(rich_idx)).items():
        gal.add(url, os.path.join(RICH, h + '.webp'))
gal.flush()
json.dump(index, open(os.path.join(pack_dir, 'index.json'), 'w'), separators=(',', ':'))

total = sum(s for _, s in packs)
print('packs', len(packs), 'images', len(index), 'MB', round(total / 1e6, 1))
files = [os.path.relpath(os.path.join(d, f), OUT) for d, _, fs in os.walk(OUT) for f in fs]
print('files', len(files), 'total MB', round(sum(os.path.getsize(os.path.join(OUT, f)) for f in files) / 1e6, 1))
