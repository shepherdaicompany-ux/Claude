/* True Rider storefront — campaign "add to cart" links, full cart page, link generator for marketing
 *
 * Link from a landing page / ad / newsletter:
 *   /dodaj/<slug-produktu>?rozmiar=M&ilosc=1&rabat=LANDING5
 *   /dodaj?p=<slug>:M,<slug2>:Pony&rabat=LANDING5          (several products, size after the colon)
 * The visitor lands in the cart with the product(s) already added and the campaign discount applied.
 * If the size is missing or sold out, the cart asks for it right there — one tap and it is in.
 */
(function () {
  'use strict';
  const TR = window.TR;
  const { $, $$, esc, pln, fold, ICON } = TR;
  const D = TR.data, S = TR.state;

  const isSizeOpt = (o) => /rozmiar|size/i.test(o.label);
  const norm = (s) => fold(s).replace(/\s+/g, '');
  const present = (det, op) => op.values.filter((v) => Object.keys(det.st || {}).some((k) => k.split(',').includes(String(v.id))));
  const buyable = (det, k) => !!det.st[k][1] && det.st[k][0] !== 0;
  const keysFor = (det, sel) => Object.keys(det.st || {}).filter((k) => { const ids = k.split(','); return Object.values(sel).every((v) => !v || ids.includes(String(v))); });

  /* Resolve a variant from human-readable wishes ({ size: 'M', color: 'Czarny' }).
     Returns { v } when exactly one buyable variant matches, otherwise { sel, need } with what is still missing. */
  TR.findVariant = function (p, det, want) {
    want = want || {};
    const keys = Object.keys(det.st || {});
    if (!keys.length) return p.av ? { v: { key: '', label: '', price: p.p, stock: 99 } } : { soldout: true };
    if (!keys.some((k) => buyable(det, k))) return { soldout: true };
    const sel = {};
    (det.opts || []).forEach((op) => {
      const vals = present(det, op);
      if (vals.length === 1) { sel[op.id] = String(vals[0].id); return; }
      const w = isSizeOpt(op) ? want.size : want.color;
      if (!w) return;
      const nw = norm(w);
      const hit = vals.find((v) => norm(v.name) === nw) || vals.find((v) => norm(v.name).split('/').includes(nw)) || (!isSizeOpt(op) && vals.find((v) => norm(v.name).includes(nw)));
      if (hit) sel[op.id] = String(hit.id);
    });
    const ks = keysFor(det, sel).filter((k) => buyable(det, k));
    const shown = (det.opts || []).filter((o) => o.shown);
    const missing = shown.filter((o) => !sel[o.id]);
    if (ks.length === 1 && (!missing.length || keys.filter((k) => buyable(det, k)).length === 1)) {
      const v = TR.variantInfo(p, det, ks[0]);
      return { v };
    }
    // chosen size sold out: drop it and let the visitor pick another one
    const out = !ks.length && Object.keys(sel).length > 0;
    if (out) shown.forEach((o) => { if (present(det, o).length > 1) delete sel[o.id]; });
    return { sel, need: shown.filter((o) => !sel[o.id]), out };
  };

  /* ---------------- deep link: /dodaj ---------------- */
  async function addFromLink(m, o) {
    const q = TR.query();
    const items = [];
    if (m.slug) items.push({ s: m.slug, size: q.get('rozmiar') || q.get('size'), color: q.get('kolor'), qty: parseInt(q.get('ilosc'), 10) || 1 });
    (q.get('p') || '').split(',').filter(Boolean).forEach((x) => { const [s, size, qty] = x.split(':'); items.push({ s, size, qty: parseInt(qty, 10) || 1 }); });
    const results = [];
    for (const it of items) {
      const p = D.bySlug.get(String(it.s).toLowerCase()) || D.byId.get(+it.s);
      if (!p) { results.push({ miss: it.s }); continue; }
      const det = await TR.detail(p);
      const r = TR.findVariant(p, det, it);
      if (r.v) { TR.cartAdd(p, r.v, Math.max(1, Math.min(it.qty, 10))); results.push({ id: p.id, ok: true, label: r.v.label }); }
      else if (r.soldout) results.push({ id: p.id, soldout: true });
      else {
        S.pending = S.pending.filter((x) => x.id !== p.id).concat({ id: p.id, sel: r.sel, qty: it.qty, out: r.out, wanted: it.size || '' });
        results.push({ id: p.id, need: true, out: r.out, wanted: it.size || '' });
      }
    }
    const code = q.get('rabat') || q.get('kod');
    const codeOk = code ? TR.applyCode(code) : false;
    const src = { link: TR.path(), at: Date.now() };
    q.forEach((v, k) => { if (/^utm_|^fbclid$|^gclid$/.test(k)) src[k] = v; });
    S.source = src; TR.save('source');
    S.landing = { results, code: codeOk ? String(code).toUpperCase() : null, badCode: code && !codeOk ? code : null, at: Date.now() };
    return TR.go('/koszyk', { replace: true });
  }
  TR.route((p) => { const m = p.match(/^\/dodaj(?:\/(.+))?$/); return m ? { slug: m[1] ? decodeURIComponent(m[1]) : null } : null; }, addFromLink);

  /* ---------------- cart page ---------------- */
  function pendingHTML(pd) {
    const p = D.byId.get(pd.id);
    const det = D.details.get(pd.id);
    if (!p || !det) return '';
    const shown = (det.opts || []).filter((x) => x.shown);
    const opts = shown.map((op) => {
      const vals = present(det, op);
      return '<div class="opt" data-popt="' + op.id + '"><span class="opt__label">' + esc(op.label) + '</span><div class="' + (isSizeOpt(op) ? 'sizes' : 'opts') + '" style="' + (isSizeOpt(op) ? '' : 'display:flex;flex-wrap:wrap;gap:8px') + '">' + vals.map((v) => {
        const trial = Object.assign({}, pd.sel, { [op.id]: String(v.id) });
        const ok = keysFor(det, trial).some((k) => buyable(det, k));
        const on = pd.sel[op.id] === String(v.id);
        return '<button type="button" class="' + (isSizeOpt(op) ? 'size' : 'chip') + (ok ? '' : ' out') + (on ? ' on' : '') + '" data-pv="' + v.id + '"' + (ok ? '' : ' disabled') + '>' + (v.hex && !isSizeOpt(op) ? '<i class="swatch" style="background:' + esc(v.hex) + '"></i>' : '') + esc(v.name) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    return '<div class="pick" data-pid="' + p.id + '"><a class="line__img" href="' + TR.url(p) + '">' + TR.img(p.im[0], 400, p.n) + '</a><div class="pick__body">' +
      '<p class="eyebrow eyebrow--gold">' + (pd.out ? 'Rozmiar ' + esc(pd.wanted) + ' właśnie się skończył — wybierz inny' : 'Jeszcze jeden krok') + '</p>' +
      '<h3 class="line__name">' + esc(p.n) + '</h3><p class="line__price">' + pln(p.p) + '</p>' + opts +
      '<p class="muted" style="font-size:.8rem">Wybierz ' + shown.filter((x) => !pd.sel[x.id]).map((x) => x.label.toLowerCase()).join(' i ') + ' — dodamy produkt od razu.</p></div></div>';
  }

  function cartView(m, o) {
    document.title = 'Koszyk — True Rider';
    const html = '<div class="wrap"><nav class="crumbs"><a href="/">True Rider</a><span aria-hidden="true">/</span><span>Koszyk</span></nav>' +
      '<h1 class="page-title" style="padding-bottom:24px">Twój <em>koszyk</em></h1><div id="cartHello"></div><div id="cartPage"></div></div><section class="sec sec--bone" id="cartMore" style="margin-top:60px"></section>';
    return TR.mount(html, o, (root) => {
      const hello = $('#cartHello', root), page = $('#cartPage', root);
      const L = S.landing && Date.now() - S.landing.at < 15000 ? S.landing : null;
      if (L) {
        const ok = L.results.filter((r) => r.ok), need = L.results.filter((r) => r.need), sold = L.results.filter((r) => r.soldout), miss = L.results.filter((r) => r.miss);
        const names = (rs) => rs.map((r) => esc((D.byId.get(r.id) || {}).n || '')).join(', ');
        hello.innerHTML = '<div class="hello"><canvas aria-hidden="true"></canvas><div class="hello__in">' +
          '<p class="eyebrow">' + (ok.length ? 'Gotowe' : need.length ? 'Prawie gotowe' : 'Ups') + '</p>' +
          '<h2>' + (ok.length ? names(ok) + ' ' + (ok.length > 1 ? 'czekają' : 'czeka') + ' w koszyku' : need.length ? 'Wybierz rozmiar, a ' + names(need) + ' od razu trafi do koszyka' : sold.length ? 'Ten produkt jest chwilowo wyprzedany' : 'Tego produktu nie ma już w sklepie') + '</h2>' +
          (L.code ? '<p class="hello__code"><b>' + esc(TR.CODES[L.code].label) + '</b> naliczony automatycznie' + (S.codeUntil ? ' · ważny jeszcze <b data-until="' + S.codeUntil + '">' + TR.countdown(S.codeUntil) + '</b>' : '') + '</p>' : '') +
          (L.badCode ? '<p class="hello__code">Kod ' + esc(L.badCode) + ' wygasł albo nie istnieje.</p>' : '') +
          (sold.length ? '<p class="hello__code">' + names(sold) + ' — chwilowo wyprzedane. Zostaw e-mail na karcie produktu, damy znać.</p>' : '') +
          (miss.length ? '<p class="hello__code">Część produktów z tego linku nie jest już w sprzedaży. Zobacz <a href="/pl/new" style="text-decoration:underline">nowości</a>.</p>' : '') +
          '</div></div>';
        confetti($('canvas', hello));
        S.landing = null;
      }
      const draw = () => {
        const pend = S.pending.filter((x) => D.details.has(x.id));
        if (!S.cart.length && !pend.length) {
          page.innerHTML = '<div class="empty" style="padding-block:60px"><h3>Koszyk czeka na pierwszy przejazd</h3><p class="muted">Dodaj legginsy, bluzę albo komplet dla konia — wszystko wyślemy w 24 h.</p><a class="btn" href="/pl/new">Zobacz nowości</a></div>';
          return;
        }
        const sub = TR.cartSubtotal(), disc = TR.discount();
        page.innerHTML = '<div class="co"><div><div class="co__card">' + pend.map(pendingHTML).join('') + S.cart.map(TR.lineHTML).join('') + (!S.cart.length ? '' : '') + '</div></div>' +
          '<aside class="co__sum"><div class="co__card"><h2 style="font-size:1.4rem">Podsumowanie</h2>' +
          '<div class="sum-row"><span>Produkty (' + TR.cartCount() + ')</span><span class="num">' + pln(sub) + '</span></div>' +
          (disc ? '<div class="sum-row"><span>' + esc(TR.codeLabel()) + '</span><span class="num">−' + pln(disc) + '</span></div>' + (S.codeUntil ? '<p class="timer">Rabat ważny jeszcze <b data-until="' + S.codeUntil + '">' + TR.countdown(S.codeUntil) + '</b></p>' : '') : '') +
          '<div class="sum-row"><span>Dostawa</span><span class="muted">od 15,50 zł · odbiór w Mierzynie 0 zł</span></div>' +
          '<div class="sum-row total"><span>Razem</span><span class="num">' + pln(sub - disc) + '</span></div>' +
          (disc ? '' : '<div class="code-row"><label class="sr" for="cpCode">Kod rabatowy</label><input id="cpCode" placeholder="Masz kod rabatowy?"><button class="btn btn--ghost" type="button" id="cpCodeBtn"><span>Użyj</span></button></div><p class="muted" id="cpCodeMsg" style="font-size:.8rem;margin-top:-8px"></p>') +
          '<a class="btn btn--block" href="/zamowienie"' + (S.cart.length ? '' : ' aria-disabled="true" style="pointer-events:none;opacity:.45"') + '><span>Przejdź do zamówienia</span>' + ICON.arrow + '</a>' +
          '<p class="muted" style="font-size:.78rem;text-align:center">Kup teraz, zapłać za 30 dni z PayPo · 14 dni na zwrot · wysyłka w 24 h</p></div></aside></div>';
        TR.hydrate(page); TR.loadNow(page);
      };
      draw();
      const redraw = (what) => { if (what === 'cart' || what === 'code') draw(); };
      TR.on(redraw);
      TR.onLeave(() => S.subs.delete(redraw));
      page.addEventListener('click', (e) => {
        TR.lineAction(e);
        const b = e.target.closest('[data-pv]');
        if (b) {
          const card = b.closest('[data-pid]'), id = +card.dataset.pid, pd = S.pending.find((x) => x.id === id);
          const opt = b.closest('[data-popt]').dataset.popt;
          pd.sel[opt] = b.dataset.pv;
          const p = D.byId.get(id), det = D.details.get(id);
          const ks = keysFor(det, pd.sel).filter((k) => buyable(det, k));
          const missing = (det.opts || []).filter((x) => x.shown && !pd.sel[x.id]);
          if (ks.length === 1 && !missing.length) {
            S.pending = S.pending.filter((x) => x !== pd);
            const v = TR.variantInfo(p, det, ks[0]);
            TR.addToCart(p, v, pd.qty || 1, $('img', card));
          } else draw();
        }
        if (e.target.closest('#cpCodeBtn')) {
          const c = $('#cpCode', page).value;
          if (!TR.applyCode(c)) $('#cpCodeMsg', page).textContent = 'Ten kod nie działa. Sprawdź pisownię.';
        }
      });
      // cross-sell: same categories as what is in the cart
      const inCart = new Set(S.cart.map((l) => l.id));
      const pool = [];
      S.cart.forEach((l) => { const p = D.byId.get(l.id); (p ? p.c : []).forEach((cid) => { const k = D.catById.get(cid); if (k) TR.catProducts(k).forEach((x) => { if (x.av && !inCart.has(x.id) && !pool.includes(x) && (!p.fam || x.fam !== p.fam)) pool.push(x); }); }); });
      const more = $('#cartMore', root);
      const list = (pool.length ? pool : D.products.filter((x) => x.av && x.nw)).slice(0, 12);
      if (!list.length) { more.remove(); return; }
      more.innerHTML = '<div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Dobierz do kompletu</p><h2>Pasuje do Twojego <em>koszyka</em></h2></div><div class="rail__ctrl"><button class="rail__btn" data-rail="-1" aria-label="Przewiń w lewo">' + ICON.left + '</button><button class="rail__btn" data-rail="1" aria-label="Przewiń w prawo">' + ICON.right + '</button></div></div><div class="rail"><div class="rail__track">' + list.map((x) => TR.card(x)).join('') + '</div><div class="rail__bar"><i></i></div></div></div>';
      TR.hydrate(more); TR.reveal(more); TR.rail(more);
    });
  }
  TR.route((p) => p === '/koszyk' || p === '/pl/basket', cartView);

  /* gold confetti burst for the welcome banner */
  function confetti(cv) {
    if (!cv || TR.reduced()) return;
    const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect(); cv.width = r.width * dpr; cv.height = r.height * dpr; ctx.scale(dpr, dpr);
    const cols = ['#d8c08f', '#a5814a', '#f1ece2', '#c99b8c'];
    const ps = Array.from({ length: 90 }, () => ({ x: r.width * (0.15 + Math.random() * 0.7), y: r.height * 0.9, vx: (Math.random() - 0.5) * 7, vy: -4 - Math.random() * 7, s: 3 + Math.random() * 5, a: Math.random() * 6, c: cols[(Math.random() * cols.length) | 0] }));
    let t = 0;
    const loop = () => {
      ctx.clearRect(0, 0, r.width, r.height);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.99; p.a += 0.15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.max(0, 1 - t / 140); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (t++ < 140) requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------------- link generator for the marketing team: /generator-linkow ---------------- */
  function genView(m, o) {
    document.title = 'Generator linków — True Rider';
    const st = { items: [], code: 'LANDING5', campaign: '' };
    const html = '<div class="wrap"><nav class="crumbs"><a href="/">True Rider</a><span aria-hidden="true">/</span><span>Generator linków</span></nav>' +
      '<h1 class="page-title" style="padding-bottom:10px">Link <em>prosto do koszyka</em></h1>' +
      '<p class="lede" style="margin-bottom:32px">Wybierz produkt, rozmiar i rabat. Klient, który kliknie link na landingu, w reklamie albo w newsletterze, ląduje w koszyku z tym produktem i naliczonym rabatem.</p>' +
      '<div class="co"><div><section class="co__card"><h2><span>1</span>Produkty</h2><div class="field"><label for="gQ">Szukaj produktu</label><input id="gQ" type="search" placeholder="np. legginsy marta rose gold" autocomplete="off"></div><div id="gRes" class="gen-res"></div><div id="gItems" style="display:grid;gap:12px"></div></section>' +
      '<section class="co__card" style="margin-top:18px"><h2><span>2</span>Rabat i kampania</h2><div class="fields"><div class="field"><label for="gCode">Rabat</label><select id="gCode">' +
      '<option value="">Bez rabatu</option>' + Object.keys(TR.CODES).map((k) => '<option value="' + k + '"' + (k === st.code ? ' selected' : '') + '>' + k + ' — ' + esc(TR.CODES[k].label) + (TR.CODES[k].hours ? ' (ważny ' + TR.CODES[k].hours + ' h od kliknięcia)' : '') + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="gCamp">Nazwa kampanii (utm_campaign)</label><input id="gCamp" placeholder="np. jesien-legginsy"></div></div></section></div>' +
      '<aside class="co__sum"><div class="co__card"><h2 style="font-size:1.4rem">Gotowy link</h2><div class="field"><label for="gLink">Link</label><textarea id="gLink" readonly style="height:110px;font:500 .8rem/1.5 var(--f-mono)"></textarea></div>' +
      '<div class="hero__cta"><button class="btn" type="button" id="gCopy"><span>Kopiuj link</span></button><button class="btn btn--ghost" type="button" id="gTest"><span>Przetestuj</span></button></div><p class="muted" id="gMsg" style="font-size:.8rem"></p>' +
      '<div class="field"><label for="gHtml">Przycisk do wklejenia na landing (HTML)</label><textarea id="gHtml" readonly style="height:120px;font:500 .74rem/1.5 var(--f-mono)"></textarea></div>' +
      '<p class="muted" style="font-size:.78rem">Rozmiar „klient wybierze” — w koszyku pojawi się wybór rozmiaru, jedno kliknięcie i produkt jest dodany. Gdy podany rozmiar się wyprzeda, koszyk sam poprosi o inny.</p></div></aside></div><div style="height:80px"></div></div>';
    return TR.mount(html, o, (root) => {
      const linkPath = () => {
        if (!st.items.length) return '';
        const params = new URLSearchParams();
        let path;
        if (st.items.length === 1) {
          const it = st.items[0];
          path = '/dodaj/' + it.p.s;
          if (it.size) params.set('rozmiar', it.size);
          if (it.qty > 1) params.set('ilosc', it.qty);
        } else {
          path = '/dodaj';
          params.set('p', st.items.map((it) => (it.p.s + ':' + (it.size || '') + (it.qty > 1 ? ':' + it.qty : '')).replace(/:+$/, '')).join(','));
        }
        if (st.code) params.set('rabat', st.code);
        params.set('utm_source', 'landing');
        if (st.campaign) params.set('utm_campaign', st.campaign);
        return path + '?' + params.toString();
      };
      const full = (path) => (TR.cfg.HASH ? location.href.split('#')[0] + '#' + path : location.origin + path);
      const out = () => {
        const p = linkPath();
        $('#gLink', root).value = p ? full(p) : 'Najpierw dodaj produkt.';
        $('#gHtml', root).value = p ? '<a href="' + full(p) + '" style="display:inline-block;padding:16px 32px;border-radius:999px;background:#0f1a2c;color:#fff;font:600 14px/1 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-decoration:none">Dodaj do koszyka</a>' : '';
      };
      const drawItems = () => {
        $('#gItems', root).innerHTML = st.items.map((it, i) => '<div class="mini" style="grid-template-columns:56px 1fr auto"><div class="mini__img">' + TR.img(it.p.im[0], 400, '') + '</div><div><span>' + esc(it.p.n) + '</span><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
          '<label class="select"><span class="sr">Rozmiar</span><select data-gs="' + i + '"><option value="">Klient wybierze w koszyku</option>' + (it.p.sz || []).map((s) => '<option value="' + esc(s[0]) + '"' + (s[0] === it.size ? ' selected' : '') + (s[1] ? '' : ' disabled') + '>' + esc(s[0]) + (s[1] ? (s[1] === 1 ? ' (ostatnie sztuki)' : '') : ' (brak)') + '</option>').join('') + '</select></label>' +
          '<label class="select"><span class="sr">Ilość</span><select data-gq="' + i + '">' + [1, 2, 3].map((n) => '<option' + (n === it.qty ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div></div>' +
          '<button class="line__rm" type="button" data-grm="' + i + '">Usuń</button></div>').join('');
        TR.hydrate($('#gItems', root)); TR.loadNow($('#gItems', root));
        out();
      };
      $('#gQ', root).addEventListener('input', TR.debounce((e) => {
        const res = TR.searchProducts(e.target.value, 6);
        $('#gRes', root).innerHTML = res.map((p) => '<button type="button" class="mini" data-gadd="' + p.id + '" style="grid-template-columns:44px 1fr auto;text-align:left;width:100%"><div class="mini__img">' + TR.img(p.im[0], 400, '') + '</div><span>' + esc(p.n) + (p.av ? '' : ' <small>wyprzedane</small>') + '</span><span class="num">' + pln(p.p) + '</span></button>').join('');
        TR.hydrate($('#gRes', root)); TR.loadNow($('#gRes', root));
      }, 150));
      root.addEventListener('click', (e) => {
        const a = e.target.closest('[data-gadd]');
        if (a) { const p = D.byId.get(+a.dataset.gadd); if (!st.items.some((x) => x.p === p)) st.items.push({ p, size: '', qty: 1 }); $('#gRes', root).innerHTML = ''; $('#gQ', root).value = ''; drawItems(); }
        const r = e.target.closest('[data-grm]');
        if (r) { st.items.splice(+r.dataset.grm, 1); drawItems(); }
        if (e.target.closest('#gCopy')) {
          const v = $('#gLink', root).value;
          const done = () => { $('#gMsg', root).textContent = 'Skopiowano.'; };
          (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(done).catch(() => { $('#gLink', root).select(); $('#gMsg', root).textContent = 'Zaznaczyłem link — skopiuj skrótem Ctrl+C.'; });
        }
        if (e.target.closest('#gTest')) { const p = linkPath(); if (p) TR.go(p); }
      });
      root.addEventListener('change', (e) => {
        if (e.target.dataset.gs) st.items[+e.target.dataset.gs].size = e.target.value;
        if (e.target.dataset.gq) st.items[+e.target.dataset.gq].qty = +e.target.value;
        if (e.target.id === 'gCode') st.code = e.target.value;
        out();
      });
      $('#gCamp', root).addEventListener('input', (e) => { st.campaign = fold(e.target.value.trim()).replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); out(); });
      out();
    });
  }
  TR.route((p) => p === '/generator-linkow', genView);
})();
