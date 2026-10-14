"""Build the storefront data files from the parsed Shoper export.

Input : parsed/products.json, parsed/categories.json, parsed/info.json (tools/parse_shoper.py)
Output: public_html/assets/data/catalog.json, details/<n>.json, pages.json

Usage : python3 build_data.py <parsed_dir> <public_html_dir> [home.html]
"""
import json, os, re, sys, html, unicodedata
from collections import defaultdict, Counter

SRC, OUT = sys.argv[1], sys.argv[2]
HOME = sys.argv[3] if len(sys.argv) > 3 else None
DATA = os.path.join(OUT, 'assets', 'data')
os.makedirs(os.path.join(DATA, 'details'), exist_ok=True)

P = json.load(open(os.path.join(SRC, 'products.json')))
C = json.load(open(os.path.join(SRC, 'categories.json')))
I = json.load(open(os.path.join(SRC, 'info.json')))


def fold(s):
    s = unicodedata.normalize('NFD', s.lower())
    return ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').replace('ł', 'l')


# ---------------------------------------------------------------- categories
cats = {}
for c in C:
    if not c.get('id') or not c.get('slug'):
        continue
    slug = re.sub(r'/\d+$', '', c['slug'])
    k = cats.setdefault(c['id'], {'id': c['id'], 's': slug, 'n': c['name'], 'crumbs': c['crumbs'], 'd': '', 'it': [], 'tags': {}})
    if c['desc'] and not k['d']:
        k['d'] = c['desc']
    if not re.search(r'/\d+$', c['slug']):
        k['s'] = c['slug']
    for pid in c['products']:
        if pid not in k['it']:
            k['it'].append(pid)
    for pid, b in c['badges'].items():
        if b['tags']:
            k['tags'][int(pid)] = b['tags']
slug2cat = {k['s']: k for k in cats.values()}
for k in cats.values():
    par = None
    if k['crumbs']:
        ps = k['crumbs'][-1][0]
        if ps in slug2cat and slug2cat[ps] is not k:
            par = slug2cat[ps]['id']
    k['par'] = par

new_ids = set()
for k in cats.values():
    for pid, tags in k['tags'].items():
        if any('nowo' in t.lower() for t in tags):
            new_ids.add(pid)

# ---------------------------------------------------------------- colours
COLOR_VALUES = {}
for p in P:
    for o in p['options']:
        if o['label'].lower() == 'kolor':
            for v in o['values']:
                if v.get('hex'):
                    COLOR_VALUES[fold(v['name'])] = v['hex']
EN = {'black': '#15161a', 'white': '#f4f2ee', 'navy': '#1f2a44', 'gold': '#c6a15b', 'rose': '#c99b8c', 'pink': '#e7b3c0', 'blue': '#5b7db1',
      'green': '#2f5d46', 'bottle': '#173b2c', 'grey': '#8a8a8a', 'gray': '#8a8a8a', 'beige': '#d9c7ab', 'choco': '#4a2f1e', 'olive': '#5d6034',
      'camel': '#c19a6b', 'red': '#a3322a', 'burgundy': '#6d1f2a', 'taupe': '#8b7d6b', 'airy': '#a9c8e8', 'allure': '#79839b', 'champagne': '#f1e3c6',
      'silver': '#c0c0c0', 'cream': '#efe6d2', 'pistachio': '#b5c99a', 'dark': '#2b2b2b', 'grenadine': '#c0273b', 'lilac': '#b8a2c8', 'mint': '#bbe7df',
      'velvet': '#4b2d3a', 'sky': '#8ec5e6', 'brown': '#5a3a24', 'sand': '#d6c4a2', 'khaki': '#7a7350', 'emerald': '#1e6b52', 'plum': '#693754'}
