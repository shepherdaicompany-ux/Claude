/* True Rider storefront — shared UI: header, menus, search, cart drawer, modal, cards, motion */
(function () {
  'use strict';
  const TR = window.TR;
  const { $, $$, esc, pln, fold, debounce } = TR;
  const D = TR.data, S = TR.state;
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    arrow: '<svg class="arr" viewBox="0 0 24 24" width="16" height="16"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 12H5m6-6-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2.5 14 10l7.5 2-7.5 2-2 7.5-2-7.5L2.5 12 10 10Z" fill="currentColor"/></svg>',
    truck: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7" cy="17.5" r="1.8" fill="#fff" stroke="currentColor" stroke-width="1.5"/><circle cx="17" cy="17.5" r="1.8" fill="#fff" stroke="currentColor" stroke-width="1.5"/></svg>',
    swap: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 8h14l-3-3M20 16H6l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    needle: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M4 20 19 5a1.5 1.5 0 0 1 2 2L6 22M15 5l4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    card: '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="6" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    filter: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  };
  TR.ICON = ICON;

  /* ---------- links ---------- */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//')) return;
    e.preventDefault();
    closeAll();
    TR.go(href);
  });
  // Rewrite in-app links for hash routing (e.g. middle-click, copy link).
  TR.fixLinks = function (root) {
    if (!TR.cfg.HASH) return;
    $$('a[href^="/"]:not([data-fixed])', root).forEach((a) => { a.dataset.fixed = 1; a.dataset.path = a.getAttribute('href'); });
  };

  /* ---------- overlays ---------- */
  let lastFocus = null;
  function openLayer(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('lock');
    const f = el.querySelector('input, button, a');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
  }
  function closeLayer(el) {
    if (!el || el.hidden) return;
    el.hidden = true;
    if (!$$('.mnav:not([hidden]), .search:not([hidden]), .drawer:not([hidden]), .modal:not([hidden]), .filters:not([hidden])').length) document.body.classList.remove('lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function closeAll() { ['mnav', 'search', 'cart', 'modal'].forEach((id) => closeLayer($('#' + id))); $$('.filters').forEach((f) => closeLayer(f)); megaClose(); }
  TR.openLayer = openLayer; TR.closeLayer = closeLayer; TR.closeAll = closeAll;
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]');
    if (c) closeLayer(c.closest('.mnav, .search, .drawer, .modal, .filters'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { const open = $$('.modal:not([hidden]), .filters:not([hidden]), .drawer:not([hidden]), .search:not([hidden]), .mnav:not([hidden])')[0]; if (open) closeLayer(open); else megaClose(); }
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------- header + mega menu ---------- */
  const hdr = $('#hdr'), mega = $('#mega');
  let megaFor = null, megaT = null;
  function navHref(n) { return '/' + n.s; }
  TR.buildNav = function () {
    const nav = D.nav;
    $('#nav').innerHTML = '<ul class="nav-list">' + nav.map((n, i) => '<li data-i="' + i + '"><a href="' + navHref(n) + '"' + (n.hot ? ' class="hot"' : '') + (n.cols ? ' aria-haspopup="true"' : '') + '>' + esc(n.n) + '</a></li>').join('') + '</ul>';
    $$('#nav li').forEach((li) => {
      const n = nav[+li.dataset.i];
      li.addEventListener('mouseenter', () => { clearTimeout(megaT); megaT = setTimeout(() => (n.cols ? megaOpen(n) : megaClose()), 90); });
      li.querySelector('a').addEventListener('focus', () => (n.cols ? megaOpen(n) : megaClose()));
    });
    hdr.addEventListener('mouseleave', () => { clearTimeout(megaT); megaT = setTimeout(megaClose, 160); });
    mega.addEventListener('mouseenter', () => clearTimeout(megaT));
    // mobile
    $('#mnavBody').innerHTML = nav.map((n) => {
      if (!n.cols) return '<a href="' + navHref(n) + '">' + esc(n.n) + '</a>';
      return '<details><summary>' + esc(n.n) + '</summary><div class="mnav__sub"><a href="' + navHref(n) + '"><b>Zobacz wszystko</b></a>' + n.cols.map((c) => '<div><h5><a href="/' + c.s + '">' + esc(c.n) + '</a></h5>' + (c.items || []).map((x) => '<a href="/' + x.s + '">' + esc(x.n) + '</a>').join('') + '</div>').join('') + '</div></details>';
    }).join('') + '<a href="/ulubione">Ulubione</a><a href="/strona/contact">Kontakt</a>';
  };
  function megaOpen(n) {
    if (megaFor === n) return;
    megaFor = n;
    const feat = n.feature && D.byId.get(n.feature);
    mega.innerHTML = '<div class="wrap mega__in"><div class="mega__cols">' + n.cols.map((c) => '<div class="mega__col"><h4><a href="/' + c.s + '">' + esc(c.n) + '</a></h4><ul>' + (c.items || []).map((x) => '<li><a href="/' + x.s + '">' + esc(x.n) + '</a></li>').join('') + '</ul></div>').join('') + '</div>' +
      (feat ? '<a class="mega__feature" href="' + TR.url(feat) + '">' + TR.img(feat.im[0], 700, feat.n) + '<span>' + esc(n.featureLabel || feat.n) + '</span></a>' : '') + '</div>';
    mega.hidden = false;
    mega.classList.remove('anim'); void mega.offsetWidth; mega.classList.add('anim');
    TR.hydrate(mega);
    $$('#nav li').forEach((li) => li.querySelector('a').classList.toggle('active', D.nav[+li.dataset.i] === n));
  }
  function megaClose() { megaFor = null; mega.hidden = true; $$('#nav a.active').forEach((a) => a.classList.remove('active')); }
  TR.megaClose = megaClose;

  $('#burger').addEventListener('click', () => openLayer($('#mnav')));
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    hdr.classList.toggle('scrolled', y > 10);
    const hide = y > 400 && y > lastY + 4 && megaFor === null;
    if (y < lastY - 4 || y < 400) { hdr.classList.remove('hide'); document.body.classList.remove('hdr-hidden'); }
    else if (hide) { hdr.classList.add('hide'); document.body.classList.add('hdr-hidden'); }
    lastY = y;
  }, { passive: true });

  /* ---------- toast ---------- */
  let toastT;
  TR.toast = function (html) {
    const t = $('#toast');
    t.innerHTML = html;
    TR.hydrate(t); TR.loadNow(t);
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 3400);
  };

  /* ---------- modal ---------- */
  TR.modal = function (html, cls) {
    const box = $('#modalBox');
    box.className = 'modal__box' + (cls ? ' ' + cls : '');
    box.innerHTML = '<button class="icon-btn modal__close" data-close aria-label="Zamknij">' + ICON.close + '</button>' + html;
    TR.hydrate(box); TR.loadNow(box);
    openLayer($('#modal'));
    return box;
  };
  TR.lightbox = function (images, start, alt) {
    let i = start || 0;
    const box = TR.modal('<div class="lb"><img alt="' + esc(alt || '') + '"><button class="lb__nav lb__prev" aria-label="Poprzednie zdjęcie">' + ICON.left + '</button><button class="lb__nav lb__next" aria-label="Następne zdjęcie">' + ICON.right + '</button><div class="lb__count"></div></div>', 'modal__box--lb');
    const img = $('img', box);
    const show = async () => { img.src = await TR.resolveSrc(images[i], 1400); $('.lb__count', box).textContent = (i + 1) + ' / ' + images.length; };
    $('.lb__prev', box).onclick = () => { i = (i - 1 + images.length) % images.length; show(); };
    $('.lb__next', box).onclick = () => { i = (i + 1) % images.length; show(); };
    box.onkeydown = (e) => { if (e.key === 'ArrowLeft') $('.lb__prev', box).click(); if (e.key === 'ArrowRight') $('.lb__next', box).click(); };
    let sx = null;
    img.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    img.addEventListener('touchend', (e) => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) (dx < 0 ? $('.lb__next', box) : $('.lb__prev', box)).click(); sx = null; });
    if (images.length < 2) $$('.lb__nav', box).forEach((b) => (b.hidden = true));
    show();
  };

  /* ---------- product card ---------- */
  TR.card = function (p, opts) {
    opts = opts || {};
    const st = TR.stockState(p);
    const badges = [];
    if (TR.onSale(p)) badges.push('<span class="badge badge--sale">−' + TR.salePct(p) + '%</span>');
    if (p.nw) badges.push('<span class="badge badge--new">Nowość</span>');
    if (st === 'low') badges.push('<span class="badge badge--low">Ostatnie sztuki</span>');
    if (st === 'out') badges.push('<span class="badge badge--out">Wyprzedane</span>');
    const fam = TR.family(p);
    const sw = fam.length > 1 ? '<div class="card__swatches">' + fam.slice(0, 5).map((x) => '<i style="background:' + esc(x.hx || '#ccc') + '" title="' + esc(x.cl || x.n) + '"></i>').join('') + '<small>' + TR.plural(fam.length, 'kolor', 'kolory', 'kolorów') + '</small></div>' : '';
    const sizes = (p.sz || []).filter((s) => s[0]);
    const quick = st !== 'out' && sizes.length ? '<div class="card__quick"><p>Szybko do koszyka</p><div class="card__sizes">' + sizes.slice(0, 10).map((s) => '<button type="button" data-q="' + esc(s[2]) + '"' + (s[1] ? '' : ' disabled') + '>' + esc(s[0]) + '</button>').join('') + '</div></div>' : '';
    const quickOne = st !== 'out' && !sizes.length ? '<div class="card__quick"><div class="card__sizes"><button type="button" data-q="" style="width:100%">Dodaj do koszyka</button></div></div>' : '';
    return '<article class="card' + (st === 'out' ? ' out' : '') + (opts.rv === false ? '' : ' rv') + '" data-id="' + p.id + '" data-cursor="Zobacz">' +
      '<div class="card__media">' + TR.img(p.im[0], 700, p.n, '', ' data-sizes="(min-width:1200px) 25vw, (min-width:760px) 33vw, 50vw"') + (p.im[1] ? TR.img(p.im[1], 700, '', 'alt') : '') +
      '<div class="card__badges">' + badges.join('') + '</div>' +
      '<button class="card__wish' + (TR.isWish(p.id) ? ' on' : '') + '" type="button" data-wish="' + p.id + '" aria-label="Dodaj do ulubionych" aria-pressed="' + TR.isWish(p.id) + '">' + ICON.heart + '</button>' + quick + quickOne + '</div>' +
      '<div class="card__body"><h3 class="card__name"><a href="' + TR.url(p) + '">' + esc(p.n) + '</a></h3>' +
      '<div class="card__price">' + (TR.onSale(p) ? '<b class="sale">' + pln(p.p) + '</b><del>' + pln(p.r) + '</del>' : '<b>' + pln(p.p) + '</b>') + '</div>' + sw + '</div></article>';
  };
  document.addEventListener('click', async (e) => {
    const w = e.target.closest('[data-wish]');
    if (w) {
      e.preventDefault();
      const id = +w.dataset.wish;
      const on = TR.toggleWish(id);
      $$('[data-wish="' + id + '"]').forEach((b) => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      w.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.2,.7,.1,1)' });
      const p = D.byId.get(id);
      TR.toast(TR.img(p.im[0], 400, '') + '<span>' + (on ? 'Dodano do ulubionych' : 'Usunięto z ulubionych') + '</span>' + (on ? '<a href="/ulubione">Zobacz</a>' : ''));
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q && q.closest('.card')) {
      e.preventDefault();
      const card = q.closest('.card');
      const p = D.byId.get(+card.dataset.id);
      const det = await TR.detail(p);
      const v = TR.variantForQuick(p, det, q.dataset.q);
      if (!v) { TR.go(TR.url(p)); return; }
      TR.addToCart(p, v, 1, $('.card__media img', card));
    }
  });

  /* Resolve a variant for quick add: only when the product has a single non-size option choice. */
  TR.variantForQuick = function (p, det, sizeValueId) {
    if (!det) return null;
    const keys = Object.keys(det.st || {});
    if (!keys.length) return { key: '', label: '', price: p.p, stock: 99 };
    const match = keys.filter((k) => !sizeValueId || k.split(',').includes(String(sizeValueId))).filter((k) => det.st[k][1]);
    if (match.length !== 1) return null;
    return TR.variantInfo(p, det, match[0]);
  };
  TR.variantInfo = function (p, det, key) {
    const s = det.st[key];
    const ids = key.split(',');
    const label = (det.opts || []).map((o) => { const v = o.values.find((x) => ids.includes(String(x.id))); return v && o.shown ? o.label + ': ' + v.name : null; }).filter(Boolean).join(' · ');
    return { key, label, price: s[3] || s[2] || p.p, stock: s[0], code: s[4] };
  };
  TR.addToCart = function (p, v, qty, fromImg) {
    TR.cartAdd(p, v, qty);
    flyToCart(fromImg);
    TR.toast(TR.img(p.im[0], 400, '') + '<span><b>' + esc(p.n) + '</b>' + (v && v.label ? ' · ' + esc(v.label) : '') + '<br>dodano do koszyka</span><a href="#" data-open-cart>Koszyk</a>');
  };
  function flyToCart(img) {
    const target = $('#openCart');
    if (!img || !img.src || TR.reduced()) return;
    const a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'fly';
    f.innerHTML = '<img src="' + img.currentSrc + '" alt="">';
    document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - 35, y0 = a.top + a.height / 2 - 52, x1 = b.left + b.width / 2 - 35, y1 = b.top + b.height / 2 - 52;
    f.animate([
      { transform: `translate(${x0}px,${y0}px) scale(1.2)`, opacity: 1 },
      { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 120}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: .55 },
      { transform: `translate(${x1}px,${y1}px) scale(.15)`, opacity: .2 },
    ], { duration: 900, easing: 'cubic-bezier(.6,0,.3,1)' }).onfinish = () => f.remove();
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); } });

  /* ---------- counters ---------- */
  function counts(what) {
    const c = TR.cartCount(), w = S.wish.length;
    const cc = $('#cartCount'), wc = $('#wishCount');
    cc.hidden = !c; cc.textContent = c; wc.hidden = !w; wc.textContent = w;
    if (what === 'cart') { cc.classList.remove('bump'); void cc.offsetWidth; cc.classList.add('bump'); renderCart(); }
    if (what === 'wish') { wc.classList.remove('bump'); void wc.offsetWidth; wc.classList.add('bump'); }
  }
  TR.on(counts);
  TR.counts = counts;

  /* ---------- cart drawer ---------- */
  function openCart() { renderCart(); openLayer($('#cart')); }
  TR.openCart = openCart;
  $('#openCart').addEventListener('click', openCart);
  function lineHTML(l) {
    const p = D.byId.get(l.id);
    if (!p) return '';
    return '<div class="line" data-key="' + esc(l.key) + '"><a class="line__img" href="' + TR.url(p) + '">' + TR.img(p.im[0], 400, p.n) + '</a><div><div class="line__top"><a class="line__name" href="' + TR.url(p) + '">' + esc(p.n) + '</a></div>' +
      (l.label ? '<div class="line__meta">' + esc(l.label) + '</div>' : '') +
      '<div class="line__bot"><div class="qty"><button type="button" data-dq="-1" aria-label="Zmniejsz ilość">−</button><span>' + l.qty + '</span><button type="button" data-dq="1" aria-label="Zwiększ ilość"' + (l.qty >= l.max ? ' disabled' : '') + '>+</button></div>' +
      '<div class="line__price">' + (l.regular && l.regular > l.price ? '<del>' + pln(l.regular * l.qty) + '</del>' : '') + pln(l.price * l.qty) + '</div></div>' +
      '<button class="line__rm" type="button" data-rm>Usuń</button></div></div>';
  }
  function renderCart() {
    const body = $('#cartBody'), foot = $('#cartFoot');
    const n = TR.cartCount();
    $('#cartHeadCount').textContent = n ? '(' + n + ')' : '';
    if (!S.cart.length) {
      body.innerHTML = '<div class="cart-empty"><h3>Koszyk czeka na pierwszy przejazd</h3><p class="muted">Dodaj legginsy, bluzę albo komplet dla konia — wszystko wyślemy w 24 h.</p><a class="btn" href="/pl/new">Zobacz nowości</a></div>';
      foot.innerHTML = '';
      TR.hydrate(body);
      return;
    }
    body.innerHTML = S.cart.map(lineHTML).join('');
    TR.hydrate(body); TR.loadNow(body);
    const sub = TR.cartSubtotal(), disc = TR.discount();
    foot.innerHTML = '<div class="sum-row"><span>Wartość produktów</span><b class="num">' + pln(sub) + '</b></div>' +
      (disc ? '<div class="sum-row"><span>' + esc(TR.CODES[S.code].label) + '</span><b class="num">−' + pln(disc) + '</b></div>' : '') +
      '<div class="sum-row"><span>Dostawa</span><span class="muted">od 15,50 zł · odbiór w Mierzynie 0 zł</span></div>' +
      '<div class="sum-row total"><span>Razem</span><span class="num">' + pln(sub - disc) + '</span></div>' +
      '<a class="btn btn--block" href="/zamowienie"><span>Przejdź do zamówienia</span>' + ICON.arrow + '</a>' +
      '<p class="muted" style="font-size:.78rem;text-align:center">Kup teraz, zapłać za 30 dni z PayPo · 14 dni na zwrot</p>';
  }
  TR.renderCart = renderCart;
  $('#cartBody').addEventListener('click', (e) => {
    const line = e.target.closest('.line');
    if (!line) return;
    const key = line.dataset.key, l = S.cart.find((x) => x.key === key);
    if (e.target.closest('[data-dq]')) TR.cartQty(key, l.qty + +e.target.closest('[data-dq]').dataset.dq);
    if (e.target.closest('[data-rm]')) { line.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(30px)' }], { duration: 250 }).onfinish = () => TR.cartQty(key, 0); }
  });

  /* ---------- search ---------- */
  function openSearch() { openLayer($('#search')); renderSearch(''); }
  TR.openSearch = openSearch;
  $('#openSearch').addEventListener('click', openSearch);
  TR.searchProducts = function (q, limit) {
    const toks = fold(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const res = [];
    for (const p of D.products) {
      if (toks.every((t) => p._f.includes(t))) {
        let score = (p.av ? 10 : 0) + (p.nw ? 3 : 0) - p._i / 1000;
        if (fold(p.n).startsWith(toks[0])) score += 5;
        res.push([score, p]);
      }
    }
    res.sort((a, b) => b[0] - a[0]);
    return res.slice(0, limit || 999).map((x) => x[1]);
  };
  function renderSearch(q) {
    const body = $('#searchBody');
    if (!q.trim()) {
      const pop = ['Legginsy Marta', 'Bluza Komma', 'Czaprak', 'Koszula konkursowa', 'Thermo', 'Scuba', 'Nauszniki', 'Kids'];
      const recent = S.recent.map((id) => D.byId.get(id)).filter(Boolean).slice(0, 6);
      body.innerHTML = '<p class="eyebrow">Popularne wyszukiwania</p><div class="search__chips">' + pop.map((t) => '<button class="chip" type="button" data-s="' + esc(t) + '">' + esc(t) + '</button>').join('') + '</div>' +
        (recent.length ? '<p class="eyebrow" style="margin-top:28px">Ostatnio oglądane</p><div class="search__res">' + recent.map((p) => TR.card(p, { rv: false })).join('') + '</div>' : '');
    } else {
      const res = TR.searchProducts(q);
      const cats = D.cats.filter((c) => fold(c.n).includes(fold(q.trim()))).slice(0, 6);
      body.innerHTML = (cats.length ? '<div class="search__chips">' + cats.map((c) => '<a class="chip" href="/' + c.s + '">' + esc(c.n) + ' <small>' + TR.catProducts(c).length + '</small></a>').join('') + '</div>' : '') +
        (res.length ? '<p class="eyebrow" style="margin-top:20px">' + res.length + ' produkt' + (res.length === 1 ? '' : res.length < 5 ? 'y' : 'ów') + '</p><div class="search__res">' + res.slice(0, 24).map((p) => TR.card(p, { rv: false })).join('') + '</div>' +
          (res.length > 24 ? '<p style="margin-top:22px"><a class="btn btn--ghost" href="/szukaj?q=' + encodeURIComponent(q) + '">Wszystkie wyniki (' + res.length + ')</a></p>' : '')
          : '<p class="search__empty">Nic nie znaleźliśmy dla „' + esc(q) + '”. Spróbuj: legginsy, bluza, czaprak.</p>');
    }
    TR.hydrate(body);
    $$('.card', body).slice(0, 12).forEach((c) => TR.loadNow(c));
  }
  const doSearch = debounce(() => renderSearch($('#searchInput').value), 120);
  $('#searchInput').addEventListener('input', doSearch);
  $('#searchInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.value.trim()) { const q = e.target.value.trim(); closeAll(); TR.go('/szukaj?q=' + encodeURIComponent(q)); } });
  $('#searchBody').addEventListener('click', (e) => { const c = e.target.closest('[data-s]'); if (c) { $('#searchInput').value = c.dataset.s; renderSearch(c.dataset.s); } });

  /* ---------- newsletter ---------- */
  $('#newsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#newsEmail').value.trim();
    const msg = $('#newsMsg');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { msg.textContent = 'Wpisz poprawny adres e-mail, np. imie@domena.pl'; return; }
    TR.store.set('newsletter', v);
    msg.textContent = 'Witamy w gronie True Rider! Twój kod −5%: TRUERIDER5';
    $('#newsEmail').value = '';
  });

  /* ---------- motion ---------- */
  let rvIO = null;
  TR.reveal = function (root) {
    document.documentElement.classList.add('js');
    const els = $$('.rv:not(.in), .rv-img:not(.in), .split:not(.in)', root);
    if (!('IntersectionObserver' in window) || TR.reduced()) { els.forEach((e) => e.classList.add('in')); return; }
    if (!rvIO) rvIO = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    els.forEach((e, i) => {
      if (e.classList.contains('card')) e.style.transitionDelay = ((i % 4) * 70) + 'ms';
      rvIO.observe(e);
    });
  };
  TR.split = function (el) {
    if (!el || el.dataset.split) return;
    el.dataset.split = 1;
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            const o = document.createElement('span'); o.className = 'w';
            const s = document.createElement('span'); s.textContent = w; s.style.setProperty('--i', i++);
            o.appendChild(s); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    el.classList.add('split');
  };

  /* custom cursor (fine pointers only) */
  if (window.matchMedia('(pointer: fine)').matches && !TR.reduced()) {
    const cur = $('#cursor'), lab = $('#cursorLabel');
    let x = -100, y = -100, cx = -100, cy = -100;
    document.body.classList.add('has-cursor');
    window.addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; }, { passive: true });
    const tick = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)'; requestAnimationFrame(tick); };
    tick();
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest('[data-cursor]');
      const onCtl = e.target.closest('button, .card__quick, input, select');
      if (t && !onCtl) { lab.textContent = t.dataset.cursor; cur.classList.add('big'); } else cur.classList.remove('big');
    });
    document.addEventListener('mouseleave', () => cur.classList.remove('big'));
  }

  /* magnetic buttons */
  if (window.matchMedia('(pointer: fine)').matches && !TR.reduced()) {
    document.addEventListener('mousemove', (e) => {
      const b = e.target.closest('.btn, .rail__btn');
      $$('.btn.mag, .rail__btn.mag').forEach((x) => { if (x !== b) { x.style.transform = ''; x.classList.remove('mag'); } });
      if (!b) return;
      const r = b.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width, dy = (e.clientY - r.top - r.height / 2) / r.height;
      b.classList.add('mag');
      b.style.transform = 'translate(' + dx * 8 + 'px,' + dy * 6 + 'px)';
    }, { passive: true });
  }

  /* rails */
  TR.rail = function (root) {
    $$('.rail', root).forEach((rail) => {
      const tr = $('.rail__track', rail), bar = $('.rail__bar i', rail);
      const prev = $('[data-rail="-1"]', rail.parentElement), next = $('[data-rail="1"]', rail.parentElement);
      const upd = () => {
        const max = tr.scrollWidth - tr.clientWidth;
        if (bar) { const w = Math.max(10, (tr.clientWidth / tr.scrollWidth) * 100); bar.style.width = w + '%'; bar.style.transform = 'translateX(' + (max > 0 ? (tr.scrollLeft / max) * (100 / w * 100 - 100) : 0) + '%)'; }
      };
      tr.addEventListener('scroll', upd, { passive: true });
      [prev, next].forEach((b) => b && b.addEventListener('click', () => tr.scrollBy({ left: +b.dataset.rail * tr.clientWidth * 0.8, behavior: 'smooth' })));
      upd();
    });
  };
})();
