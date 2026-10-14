"""Parse downloaded Shoper pages into products.json, categories.json, info.json.
Usage: python3 parse_shoper.py <workdir>"""
import re, os, json, base64, html, sys, unicodedata
BASE = sys.argv[1] if len(sys.argv) > 1 else '.'
RAW = BASE + '/raw'
OUT = BASE + '/parsed'
os.makedirs(OUT, exist_ok=True)


def txt(x):
    x = re.sub(r'<[^>]+>', ' ', x or '')
    return re.sub(r'\s+', ' ', html.unescape(x)).strip()


def canon(s):
    m = re.search(r'<link rel="canonical" href="https?://(?:www\.)?truerider\.eu/([^"]*)"', s)
    return m.group(1) if m else None


def money(v):
    if not v:
        return None
    v = html.unescape(v).replace('\xa0', '').replace('zł', '').replace(' ', '').replace(',', '.')
    try:
        return round(float(v), 2)
    except ValueError:
        return None


def clean_html(h):
    """Strip inline styling from Shoper WYSIWYG content, keep semantic tags."""
    h = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', h, flags=re.S)
    h = re.sub(r'<!--.*?-->', '', h, flags=re.S)
    h = re.sub(r'\s(style|class|data-[a-z-]+|dir|lang|align|width|height|border|cellpadding|cellspacing|frameborder|title)="[^"]*"', '', h)
    h = re.sub(r'</?(span|font|div|o:p|u)[^>]*>', '', h)
    h = re.sub(r'<p>\s*(&nbsp;|\xa0|\s)*\s*</p>', '', h)
    h = re.sub(r'<strong>\s*</strong>', '', h)
    h = re.sub(r'(<strong>)+', '<strong>', h)
    h = re.sub(r'(</strong>)+', '</strong>', h)
    h = re.sub(r'<br\s*/?>\s*(<br\s*/?>\s*)+', '<br>', h)
    h = re.sub(r'src="/', 'src="https://truerider.eu/', h)
    h = re.sub(r'src="(?!https?:)(?!//)', 'src="https://truerider.eu/', h)
    h = h.replace('https://www.truerider.eu', 'https://truerider.eu')
    h = re.sub(r'\n\s*\n+', '\n', h)
    return h.strip()


def split_sections(h):
    """Shoper uses {newtable/Title/} markers to split the description into tabs."""
    parts = re.split(r'(?:<p>)?\s*(?:<strong>)*\s*\{newtable/([^/}]*)/?\}\s*(?:</strong>)*\s*(?:</p>)?', h)
    intro = parts[0].strip()
    sections = []
    for i in range(1, len(parts), 2):
        title = txt(parts[i]).rstrip(':').strip()
        body = parts[i + 1].strip() if i + 1 < len(parts) else ''
        body = re.sub(r'^(</strong>|</p>|\s)+', '', body)
        body = re.sub(r'(<p>|<strong>|\s)+$', '', body)
        if body:
            sections.append({'title': title, 'html': body})
    return intro, sections