PL = {'czarn': '#15161a', 'bial': '#f4f2ee', 'granat': '#1f2a44', 'bezow': '#d4c6b0', 'braz': '#5a3a24', 'szar': '#8a8a8a', 'roz': '#e7b3c0', 'zielon': '#2f5d46',
      'niebiesk': '#5b7db1', 'blekit': '#b1e9f1', 'czerwon': '#a3322a', 'bordow': '#8b0505', 'oliwk': '#57592a', 'szampan': '#f1e3c6', 'ceglan': '#c73b04',
      'grafit': '#4e4e4e', 'popiel': '#898989', 'seledyn': '#b8ccba', 'pudrow': '#f5b7b1', 'karmel': '#916e4e', 'zlot': '#c6a15b', 'srebrn': '#c0c0c0',
      'fiolet': '#6b4c8a', 'malin': '#eb0165', 'mieto': '#bbe7df', 'jagod': '#4f2d5a', 'chabr': '#0c33fb', 'morsk': '#5d99a3', 'kremow': '#efe6d2', 'zolt': '#e7c94a', 'pomarancz': '#e87d35', 'turkus': '#2bb3b1', 'dusty': '#7d93b2'}
GROUPS = [  # filter group, hex, folded stems
    ('Czarny', '#15161a', ['czarn', 'black', 'grafit', 'antracyt', 'dark']),
    ('Biały', '#f4f2ee', ['bial', 'white', 'kremow', 'cream', 'ecru']),
    ('Granatowy', '#1f2a44', ['granat', 'navy', 'jeans']),
    ('Beżowy', '#d4c6b0', ['bezow', 'beige', 'camel', 'sand', 'taupe', 'karmel', 'orzech']),
    ('Brązowy', '#5a3a24', ['braz', 'choco', 'brown', 'czekolad']),
    ('Zielony', '#2f5d46', ['zielon', 'green', 'olive', 'oliwk', 'bottle', 'khaki', 'pistachio', 'seledyn', 'emerald', 'mieto', 'mint']),
    ('Niebieski', '#5b7db1', ['turkus', 'dusty', 'niebiesk', 'blue', 'blekit', 'airy', 'allure', 'sky', 'chabr', 'morsk', 'citadel', 'aquifer', 'sahara']),
    ('Różowy', '#e7b3c0', ['roz', 'pink', 'rose', 'pudrow', 'primrose', 'malin']),
    ('Szary', '#8a8a8a', ['szar', 'grey', 'gray', 'popiel', 'silver', 'srebrn', 'melanz']),
    ('Czerwony', '#a3322a', ['czerwon', 'red', 'ceglan', 'grenadine', 'bordow', 'burgundy']),
    ('Złoty', '#c6a15b', ['zlot', 'gold', 'szampan', 'champagne']),
    ('Fioletowy', '#6b4c8a', ['fiolet', 'plum', 'lilac', 'jagod', 'velvet']),
]
COLOR_STEMS = set(list(EN) + list(PL) + ['antracyt', 'orzech', 'citadel', 'aquifer', 'sahara', 'primrose', 'melanz', 'czekolad', 'ecru', 'jeans'])
for name in COLOR_VALUES:
    for w in re.findall(r'[a-z]+', name):
        if len(w) >= 4:
            COLOR_STEMS.add(w[:6])
KEEP = {'kids', 'cristal', 'diamond', 'gloss', 'winter', 'summer', 'thermo', 'full', 'grip', 'men', 'meska', 'meskie', 'damska', 'tech', 'classic', 'mini',
        'pony', 'cob', 'full', 'warm', 'rider', 'ride', 'riders', 'true', 'born', 'team', 'marta', 'komma', 'scuba', 'shield', 'art', 'unzip', 'zip', 'long', 'short', 'sleeve', 'dark', 'limitowany', 'kolor'}
CONNECT = {'&', 'and', 'z', 'i', '-'}


def is_color_word(w):
    f = fold(w)
    f = re.sub(r'[^a-z]', '', f)
    if not f or f in KEEP:
        return False
    if f in EN:
        return True
    return any(f.startswith(st[:5]) and len(st) >= 4 for st in COLOR_STEMS if len(f) >= 3) or any(f.startswith(st) for st in PL)


