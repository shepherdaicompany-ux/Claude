/* True Rider storefront — core: config, utils, data, images, state, router */
(function () {
  'use strict';
  const TR = (window.TR = window.TR || {});

  /* ---------- config ---------- */
  // BUNDLE: images come from packed files shipped with the page (offline preview); otherwise from the shop CDN.
  // HASH: hash routing for hosts without rewrite rules (preview, file://). Production uses clean URLs + .htaccess.
  TR.cfg = Object.assign({
    BUNDLE: false,
    HASH: location.protocol === 'file:',
    CDN: 'https://truerider.eu/environment/cache/images/',
    DATA: 'assets/data/',
    PACK: 'assets/pack/',
    FREE_SHIP: 0,
  }, window.TR_CFG || {});

  /* ---------- utils ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pln = (v) => (v == null ? '' : new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + ' zł');
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('tr_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tr_' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: state stays in memory */ } },
  };
  Object.assign(TR, { $, $$, esc, pln, fold, debounce, clamp, reduced, store });

  /* ---------- data ---------- */
  const D = (TR.data = { products: [], byId: new Map(), bySlug: new Map(), cats: [], catById: new Map(), catBySlug: new Map(), pages: null, details: new Map() });
  const getJSON = (url) => fetch(url, { cache: 'force-cache' }).then((r) => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); });

  TR.loadCatalog = async function () {
    const c = await getJSON(TR.cfg.DATA + 'catalog.json');
    D.v = c.v; D.nav = c.nav; D.home = c.home; D.pagesIndex = c.pages; D.colls = c.colls || [];
    D.products = c.products;
    c.products.forEach((p, i) => { p._i = i; p._f = fold(p.n + ' ' + (p.cl || '') + ' ' + (p.k || '')); D.byId.set(p.id, p); D.bySlug.set(p.s.toLowerCase(), p); });
    D.cats = c.cats;
    c.cats.forEach((k) => { D.catById.set(k.id, k); D.catBySlug.set(k.s.toLowerCase(), k); });
    c.cats.forEach((k) => { k.kids = c.cats.filter((x) => x.par === k.id); });
    return D;
  };
  const shardP = new Map();
  TR.detail = function (p) {
    if (D.details.has(p.id)) return Promise.resolve(D.details.get(p.id));
    if (!shardP.has(p.sk)) shardP.set(p.sk, getJSON(TR.cfg.DATA + 'details/' + p.sk + '.json').then((m) => { Object.keys(m).forEach((id) => D.details.set(+id, m[id])); }));
    return shardP.get(p.sk).then(() => D.details.get(p.id));
  };
  TR.loadPages = function () {
    if (!D.pagesP) D.pagesP = getJSON(TR.cfg.DATA + 'pages.json').then((x) => (D.pages = x));
    return D.pagesP;
  };

  /* ---------- images ---------- */
  // Shoper renders any square bounding box on demand: productGfx_<id>_<w>_<w>/<file>
  const sizeFor = (w) => (w <= 400 ? 400 : w <= 700 ? 700 : 1000);
  TR.imgUrl = (g, f, w) => TR.cfg.CDN + 'productGfx_' + g + '_' + sizeFor(w) + '_' + sizeFor(w) + '/' + encodeURI(f);
  let packIndex = null, packIndexP = null;
  const packs = new Map(), blobUrls = new Map();
  function packIdx() { if (!packIndexP) packIndexP = getJSON(TR.cfg.PACK + 'index.json').then((x) => (packIndex = x)); return packIndexP; }
  async function blobFor(g) {
    if (blobUrls.has(g)) return blobUrls.get(g);
    await packIdx();
    const e = packIndex[g];
    if (!e) return null;
    const [pk, off, len] = e;
    if (!packs.has(pk)) packs.set(pk, fetch(TR.cfg.PACK + pk + '.bin').then((r) => r.blob()));
    const b = await packs.get(pk);
    const u = URL.createObjectURL(b.slice(off, off + len, 'image/webp'));
    blobUrls.set(g, u);
    return u;
  }
  TR.img = function (im, w, alt, cls, extra) {
    if (!im) return '<span class="noimg"></span>';
    const [g, f] = im;
    return '<img ' + (cls ? 'class="' + cls + '" ' : '') + 'data-g="' + g + '" data-f="' + esc(f) + '" data-w="' + w + '" alt="' + esc(alt || '') + '" decoding="async"' + (extra || '') + '>';
  };
  let io = null;
  function setSrc(el) {
    const g = el.dataset.g, f = el.dataset.f, w = +el.dataset.w || 700;
    el.removeAttribute('data-g');
    const done = () => el.classList.remove('ld');
    el.addEventListener('load', done, { once: true });
    if (!TR.cfg.BUNDLE) {
      // the shop CDN sometimes fails to render a size on first request: fall back to the original file
      el.addEventListener('error', () => { el.removeAttribute('srcset'); el.src = TR.cfg.CDN.replace('environment/cache/images/', 'userdata/public/gfx/') + g + '/' + encodeURI(f); }, { once: true });
      el.src = TR.imgUrl(g, f, w);
      if (w >= 700) el.srcset = TR.imgUrl(g, f, 400) + ' 400w, ' + TR.imgUrl(g, f, 700) + ' 700w, ' + TR.imgUrl(g, f, 1000) + ' 1000w';
      if (el.dataset.sizes) el.sizes = el.dataset.sizes;
    } else {
      blobFor(g).then((u) => { if (u) el.src = u; else el.src = TR.imgUrl(g, f, w); });
    }
  }
  TR.hydrate = function (root) {
    const imgs = $$('img[data-g]', root || document);
    if (!imgs.length) return;
    if (!('IntersectionObserver' in window)) { imgs.forEach(setSrc); return; }
    if (!io) io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); setSrc(e.target); } }), { rootMargin: '600px 300px' });
    imgs.forEach((el) => { el.classList.add('ld'); io.observe(el); });
  };
  TR.loadNow = function (root) { $$('img[data-g]', root).forEach((el) => { if (io) io.unobserve(el); setSrc(el); }); };
  // rich HTML (descriptions, info pages): in bundle mode external images come from the pack too
  TR.rich = (h) => (TR.cfg.BUNDLE ? String(h || '').replace(/<img([^>]*?)\ssrc="([^"]+)"/g, '<img$1 data-rsrc="$2"') : h || '');
  TR.richImgs = function (root) {
    if (!TR.cfg.BUNDLE) return;
    $$('img[data-rsrc]', root).forEach((im) => { const u = im.dataset.rsrc; im.removeAttribute('data-rsrc'); blobFor(u).then((b) => { if (b) im.src = b; else im.remove(); }); });
  };
  TR.packReady = () => packIdx();
  TR.packHas = (g) => !!(packIndex && packIndex[g]);
  TR.resolveSrc = async function (im, w) { if (!im) return ''; return TR.cfg.BUNDLE ? (await blobFor(String(im[0]))) || TR.imgUrl(im[0], im[1], w) : TR.imgUrl(im[0], im[1], w); };

  /* ---------- product helpers ---------- */
  TR.price = (p) => p.p;
  TR.onSale = (p) => p.r && p.r > p.p;
  TR.salePct = (p) => (TR.onSale(p) ? Math.round((1 - p.p / p.r) * 100) : 0);
  TR.stockState = (p) => {
    if (!p.av) return 'out';
    const sz = p.sz || [];
    const ok = sz.filter((s) => s[1] > 0);
    if (sz.length > 1 && ok.length && ok.every((s) => s[1] === 1)) return 'low';
    return 'ok';
  };
  TR.family = (p) => (p.fam ? D.products.filter((x) => x.fam === p.fam) : [p]);
  TR.url = (p) => '/' + p.s;
  TR.catUrl = (c) => '/' + c.s;
  TR.catProducts = (c) => {
    const seen = new Set(), out = [];
    const add = (k) => { k.it.forEach((id) => { if (!seen.has(id) && D.byId.has(id)) { seen.add(id); out.push(D.byId.get(id)); } }); k.kids.forEach(add); };
    add(c);
    return out;
  };

  /* ---------- state: cart, wishlist, recent ---------- */
  const S = (TR.state = {
    cart: store.get('cart', []),
    wish: store.get('wish', []),
    recent: store.get('recent', []),
    orders: store.get('orders', []),
    code: store.get('code', null),
    codeUntil: store.get('codeUntil', 0),
    source: store.get('source', null),
    pending: [],
    subs: new Set(),
  });
  TR.on = (fn) => S.subs.add(fn);
  const emit = (what) => S.subs.forEach((fn) => fn(what));
  TR.save = function (what) {
    if (what === 'cart') store.set('cart', S.cart);
    if (what === 'wish') store.set('wish', S.wish);
    if (what === 'recent') store.set('recent', S.recent);
    if (what === 'orders') store.set('orders', S.orders);
    if (what === 'code') { store.set('code', S.code); store.set('codeUntil', S.codeUntil || 0); }
    if (what === 'source') store.set('source', S.source);
    emit(what);
  };
  TR.cartAdd = function (p, variant, qty) {
    // variant: { key, label, price, stock }
    const key = p.id + ':' + (variant ? variant.key : '');
    const line = S.cart.find((l) => l.key === key);
    const max = variant && variant.stock > 0 ? variant.stock : 99;
    if (line) line.qty = Math.min(max, line.qty + (qty || 1));
    else S.cart.unshift({ key, id: p.id, v: variant ? variant.key : '', label: variant ? variant.label : '', price: variant && variant.price ? variant.price : p.p, regular: p.r || null, max, qty: Math.min(max, qty || 1), added: Date.now() });
    TR.save('cart');
    return key;
  };
  TR.cartQty = function (key, qty) {
    const l = S.cart.find((x) => x.key === key);
    if (!l) return;
    if (qty <= 0) S.cart = S.cart.filter((x) => x.key !== key);
    else l.qty = Math.min(l.max || 99, qty);
    TR.save('cart');
  };
  TR.cartCount = () => S.cart.reduce((a, l) => a + l.qty, 0);
  TR.cartSubtotal = () => S.cart.reduce((a, l) => a + l.qty * l.price, 0);
  // Discount codes. `hours` = how long a code stays active after it is applied (campaign links create urgency).
  // Until the CMS exists, campaign codes are defined here.
  TR.CODES = {
    TRUERIDER5: { pct: 5, label: 'Rabat newsletterowy −5%' },
    TEAM10: { pct: 10, label: 'Rabat klubowy −10%' },
    LANDING5: { pct: 5, label: 'Rabat z kampanii −5%', hours: 48 },
    LANDING10: { pct: 10, label: 'Rabat z kampanii −10%', hours: 24 },
  };
  TR.codeValid = () => !!(S.code && TR.CODES[S.code] && (!S.codeUntil || Date.now() < S.codeUntil));
  TR.codeLabel = () => (TR.codeValid() ? TR.CODES[S.code].label : '');
  TR.applyCode = function (code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) { S.code = null; S.codeUntil = 0; TR.save('code'); return true; }
    const c = TR.CODES[code];
    if (!c) return false;
    // re-applying the same active code keeps the original deadline
    if (!(S.code === code && TR.codeValid())) S.codeUntil = c.hours ? Date.now() + c.hours * 3600e3 : 0;
    S.code = code;
    TR.save('code');
    return true;
  };
  TR.discount = () => (TR.codeValid() ? Math.round(TR.cartSubtotal() * TR.CODES[S.code].pct) / 100 : 0);
  TR.countdown = (until) => { const s = Math.max(0, Math.floor((until - Date.now()) / 1000)); const p = (n) => String(n).padStart(2, '0'); return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60); };
  TR.toggleWish = function (id) {
    const i = S.wish.indexOf(id);
    if (i >= 0) S.wish.splice(i, 1); else S.wish.unshift(id);
    TR.save('wish');
    return i < 0;
  };
  TR.isWish = (id) => S.wish.includes(id);
  TR.pushRecent = function (id) { S.recent = [id].concat(S.recent.filter((x) => x !== id)).slice(0, 12); TR.save('recent'); };

  /* ---------- router ---------- */
  const R = (TR.router = { routes: [], current: null });
  TR.route = (test, view) => R.routes.push({ test, view });
  TR.path = function () {
    if (R.mem) return R.mem;
    if (TR.cfg.HASH) { const h = location.hash.replace(/^#/, ''); return h.startsWith('/') ? h : '/'; }
    return decodeURIComponent(location.pathname.replace(/\/index\.html$/, '/')) || '/';
  };
  TR.query = function () {
    const raw = TR.cfg.HASH ? (location.hash.split('?')[1] || '') : location.search.slice(1);
    return new URLSearchParams(raw);
  };
  TR.href = (path) => (TR.cfg.HASH ? '#' + path : path);
  TR.go = function (path, opts) {
    opts = opts || {};
    const target = TR.cfg.HASH ? '#' + path : path;
    try {
      if (opts.replace) history.replaceState(null, '', target); else history.pushState(null, '', target);
      R.mem = null;
      if (TR.path() !== path) R.mem = path;
    } catch (e) { R.mem = path; /* sandboxed frame without history: route in memory */ }
    TR.render(opts);
  };
  TR.render = async function (opts) {
    opts = opts || {};
    const full = TR.path();
    const path = full.split('?')[0].replace(/\/+$/, '') || '/';
    for (const r of R.routes) {
      const m = r.test(path);
      if (m) { R.current = { path, m }; await r.view(m, opts); return; }
    }
  };
  window.addEventListener('popstate', () => { R.mem = null; TR.render({ pop: true }); });
})();