def parse_product(s):
    m = re.search(r'<body id="shop_product(\d+)"', s)
    if not m:
        return None
    p = {'id': int(m.group(1)), 'slug': canon(s)}
    m = re.search(r'<h1 class="name" itemprop="name">(.*?)</h1>', s, re.S)
    p['name'] = txt(m.group(1)) if m else None
    crumbs = re.findall(r'<li class="bred-\d+ ?"[^>]*>\s*<a href="([^"]+)" itemprop="item">.*?<span itemprop="name">(.*?)</span>', s, re.S)
    p['crumbs'] = [[u.strip('/'), txt(n)] for u, n in crumbs if u != '/']
    m = re.search(r'<em class="main-price[^"]*">(.*?)</em>', s, re.S)
    p['price'] = money(txt(m.group(1))) if m else None
    m = re.search(r'<del class="price__inactive">(.*?)</del>', s, re.S)
    p['regular'] = money(txt(m.group(1))) if m and txt(m.group(1)) else None
    m = re.search(r'<strong class="js__omnibus-price-gross price__inactive">(.*?)</strong>', s, re.S)
    p['omnibus'] = money(txt(m.group(1))) if m and txt(m.group(1)) else None
    m = re.search(r'<link itemprop="availability" href="https://schema.org/(\w+)"', s)
    p['schema_avail'] = m.group(1) if m else None
    m = re.search(r'<meta itemprop="sku" content="([^"]*)"', s)
    p['sku'] = m.group(1) if m else None
    m = re.search(r'class="delivery">\s*<span class="first">[^<]*</span>\s*<span class="second">([^<]*)</span>', s)
    p['delivery'] = txt(m.group(1)) if m else None
    m = re.search(r'id="box_productfull" data-category="([^"]*)"', s)
    p['category_name'] = html.unescape(m.group(1)) if m else None
    # gallery
    imgs = []
    for gid, href in re.findall(r'id="prodimg(\d+)"\s*href="/userdata/public/gfx/\d+/([^"]+)"', s):
        if (gid, href) not in imgs:
            imgs.append((gid, href))
    if not imgs:
        m = re.search(r'productGfx_(\d+)_\d+_\d+/([^"?]+)', s)
        if m:
            imgs.append((m.group(1), m.group(2)))
    p['images'] = [[int(g), f] for g, f in imgs]
    # options
    opts = []
    for oid, label_html, body in re.findall(r'<label for="option_(\d+)" class="label">(.*?)</label>.*?(<select id="option_\1".*?</select>|<input[^>]*name="option_\1"[^>]*>|<textarea[^>]*name="option_\1".*?</textarea>)', s, re.S):
        label = txt(label_html).replace('*', '').strip().rstrip(':').strip()
        o = {'id': int(oid), 'label': label}
        if body.startswith('<select'):
            o['type'] = 'select'
            o['values'] = []
            for vid, attrs, name in re.findall(r'<option value="(\d+)"([^>]*)>(.*?)</option>', body, re.S):
                v = {'id': int(vid), 'name': txt(name)}
                t = re.search(r'title="(#[0-9a-fA-F]{3,6})"', attrs)
                if t:
                    v['hex'] = t.group(1)
                o['values'].append(v)
        else:
            o['type'] = 'text'
        req = re.search(r'name="option_%s"' % oid, s)
        opts.append(o)
    p['options'] = opts
    m = re.search(r'Shop\.values\.OptionsConfiguration = "([^"]*)"', s)
    p['optconf'] = m.group(1) if m else None
    stocks = {}
    m = re.search(r'Shop\.values\.ProductStocksCache = "([^"]+)"', s)
    if m:
        try:
            d = json.loads(base64.b64decode(m.group(1)))
            for k, v in (d.items() if isinstance(d, dict) else []):
                stocks[k] = {
                    'stock': v.get('stock'), 'buy': v.get('can_buy'), 'price': money(v.get('price')),
                    'special': money(v.get('special_offer')) if v.get('special_offer') else None,
                    'avail': v.get('availability'), 'delivery': v.get('delivery'), 'code': v.get('code'),
                    'photo': int(v['photo_id']) if v.get('photo_id') else None,
                    'lowest': money(v.get('historical_lowest_price')),
                }
        except Exception as e:
            print('stock decode fail', p['slug'], e, file=sys.stderr)
    p['stocks'] = stocks
    m = re.search(r'<input type="hidden" value="(\d+)" name="stock_id">', s)
    p['stock_id'] = int(m.group(1)) if m else None
    p['can_buy_page'] = 'addtobasket' in s and 'class="addtobasket' in s
    # description
    m = re.search(r'<div class="resetcss fr-view" itemprop="description">(.*?)</div>\s*</div>\s*</div>', s, re.S)
    desc = clean_html(m.group(1)) if m else ''
    intro, sections = split_sections(desc)
    p['intro'] = intro
    p['sections'] = sections
    p['videos'] = sorted(set(re.findall(r'youtube\.com/embed/([A-Za-z0-9_-]{6,})', desc)))
    m = re.search(r'<meta property="og:description" content="([^"]*)"', s)
    p['short'] = html.unescape(m.group(1)) if m else ''
    # promo flags
    p['flags'] = sorted(set(re.findall(r'<span class="(?:tag|productTag|promo)[^"]*"[^>]*>([^<]+)</span>', s)))
    return p