def split_color(name):
    words = name.replace('&amp;', '&').split()
    keep, color = [], []
    for i, w in enumerate(words):
        if is_color_word(w) or (w in CONNECT and color and i + 1 < len(words) and is_color_word(words[i + 1]) and words[i - 1] in color):
            color.append(w)
        else:
            keep.append(w)
    return ' '.join(keep), ' '.join(color)


def hex_for(label):
    f = fold(label)
    for w in re.findall(r'[a-z]+', f):
        if w in EN:
            return EN[w]
        for st, hx in PL.items():
            if w.startswith(st):
                return hx
    for n, hx in COLOR_VALUES.items():
        if n and n in f:
            return hx
    return None


def group_for(label):
    f = fold(label)
    words = re.findall(r'[a-z]+', f)
    if 'black' in words and 'gold' in words:
        return ['Czarny', '#15161a']
    for g, hx, stems in GROUPS:
        if any(w.startswith(st) for w in words for st in stems):
            return [g, hx]
    return None


# ---------------------------------------------------------------- products
SIZE_OPT = re.compile(r'rozmiar|size', re.I)
cat_of = defaultdict(list)
for k in cats.values():
    for pid in k['it']:
        cat_of[pid].append(k['id'])

products, details = [], {}
for p in sorted(P, key=lambda x: x['id']):
    if not p['price'] or not p['images'] and not p['stocks']:
        pass
    vals = {}
    for o in p['options']:
        for v in o.get('values', []):
            vals[str(v['id'])] = o['id']
    st = p['stocks'] if isinstance(p['stocks'], dict) else {}
    present = defaultdict(list)
    for key in st:
        for vid in key.split(','):
            oid = vals.get(vid)
            if oid is not None and vid not in present[oid]:
                present[oid].append(vid)
    opts = []
    for o in p['options']:
        if o.get('type') != 'select':
            continue
        pv = [v for v in o['values'] if str(v['id']) in present[o['id']]]
        if not pv:
            continue
        opts.append({'id': o['id'], 'label': o['label'], 'values': pv, 'shown': len(pv) > 1 or bool(SIZE_OPT.search(o['label'])) and pv[0]['name'].lower() not in ('one size', 'uniwersalny')})
    # variants
    stv = {}
    for key, s in st.items():
        stock = s.get('stock')
        try:
            stock = int(float(stock)) if stock is not None else -1
        except (TypeError, ValueError):
            stock = -1
        stv[key] = [stock, 1 if s.get('buy') else 0, s.get('price') or p['price'], s.get('special'), s.get('code') or '']
    av = any(v[1] for v in stv.values()) if stv else (p['schema_avail'] == 'InStock')
    # sizes summary for cards/filters
    sz = []
    so = next((o for o in opts if SIZE_OPT.search(o['label'])), None)
    if so and so['shown']:
        for v in so['values']:
            ks = [k for k in stv if str(v['id']) in k.split(',')]
            buy = [stv[k] for k in ks if stv[k][1]]
            state = 0
            if buy:
                total = sum(max(0, b[0]) for b in buy) if all(b[0] >= 0 for b in buy) else 99
                state = 1 if 0 < total <= 2 else 2
            sz.append([v['name'], state, v['id']])
    base, color = split_color(p['name'])
    fam = fold(re.sub(r'\s+', ' ', base)).strip()
    fam = re.sub(r'limitowany kolor|\bkolor\b', '', fam).strip()
    hx = hex_for(color) if color else None
    cg = group_for(color) if color else None
    crumbs = [c for c in p['crumbs'] if c[0] in slug2cat]
    cids = list(dict.fromkeys(cat_of.get(p['id'], []) + ([slug2cat[crumbs[-1][0]]['id']] if crumbs else [])))
    keywords = ' '.join(cats[c]['n'] for c in cids if c in cats)
    images = p['images']
    products.append({
        'id': p['id'], 's': p['slug'], 'n': p['name'], 'p': p['price'], 'r': p['regular'], 'o': p['omnibus'],
        'im': images[:2] if images else [], 'ni': len(images), 'c': cids, 'fam': fam, 'cl': color or '', 'hx': hx, 'cg': cg,
        'sz': sz, 'av': 1 if av else 0, 'nw': 1 if p['id'] in new_ids else 0, 'k': keywords,
    })
    noframe = lambda h: re.sub(r'<p>\s*<iframe.*?</iframe>\s*</p>|<iframe.*?</iframe>', '', h, flags=re.S)
    details[p['id']] = {
        'intro': noframe(p['intro']), 'sec': [{'t': s['title'], 'h': noframe(s['html'])} for s in p['sections'] if noframe(s['html']).strip()], 'img': images, 'opts': opts, 'st': stv,
        'vid': p['videos'], 'dl': p['delivery'], 'sku': p['sku'], 'cr': crumbs,
    }

