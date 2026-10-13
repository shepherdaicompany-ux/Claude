/* Stylowa Kebab — logika strony: menu, koszyk, rezerwacja godziny, śledzenie zamówienia, efekty. */
(function () {
  'use strict';

  const Api = window.StylowaApi;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zl = (g) => Api.zl(g);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };
  const DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const DAYS_SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  const S = {
    cats: [], options: [], settings: null, days: [], items: {}, extras: [],
    cart: store.get('stylowa_cart', []),
    type: store.get('stylowa_type', 'wynos'),
    pay: 'gotowka', date: null, slot: null,
    last: store.get('stylowa_last_order', null),
  };

  // ============================================================ start
  document.getElementById('year').textContent = new Date().getFullYear();
  intro();
  header();
  reveal();
  embers();
  glow();
  boot();

  async function boot() {
    try {
      await Api.init('');
      if (Api.mode === 'demo') $('#demoBadge').hidden = false;
      const m = await Api.pub('menu');
      S.cats = m.categories; S.options = m.options; S.settings = m.settings; S.days = m.days;
      S.cats.forEach((c) => c.items.forEach((i) => { S.items[i.id] = Object.assign({ cat: c }, i); }));
      S.extras = (S.cats.find((c) => c.extras) || { items: [] }).items;
      // usuń z koszyka pozycje, których już nie ma w menu
      S.cart = S.cart.filter((l) => S.items[l.id]);
      renderMenu();
      renderHours();
      liveStatus();
      setInterval(liveStatus, 60000);
      renderCart();
      if (S.settings.notice) { const n = $('#notice'); n.textContent = S.settings.notice; n.hidden = false; }
      if (!S.settings.ordering) {
        $('#menu').classList.add('ordering-off');
        const n = $('#notice');
        n.textContent = (S.settings.notice ? S.settings.notice + ' · ' : '') + 'Zamówienia online są chwilowo wstrzymane. Zadzwoń: ' + S.settings.phone;
        n.hidden = false;
      }
      if (Api.mode === 'php') mapEmbed();
      tracker();
    } catch (e) {
      $('#dishes').innerHTML = '<p class="loading">Nie udało się wczytać menu. Odśwież stronę albo zadzwoń: 698 563 103.</p>';
    }
  }

  // ============================================================ menu
  function renderMenu() {
    const bar = $('#catBar');
    const dishes = $('#dishes');
    const drinks = $('#drinks');
    bar.innerHTML = '';
    dishes.innerHTML = '';
    drinks.innerHTML = '';

    S.cats.forEach((c) => {
      if (!c.items.length) return;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.target = 'cat-' + c.id;
      chip.innerHTML = '<svg><use href="#i-' + esc(c.icon) + '"/></svg>' + esc(c.name);
      chip.addEventListener('click', () => { document.getElementById('cat-' + c.id).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); });
      bar.appendChild(chip);

      if (c.food) {
        const min = Math.min(...c.items.map((i) => i.price));
        const card = document.createElement('article');
        card.className = 'dish reveal';
        card.id = 'cat-' + c.id;
        card.innerHTML =
          '<div class="dish__top"><span class="dish__icon"><svg><use href="#i-' + esc(c.icon) + '"/></svg></span>' +
          '<div><h3 class="dish__name">' + esc(c.name) + '</h3><span class="dish__from">' + (c.items.length > 1 ? 'od ' : '') + zl(min) + '</span></div></div>' +
          '<p class="dish__desc">' + esc(c.desc) + '</p>' +
          '<div class="sizes">' + c.items.map((i) => '<button type="button" class="size" data-id="' + esc(i.id) + '"><small>' + esc(i.size || i.name) + '</small><b>' + zl(i.price) + '</b></button>').join('') + '</div>';
        dishes.appendChild(card);
      } else {
        const box = document.createElement('section');
        box.className = 'dlist reveal';
        box.id = 'cat-' + c.id;
        box.innerHTML = '<h3><svg><use href="#i-' + esc(c.icon) + '"/></svg>' + esc(c.name) + '</h3>' +
          (c.desc ? '<p class="note">' + esc(c.desc) + '</p>' : '') +
          '<ul>' + c.items.map((i) => '<li><span>' + esc(i.name) + (i.deposit ? ' <small class="muted">+ ' + zl(i.deposit) + ' kaucja</small>' : '') + '</span><b>' + (c.extras ? '+' : '') + zl(i.price) + '</b>' +
            (c.extras ? '' : '<button type="button" class="add-mini" data-id="' + esc(i.id) + '" aria-label="Dodaj ' + esc(i.name) + '"><svg><use href="#i-plus"/></svg></button>') + '</li>').join('') + '</ul>';
        drinks.appendChild(box);
      }
    });

    $$('.size', dishes).forEach((b) => b.addEventListener('click', (e) => {
      const it = S.items[b.dataset.id];
      if (it.cat.opts) openDish(it.id);
      else { addToCart({ id: it.id, qty: 1, opts: {}, extras: [], note: '' }, e.currentTarget); }
    }));
    $$('.add-mini', drinks).forEach((b) => b.addEventListener('click', (e) => {
      addToCart({ id: b.dataset.id, qty: 1, opts: {}, extras: [], note: '' }, e.currentTarget);
      b.classList.remove('added'); void b.offsetWidth; b.classList.add('added');
    }));
    reveal();
    scrollSpy();
  }

  function scrollSpy() {
    const chips = $$('.chip');
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        chips.forEach((c) => c.classList.toggle('on', c.dataset.target === en.target.id));
        const on = chips.find((c) => c.dataset.target === en.target.id);
        if (on) { const bar = $('#catBar'); bar.scrollTo({ left: on.offsetLeft - 24, behavior: reduced ? 'auto' : 'smooth' }); }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    chips.forEach((c) => { const el = document.getElementById(c.dataset.target); if (el) io.observe(el); });
  }

  // ============================================================ okno dania
  const D = { id: null, opts: {}, extras: new Set(), qty: 1 };

  function openDish(id) {
    const it = S.items[id];
    const c = it.cat;
    D.id = id; D.qty = 1; D.extras = new Set(); D.opts = {};
    S.options.forEach((g) => { D.opts[g.name] = g.choices[0]; });
    $('#dmTitle').textContent = c.name;
    $('#dmDesc').textContent = c.desc;
    $('.dm__icon use').setAttribute('href', '#i-' + c.icon);
    const body = $('#dmBody');
    let h = '';
    if (c.items.length > 1) {
      h += '<div class="opt"><div class="opt__t">Rozmiar</div><div class="pills" data-g="__size">' +
        c.items.map((i) => '<button type="button" class="pill" data-v="' + esc(i.id) + '" aria-pressed="' + (i.id === id) + '">' + esc(i.size || i.name) + ' <small>' + zl(i.price) + '</small></button>').join('') + '</div></div>';
    }
    S.options.forEach((g) => {
      h += '<div class="opt"><div class="opt__t">' + esc(g.name) + '</div><div class="pills" data-g="' + esc(g.name) + '">' +
        g.choices.map((v, i) => '<button type="button" class="pill" data-v="' + esc(v) + '" aria-pressed="' + (i === 0) + '">' + esc(v) + '</button>').join('') + '</div></div>';
    });
    if (S.extras.length) {
      h += '<div class="opt"><div class="opt__t">Dodatki <small>dowolnie wiele</small></div><div class="pills" data-g="__extras">' +
        S.extras.map((e) => '<button type="button" class="pill" data-v="' + esc(e.id) + '" aria-pressed="false">' + esc(e.name) + ' <small>+' + zl(e.price) + '</small></button>').join('') + '</div></div>';
    }
    h += '<div class="opt"><label class="f"><span class="opt__t" style="margin:0">Uwagi do dania</span><input id="dmNote" maxlength="120" placeholder="np. bez cebuli, sos osobno"></label></div>';
    body.innerHTML = h;
    body.scrollTop = 0;

    $$('.pills', body).forEach((grp) => grp.addEventListener('click', (e) => {
      const b = e.target.closest('.pill');
      if (!b) return;
      const g = grp.dataset.g;
      if (g === '__extras') {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        on ? D.extras.add(b.dataset.v) : D.extras.delete(b.dataset.v);
      } else {
        $$('.pill', grp).forEach((x) => x.setAttribute('aria-pressed', x === b));
        if (g === '__size') D.id = b.dataset.v; else D.opts[g] = b.dataset.v;
      }
      dishPrice();
    }));
    $('#dmQtyVal').textContent = '1';
    dishPrice();
    openLayer($('#dishModal'));
  }

  function unitPrice(id, extras) {
    let p = S.items[id].price;
    (extras || []).forEach((e) => { const x = S.extras.find((y) => y.id === e); if (x) p += x.price; });
    return p;
  }

  function dishPrice() { $('#dmPrice').textContent = zl(unitPrice(D.id, [...D.extras]) * D.qty); }

  $('#dmQty').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    D.qty = Math.max(1, Math.min(20, D.qty + +b.dataset.q));
    $('#dmQtyVal').textContent = D.qty;
    dishPrice();
  });
  $('#dmAdd').addEventListener('click', (e) => {
    addToCart({ id: D.id, qty: D.qty, opts: Object.assign({}, D.opts), extras: [...D.extras], note: ($('#dmNote').value || '').trim() }, e.currentTarget);
    closeLayer($('#dishModal'));
  });

  // ============================================================ koszyk
  function lineKey(l) { return l.id + '|' + JSON.stringify(l.opts) + '|' + l.extras.slice().sort().join(',') + '|' + l.note; }

  function addToCart(line, fromEl) {
    if (S.settings && !S.settings.ordering) { toast('Zamówienia online są chwilowo wstrzymane'); return; }
    const k = lineKey(line);
    const ex = S.cart.find((l) => lineKey(l) === k);
    if (ex) ex.qty = Math.min(30, ex.qty + line.qty); else S.cart.push(line);
    saveCart();
    renderCart();
    fly(fromEl);
    toast('Dodano: ' + S.items[line.id].name + (line.qty > 1 ? ' ×' + line.qty : ''));
  }

  function saveCart() { store.set('stylowa_cart', S.cart); store.set('stylowa_type', S.type); }

  function totals(lines, type) {
    let sub = 0, pack = 0, dep = 0, portions = 0;
    lines.forEach((l) => {
      const it = S.items[l.id];
      if (!it) return;
      sub += unitPrice(l.id, l.extras) * l.qty;
      dep += (it.deposit || 0) * l.qty;
      if (it.cat.food) { portions += l.qty; if (type === 'wynos') pack += S.settings.packagingFee * l.qty; }
    });
    return { sub, pack, dep, total: sub + pack + dep, portions };
  }

  function sumHtml(t) {
    return '<dt>Dania i napoje</dt><dd>' + zl(t.sub) + '</dd>' +
      (t.pack ? '<dt>Opakowania na wynos</dt><dd>' + zl(t.pack) + '</dd>' : '') +
      (t.dep ? '<dt>Kaucja za butelki</dt><dd>' + zl(t.dep) + '</dd>' : '') +
      '<dt class="total">Razem</dt><dd class="total">' + zl(t.total) + '</dd>';
  }

  function lineMeta(l) {
    const bits = [];
    Object.entries(l.opts || {}).forEach(([k, v]) => bits.push(esc(k) + ': ' + esc(v)));
    (l.extras || []).forEach((e) => { const x = S.extras.find((y) => y.id === (e.id || e)); if (x) bits.push('+ ' + esc(x.name)); else if (e.name) bits.push('+ ' + esc(e.name)); });
    if (l.note) bits.push('„' + esc(l.note) + '”');
    return bits.join(' · ');
  }

  function renderCart() {
    const n = S.cart.reduce((s, l) => s + l.qty, 0);
    const btn = $('#cartBtn');
    $('#cartCount').textContent = n;
    btn.classList.toggle('has', n > 0);
    if (!S.settings) return;
    const list = $('#cartList');
    $('#cartEmpty').hidden = n > 0;
    $('#typeSeg').hidden = n === 0;
    $('#cartSum').hidden = n === 0;
    $('#toCheckout').hidden = n === 0;
    list.innerHTML = S.cart.map((l, i) => {
      const it = S.items[l.id];
      return '<li class="ci"><span class="ci__name">' + esc(it.name) + '</span><span class="ci__price">' + zl(unitPrice(l.id, l.extras) * l.qty) + '</span>' +
        (lineMeta(l) ? '<span class="ci__meta">' + lineMeta(l) + '</span>' : '') +
        '<div class="ci__row"><div class="qty"><button type="button" data-i="' + i + '" data-q="-1" aria-label="Mniej"><svg><use href="#i-minus"/></svg></button><output>' + l.qty + '</output>' +
        '<button type="button" data-i="' + i + '" data-q="1" aria-label="Więcej"><svg><use href="#i-plus"/></svg></button></div>' +
        '<button type="button" class="ci__del" data-del="' + i + '">Usuń</button></div></li>';
    }).join('');
    $$('#typeSeg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.type === S.type));
    const t = totals(S.cart, S.type);
    $('#cartSum').innerHTML = sumHtml(t);
  }

  $('#cartList').addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    const d = e.target.closest('[data-del]');
    if (q) {
      const l = S.cart[+q.dataset.i];
      l.qty += +q.dataset.q;
      if (l.qty < 1) S.cart.splice(+q.dataset.i, 1);
      if (l.qty > 30) l.qty = 30;
    } else if (d) S.cart.splice(+d.dataset.del, 1);
    else return;
    saveCart();
    renderCart();
  });
  $('#typeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    S.type = b.dataset.type;
    saveCart();
    renderCart();
  });
  $('#cartBtn').addEventListener('click', () => openDrawer('cart'));
  $$('[data-open-order]').forEach((a) => a.addEventListener('click', (e) => {
    if (S.cart.length) { e.preventDefault(); openDrawer('cart'); }
  }));

  // ============================================================ szuflada
  function openDrawer(step) {
    showStep(step);
    openLayer($('#drawer'));
  }

  function showStep(step) {
    $('#stepCart').hidden = step !== 'cart';
    $('#stepCheckout').hidden = step !== 'checkout';
    $('#stepDone').hidden = step !== 'done';
    $('#drBack').hidden = step !== 'checkout';
    $('#drTitle').textContent = step === 'done' ? 'Zamówienie' : step === 'checkout' ? 'Odbiór i dane' : 'Twoje zamówienie';
    const idx = { cart: 0, checkout: 1, done: 2 }[step];
    $$('#drProgress li').forEach((li, i) => li.classList.toggle('on', i <= idx));
    if (step === 'checkout') prepCheckout();
    if (step === 'done') pollStatus();
  }

  $('#drBack').addEventListener('click', () => showStep('cart'));
  $('#toCheckout').addEventListener('click', () => {
    if (!S.settings.ordering) { toast('Zamówienia online są chwilowo wstrzymane'); return; }
    showStep('checkout');
  });

  // ============================================================ termin
  function dayLabel(d, i) {
    const dt = new Date(d.date + 'T12:00:00');
    const name = i === 0 ? 'Dziś' : i === 1 ? 'Jutro' : DAYS[dt.getDay()];
    return '<b>' + name + '</b><small>' + DAYS_SHORT[dt.getDay()] + ', ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()] + (d.open ? '' : ' · zamknięte') + '</small>';
  }

  async function prepCheckout() {
    const f = store.get('stylowa_me', {});
    if (f.name && !$('#fName').value) $('#fName').value = f.name;
    if (f.phone && !$('#fPhone').value) $('#fPhone').value = f.phone;
    $$('#paySeg button').forEach((b) => b.setAttribute('aria-checked', b.dataset.pay === S.pay));
    $('#formErr').hidden = true;
    const t = totals(S.cart, S.type);
    $('#checkoutSum').innerHTML = sumHtml(t);
    $('#placeTotal').textContent = zl(t.total);
    try { const m = await Api.pub('slots', { date: S.date || Api.ymd(new Date()), portions: t.portions }); S.days = m.days; } catch (e) { /* zostaw stare */ }
    if (!S.date || !S.days.some((d) => d.date === S.date)) S.date = (S.days.find((d) => d.open) || S.days[0] || {}).date;
    renderDays();
    loadSlots();
  }

  function renderDays() {
    $('#days').innerHTML = S.days.map((d, i) => '<button type="button" class="day" data-d="' + d.date + '" aria-pressed="' + (d.date === S.date) + '"' + (d.open ? '' : ' disabled') + '>' + dayLabel(d, i) + '</button>').join('');
  }

  $('#days').addEventListener('click', (e) => {
    const b = e.target.closest('.day');
    if (!b) return;
    S.date = b.dataset.d;
    S.slot = null;
    renderDays();
    loadSlots();
  });

  async function loadSlots() {
    const box = $('#slots');
    box.innerHTML = '<p class="slots-empty">Sprawdzam wolne godziny…</p>';
    if (!S.date) { box.innerHTML = '<p class="slots-empty">Brak dostępnych dni.</p>'; return; }
    const t = totals(S.cart, S.type);
    try {
      const r = await Api.pub('slots', { date: S.date, portions: t.portions });
      const free = r.slots.filter((s) => s.state === 'free');
      if (S.slot && !free.some((s) => s.t === S.slot)) S.slot = null;
      if (!S.slot && free.length) S.slot = free[0].t;
      const visible = r.slots.filter((s) => s.state !== 'past');
      $('#slotHint').textContent = free.length ? 'najbliższa wolna: ' + free[0].t : '';
      if (!visible.length) { box.innerHTML = '<p class="slots-empty">Na ten dzień nie ma już wolnych godzin. Wybierz inny dzień.</p>'; return; }
      box.innerHTML = visible.map((s) => '<button type="button" class="slot' + (s.state === 'free' && s.left <= 2 ? ' few' : '') + '" data-t="' + s.t + '" aria-pressed="' + (s.t === S.slot) + '"' +
        (s.state === 'free' ? '' : ' disabled title="' + (s.state === 'blocked' ? 'Niedostępne' : 'Zajęte') + '"') + '>' + s.t + '</button>').join('');
      const sel = $('.slot[aria-pressed="true"]', box);
      if (sel) box.scrollTop = Math.max(0, sel.offsetTop - box.offsetTop - 8);
    } catch (e) {
      box.innerHTML = '<p class="slots-empty">' + esc(e.message) + '</p>';
    }
  }

  $('#slots').addEventListener('click', (e) => {
    const b = e.target.closest('.slot');
    if (!b || b.disabled) return;
    S.slot = b.dataset.t;
    $$('.slot').forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#paySeg').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    S.pay = b.dataset.pay;
    $$('#paySeg button').forEach((x) => x.setAttribute('aria-checked', x === b));
  });

  $('#stepCheckout').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#formErr');
    err.hidden = true;
    const name = $('#fName').value.trim();
    const phone = $('#fPhone').value.trim();
    $('#fName').classList.toggle('bad', name.length < 2);
    $('#fPhone').classList.toggle('bad', phone.replace(/\D/g, '').length < 9);
    let msg = '';
    if (!S.slot) msg = 'Wybierz godzinę odbioru.';
    else if (name.length < 2) msg = 'Podaj imię, żebyśmy wiedzieli, komu wydać zamówienie.';
    else if (phone.replace(/\D/g, '').length < 9) msg = 'Podaj numer telefonu (9 cyfr), żebyśmy mogli potwierdzić zamówienie.';
    if (msg) { err.textContent = msg; err.hidden = false; err.scrollIntoView({ block: 'nearest' }); return; }

    const btn = $('#placeOrder');
    btn.disabled = true; btn.classList.add('is-busy');
    try {
      const r = await Api.pub('order', {}, {
        name, phone, type: S.type, date: S.date, slot: S.slot, payment: S.pay, notes: $('#fNotes').value.trim(), website: $('#fWebsite').value,
        items: S.cart.map((l) => ({ id: l.id, qty: l.qty, opts: l.opts, extras: l.extras, note: l.note })),
      });
      store.set('stylowa_me', { name, phone });
      S.last = { token: r.order.token, number: r.order.number, date: r.order.date, slot: r.order.slot };
      store.set('stylowa_last_order', S.last);
      S.cart = []; saveCart(); renderCart();
      $('#fNotes').value = '';
      renderDone(r.order);
      showStep('done');
      tracker();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
      if (ex.status === 409) loadSlots();
    } finally {
      btn.disabled = false; btn.classList.remove('is-busy');
    }
  });

  // ============================================================ potwierdzenie i śledzenie
  function whenText(o) {
    const today = Api.ymd(new Date());
    const tomorrow = Api.addDays(today, 1);
    const dt = new Date(o.date + 'T12:00:00');
    const d = o.date === today ? 'dziś' : o.date === tomorrow ? 'jutro' : DAYS[dt.getDay()].toLowerCase() + ' ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()];
    return (o.type === 'na_miejscu' ? 'Na miejscu' : 'Odbiór') + ' ' + d + ' o <b>' + o.slot + '</b>';
  }

  function renderDone(o) {
    $('#doneNum').textContent = o.number;
    $('#doneWhen').innerHTML = whenText(o) + ' · ' + esc(o.name);
    $('#doneList').innerHTML = o.items.map((l) => '<li class="ci"><span class="ci__name">' + l.qty + '× ' + esc(l.name) + '</span><span class="ci__price">' + zl(l.unit * l.qty) + '</span>' +
      (lineMeta(l) ? '<span class="ci__meta">' + lineMeta(l) + '</span>' : '') + '</li>').join('');
    const pack = o.items.reduce((s, l) => s + l.packaging * l.qty, 0);
    const dep = o.items.reduce((s, l) => s + l.deposit * l.qty, 0);
    $('#doneSum').innerHTML = sumHtml({ sub: o.total - pack - dep, pack, dep, total: o.total }) + '<dt>Płatność</dt><dd>' + (o.payment === 'karta' ? 'karta' : 'gotówka') + ' przy odbiorze</dd>';
    renderTrack(o.status);
  }

  function renderTrack(status) {
    const order = ['nowe', 'przyjete', 'przygotowanie', 'gotowe'];
    const track = $('#track');
    track.classList.toggle('cancel', status === 'anulowane');
    const idx = status === 'wydane' ? 4 : order.indexOf(status);
    $$('#track li').forEach((li, i) => { li.classList.toggle('on', i <= idx); li.classList.toggle('cur', i === idx); });
    const info = $('#doneInfo');
    if (status === 'anulowane') info.textContent = 'Zamówienie zostało anulowane. W razie pytań zadzwoń: ' + (S.settings ? S.settings.phone : '698 563 103') + '.';
    else if (status === 'gotowe') info.textContent = 'Twoje zamówienie czeka na odbiór. Smacznego!';
    else if (status === 'wydane') info.textContent = 'Zamówienie wydane. Dziękujemy i zapraszamy ponownie!';
    else info.textContent = 'Status odświeża się sam. Możesz zamknąć to okno — zamówienie znajdziesz pod przyciskiem na dole ekranu.';
  }

  let pollTimer = null;
  async function pollStatus() {
    clearTimeout(pollTimer);
    if (!S.last) return;
    try {
      const r = await Api.pub('status', { token: S.last.token });
      renderDone(r.order);
      pillText(r.order);
      if (['wydane', 'anulowane'].includes(r.order.status) || r.order.date < Api.ymd(new Date())) {
        if (r.order.date < Api.ymd(new Date())) { store.del('stylowa_last_order'); S.last = null; $('#trackerPill').hidden = true; return; }
      }
    } catch (e) {
      if (e.status === 404) { store.del('stylowa_last_order'); S.last = null; $('#trackerPill').hidden = true; return; }
    }
    pollTimer = setTimeout(pollStatus, 15000);
  }

  function pillText(o) {
    const pill = $('#trackerPill');
    if (o.status === 'wydane' || o.status === 'anulowane') { pill.hidden = true; return; }
    pill.hidden = false;
    $('#trackerPillTxt').textContent = 'Zamówienie ' + o.number + ' · ' + Api.STATUS_LABEL[o.status] + ' · ' + o.slot;
  }

  function tracker() {
    if (!S.last) return;
    pollStatus();
  }

  $('#trackerPill').addEventListener('click', () => openDrawer('done'));
  $('#newOrder').addEventListener('click', () => {
    closeLayer($('#drawer'));
    document.getElementById('menu').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  });

  // ============================================================ warstwy
  let lastFocus = null;
  function openLayer(el) {
    lastFocus = document.activeElement;
    $('#toast').classList.remove('show');
    el.hidden = false;
    el.classList.remove('closing');
    document.body.classList.add('lock');
    const f = el.querySelector('.drawer__panel, .modal__panel');
    setTimeout(() => { const b = el.querySelector('[data-close].icon-btn, .modal__x'); if (b) b.focus({ preventScroll: true }); }, 50);
    void f;
  }
  function closeLayer(el) {
    if (el.hidden) return;
    el.classList.add('closing');
    setTimeout(() => {
      el.hidden = true; el.classList.remove('closing');
      if (!$('.modal:not([hidden]), .drawer:not([hidden])')) document.body.classList.remove('lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, reduced ? 0 : 300);
  }
  $$('.modal, .drawer').forEach((layer) => layer.addEventListener('click', (e) => {
    const c = e.target.closest('[data-close]');
    if (!c) return;
    closeLayer(layer);
    if (c.dataset.goto) setTimeout(() => $(c.dataset.goto).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }), 320);
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = $('.modal:not([hidden])') || $('.drawer:not([hidden])');
    if (open) closeLayer(open);
  });

  // ============================================================ godziny / status
  function renderHours() {
    const h = S.settings.hours;
    const today = new Date().getDay();
    $$('#hoursTable tr').forEach((tr) => {
      const d = +tr.dataset.d;
      const v = h[d];
      tr.querySelector('td').textContent = v ? v[0] + ' – ' + v[1] : 'nieczynne';
      tr.classList.toggle('today', d === today);
    });
    if (S.settings.phone) {
      const p = $('#phoneLink');
      p.textContent = S.settings.phone;
      p.href = 'tel:' + S.settings.phone.replace(/[^\d+]/g, '');
    }
  }

  function liveStatus() {
    if (!S.settings) return;
    const h = S.settings.hours;
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    const t = h[now.getDay()];
    const el = $('#liveStatus');
    const txt = $('#liveStatusTxt');
    el.classList.remove('open', 'closed');
    if (t && min >= Api.toMin(t[0]) && min < Api.toMin(t[1])) {
      el.classList.add('open');
      txt.textContent = 'Otwarte teraz · do ' + t[1];
      return;
    }
    el.classList.add('closed');
    if (t && min < Api.toMin(t[0])) { txt.textContent = 'Otwieramy dziś o ' + t[0]; return; }
    for (let i = 1; i <= 7; i++) {
      const d = (now.getDay() + i) % 7;
      if (h[d]) { txt.textContent = 'Zamknięte · otwieramy ' + (i === 1 ? 'jutro' : DAYS[d].toLowerCase()) + ' o ' + h[d][0]; return; }
    }
    txt.textContent = 'Chwilowo zamknięte';
  }

  function mapEmbed() {
    const f = document.createElement('iframe');
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.title = 'Mapa dojazdu: Poczdamska 3F, Głogów';
    f.src = 'https://maps.google.com/maps?q=Poczdamska%203F%2C%2067-200%20G%C5%82og%C3%B3w&z=16&output=embed';
    $('#map').prepend(f);
  }

  // ============================================================ efekty
  function intro() {
    const el = $('#intro');
    const done = () => { el.classList.add('out'); document.body.classList.add('ready'); setTimeout(() => el.remove(), 700); };
    let seen = false;
    try { seen = sessionStorage.getItem('stylowa_intro') === '1'; sessionStorage.setItem('stylowa_intro', '1'); } catch (e) { /* */ }
    if (reduced || seen) { el.remove(); document.body.classList.add('ready'); return; }
    setTimeout(done, 1300);
  }

  function header() {
    const top = $('#top');
    const onScroll = () => top.classList.toggle('solid', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const burger = $('#burger');
    const nav = $('#nav');
    const setNav = (open) => {
      nav.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.classList.toggle('lock', open);
    };
    burger.addEventListener('click', () => setNav(!nav.classList.contains('open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setNav(false)));
    // aktywna sekcja w nawigacji
    if ('IntersectionObserver' in window) {
      const links = $$('a[href^="#"]', nav).filter((a) => !a.hasAttribute('data-open-order'));
      const io = new IntersectionObserver((ents) => ents.forEach((en) => {
        if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      }), { rootMargin: '-45% 0px -50% 0px' });
      ['menu', 'jak', 'lokal', 'kontakt'].forEach((id) => io.observe(document.getElementById(id)));
    }
  }

  // Elementy poniżej pierwszego ekranu wjeżdżają przy przewijaniu; to, co widać od razu, zostaje widoczne.
  function reveal() {
    if (reduced || !('IntersectionObserver' in window)) return;
    const io = reveal.io || (reveal.io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); en.target.classList.remove('pre'); reveal.io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' }));
    const vh = window.innerHeight;
    $$('.reveal:not(.pre):not(.in)').forEach((el, i) => {
      if (el.getBoundingClientRect().top < vh * 0.92) { el.classList.add('in'); return; }
      el.classList.add('pre');
      el.style.setProperty('--d', ((i % 3) * 0.08) + 's');
      io.observe(el);
    });
  }

  function glow() {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.dish');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  function fly(fromEl) {
    const btn = $('#cartBtn');
    const go = () => { btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); };
    if (reduced || !fromEl || !fromEl.getBoundingClientRect) { go(); return; }
    const a = fromEl.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'fly';
    dot.style.left = (a.left + a.width / 2 - 17) + 'px';
    dot.style.top = (a.top + a.height / 2 - 17) + 'px';
    document.body.appendChild(dot);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = dot.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 120) + 'px) scale(.9)', opacity: 1, offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3)', opacity: 0.4 },
    ], { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' });
    anim.onfinish = () => { dot.remove(); go(); };
  }

  let toastT = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Iskry z rożna unoszące się w hero.
  function embers() {
    const c = $('#embers');
    if (!c || reduced) return;
    const ctx = c.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], running = true, raf = 0;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, w / 14));
      parts = Array.from({ length: n }, () => spawn(true));
    };
    const spawn = (anywhere) => ({
      x: Math.random() * w, y: anywhere ? Math.random() * h : h + 10,
      r: Math.random() * 1.8 + 0.4, vy: -(Math.random() * 0.6 + 0.25), vx: (Math.random() - 0.5) * 0.25,
      life: Math.random() * 0.6 + 0.4, ph: Math.random() * Math.PI * 2, hue: 32 + Math.random() * 16,
    });
    const tick = (t) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      parts.forEach((p, i) => {
        p.y += p.vy; p.x += p.vx + Math.sin(t / 900 + p.ph) * 0.18;
        const fade = Math.max(0, Math.min(1, p.y / h)) * p.life;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, 'hsla(' + p.hue + ',95%,70%,' + fade + ')');
        g.addColorStop(1, 'hsla(' + p.hue + ',95%,50%,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
        if (p.y < -20) parts[i] = spawn(false);
      });
      raf = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => {
        running = en.isIntersecting;
        cancelAnimationFrame(raf);
        if (running) raf = requestAnimationFrame(tick);
      }).observe(c);
    }
    raf = requestAnimationFrame(tick);
  }
})();
