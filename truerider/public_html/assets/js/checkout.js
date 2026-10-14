/* True Rider storefront — checkout ("parkur" progress), order confirmation */
(function () {
  'use strict';
  const TR = window.TR;
  const { $, $$, esc, pln, ICON } = TR;
  const D = TR.data, S = TR.state;

  const SHIP = [
    { id: 'inpost', n: 'Paczkomat InPost', d: 'Zwykle 1–2 dni robocze', price: 15.5, cod: false, locker: true },
    { id: 'inpost-cod', n: 'Paczkomat InPost — za pobraniem', d: 'Płacisz przy odbiorze', price: 18.5, cod: true, locker: true },
    { id: 'dpd', n: 'Kurier DPD', d: 'Dostawa w 1 dzień roboczy', price: 17.5, cod: false },
    { id: 'dpd-cod', n: 'Kurier DPD — za pobraniem', d: 'Płacisz kurierowi', price: 21.99, cod: true },
    { id: 'pickup', n: 'Odbiór osobisty — Mierzyn', d: 'ul. Welecka 13, pn–pt 9:00–17:00', price: 0, cod: false, pickup: true },
  ];
  const PAY = [
    { id: 'blik', n: 'BLIK', d: 'Kod z aplikacji banku' },
    { id: 'payu', n: 'Szybki przelew PayU', d: 'Wszystkie polskie banki' },
    { id: 'card', n: 'Karta płatnicza', d: 'Visa, Mastercard, Maestro' },
    { id: 'paypo', n: 'PayPo — zapłać za 30 dni', d: 'Odbierz, sprawdź, zapłać później' },
    { id: 'paypal', n: 'PayPal', d: 'Logowanie do konta PayPal' },
    { id: 'transfer', n: 'Przelew tradycyjny', d: 'Wysyłka po zaksięgowaniu wpłaty' },
  ];
  const F = (TR.checkoutForm = TR.store.get('checkout', { ship: 'inpost', pay: 'blik' }));

  /* show-jumping course: four fences, a rider marker hops to the furthest cleared one */
  function courseSVG() {
    const fence = (x) => '<g transform="translate(' + x + ',0)"><rect x="-22" y="26" width="3" height="34" fill="currentColor"/><rect x="19" y="26" width="3" height="34" fill="currentColor"/>' +
      [30, 40].map((y) => '<rect x="-20" y="' + y + '" width="40" height="4" rx="1" fill="url(#rail)"/>').join('') + '</g>';
    return '<svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="rail" width="10" height="4" patternUnits="userSpaceOnUse"><rect width="5" height="4" fill="#a5814a"/><rect x="5" width="5" height="4" fill="#fcfbf9"/></pattern></defs>' +
      '<line x1="0" y1="60" x2="400" y2="60" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 4"/>' +
      [50, 150, 250, 350].map(fence).join('') + '<circle id="rider" cx="50" cy="18" r="7" fill="#0f1a2c" stroke="#d8c08f" stroke-width="2"/></svg>';
  }
  let riderAt = 0;
  function hopTo(step) {
    const r = $('#rider');
    if (!r || step === riderAt) return;
    const from = 50 + riderAt * 100, to = 50 + step * 100;
    riderAt = step;
    if (TR.reduced()) { r.setAttribute('cx', to); return; }
    const t0 = performance.now(), dur = 650;
    const f = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      r.setAttribute('cx', from + (to - from) * e);
      r.setAttribute('cy', 18 - Math.sin(Math.PI * k) * 14);
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
    $$('.course__labels span').forEach((s, i) => s.classList.toggle('on', i <= step));
  }

  function checkoutView(m, o) {
    document.title = 'Zamówienie — True Rider';
    riderAt = 0;
    if (!S.cart.length) {
      return TR.mount('<div class="wrap"><div class="empty" style="padding-block:120px"><h3>Twój koszyk jest pusty</h3><p class="muted">Dodaj produkty, a potem wróć tutaj, żeby złożyć zamówienie.</p><a class="btn" href="/pl/new">Zobacz nowości</a></div></div>', o);
    }
    const field = (id, label, type, full, extra) => '<div class="field' + (full ? ' full' : '') + '"><label for="' + id + '">' + label + '</label><input id="' + id + '" name="' + id + '" type="' + (type || 'text') + '" value="' + esc(F[id] || '') + '"' + (extra || '') + '><span class="msg"></span></div>';
    const html = '<div class="wrap"><nav class="crumbs"><a href="/">True Rider</a><span aria-hidden="true">/</span><span>Zamówienie</span></nav>' +
      '<h1 class="page-title" style="padding-bottom:10px">Ostatnia prosta <em>do mety</em></h1>' +
      '<div class="course">' + courseSVG() + '<div class="course__labels"><span class="on">Koszyk</span><span>Dane</span><span>Dostawa</span><span>Płatność</span></div></div>' +
      '<form class="co" id="coForm" novalidate><div>' +
        '<section class="co__card"><h2><span>1</span>Dane kontaktowe</h2><div class="fields">' +
          field('email', 'E-mail', 'email', true, ' autocomplete="email" required') + field('fname', 'Imię', 'text', false, ' autocomplete="given-name" required') + field('lname', 'Nazwisko', 'text', false, ' autocomplete="family-name" required') + field('phone', 'Telefon', 'tel', true, ' autocomplete="tel" required placeholder="np. 519 559 462"') +
          '<label class="check full"><input type="checkbox" id="invoice"' + (F.invoice ? ' checked' : '') + '><span>Chcę fakturę na firmę</span></label>' +
          '<div class="fields full" id="invoiceBox"' + (F.invoice ? '' : ' hidden') + '>' + field('company', 'Nazwa firmy', 'text', true) + field('nip', 'NIP', 'text', true, ' inputmode="numeric"') + '</div>' +
        '</div></section>' +
        '<section class="co__card"><h2><span>2</span>Dostawa</h2><div class="radios">' + SHIP.map((s) => '<label class="radio"><input type="radio" name="ship" value="' + s.id + '"' + (F.ship === s.id ? ' checked' : '') + '><span><b>' + s.n + '</b><small>' + s.d + '</small></span><em>' + (s.price ? pln(s.price) : 'Bezpłatnie') + '</em></label>').join('') + '</div>' +
          '<div id="lockerBox" class="fields">' + field('locker', 'Kod paczkomatu', 'text', true, ' placeholder="np. SZN01M" style="text-transform:uppercase"') + '<p class="full muted" style="font-size:.8rem">W sklepie produkcyjnym w tym miejscu otworzy się mapa paczkomatów InPost (Geowidget).</p></div>' +
          '<div id="addrBox" class="fields">' + field('street', 'Ulica i numer', 'text', true, ' autocomplete="street-address"') + field('zip', 'Kod pocztowy', 'text', false, ' inputmode="numeric" placeholder="00-000" autocomplete="postal-code"') + field('city', 'Miejscowość', 'text', false, ' autocomplete="address-level2"') + '</div>' +
        '</section>' +
        '<section class="co__card" id="paySec"><h2><span>3</span>Płatność</h2><div class="radios" id="payList"></div></section>' +
        '<section class="co__card"><h2><span>4</span>Uwagi i zgody</h2><div class="field"><label for="note">Uwagi do zamówienia (np. personalizacja, termin)</label><textarea id="note">' + esc(F.note || '') + '</textarea></div>' +
          '<label class="check"><input type="checkbox" id="terms" required><span>Akceptuję <a href="/strona/rules" target="_blank">regulamin sklepu</a> i <a href="/strona/privacy-policy" target="_blank">politykę prywatności</a>.</span></label>' +
          '<label class="check"><input type="checkbox" id="nl"' + (F.nl ? ' checked' : '') + '><span>Chcę dostawać newsletter z nowościami i rabatami (−5% na kolejne zakupy).</span></label><p class="msg" id="termsMsg" style="color:var(--sale);font-size:.8rem"></p></section>' +
      '</div>' +
      '<aside class="co__sum"><div class="co__card"><h2 style="font-size:1.4rem">Podsumowanie</h2><div id="sumLines" style="display:grid;gap:14px"></div>' +
        '<div class="code-row"><label class="sr" for="code">Kod rabatowy</label><input id="code" placeholder="Kod rabatowy" value="' + esc(S.code || '') + '"><button class="btn btn--ghost" type="button" id="codeBtn"><span>Użyj</span></button></div><p class="muted" id="codeMsg" style="font-size:.8rem;margin-top:-8px"></p>' +
        '<div id="sumTotals" style="display:grid;gap:8px"></div>' +
        '<button class="btn btn--block" type="submit" id="placeBtn"><span>Zamawiam i płacę</span>' + ICON.arrow + '</button>' +
        '<p class="muted" style="font-size:.76rem;text-align:center">Wersja demonstracyjna: zamówienie zapisze się w tej przeglądarce, bez płatności. Bramka PayU/PayPo i panel zamówień dojdą w kolejnym etapie.</p>' +
      '</div></aside></form></div>';

    return TR.mount(html, o, (root) => {
      const form = $('#coForm', root);
      const ship = () => SHIP.find((s) => s.id === F.ship) || SHIP[0];
      const val = (id) => ($('#' + id, root) ? $('#' + id, root).value.trim() : '');
      const rules = {
        email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Wpisz adres e-mail, np. imie@domena.pl',
        fname: (v) => v.length > 1 || 'Podaj imię',
        lname: (v) => v.length > 1 || 'Podaj nazwisko',
        phone: (v) => v.replace(/\D/g, '').length >= 9 || 'Telefon musi mieć co najmniej 9 cyfr',
        company: (v) => !F.invoice || v.length > 1 || 'Podaj nazwę firmy',
        nip: (v) => !F.invoice || v.replace(/\D/g, '').length === 10 || 'NIP ma 10 cyfr',
        locker: (v) => !ship().locker || /^[A-Z]{3}\d{2,3}[A-Z]{0,2}$/i.test(v) || 'Kod paczkomatu ma format np. SZN01M',
        street: (v) => ship().locker || ship().pickup || v.length > 3 || 'Podaj ulicę i numer',
        zip: (v) => ship().locker || ship().pickup || /^\d{2}-\d{3}$/.test(v) || 'Kod pocztowy w formacie 00-000',
        city: (v) => ship().locker || ship().pickup || v.length > 1 || 'Podaj miejscowość',
      };
      const check = (id, show) => {
        const r = rules[id](val(id));
        const f = $('#' + id, root).closest('.field');
        if (show) { f.classList.toggle('err', r !== true); $('.msg', f).textContent = r === true ? '' : r; }
        return r === true;
      };
      const drawPay = () => {
        const s = ship();
        $('#lockerBox', root).hidden = !s.locker;
        $('#addrBox', root).hidden = !!(s.locker || s.pickup);
        if (s.cod) { F.pay = 'cod'; $('#payList', root).innerHTML = '<label class="radio"><input type="radio" name="pay" value="cod" checked><span><b>Płatność przy odbiorze</b><small>Gotówka lub karta u kuriera / w paczkomacie</small></span><em></em></label>'; }
        else {
          if (F.pay === 'cod' || !PAY.find((p) => p.id === F.pay)) F.pay = 'blik';
          $('#payList', root).innerHTML = PAY.map((p) => '<label class="radio"><input type="radio" name="pay" value="' + p.id + '"' + (F.pay === p.id ? ' checked' : '') + '><span><b>' + p.n + '</b><small>' + p.d + '</small></span><em></em></label>').join('');
        }
      };
      const totals = () => {
        const sub = TR.cartSubtotal(), disc = TR.discount(), sh = ship().price;
        return { sub, disc, sh, total: Math.round((sub - disc + sh) * 100) / 100 };
      };
      const drawSum = () => {
        $('#sumLines', root).innerHTML = S.cart.map((l) => { const p = D.byId.get(l.id); return p ? '<div class="mini"><div class="mini__img">' + TR.img(p.im[0], 400, '') + '<b>' + l.qty + '</b></div><div><span>' + esc(p.n) + '</span>' + (l.label ? '<small>' + esc(l.label) + '</small>' : '') + '</div><span class="num">' + pln(l.price * l.qty) + '</span></div>' : ''; }).join('');
        TR.hydrate($('#sumLines', root)); TR.loadNow($('#sumLines', root));
        const t = totals();
        $('#sumTotals', root).innerHTML = '<div class="sum-row"><span>Produkty</span><span class="num">' + pln(t.sub) + '</span></div>' +
          (t.disc ? '<div class="sum-row"><span>' + esc(TR.CODES[S.code].label) + '</span><span class="num">−' + pln(t.disc) + '</span></div>' : '') +
          '<div class="sum-row"><span>Dostawa · ' + esc(ship().n) + '</span><span class="num">' + (t.sh ? pln(t.sh) : '0,00 zł') + '</span></div>' +
          '<div class="sum-row total"><span>Do zapłaty</span><span class="num">' + pln(t.total) + '</span></div>';
      };
      const progress = () => {
        const contact = ['email', 'fname', 'lname', 'phone', 'company', 'nip'].every((id) => check(id, false));
        const deliv = contact && ['locker', 'street', 'zip', 'city'].every((id) => check(id, false));
        const pay = deliv && !!F.pay;
        hopTo(pay ? 3 : deliv ? 2 : contact ? 1 : 0);
      };
      const persist = TR.debounce(() => {
        ['email', 'fname', 'lname', 'phone', 'company', 'nip', 'locker', 'street', 'zip', 'city', 'note'].forEach((id) => { if ($('#' + id, root)) F[id] = val(id); });
        F.nl = $('#nl', root).checked;
        TR.store.set('checkout', F);
      }, 300);
      form.addEventListener('input', (e) => {
        if (e.target.id === 'zip') { let v = e.target.value.replace(/\D/g, '').slice(0, 5); if (v.length > 2) v = v.slice(0, 2) + '-' + v.slice(2); e.target.value = v; }
        if (rules[e.target.id] && e.target.closest('.field').classList.contains('err')) check(e.target.id, true);
        persist(); progress();
      });
      form.addEventListener('focusout', (e) => { if (rules[e.target.id] && e.target.value) check(e.target.id, true); });
      form.addEventListener('change', (e) => {
        if (e.target.name === 'ship') { F.ship = e.target.value; drawPay(); drawSum(); }
        if (e.target.name === 'pay') F.pay = e.target.value;
        if (e.target.id === 'invoice') { F.invoice = e.target.checked; $('#invoiceBox', root).hidden = !F.invoice; }
        persist(); progress();
      });
      $('#codeBtn', root).addEventListener('click', () => {
        const c = val('code').toUpperCase();
        if (!c) { S.code = null; TR.save('code'); $('#codeMsg', root).textContent = ''; drawSum(); return; }
        if (TR.CODES[c]) { S.code = c; TR.save('code'); $('#codeMsg', root).textContent = 'Kod przyjęty: ' + TR.CODES[c].label; }
        else $('#codeMsg', root).textContent = 'Ten kod nie działa. Sprawdź pisownię — kod z newslettera to TRUERIDER5.';
        drawSum();
      });
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const ids = Object.keys(rules).filter((id) => $('#' + id, root) && !$('#' + id, root).closest('[hidden]'));
        const bad = ids.filter((id) => !check(id, true));
        const terms = $('#terms', root).checked;
        $('#termsMsg', root).textContent = terms ? '' : 'Zaznacz akceptację regulaminu, aby złożyć zamówienie.';
        if (bad.length || !terms) {
          const first = bad.length ? $('#' + bad[0], root) : $('#terms', root);
          first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true });
          return;
        }
        const t = totals();
        const no = 'TR-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
        const order = {
          no, date: new Date().toISOString(), status: 'nowe',
          customer: { email: F.email, name: F.fname + ' ' + F.lname, phone: F.phone, company: F.invoice ? F.company : '', nip: F.invoice ? F.nip : '' },
          ship: { id: ship().id, n: ship().n, price: ship().price, locker: ship().locker ? F.locker.toUpperCase() : '', address: ship().locker || ship().pickup ? '' : F.street + ', ' + F.zip + ' ' + F.city },
          pay: F.pay, note: F.note || '', code: S.code,
          lines: S.cart.map((l) => ({ id: l.id, name: (D.byId.get(l.id) || {}).n, label: l.label, qty: l.qty, price: l.price })),
          totals: t,
        };
        S.orders.unshift(order); TR.save('orders');
        if (F.nl && F.email) TR.store.set('newsletter', F.email);
        S.cart = []; S.code = null; TR.save('cart'); TR.save('code');
        TR.go('/zamowienie/' + no);
      });
      drawPay(); drawSum(); progress();
    });
  }

  function rosette() {
    const pts = [];
    for (let i = 0; i < 72; i++) { const a = (i / 72) * Math.PI * 2, r = i % 2 ? 66 : 80; pts.push((85 + Math.cos(a) * r).toFixed(1) + ',' + (85 + Math.sin(a) * r).toFixed(1)); }
    return '<svg class="rosette" viewBox="0 0 170 220" aria-hidden="true">' +
      '<path d="M60 130 L40 215 L62 200 L74 218 L85 140Z" fill="#0f1a2c"/><path d="M110 130 L130 215 L108 200 L96 218 L85 140Z" fill="#1b2a42"/>' +
      '<g class="spin"><polygon points="' + pts.join(' ') + '" fill="#a5814a"/></g><circle cx="85" cy="85" r="56" fill="#d8c08f"/><circle cx="85" cy="85" r="44" fill="#0f1a2c"/>' +
      '<text x="85" y="80" text-anchor="middle" fill="#d8c08f" font-family="DM Mono, monospace" font-size="9" letter-spacing="2">TRUE RIDER</text><text x="85" y="104" text-anchor="middle" fill="#f1ece2" font-family="Bodoni Moda, serif" font-style="italic" font-size="26">Clear</text></svg>';
  }
  function doneView(no, o) {
    const ord = S.orders.find((x) => x.no === no);
    document.title = 'Zamówienie przyjęte — True Rider';
    if (!ord) return TR.notFound(o);
    const payTxt = { blik: 'BLIK', payu: 'Szybki przelew PayU', card: 'Karta płatnicza', paypo: 'PayPo — zapłać za 30 dni', paypal: 'PayPal', transfer: 'Przelew tradycyjny', cod: 'Płatność przy odbiorze' }[ord.pay];
    const html = '<div class="wrap"><div class="done">' + rosette() + '<p class="eyebrow eyebrow--gold">Czysty przejazd</p><h1>Dziękujemy, <em>' + esc(ord.customer.name.split(' ')[0]) + '</em>!</h1><p class="lede" style="text-align:center">Zamówienie zostało przyjęte. Potwierdzenie wyślemy na <b>' + esc(ord.customer.email) + '</b>, a paczkę nadamy w ciągu 24 h od zaksięgowania płatności.</p>' +
      '<div class="done__box"><div class="sum-row"><span>Numer zamówienia</span><span class="ordno">' + esc(ord.no) + '</span></div><div class="sum-row"><span>Dostawa</span><span>' + esc(ord.ship.n) + (ord.ship.locker ? ' · ' + esc(ord.ship.locker) : '') + '</span></div>' + (ord.ship.address ? '<div class="sum-row"><span>Adres</span><span>' + esc(ord.ship.address) + '</span></div>' : '') + '<div class="sum-row"><span>Płatność</span><span>' + esc(payTxt) + '</span></div>' +
      ord.lines.map((l) => '<div class="sum-row"><span>' + l.qty + ' × ' + esc(l.name) + (l.label ? ' <small class="muted">(' + esc(l.label) + ')</small>' : '') + '</span><span class="num">' + pln(l.price * l.qty) + '</span></div>').join('') +
      '<div class="sum-row total"><span>Razem</span><span class="num">' + pln(ord.totals.total) + '</span></div></div>' +
      (ord.pay === 'transfer' ? '<p class="muted" style="max-width:56ch">Dane do przelewu: True Rider, nr konta 63 1140 2004 0000 3202 7504 1176, tytuł: ' + esc(ord.no) + '.</p>' : '') +
      '<div class="hero__cta" style="justify-content:center"><a class="btn" href="/"><span>Wróć do sklepu</span></a><a class="btn btn--ghost" href="/pl/new"><span>Zobacz nowości</span></a></div></div></div>';
    return TR.mount(html, o);
  }

  TR.route((p) => p === '/koszyk' || p === '/pl/basket', (m, o) => { TR.openCart(); return TR.go('/pl/new', { replace: true }); });
  TR.route((p) => p === '/zamowienie', checkoutView);
  TR.route((p) => { const m = p.match(/^\/zamowienie\/(TR-[\d-]+)$/); return m ? m[1] : null; }, doneView);
})();
