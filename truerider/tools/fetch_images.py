"""Download product photos (first N per product) from the shop CDN as 720px WebP.
Usage: python3 fetch_images.py <public_html/assets/data> <out_dir> [per_product]"""
import json, os, sys, glob, time, io, urllib.request, urllib.parse, concurrent.futures as cf
from PIL import Image
DATA = sys.argv[1]; OUT = sys.argv[2]; PER = int(sys.argv[3]) if len(sys.argv) > 3 else 6
cat = json.load(open(os.path.join(DATA, 'catalog.json')))
want = {}
det = {}
for f in glob.glob(os.path.join(DATA, 'details', '*.json')):
    det.update(json.load(open(f)))
for p in cat['products']:
    for im in det[str(p['id'])]['img'][:PER]:
        want[im[0]] = im[1]
for im in cat['home'].get('hero', []) + [x[1] for x in cat['home'].get('ig', [])]:
    want[im[0]] = im[1]
print('images', len(want), flush=True)
def get(item):
    g, f = item
    dest = os.path.join(OUT, '%s.webp' % g)
    if os.path.exists(dest):
        return 'skip'
    url = 'https://truerider.eu/environment/cache/images/productGfx_%s_1000_1000/%s' % (g, urllib.parse.quote(f))
    for a in range(6):
        try:
            d = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=12).read()
            im = Image.open(io.BytesIO(d)).convert('RGB')
            im.thumbnail((720, 1080))
            im.save(dest, 'WEBP', quality=70, method=5)
            return 'ok'
        except Exception as e:
            err = e
            time.sleep(0.8)
    print('FAIL', g, f, err, flush=True)
    return 'fail'
n = 0
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(get, list(want.items())):
        n += 1
        if n % 100 == 0:
            print(n, flush=True)
print('DONE', flush=True)