# families: only keep when 2+ distinct products share a key
fc = Counter(x['fam'] for x in products)
for x in products:
    if fc[x['fam']] < 2 or not x['cl']:
        x['fam'] = None
    if not x['im']:
        x['im'] = [[0, '']]

# homepage lists
home = {'nowosci': [], 'polecane': [], 'news': []}
if HOME:
    hs = open(HOME, encoding='utf-8').read()
    ids = [int(x) for x in re.findall(r'data-product-id="(\d+)"', hs)]
    home['nowosci'] = list(dict.fromkeys(ids))
    for t, url, d in re.findall(r'<h3[^>]*>\s*<a[^>]*>([^<]+)</a>.*?href="(https://truerider\.eu/[^"]+)".*?(\d\d-\d\d-\d{4})', hs, re.S)[:0]:
        pass
byid = {x['id']: x for x in products}
for pid in home['nowosci']:
    if pid in byid:
        byid[pid]['nw'] = 1
# feature picks used by the homepage (chosen by slug so they survive id changes)
def by_slug(s):
    return next((x for x in products if x['s'] == s), None)


def first_av(cat_slug, name_has=None):
    k = slug2cat.get(cat_slug)
    if not k:
        return None
    for pid in k['it']:
        x = byid.get(pid)
        if x and x['av'] and (not name_has or name_has.lower() in x['n'].lower()):
            return x
    return None


picks = [by_slug('Bluzo-kurtka-z-Kapturem-Scuba-Black'), by_slug('bluza-true-rider-komma-rose-gold'), by_slug('legginsy-marta-rose-gold-diamond'), by_slug('bomberka-forever-dry-granatowa')]
picks = [x for x in picks if x]
home['hero'] = []
home['heroLabels'] = []
for x in picks:
    det = details[x['id']]
    im = det['img'][1] if len(det['img']) > 1 else det['img'][0]
    home['hero'].append(im)
    home['heroLabels'].append(x['n'])
seen_fam, pol = set(), []
for slug in ['kategoria/legginsy', 'kategoria/bluzy', 'kategoria/kurtki', 'dla-konia-czapraki', 'kategoria/koszule-konkursowe', 'dla-konia-nauszniki', 'kategoria/kamizelki', 'mlodzi-jezdzcy-legginsy-jedzieckie']:
    k = slug2cat.get(slug)
    if not k:
        continue
    n = 0
    for pid in k['it']:
        x = byid.get(pid)
        if x and x['av'] and x['ni'] >= 4 and (x['fam'] or x['n']) not in seen_fam and pid not in home['nowosci']:
            seen_fam.add(x['fam'] or x['n'])
            pol.append(pid)
            n += 1
            if n == 2:
                break
