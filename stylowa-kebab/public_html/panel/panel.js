/* Panel Stylowa — obsługa zamówień, kalendarz slotów, zamówienia telefoniczne, menu i ustawienia. */
(function () {
  'use strict';

  const Api = window.StylowaApi;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const zl = (g) => Api.zl(g);
  const ls = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } },
  };
  const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const DSHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];
  const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const FLOW = ['nowe', 'przyjete', 'przygotowanie', 'gotowe', 'wydane'];
  const NEXT = { nowe: ['przyjete', 'Przyjmij'], przyjete: ['przygotowanie', 'Do kuchni'], przygotowanie: ['gotowe', 'Gotowe'], gotowe: ['wydane', 'Wydane'] };
  const SRC = { online: 'online', telefon: 'telefon', lokal: 'na miejscu' };
  const L = Api.STATUS_LABEL;

  const P = {
    cats: [], options: [], settings: {}, items: {}, extras: [],
    orders: [], byId: {}, latest: null, sound: ls.get('panel_sound', false), tab: 'live', col: 'nowe',
    calDate: Api.ymd(new Date()), calOrders: {},
    t: { lines: [], src: 'telefon', type: 'wynos', pay: 'gotowka' },
    fresh: new Set(),
  };
  let pollTimer = null;

  // ============================================================ start
  start();

  async function start() {
    await Api.init('../');
    if (Api.mode === 'demo') { $('#loginHint').hidden = false; $('#demoTag').hidden = false; $('#demoBox').hidden = false; }
    try {
      const me = await Api.adm('me');
      if (me.auth) return enter(me);
    } catch (e) { /* */ }
    showLogin();
  }

  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    setTimeout(() => $('#loginPass').focus(), 50);
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#loginErr');
    err.hidden = true;
    try {
      const r = await Api.adm('login', {}, { password: $('#loginPass').value });
      $('#loginPass').value = '';
      enter(r);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  });

  async function enter(me) {
    $('#login').hidden = true;
    $('#app').hidden = false;
    $('#warnPass').hidden = !me.defaultPassword;
    await loadBootstrap();
    clock();
    setInterval(clock, 15000);
    soundUi();
    go(ls.get('panel_tab', 'live'));
    await poll(true);
  }

  async function loadBootstrap() {
    const b = await Api.adm('bootstrap');
    setMenu(b.categories);
    P.options = b.options;
    P.settings = b.settings;
    $('#orderingToggle').checked = P.settings.ordering_enabled === '1';
    orderingTxt();
  }

  function setMenu(cats) {
    P.cats = cats;
    P.items = {};
    cats.forEach((c) => c.items.forEach((i) => { P.items[i.id] = Object.assign({ cat: c }, i); }));
    P.extras = ((cats.find((c) => c.extras) || {}).items || []).filter((i) => i.active);
  }

  function clock() {
    const d = new Date();
    $('#clock').textContent = Api.pad(d.getHours()) + ':' + Api.pad(d.getMinutes());
    $('#today').textContent = DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    if (P.tab === 'live') renderLive();
  }

  // ============================================================ nawigacja
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); });
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-goto]'); if (g) go(g.dataset.goto); });

  function go(tab) {
    P.tab = tab;
    ls.set('panel_tab', tab);
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $$('.view').forEach((v) => { v.hidden = v.id !== 'v-' + tab; });
    window.scrollTo(0, 0);
    if (tab === 'live') renderLive();
    if (tab === 'cal') loadCal();
    if (tab === 'new') renderPos();
    if (tab === 'hist') loadHist();
    if (tab === 'menu') renderMenuEdit();
    if (tab === 'set') renderSettings();
  }

  $('#logoutBtn').addEventListener('click', async () => {
    try { await Api.adm('logout', {}, {}); } catch (e) { /* */ }
    clearTimeout(pollTimer);
    showLogin();
  });

  $('#orderingToggle').addEventListener('change', async (e) => {
    const on = e.target.checked;
    try {
      await Api.adm('settings_save', {}, { settings: { ordering_enabled: on } });
      P.settings.ordering_enabled = on ? '1' : '0';
      orderingTxt();
      toast(on ? 'Zamówienia online włączone' : 'Zamówienia online wstrzymane');
    } catch (ex) { e.target.checked = !on; toast(ex.message, true); }
  });
  function orderingTxt() { $('#orderingTxt').textContent = $('#orderingToggle').checked ? 'Online: przyjmujemy' : 'Online: wstrzymane'; }

  // ============================================================ odświeżanie i powiadomienia
  async function poll(first) {
    clearTimeout(pollTimer);
    try {
      const r = await Api.adm('poll');
      const prev = P.latest;
      P.orders = r.orders;
      P.byId = {};
      r.orders.forEach((o) => { P.byId[o.id] = o; });
      if (!first && prev != null && r.latestId > prev) {
        const fresh = r.orders.filter((o) => o.id > prev && o.source === 'online');
        if (fresh.length) {
          fresh.forEach((o) => P.fresh.add(o.id));
          chime();
          toast(fresh.length === 1 ? 'Nowe zamówienie ' + fresh[0].number + ' na ' + fresh[0].slot : 'Nowe zamówienia: ' + fresh.length);
          if (P.tab === 'cal') loadCal(true);
        }
      }
      P.latest = r.latestId;
      if ($('#orderingToggle').checked !== r.ordering) { $('#orderingToggle').checked = r.ordering; orderingTxt(); }
      const n = r.orders.filter((o) => o.status === 'nowe').length;
      const badge = $('#badgeNew');
      badge.hidden = !n;
      badge.textContent = n;
      document.title = (n ? '(' + n + ') ' : '') + 'Panel Stylowa';
      if (P.tab === 'live') renderLive();
    } catch (e) {
      if (e.status === 401) { showLogin(); return; }
    }
    pollTimer = setTimeout(poll, 8000);
  }

  let audio = null;
  function chime() {
    if (!P.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      [[880, 0], [1175, 0.16], [1568, 0.32]].forEach(([f, d]) => {
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
        o.connect(g).connect(audio.destination);
        o.start(t + d); o.stop(t + d + 0.55);
      });
    } catch (e) { /* brak audio */ }
  }
  function soundUi() {
    const b = $('#soundBtn');
    b.classList.toggle('on', P.sound);
    b.innerHTML = '<svg><use href="#p-' + (P.sound ? 'bell' : 'mute') + '"/></svg>';
    b.title = P.sound ? 'Dźwięk nowych zamówień: włączony' : 'Dźwięk nowych zamówień: wyłączony';
  }
  $('#soundBtn').addEventListener('click', () => {
    P.sound = !P.sound;
    ls.set('panel_sound', P.sound);
    soundUi();
    if (P.sound) { chime(); toast('Dźwięk włączony — usłyszysz każde nowe zamówienie'); }
  });

  // ============================================================ na żywo
  function nowMin() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function dayWord(date) {
    const today = Api.ymd(new Date());
    if (date === today) return '';
    if (date === Api.addDays(today, 1)) return 'jutro';
    const d = new Date(date + 'T12:00:00');
    return DSHORT[d.getDay()] + ' ' + d.getDate() + '.' + Api.pad(d.getMonth() + 1);
  }
  function eta(o) {
    if (o.date !== Api.ymd(new Date())) return { t: '', c: '' };
    const diff = Api.toMin(o.slot) - nowMin();
    if (['gotowe', 'wydane', 'anulowane'].includes(o.status)) return { t: '', c: '' };
    if (diff < 0) return { t: 'spóźnione o ' + (-diff) + ' min', c: 'late' };
    if (diff === 0) return { t: 'teraz', c: 'soon' };
    return { t: 'za ' + (diff >= 60 ? Math.floor(diff / 60) + ' h ' + (diff % 60) + ' min' : diff + ' min'), c: diff <= 15 ? 'soon' : '' };
  }
  function lineDesc(l) {
    const bits = Object.values(l.opts || {}).map(esc);
    (l.extras || []).forEach((e) => bits.push('+' + esc(e.name)));
    if (l.note) bits.push('„' + esc(l.note) + '”');
    return bits.join(', ');
  }

  function renderLive() {
    const today = Api.ymd(new Date());
    const todays = P.orders.filter((o) => o.date === today && o.status !== 'anulowane');
    const active = P.orders.filter((o) => ['nowe', 'przyjete', 'przygotowanie', 'gotowe'].includes(o.status));
    const upcoming = active.filter((o) => o.date === today && Api.toMin(o.slot) >= nowMin() && o.status !== 'gotowe').sort((a, b) => a.slot.localeCompare(b.slot))[0];
    $('#kpis').innerHTML =
      kpi('Dziś zamówień', todays.length, todays.filter((o) => o.status === 'wydane').length + ' wydanych') +
      kpi('Utarg dziś', zl(todays.reduce((s, o) => s + o.total, 0)), 'bez anulowanych') +
      kpi('W toku', active.filter((o) => o.status !== 'gotowe').length, active.filter((o) => o.status === 'nowe').length + ' czeka na przyjęcie') +
      kpi('Najbliższy odbiór', upcoming ? upcoming.slot : '—', upcoming ? upcoming.number + ' · ' + esc(upcoming.name) : 'brak w kolejce');

    const cols = ['nowe', 'przyjete', 'przygotowanie', 'gotowe'];
    $('#colNav').innerHTML = cols.map((s) => '<button type="button" data-s="' + s + '" class="' + (P.col === s ? 'on' : '') + '"><i></i>' + L[s] + ' (' + active.filter((o) => o.status === s).length + ')</button>').join('');
    $('#board').innerHTML = cols.map((s) => {
      const list = active.filter((o) => o.status === s).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot) || a.id - b.id);
      return '<section class="col' + (P.col === s ? ' show' : '') + '" data-s="' + s + '"><header class="col__h"><i></i>' + L[s] + '<span>' + list.length + '</span></header><div class="col__b">' +
        (list.length ? list.map(card).join('') : '<p class="col__empty">Brak zamówień</p>') + '</div></section>';
    }).join('');
  }
  function kpi(t, v, s) { return '<div class="kpi"><small>' + t + '</small><b>' + v + '</b><span>' + s + '</span></div>'; }

  function card(o) {
    const e = eta(o);
    const nx = NEXT[o.status];
    return '<article class="oc' + (P.fresh.has(o.id) ? ' fresh' : '') + '" data-s="' + o.status + '" data-id="' + o.id + '">' +
      '<div class="oc__top"><span class="oc__time">' + o.slot + '</span><span class="oc__day">' + dayWord(o.date) + '</span><span class="oc__num">' + o.number + '</span></div>' +
      (e.t ? '<span class="oc__eta ' + e.c + '">' + e.t + '</span>' : '') +
      '<div class="oc__who"><b>' + esc(o.name) + '</b><span class="tag tag--' + o.source + '">' + SRC[o.source] + '</span><span class="tag">' + (o.type === 'wynos' ? 'wynos' : 'na miejscu') + '</span></div>' +
      '<ul class="oc__items">' + o.items.map((l) => '<li>' + l.qty + '× ' + esc(l.name) + (lineDesc(l) ? ' <small>' + lineDesc(l) + '</small>' : '') + '</li>').join('') + '</ul>' +
      (o.notes ? '<p class="oc__notes">' + esc(o.notes) + '</p>' : '') +
      '<div class="oc__foot"><span class="oc__total">' + zl(o.total) + '</span><small class="muted">' + (o.payment === 'karta' ? 'karta' : 'gotówka') + '</small>' +
      (nx ? '<button type="button" class="btn btn--gold btn--sm" data-next="' + nx[0] + '">' + nx[1] + '</button>' : '') + '</div></article>';
  }

  $('#colNav').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; P.col = b.dataset.s; renderLive(); });
  $('#board').addEventListener('click', async (e) => {
    const c = e.target.closest('.oc');
    if (!c) return;
    const id = +c.dataset.id;
    P.fresh.delete(id);
    const nx = e.target.closest('[data-next]');
    if (nx) {
      nx.disabled = true;
      await setStatus(id, nx.dataset.next);
      return;
    }
    openOrder(P.byId[id]);
  });

  async function setStatus(id, status) {
    try {
      const r = await Api.adm('order_update', {}, { id, status });
      upsert(r.order);
      toast(r.order.number + ': ' + L[status]);
      return r.order;
    } catch (ex) { toast(ex.message, true); }
  }
  function upsert(o) {
    const i = P.orders.findIndex((x) => x.id === o.id);
    if (i >= 0) P.orders[i] = o; else P.orders.push(o);
    P.byId[o.id] = o;
    P.calOrders[o.id] = o;
    if (P.tab === 'live') renderLive();
    if (P.tab === 'cal') loadCal(true);
    if (P.tab === 'hist') loadHist();
  }

  // ============================================================ szczegóły zamówienia
  let cur = null;
  function openOrder(o) {
    if (!o) return;
    cur = o;
    $('#omTitle').textContent = o.number;
    const st = $('#omStatus');
    st.className = 'st'; st.dataset.s = o.status; st.textContent = L[o.status];
    const tel = o.phone ? '<a href="tel:' + esc(o.phone) + '">' + esc(o.phone) + '</a>' : '—';
    const d = new Date(o.date + 'T12:00:00');
    $('#omBody').innerHTML =
      '<dl class="kv"><dt>Odbiór</dt><dd><b>' + o.slot + '</b> · ' + DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' · ' + (o.type === 'wynos' ? 'na wynos' : 'na miejscu') + '</dd>' +
      '<dt>Klient</dt><dd>' + esc(o.name) + '</dd><dt>Telefon</dt><dd>' + tel + '</dd>' +
      '<dt>Źródło</dt><dd><span class="tag tag--' + o.source + '">' + SRC[o.source] + '</span> · złożone ' + esc(o.createdAt.slice(0, 16)) + '</dd>' +
      '<dt>Płatność</dt><dd>' + (o.payment === 'karta' ? 'karta' : 'gotówka') + ' przy odbiorze</dd>' +
      (o.notes ? '<dt>Uwagi</dt><dd>' + esc(o.notes) + '</dd>' : '') + '</dl>' +
      '<ul class="items">' + o.items.map((l) => '<li><span>' + l.qty + '× ' + esc(l.name) + '</span><b>' + zl(l.line) + '</b>' + (lineDesc(l) ? '<small>' + lineDesc(l) + '</small>' : '') + '</li>').join('') +
      '<li><span><b>Razem</b></span><b>' + zl(o.total) + '</b></li></ul>' +
      '<div class="box"><h4>Status</h4><div class="steps">' + Api.STATUSES.map((s) => '<button type="button" class="btn btn--ghost btn--sm' + (s === o.status ? ' cur' : '') + '" data-s="' + s + '" data-set="' + s + '">' + L[s] + '</button>').join('') + '</div></div>' +
      '<div class="box"><h4>Przesuń termin</h4><div class="row"><label class="f"><span>Dzień</span><input type="date" id="mvDate" value="' + o.date + '"></label>' +
      '<label class="f"><span>Godzina</span><select id="mvSlot"></select></label><button type="button" class="btn btn--ghost" id="mvSave">Przesuń</button></div></div>' +
      '<div class="box"><h4>Dane klienta</h4><div class="row"><label class="f"><span>Imię</span><input id="edName" value="' + esc(o.name) + '"></label>' +
      '<label class="f"><span>Telefon</span><input id="edPhone" value="' + esc(o.phone) + '"></label></div>' +
      '<label class="f"><span>Uwagi</span><input id="edNotes" value="' + esc(o.notes) + '"></label><div class="row"><button type="button" class="btn btn--ghost btn--sm" id="edSave">Zapisz dane</button></div></div>' +
      '<div class="row"><button type="button" class="btn btn--ghost" id="omPrint"><svg><use href="#p-print"/></svg>Drukuj bon</button>' +
      '<span class="confirm" id="delWrap"><button type="button" class="btn btn--danger" id="omDel">Usuń zamówienie</button></span></div>';
    fillSlotSelect($('#mvSlot'), o.date, o.slot);
    openModal($('#orderModal'));
  }

  $('#omBody').addEventListener('click', async (e) => {
    const o = cur;
    if (!o) return;
    const s = e.target.closest('[data-set]');
    if (s) { const u = await setStatus(o.id, s.dataset.set); if (u) openOrder(u); return; }
    if (e.target.closest('#mvSave')) {
      try {
        const r = await Api.adm('order_update', {}, { id: o.id, date: $('#mvDate').value, slot: $('#mvSlot').value });
        upsert(r.order); openOrder(r.order); toast('Przesunięto na ' + r.order.slot);
      } catch (ex) { toast(ex.message, true); }
      return;
    }
    if (e.target.closest('#edSave')) {
      try {
        const r = await Api.adm('order_update', {}, { id: o.id, name: $('#edName').value, phone: $('#edPhone').value, notes: $('#edNotes').value });
        upsert(r.order); openOrder(r.order); toast('Zapisano');
      } catch (ex) { toast(ex.message, true); }
      return;
    }
    if (e.target.closest('#omPrint')) { printTicket(o); return; }
    if (e.target.closest('#omDel')) {
      $('#delWrap').innerHTML = 'Na pewno usunąć? <button type="button" class="btn btn--danger btn--sm" id="omDelYes">Tak, usuń</button><button type="button" class="btn btn--ghost btn--sm" id="omDelNo">Nie</button>';
      return;
    }
    if (e.target.closest('#omDelNo')) { openOrder(o); return; }
    if (e.target.closest('#omDelYes')) {
      try {
        await Api.adm('order_delete', {}, { id: o.id });
        P.orders = P.orders.filter((x) => x.id !== o.id);
        delete P.byId[o.id];
        closeModal($('#orderModal'));
        toast('Usunięto ' + o.number);
        if (P.tab === 'live') renderLive();
        if (P.tab === 'cal') loadCal(true);
        if (P.tab === 'hist') loadHist();
      } catch (ex) { toast(ex.message, true); }
    }
  });
  $('#omBody').addEventListener('change', (e) => { if (e.target.id === 'mvDate') fillSlotSelect($('#mvSlot'), e.target.value, null); });

  async function fillSlotSelect(sel, date, keep) {
    sel.innerHTML = '<option>…</option>';
    try {
      const r = await Api.adm('slots', { date });
      if (!r.slots.length) { sel.innerHTML = '<option value="">lokal zamknięty</option>'; return r; }
      const firstFree = (r.slots.find((s) => s.state === 'free') || r.slots[0]).t;
      const pick = keep || firstFree;
      sel.innerHTML = r.slots.map((s) => '<option value="' + s.t + '"' + (s.t === pick ? ' selected' : '') + '>' + s.t + ' · ' + s.used + '/' + s.cap +
        (s.state === 'blocked' ? ' · zablokowany' : s.state === 'full' ? ' · pełny' : s.state === 'past' ? ' · minął' : '') + '</option>').join('');
      if (keep && !r.slots.some((s) => s.t === keep)) sel.insertAdjacentHTML('afterbegin', '<option value="' + keep + '" selected>' + keep + '</option>');
      sel._slots = r.slots;
      return r;
    } catch (ex) { sel.innerHTML = '<option value="">błąd</option>'; }
  }

  function printTicket(o) {
    const d = new Date(o.date + 'T12:00:00');
    $('#print').innerHTML = '<h1>STYLOWA ' + o.number + '</h1><div class="big">' + o.slot + ' · ' + (o.type === 'wynos' ? 'WYNOS' : 'NA MIEJSCU') + '</div>' +
      '<div>' + DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</div><hr>' +
      o.items.map((l) => '<div><b>' + l.qty + '× ' + esc(l.name) + '</b>' + (lineDesc(l) ? '<br>&nbsp;&nbsp;' + lineDesc(l) : '') + '</div>').join('') +
      (o.notes ? '<hr><div>UWAGI: ' + esc(o.notes) + '</div>' : '') +
      '<hr><div>' + esc(o.name) + ' ' + esc(o.phone) + '</div><div class="big">' + zl(o.total) + ' · ' + (o.payment === 'karta' ? 'KARTA' : 'GOTÓWKA') + '</div>';
    window.print();
  }

  // ============================================================ kalendarz
  async function loadCal(silent) {
    const tl = $('#timeline');
    if (!silent) tl.innerHTML = '<p class="cal-empty">Wczytuję…</p>';
    try {
      const [r, os] = await Promise.all([Api.adm('slots', { date: P.calDate }), Api.adm('orders', { date: P.calDate })]);
      os.orders.forEach((o) => { P.calOrders[o.id] = o; });
      renderCal(r);
    } catch (ex) { tl.innerHTML = '<p class="cal-empty">' + esc(ex.message) + '</p>'; }
  }

  function renderCal(r) {
    const today = Api.ymd(new Date());
    $('#dayStrip').innerHTML = r.days.map((d) => {
      const dt = new Date(d.date + 'T12:00:00');
      return '<button type="button" class="dchip' + (d.date === P.calDate ? ' on' : '') + (d.date === today ? ' today' : '') + (d.open ? '' : ' closed') + '" data-d="' + d.date + '">' +
        '<small>' + (d.date === today ? 'dziś' : DSHORT[dt.getDay()]) + '</small><b>' + dt.getDate() + '.' + Api.pad(dt.getMonth() + 1) + '</b><span>' + (d.open ? d.count + ' zam.' : 'zamknięte') + '</span></button>';
    }).join('');
    const dt = new Date(P.calDate + 'T12:00:00');
    $('#calTitle').textContent = (P.calDate === today ? 'Dziś, ' : '') + DAYS[dt.getDay()] + ' ' + dt.getDate() + ' ' + MONTHS[dt.getMonth()];
    $('#calHours').textContent = r.hours ? 'otwarte ' + r.hours[0] + '–' + r.hours[1] : 'lokal zamknięty w tym dniu';
    $('#dayBlock').checked = r.dayBlocked;
    const tl = $('#timeline');
    if (!r.slots.length) { tl.innerHTML = '<p class="cal-empty">W tym dniu lokal jest zamknięty. Godziny zmienisz w Ustawieniach.</p>'; return; }
    const nm = nowMin();
    const step = +P.settings.slot_minutes || 15;
    tl.innerHTML = r.slots.map((s) => {
      const m = Api.toMin(s.t);
      const isNow = P.calDate === today && nm >= m && nm < m + step;
      const pct = Math.min(100, Math.round((s.used / s.cap) * 100));
      const orders = s.orders.map((id) => P.calOrders[id]).filter(Boolean);
      return '<div class="tl' + (s.state === 'past' ? ' past' : '') + (s.state === 'blocked' ? ' blocked' : '') + (isNow ? ' now' : '') + (s.t.endsWith(':00') ? ' hour' : '') + '">' +
        '<span class="tl__t">' + s.t + '</span>' +
        '<div class="load"><div class="load__bar"><i class="' + (s.used >= s.cap ? 'full' : '') + '" style="width:' + pct + '%"></i></div><small>' + s.used + ' / ' + s.cap + ' porcji</small></div>' +
        '<div class="tl__orders">' + (s.state === 'blocked' ? '<span class="blocked-note">' + (r.dayBlocked ? 'Dzień zablokowany' : 'Slot zablokowany dla zamówień online') + '</span>' : '') +
        orders.map((o) => '<button type="button" class="ochip' + (o.status === 'anulowane' ? ' cancel' : '') + '" data-s="' + o.status + '" data-id="' + o.id + '"><b>' + o.number + '</b><span>' + esc(o.name) + ' · ' + o.portions + ' por.</span></button>').join('') + '</div>' +
        '<div class="tl__act"><button type="button" class="ibtn" data-add="' + s.t + '" title="Dodaj zamówienie na ' + s.t + '"><svg><use href="#p-plus"/></svg></button>' +
        (r.dayBlocked ? '' : '<button type="button" class="ibtn' + (s.blocked ? ' on' : '') + '" data-lock="' + s.t + '" data-on="' + (s.blocked ? 0 : 1) + '" title="' + (s.blocked ? 'Odblokuj' : 'Zablokuj') + ' slot"><svg><use href="#p-' + (s.blocked ? 'lock' : 'unlock') + '"/></svg></button>') + '</div></div>';
    }).join('');
    const nowRow = $('.tl.now', tl);
    if (nowRow && !renderCal.scrolled) { renderCal.scrolled = true; nowRow.scrollIntoView({ block: 'center' }); }
  }

  $('#dayStrip').addEventListener('click', (e) => { const b = e.target.closest('.dchip'); if (!b) return; P.calDate = b.dataset.d; loadCal(); });
  $('#calPrev').addEventListener('click', () => { P.calDate = Api.addDays(P.calDate, -7); loadCal(); });
  $('#calNext').addEventListener('click', () => { P.calDate = Api.addDays(P.calDate, 7); loadCal(); });
  $('#dayBlock').addEventListener('change', async (e) => {
    try { await Api.adm('block', {}, { date: P.calDate, slot: '*', on: e.target.checked }); toast(e.target.checked ? 'Dzień zablokowany dla zamówień online' : 'Dzień odblokowany'); loadCal(true); } catch (ex) { toast(ex.message, true); }
  });
  $('#timeline').addEventListener('click', async (e) => {
    const chip = e.target.closest('.ochip');
    if (chip) { openOrder(P.calOrders[+chip.dataset.id]); return; }
    const add = e.target.closest('[data-add]');
    if (add) { P.t.date = P.calDate; P.t.slot = add.dataset.add; go('new'); return; }
    const lock = e.target.closest('[data-lock]');
    if (lock) {
      try { await Api.adm('block', {}, { date: P.calDate, slot: lock.dataset.lock, on: lock.dataset.on === '1' }); loadCal(true); } catch (ex) { toast(ex.message, true); }
    }
  });

  // ============================================================ nowe zamówienie (telefon / kasa)
  let posCat = null;
  function renderPos() {
    const food = P.cats.filter((c) => !c.extras && c.items.length);
    if (!posCat || !food.some((c) => c.id === posCat)) posCat = (food[0] || {}).id;
    $('#posCats').innerHTML = food.map((c) => '<button type="button" data-c="' + c.id + '" class="' + (c.id === posCat ? 'on' : '') + '">' + esc(c.name) + '</button>').join('');
    const cat = food.find((c) => c.id === posCat);
    $('#posItems').innerHTML = cat ? cat.items.map((i) => '<button type="button" class="pitem' + (i.active ? '' : ' off') + '" data-id="' + i.id + '"><b>' + esc(i.name) + '</b><span>' + zl(i.price) + (i.active ? '' : ' · niedostępne') + '</span></button>').join('') : '';
    if (!$('#tDate').value || P.t.date) { $('#tDate').value = P.t.date || Api.ymd(new Date()); }
    tSlots(P.t.slot);
    P.t.date = null; P.t.slot = null;
    renderTicket();
  }
  $('#posCats').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; posCat = b.dataset.c; renderPos(); });
  $('#posItems').addEventListener('click', (e) => {
    const b = e.target.closest('.pitem');
    if (!b) return;
    const it = P.items[b.dataset.id];
    if (it.cat.opts && (P.options.length || P.extras.length)) openOpts(it);
    else addLine({ id: it.id, qty: 1, opts: {}, extras: [], note: '' });
  });

  const OP = { id: null, opts: {}, extras: new Set() };
  function openOpts(it) {
    OP.id = it.id; OP.opts = {}; OP.extras = new Set();
    P.options.forEach((g) => { OP.opts[g.name] = g.choices[0]; });
    $('#opTitle').textContent = it.name + ' · ' + zl(it.price);
    $('#opBody').innerHTML = P.options.map((g) => '<div class="optg"><h4>' + esc(g.name) + '</h4><div class="pills" data-g="' + esc(g.name) + '">' +
      g.choices.map((v, i) => '<button type="button" class="pill' + (i === 0 ? ' on' : '') + '" data-v="' + esc(v) + '">' + esc(v) + '</button>').join('') + '</div></div>').join('') +
      (P.extras.length ? '<div class="optg"><h4>Dodatki</h4><div class="pills" data-g="__x">' + P.extras.map((x) => '<button type="button" class="pill" data-v="' + x.id + '">' + esc(x.name) + ' +' + zl(x.price) + '</button>').join('') + '</div></div>' : '') +
      '<label class="f"><span>Uwagi do dania</span><input id="opNote" maxlength="120"></label>';
    openModal($('#optModal'));
  }
  $('#opBody').addEventListener('click', (e) => {
    const b = e.target.closest('.pill');
    if (!b) return;
    const g = b.parentElement.dataset.g;
    if (g === '__x') { b.classList.toggle('on'); b.classList.contains('on') ? OP.extras.add(b.dataset.v) : OP.extras.delete(b.dataset.v); return; }
    $$('.pill', b.parentElement).forEach((x) => x.classList.toggle('on', x === b));
    OP.opts[g] = b.dataset.v;
  });
  $('#opAdd').addEventListener('click', () => {
    addLine({ id: OP.id, qty: 1, opts: Object.assign({}, OP.opts), extras: [...OP.extras], note: $('#opNote').value.trim() });
    closeModal($('#optModal'));
  });

  function addLine(l) {
    const key = (x) => x.id + JSON.stringify(x.opts) + x.extras.slice().sort().join() + x.note;
    const ex = P.t.lines.find((x) => key(x) === key(l));
    if (ex) ex.qty++; else P.t.lines.push(l);
    renderTicket();
  }
  function unit(l) { let p = P.items[l.id].price; l.extras.forEach((e) => { const x = P.extras.find((y) => y.id === e); if (x) p += x.price; }); return p; }
  function ticketTotals() {
    let sub = 0, pack = 0, dep = 0, portions = 0;
    P.t.lines.forEach((l) => {
      const it = P.items[l.id];
      sub += unit(l) * l.qty;
      dep += it.deposit * l.qty;
      if (it.cat.food) { portions += l.qty; if (P.t.type === 'wynos') pack += (+P.settings.packaging_fee || 0) * l.qty; }
    });
    return { sub, pack, dep, total: sub + pack + dep, portions };
  }
  function renderTicket() {
    const ul = $('#tLines');
    ul.innerHTML = P.t.lines.length ? P.t.lines.map((l, i) => {
      const it = P.items[l.id];
      const desc = Object.values(l.opts).concat(l.extras.map((e) => '+' + ((P.extras.find((x) => x.id === e) || {}).name || e))).concat(l.note ? ['„' + l.note + '”'] : []).map(esc).join(', ');
      return '<li class="tline"><div class="q"><button type="button" data-i="' + i + '" data-q="-1" aria-label="Mniej"><svg><use href="#p-minus"/></svg></button><output>' + l.qty + '</output><button type="button" data-i="' + i + '" data-q="1" aria-label="Więcej"><svg><use href="#p-plus"/></svg></button></div>' +
        '<span>' + esc(it.name) + '</span><span class="p">' + zl(unit(l) * l.qty) + '</span>' + (desc ? '<small>' + desc + '</small>' : '') + '</li>';
    }).join('') : '<li class="empty">Dotknij pozycji z menu, żeby dodać.</li>';
    const t = ticketTotals();
    $('#tSum').innerHTML = '<dt>Pozycje</dt><dd>' + zl(t.sub) + '</dd>' + (t.pack ? '<dt>Opakowania</dt><dd>' + zl(t.pack) + '</dd>' : '') + (t.dep ? '<dt>Kaucja</dt><dd>' + zl(t.dep) + '</dd>' : '') +
      '<dt class="tot">Razem</dt><dd class="tot">' + zl(t.total) + '</dd>';
    $$('#srcSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === P.t.src));
    $$('#typeSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === P.t.type));
    $$('#paySeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === P.t.pay));
    slotInfo();
  }
  $('#tLines').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]');
    if (!b) return;
    const l = P.t.lines[+b.dataset.i];
    l.qty += +b.dataset.q;
    if (l.qty < 1) P.t.lines.splice(+b.dataset.i, 1);
    renderTicket();
  });
  [['#srcSeg', 'src'], ['#typeSeg', 'type'], ['#paySeg', 'pay']].forEach(([sel, k]) => $(sel).addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    P.t[k] = b.dataset.v;
    if (k === 'src' && b.dataset.v === 'lokal') { P.t.type = 'na_miejscu'; tSlots(nearestSlotNow()); }
    renderTicket();
  }));
  function nearestSlotNow() {
    const step = +P.settings.slot_minutes || 15;
    const m = Math.ceil(nowMin() / step) * step;
    return Api.fromMin(m);
  }
  $('#tDate').addEventListener('change', () => tSlots(null));
  $('#tSlot').addEventListener('change', slotInfo);
  async function tSlots(keep) {
    const sel = $('#tSlot');
    const r = await fillSlotSelect(sel, $('#tDate').value, keep);
    if (!keep && r && sel._slots) {
      const f = sel._slots.find((s) => s.state === 'free');
      if (f) sel.value = f.t;
    }
    slotInfo();
  }
  function slotInfo() {
    const sel = $('#tSlot');
    const info = $('#tSlotInfo');
    const s = (sel._slots || []).find((x) => x.t === sel.value);
    if (!s) { info.textContent = ''; return; }
    const t = ticketTotals();
    const after = s.used + t.portions;
    info.classList.toggle('warn2', after > s.cap || s.state === 'blocked');
    info.textContent = 'Obłożenie slotu po zapisaniu: ' + after + ' / ' + s.cap + ' porcji' + (after > s.cap ? ' — przekroczysz pojemność kuchni' : '') + (s.state === 'blocked' ? ' · slot zablokowany dla online' : '');
  }

  $('#ticket').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#tErr');
    err.hidden = true;
    if (!P.t.lines.length) { err.textContent = 'Dodaj co najmniej jedną pozycję.'; err.hidden = false; return; }
    if (!$('#tSlot').value) { err.textContent = 'Wybierz godzinę odbioru.'; err.hidden = false; return; }
    const btn = $('#tSave');
    btn.disabled = true;
    try {
      const r = await Api.adm('order_create', {}, {
        source: P.t.src, type: P.t.type, payment: P.t.pay, name: $('#tName').value.trim(), phone: $('#tPhone').value.trim(),
        date: $('#tDate').value, slot: $('#tSlot').value, notes: $('#tNotes').value.trim(),
        items: P.t.lines.map((l) => ({ id: l.id, qty: l.qty, opts: l.opts, extras: l.extras, note: l.note })),
      });
      P.t.lines = [];
      $('#tName').value = ''; $('#tPhone').value = ''; $('#tNotes').value = '';
      upsert(r.order);
      P.latest = Math.max(P.latest || 0, r.order.id);
      toast('Zapisano ' + r.order.number + ' na ' + r.order.slot);
      tSlots(null);
      renderTicket();
    } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    btn.disabled = false;
  });

  // ============================================================ historia
  function initHist() {
    if ($('#hFrom').value) return;
    const today = Api.ymd(new Date());
    $('#hFrom').value = Api.addDays(today, -6);
    $('#hTo').value = Api.addDays(today, 2);
    $('#hStatus').innerHTML = '<option value="">wszystkie</option>' + Api.STATUSES.map((s) => '<option value="' + s + '">' + L[s] + '</option>').join('');
  }
  async function loadHist() {
    initHist();
    const p = { from: $('#hFrom').value, to: $('#hTo').value };
    if ($('#hStatus').value) p.status = $('#hStatus').value;
    if ($('#hQ').value.trim()) p.q = $('#hQ').value.trim();
    try {
      const [r, st] = await Promise.all([Api.adm('orders', p), Api.adm('stats', { from: p.from, to: p.to })]);
      r.orders.forEach((o) => { P.calOrders[o.id] = o; });
      $('#histTable tbody').innerHTML = r.orders.length ? r.orders.map((o) => '<tr data-id="' + o.id + '"><td><b>' + o.number + '</b></td><td>' + o.date.slice(5).split('-').reverse().join('.') + '</td><td>' + o.slot + '</td>' +
        '<td>' + esc(o.name) + '<br><small>' + esc(o.phone) + '</small></td><td>' + o.items.map((l) => l.qty + '× ' + esc(l.name)).join(', ') + '</td>' +
        '<td><span class="tag tag--' + o.source + '">' + SRC[o.source] + '</span></td><td><span class="st" data-s="' + o.status + '">' + L[o.status] + '</span></td><td class="r">' + zl(o.total) + '</td></tr>').join('')
        : '<tr><td colspan="8" class="muted" style="text-align:center;padding:30px">Brak zamówień dla tych filtrów.</td></tr>';
      const max = Math.max(1, ...st.top.map((t) => t.qty));
      const srcTotal = Math.max(1, st.sources.online + st.sources.telefon + st.sources.lokal);
      $('#stats').innerHTML =
        '<div class="stat"><h4>Utarg w okresie</h4><div class="big">' + zl(st.sum) + '</div><span class="muted">' + st.count + ' zamówień · średnio ' + zl(st.count ? Math.round(st.sum / st.count) : 0) + '</span></div>' +
        '<div class="stat"><h4>Skąd zamówienia</h4><div class="hbars">' + ['online', 'telefon', 'lokal'].map((k) => '<div class="hbar"><div><i style="width:' + Math.round(st.sources[k] / srcTotal * 100) + '%"></i>' + SRC[k] + '</div><b>' + st.sources[k] + '</b></div>').join('') + '</div></div>' +
        '<div class="stat"><h4>Najczęściej zamawiane</h4><div class="hbars">' + (st.top.length ? st.top.slice(0, 5).map((t) => '<div class="hbar"><div><i style="width:' + Math.round(t.qty / max * 100) + '%"></i>' + esc(t.name) + '</div><b>' + t.qty + '</b></div>').join('') : '<span class="muted">brak danych</span>') + '</div></div>';
    } catch (ex) { toast(ex.message, true); }
  }
  $('#histForm').addEventListener('submit', (e) => { e.preventDefault(); loadHist(); });
  $('#histTable').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) openOrder(P.calOrders[+tr.dataset.id]); });

  // ============================================================ menu
  function renderMenuEdit() {
    $('#menuEdit').innerHTML = P.cats.map((c) => '<section class="mcat" data-cat="' + c.id + '"><header><h3>' + esc(c.name) + '</h3><button type="button" class="btn btn--ghost btn--sm" data-addrow="' + c.id + '"><svg><use href="#p-plus"/></svg>Dodaj pozycję</button></header>' +
      '<div class="mrow mhead"><span>Nazwa</span><span class="msize">Rozmiar</span><span>Cena (zł)</span><span class="mdep">Kaucja</span><span>Dostępne</span><span></span></div>' +
      c.items.map((i) => mrow(c.id, i)).join('') + '</section>').join('');
  }
  function mrow(cat, i) {
    return '<div class="mrow' + (i.active ? '' : ' off') + '" data-id="' + esc(i.id || '') + '" data-cat="' + cat + '">' +
      '<input data-k="name" value="' + esc(i.name) + '" aria-label="Nazwa" placeholder="Nazwa">' +
      '<input class="msize" data-k="size" value="' + esc(i.size) + '" aria-label="Rozmiar" placeholder="np. Duża">' +
      '<input data-k="price" type="number" step="0.5" min="0" value="' + (i.price / 100) + '" aria-label="Cena">' +
      '<input class="mdep" data-k="deposit" type="number" step="0.5" min="0" value="' + ((i.deposit || 0) / 100) + '" aria-label="Kaucja">' +
      '<label class="switch" title="Dostępne"><input type="checkbox" data-k="active"' + (i.active ? ' checked' : '') + '><span class="switch__ui"></span></label>' +
      '<span class="row"><button type="button" class="btn btn--gold btn--sm" data-save disabled>Zapisz</button><button type="button" class="ibtn" data-del title="Usuń"><svg><use href="#p-x"/></svg></button></span></div>';
  }
  $('#menuEdit').addEventListener('input', (e) => {
    const row = e.target.closest('.mrow');
    if (!row) return;
    row.classList.add('dirty');
    $('[data-save]', row).disabled = false;
    if (e.target.dataset.k === 'active') row.classList.toggle('off', !e.target.checked);
  });
  $('#menuEdit').addEventListener('click', async (e) => {
    const add = e.target.closest('[data-addrow]');
    if (add) {
      const sec = add.closest('.mcat');
      sec.insertAdjacentHTML('beforeend', mrow(add.dataset.addrow, { id: '', name: '', size: '', price: 0, deposit: 0, active: true }));
      $('.mrow:last-child input', sec).focus();
      return;
    }
    const row = e.target.closest('.mrow');
    if (!row) return;
    if (e.target.closest('[data-save]')) {
      const v = (k) => $('[data-k="' + k + '"]', row);
      try {
        const r = await Api.adm('item_save', {}, { item: { id: row.dataset.id, cat: row.dataset.cat, name: v('name').value, size: v('size').value, price: v('price').value, deposit: v('deposit').value, active: v('active').checked } });
        setMenu(r.categories);
        renderMenuEdit();
        toast('Zapisano pozycję menu');
      } catch (ex) { toast(ex.message, true); }
      return;
    }
    const del = e.target.closest('[data-del]');
    if (del) {
      if (!row.dataset.id) { row.remove(); return; }
      if (!del.classList.contains('armed')) { del.classList.add('armed', 'on'); del.title = 'Kliknij ponownie, aby usunąć'; toast('Kliknij jeszcze raz, aby usunąć pozycję'); setTimeout(() => { del.classList.remove('armed', 'on'); }, 3000); return; }
      try { const r = await Api.adm('item_delete', {}, { id: row.dataset.id }); setMenu(r.categories); renderMenuEdit(); toast('Usunięto pozycję'); } catch (ex) { toast(ex.message, true); }
    }
  });

  // ============================================================ ustawienia
  function renderSettings() {
    const s = P.settings;
    $('#sSlot').value = s.slot_minutes; $('#sCap').value = s.slot_capacity; $('#sLead').value = s.lead_minutes;
    $('#sDays').value = s.days_ahead; $('#sPack').value = (+s.packaging_fee || 0) / 100; $('#sPhone').value = s.phone || '';
    $('#sOpts').value = s.option_groups || ''; $('#sNotice').value = s.notice || '';
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('#sHours').innerHTML = order.map((d) => {
      const h = s.hours[d];
      return '<div class="hrow' + (h ? '' : ' closed') + '" data-d="' + d + '"><b>' + DAYS[d] + '</b><input type="time" data-o value="' + (h ? h[0] : '10:00') + '" aria-label="Otwarcie"><input type="time" data-c value="' + (h ? h[1] : '22:00') + '" aria-label="Zamknięcie">' +
        '<label><input type="checkbox" data-x' + (h ? '' : ' checked') + '> nieczynne</label></div>';
    }).join('');
  }
  $('#sHours').addEventListener('change', (e) => { const r = e.target.closest('.hrow'); if (r && e.target.dataset.x !== undefined) r.classList.toggle('closed', e.target.checked); });
  $('#setForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hours = {};
    $$('#sHours .hrow').forEach((r) => { hours[r.dataset.d] = $('[data-x]', r).checked ? null : [$('[data-o]', r).value, $('[data-c]', r).value]; });
    const settings = {
      slot_minutes: +$('#sSlot').value, slot_capacity: +$('#sCap').value, lead_minutes: +$('#sLead').value, days_ahead: +$('#sDays').value,
      packaging_fee: Math.round(parseFloat($('#sPack').value || '0') * 100), phone: $('#sPhone').value, option_groups: $('#sOpts').value, notice: $('#sNotice').value, hours,
    };
    try {
      await Api.adm('settings_save', {}, { settings });
      await loadBootstrap();
      renderSettings();
      toast('Ustawienia zapisane');
    } catch (ex) { toast(ex.message, true); }
  });
  $('#passForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await Api.adm('password', {}, { current: $('#pCur').value, next: $('#pNew').value });
      $('#pCur').value = ''; $('#pNew').value = '';
      $('#warnPass').hidden = true;
      toast('Hasło zmienione');
    } catch (ex) { toast(ex.message, true); }
  });
  $('#demoReset').addEventListener('click', () => { Api.resetDemo(); location.reload(); });

  // ============================================================ okna i komunikaty
  function openModal(m) { m.hidden = false; setTimeout(() => { const b = $('[data-close].ibtn', m); if (b) b.focus(); }, 30); }
  function closeModal(m) { m.hidden = true; }
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(m); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.modal:not([hidden])').forEach(closeModal); });

  let tt = null;
  function toast(msg, bad) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('bad', !!bad);
    t.classList.add('show');
    clearTimeout(tt);
    tt = setTimeout(() => t.classList.remove('show'), 2600);
  }
})();
