"""Download every product, category and info page listed in the Shoper sitemaps.
Usage: python3 scrape_shoper.py <workdir> [workers]   (sitemaps saved first as <workdir>/sm_p1.xml, sm_p2.xml, sm_c.xml, sm_col.xml, sm_i.xml)"""
import re, os, time, urllib.request, concurrent.futures as cf, sys
BASE = sys.argv[1]  # work dir with sm_*.xml sitemaps; pages land in <BASE>/raw/{p,c,i}
RAW = BASE + '/raw'
for d in 'pci':
    os.makedirs(RAW + '/' + d, exist_ok=True)


def locs(f):
    return re.findall(r'<loc>([^<]+)', open(BASE + '/' + f, encoding='utf-8').read())


def fname(u):
    return re.sub(r'[^a-zA-Z0-9_-]', '_', u.replace('https://truerider.eu/', ''))[:150] or 'index'


def get(job):
    u, dest = job
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        return 'skip'
    for a in range(6):
        try:
            req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36', 'Accept-Language': 'pl-PL'})
            d = urllib.request.urlopen(req, timeout=20).read()
            open(dest, 'wb').write(d)
            time.sleep(0.4)
            return 'ok'
        except Exception:
            time.sleep(1.5)
    print('FAIL', u, flush=True)
    return 'fail'


jobs = []
for f in ['sm_p1.xml', 'sm_p2.xml']:
    jobs += [(u, RAW + '/p/' + fname(u) + '.html') for u in locs(f)]
for f in ['sm_c.xml', 'sm_col.xml']:
    jobs += [(u, RAW + '/c/' + fname(u) + '.html') for u in locs(f) if 'Produkty-bez' not in u]
for f in ['sm_i.xml']:
    jobs += [(u, RAW + '/i/' + fname(u) + '.html') for u in locs(f)]
print('jobs', len(jobs), flush=True)
n = 0
with cf.ThreadPoolExecutor(int(sys.argv[2]) if len(sys.argv) > 2 else 3) as ex:
    for r in ex.map(get, jobs):
        n += 1
        if n % 50 == 0:
            print(n, flush=True)
print('DONE', flush=True)