home['polecane'] = pol
ig, ig_keys = [], set()
for x in sorted(products, key=lambda y: -y['id']):
    key = re.sub(r'\bkids\b', '', x['fam'] or fold(x['n'])).strip()
    if x['av'] and x['ni'] >= 6 and len(ig) < 12 and key not in ig_keys:
        ig_keys.add(key)
        ig.append((x['id'], details[x['id']]['img'][min(3 + len(ig) % 3, x['ni'] - 1)]))
home['ig'] = [[i, im] for i, im in ig[:12]]
mA = by_slug('legginsy-marta-rose-gold-diamond') or first_av('kategoria/rose-gold')
mB = first_av('dla-konia-kolekcja-rose-gold', 'czaprak') or first_av('dla-konia-kolekcja-rose-gold')
home['match'] = [mA['id'], mB['id']] if mA and mB else []
home['news'] = [
    {'t': 'SCUBA już dostępna! Poznaj naszą nową kurtkę przeciwdeszczową', 's': 'Bluzo-kurtka-z-Kapturem-Scuba-Black', 'd': '28.09.2026'},
    {'t': 'Nowość! Białe legginsy Diamond Gloss', 's': 'legginsy-marta-diamond-gloss-biale', 'd': '03.08.2026'},
    {'t': 'Nowa kolekcja Diamond Gloss już dostępna', 's': 'pl/new', 'd': '05.05.2026'},
    {'t': 'RESTOCK! Bluzy Komma ponownie dostępne', 's': 'bluza-true-rider-komma-black-and-gold', 'd': '23.10.2023'},
]
home['news'] = [n for n in home['news'] if n['s'] == 'pl/new' or by_slug(n['s'])]

COLLS = [
    ('kobieta-kolekcja-jesien-zima', 'Jesień / Zima', 'Jesień <em>/ Zima</em>', '#3b3a36', 'Kurtki Scuba, bomberki Forever Dry, ocieplane legginsy Marta Winter i bluzy na chłodne treningi.'),
    ('air-mesh', 'Air Mesh', 'Air <em>Mesh</em>', '#9fb6c9', 'Przewiewne koszulki z siateczki, także z kryształkami Cristal — na upalne treningi i zawody.'),
    ('kategoria/rose-gold', 'Rose Gold', 'Rose <em>Gold</em>', '#c99b8c', 'Różowe złoto na legginsach, bluzach i czaprakach — w modelach Diamond z diamencikami.'),
    ('kategoria/black-gold', 'Black & Gold', 'Black <em>&amp; Gold</em>', '#c6a15b', 'Ponadczasowa czerń ze złotym haftem — elegancja na zawody i do stajni.'),
    ('kolekcja-olive', 'Olive', '<em>Olive</em>', '#5d6034', 'Oliwkowa zieleń w duchu natury: legginsy, bluzy i dodatki w jednym tonie.'),
    ('kolekcja-choco', 'Choco', '<em>Choco</em>', '#4a2f1e', 'Głęboki czekoladowy brąz na legginsach, bluzach i kamizelkach.'),
    ('kolekcja-szampanska', 'Szampańska', '<em>Szampańska</em>', '#e9d9b8', 'Jasny, szampański odcień na legginsach, bluzach i dodatkach.'),
    ('dla-konia-kolekcja-velvet', 'Velvet', '<em>Velvet</em> dla konia', '#4b2d3a', 'Welurowe czapraki i nauszniki o głębokim kolorze i miękkim połysku.'),
    ('dla-konia-kolekcja-sparkle', 'Sparkle', '<em>Sparkle</em> dla konia', '#b9b9c4', 'Brokatowy napis True Rider na czaprakach i nausznikach — blask z klasą.'),
]
colls = [{'s': s, 'n': n, 'html': h, 'hx': hx, 'd': d} for s, n, h, hx, d in COLLS if s in slug2cat]