def parse_category(s, fname):
    c = {'file': fname, 'slug': canon(s)}
    m = re.search(r'<body id="shop_category(\d+)"', s)
    c['id'] = int(m.group(1)) if m else None
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    c['name'] = txt(m.group(1)) if m else None
    crumbs = re.findall(r'<li class="bred-\d+ ?"[^>]*>\s*<a href="([^"]+)" itemprop="item">.*?<span itemprop="name">(.*?)</span>', s, re.S)
    c['crumbs'] = [[u.strip('/'), txt(n)] for u, n in crumbs if u != '/']
    c['products'] = [int(x) for x in re.findall(r'data-product-id="(\d+)"', s)]
    c['product_slugs'] = re.findall(r'<a class="prodname f-row" href="/([^"]+)"', s)
    m = re.search(r'<div class="categorydesc[^"]*"[^>]*>(.*?)</div>\s*</div>', s, re.S) or re.search(r'id="box_categorydesc"[^>]*>(.*?)</div>\s*</div>', s, re.S)
    c['desc'] = clean_html(m.group(1)) if m else ''
    # list-level badges: product id -> tags (Nowość, Promocja)
    badges = {}
    for pid, block in re.findall(r'data-product-id="(\d+)"(.*?)(?=data-product-id="|\Z)', s, re.S):
        tags = re.findall(r'<span class="tag[^"]*">\s*([^<]+?)\s*</span>', block[:6000])
        alt = re.search(r'data-src-alt="([^"]+)"', block[:4000])
        price = re.search(r'<em[^>]*>([\d\s,.]+)\s*zł</em>', block[:8000])
        badges[pid] = {'tags': tags, 'alt': alt.group(1) if alt else None}
    c['badges'] = badges
    m = re.search(r'<link rel="next" href="([^"]+)"', s)
    c['next'] = m.group(1) if m else None
    return c


def parse_info(s, fname):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S) or re.search(r'<title>(.*?)</title>', s, re.S)
    title = re.sub(r'\s*[-|–]\s*True Rider.*$', '', txt(m.group(1))) if m else fname
    m = re.search(r'id="box_textpage"[^>]*>.*?<div class="innerbox[^"]*">(.*?)</div>\s*</div>\s*</div>', s, re.S) or \
        re.search(r'<div class="resetcss[^"]*"[^>]*>(.*?)</div>\s*</div>', s, re.S)
    body = clean_html(m.group(1)) if m else ''
    return {'file': fname, 'slug': canon(s), 'title': title, 'html': body}


if __name__ == '__main__':
    prods, cats, infos = [], [], []
    for f in sorted(os.listdir(RAW + '/p')):
        s = open(RAW + '/p/' + f, encoding='utf-8', errors='ignore').read()
        p = parse_product(s)
        if p:
            prods.append(p)
        else:
            print('noprod', f, file=sys.stderr)
    for f in sorted(os.listdir(RAW + '/c')):
        s = open(RAW + '/c/' + f, encoding='utf-8', errors='ignore').read()
        cats.append(parse_category(s, f))
    for f in sorted(os.listdir(RAW + '/i')):
        s = open(RAW + '/i/' + f, encoding='utf-8', errors='ignore').read()
        infos.append(parse_info(s, f))
    json.dump(prods, open(OUT + '/products.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(cats, open(OUT + '/categories.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(infos, open(OUT + '/info.json', 'w'), ensure_ascii=False, indent=1)
    print(len(prods), len(cats), len(infos))
