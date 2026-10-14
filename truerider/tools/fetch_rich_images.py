"""Download images embedded in descriptions and info pages (size charts etc.).
Usage: python3 fetch_rich_images.py <public_html/assets/data> <out_dir>"""
import json, glob, re, os, sys, io, hashlib, time, urllib.request
from PIL import Image
DATA, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
urls = set()
for f in glob.glob(os.path.join(DATA, 'details', '*.json')):
    for k, v in json.load(open(f)).items():
        for s in [v['intro']] + [x['h'] for x in v['sec']]:
            urls.update(re.findall(r'<img[^>]+src="([^"]+)"', s))
for k, v in json.load(open(os.path.join(DATA, 'pages.json'))).items():
    urls.update(re.findall(r'<img[^>]+src="([^"]+)"', v['h']))
index = {}
for u in sorted(urls):
    h = hashlib.sha1(u.encode()).hexdigest()[:16]
    dest = os.path.join(OUT, h + '.webp')
    if not os.path.exists(dest):
        for a in range(4):
            try:
                d = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=20).read()
                im = Image.open(io.BytesIO(d))
                im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
                if im.mode == 'RGBA':
                    bg = Image.new('RGB', im.size, (252, 251, 249)); bg.paste(im, mask=im.split()[3]); im = bg
                im.thumbnail((1200, 2400))
                im.save(dest, 'WEBP', quality=78, method=5)
                break
            except Exception as e:
                err = e; time.sleep(1)
        else:
            print('FAIL', u, err, flush=True)
            continue
    index[u] = h
json.dump(index, open(os.path.join(OUT, 'index.json'), 'w'))
print('done', len(index), 'of', len(urls))