# ---------------------------------------------------------------- navigation
def nav_item(slug, name, cols, hot=False, feature=None, label=None):
    it = {'s': slug, 'n': name}
    if hot:
        it['hot'] = 1
    if cols:
        it['cols'] = [{'s': c[0], 'n': c[1], 'items': [{'s': s, 'n': n} for s, n in c[2]]} for c in cols if c[0] in slug2cat or c[0].startswith(('pl/', 'strona/'))]
        for c in it['cols']:
            c['items'] = [x for x in c['items'] if x['s'] in slug2cat]
    f = first_av(feature or slug)
    if f:
        it['feature'] = f['id']
        it['featureLabel'] = label or name
    return it


NAV = [
    nav_item('pl/new', 'Nowości', None, hot=True),
    nav_item('kobieta', 'Kobieta', [
        ('kobieta-kolekcja', 'Według kolekcji', [('kobieta-kolekcja-jesien-zima', 'Jesień / Zima'), ('air-mesh', 'Air Mesh'), ('kategoria/rose-gold', 'Rose Gold'), ('kategoria/black-gold', 'Black & Gold'), ('kolekcja-olive', 'Olive'), ('kolekcja-choco', 'Choco'), ('kolekcja-szampanska', 'Szampańska')]),
        ('kategoria/legginsy', 'Legginsy jeździeckie', [('kobieta-legginsy-jezdzieckie-letnie', 'Legginsy letnie'), ('kobieta-legginsy-jezdzieckie-zimowe', 'Legginsy zimowe'), ('kategoria/bryczesy', 'Bryczesy')]),
        ('kategoria/koszulki-treningowe', 'Koszulki treningowe', [('kobieta-koszulki-treningowe-krotki-rekaw', 'Krótki rękaw'), ('kobieta-koszulki-treningowe-dlugi-rekaw', 'Długi rękaw'), ('kategoria/t-shirt', 'T-shirty jeździeckie')]),
        ('kobieta-odziez-konkursowa', 'Odzież konkursowa', [('kobieta-odziez-konkursowa-legginsy-konkursowe', 'Legginsy konkursowe'), ('kategoria-bryczesy-konkursowe', 'Bryczesy konkursowe'), ('kategoria/koszule-konkursowe-dlugi-rekaw', 'Koszule — długi rękaw'), ('kategoria/koszule-konkursowe-krotki-rekaw', 'Koszule — krótki rękaw'), ('fraki-jezdzieckie', 'Fraki')]),
        ('kategoria/bluzy', 'Okrycia', [('kategoria/bluzy', 'Bluzy jeździeckie'), ('kategoria/kurtki', 'Kurtki i płaszcze'), ('kategoria/kamizelki', 'Kamizelki'), ('kategoria/kamizelki-ochronne', 'Kamizelki ochronne'), ('kategoria/spodnie-dresowe', 'Spodnie dresowe')]),
        ('kobieta-odziez-termoaktywna', 'Odzież termoaktywna', [('kobieta-odziez-termoaktywna-thermogolfy', 'Thermo Golfy'), ('kobieta-odziez-termoaktywna-thermo-legginsy', 'Thermo Legginsy')]),
    ], feature='kobieta-kolekcja-jesien-zima', label='Jesień / Zima'),
    nav_item('mlodzi-jezdzcy', 'Młodzież', [
        ('mlodzi-jezdzcy-kolekcja', 'Według kolekcji', [('mlodzi-jezdzcy-kolekcja-jesien-zima', 'Jesień / Zima'), ('mlodzi-jezdzcy-kolekcja-air-mesh', 'Air Mesh'), ('mlodzi-jezdzcy-kolekcja-rose-gold', 'Rose Gold'), ('mlodzi-jezdzcy-kolekcja-black-and-gold', 'Black & Gold'), ('mlodzi-jezdzcy-kolekcja-olive', 'Olive'), ('mlodzi-jezdzcy-kolekcja-choco', 'Choco'), ('mlodzi-jezdzcy-kolekcja-szampanska', 'Szampańska')]),
        ('mlodzi-jezdzcy-legginsy-jedzieckie', 'Legginsy jeździeckie', [('mlodzi-jezdzcy-legginsy-jezdzieckie-letnie', 'Legginsy letnie'), ('mlodzi-jezdzcy-legginsy-jedzieckie-zimowe', 'Legginsy zimowe'), ('mlodzi-jezdzcy-bryczesy', 'Bryczesy')]),
        ('mlodzi-jezdzcy-koszulki-treningowe', 'Koszulki treningowe', [('mlodzi-jezdzcy-koszulki-treningowe-krotki-rekaw', 'Krótki rękaw'), ('mlodzi-jezdzcy-legginsy-jezdzieckie-koszulki-treningowe-dlugi-rekaw', 'Długi rękaw'), ('mlodzi-jezdzcy-t-shirty', 'T-shirty jeździeckie')]),
        ('mlodzi-jezdzcy-odziez-konkursowa', 'Odzież konkursowa', [('mlodzi-jezdzcy-odziez-konkursowa-legginsy-do-jazdy-konnej', 'Legginsy konkursowe'), ('mlodzi-jezdzcy-bryczesy-konkursowe', 'Bryczesy konkursowe'), ('mlodzi-jezdzcy-odziez-konkursowa-koszule-dlugi-rekaw', 'Koszule — długi rękaw'), ('mlodzi-jezdzcy-odziez-konkursowa-koszule-krotki-rekaw', 'Koszule — krótki rękaw'), ('mlodzi-jezdzcy-odziez-konkursowa-fraki', 'Fraki')]),
        ('mlodzi-jezdzcy-bluzy-jezdzieckie', 'Okrycia', [('mlodzi-jezdzcy-bluzy-jezdzieckie', 'Bluzy jeździeckie'), ('mlodzi-jezdzcy-kurtki-jezdzieckie', 'Kurtki jeździeckie'), ('mlodzi-jezdzcy-kamizelki-jezdzieckie', 'Kamizelki'), ('kategoria/kamizelki-ochronne-kids', 'Kamizelki ochronne'), ('mlodzi-jezdzcy-spodnie-dresowe', 'Spodnie dresowe')]),
        ('mlodzi-jezdzcy-odziez-termoaktywna', 'Odzież termoaktywna', [('mlodzi-jezdzcy-odziez-termoaktywna-thermogolfy', 'Thermo Golfy'), ('mlodzi-jezdzcy-odziez-termoaktywna-thero-legginsy-do-jady-konnej', 'Thermo Legginsy')]),
    ], feature='mlodzi-jezdzcy-kolekcja-jesien-zima', label='Młodzi jeźdźcy'),
    nav_item('mezczyzna', 'Mężczyzna', [
        ('mezczyzna-kolekcja', 'Według kolekcji', [('mezczyzna-kolekcja-black-and-gold', 'Black & Gold'), ('mezczyzna-kolekcja-navy', 'Navy'), ('mezczyzna-kolekcja-jesien-zima', 'Jesień / Zima')]),
        ('mezczyzna', 'Odzież', [('mezczyzna-bluzy-jezdzieckie', 'Bluzy jeździeckie'), ('mezczyzna-kamizelki-jezdzieckie', 'Kamizelki'), ('mezczyzna-bryczesy-do-jazdy-konnej', 'Bryczesy'), ('mezczyzna-spodnie-dresowe', 'Spodnie dresowe')]),
    ], label='Dla jeźdźców'),
    nav_item('dla-konia', 'Dla konia', [
        ('dla-konia-kolekcja', 'Według kolekcji', [('dla-konia-kolekcja-velvet', 'Velvet'), ('dla-konia-kolekcja-black-and-gold', 'Black & Gold'), ('dla-konia-kolekcja-rose-gold', 'Rose Gold'), ('dla-konia-kolekcja-sparkle', 'Sparkle'), ('dla-konia-kolekcja-born-to-ride', 'Born to Ride')]),
        ('dla-konia', 'Sprzęt', [('dla-konia-czapraki', 'Czapraki'), ('dla-konia-nauszniki', 'Nauszniki'), ('dla-konia-derki', 'Derki polarowe'), ('dla-konia-kantary', 'Kantary'), ('dla-konia-naczolki', 'Naczółki')]),
    ], feature='dla-konia-czapraki', label='Czapraki True Rider'),
    nav_item('do-stajni', 'Do stajni', [('do-stajni', 'Wyposażenie stajni', [('dla-stajni-kurtyny', 'Kurtyny'), ('dla-stajni-bramki', 'Bramki'), ('dla-stajni-torby', 'Torby')])]),
    nav_item('kategoria/znakowanie-odziezy', 'Personalizacja', [('strona/technologie', 'Technologie', []), ('kategoria/znakowanie-odziezy', 'Personalizacja', [('kategoria/znakowanie-odziezy', 'Hafty i znakowanie')])]),
]
for n in NAV:
    if n.get('cols') == []:
        del n['cols']

cat_out = []
for k in sorted(cats.values(), key=lambda x: x['id']):
    cat_out.append({'id': k['id'], 's': k['s'], 'n': k['n'], 'par': k['par'], 'd': k['d'], 'it': [i for i in k['it'] if i in byid]})

# ---------------------------------------------------------------- details shards
SHARD = 24
for i, x in enumerate(products):
    x['sk'] = i // SHARD
shards = defaultdict(dict)
for x in products:
    shards[x['sk']][x['id']] = details[x['id']]
for n, m in shards.items():
    json.dump(m, open(os.path.join(DATA, 'details', '%d.json' % n), 'w'), ensure_ascii=False, separators=(',', ':'))

# ---------------------------------------------------------------- info pages
PAGE_TITLES = {'about-us': 'O nas', 'philosophy': 'Filozofia marki', 'values': 'Nasze wartości', 'mission-vision': 'Misja i wizja', 'technologie': 'Technologie',
               'ambassadors': 'Ambasadorzy', 'partners': 'Partnerzy', 'trueriderbrand': 'True Rider Brand', 'video': 'Wideo', 'customers': 'Nasi klienci',
               'order': 'Koszty i czas dostawy', 'sposoby-platnosci': 'Sposoby płatności', 'wymiana-i-zwroty': 'Wymiana i zwroty', 'returns': 'Zwroty',
               'tabela-rozmiarow': 'Tabela rozmiarów', 'zamowienia-indywidualne': 'Personalizacja i zamówienia klubowe', 'faq': 'Najczęstsze pytania',
               'contact': 'Kontakt', 'rules': 'Regulamin sklepu', 'privacy-policy': 'Polityka prywatności', 'policy_cookies': 'Polityka cookies',
               'copyright': 'Prawa autorskie', 'sklep-jezdziecki': 'Sklep jeździecki', 'akcesoria-jezdzieckie': 'Akcesoria jeździeckie',
               'odziez-do-jazdy-konnej': 'Odzież do jazdy konnej'}
SKIP = {'ffffffffffffffffffffff', 'test-tabela', 'https-www-truerider-eu-kolekcja-sale-2', 'realizacja'}
pages = {}
for pg in I:
    slug = (pg['slug'] or '').replace('strona/', '')
    if not slug or slug in SKIP or len(pg['html']) < 80:
        continue
    pages[slug] = {'t': PAGE_TITLES.get(slug, pg['title']), 'h': pg['html']}

catalog = {'v': 1, 'products': products, 'cats': cat_out, 'nav': NAV, 'home': home, 'colls': colls, 'pages': sorted(pages)}
json.dump(catalog, open(os.path.join(DATA, 'catalog.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(pages, open(os.path.join(DATA, 'pages.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print('products', len(products), 'available', sum(x['av'] for x in products), 'cats', len(cat_out), 'shards', len(shards), 'pages', len(pages))
print('families', len({x['fam'] for x in products if x['fam']}), 'new', sum(x['nw'] for x in products))
