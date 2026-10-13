/*
 * Stylowa Kebab — klient API.
 * Na hostingu rozmawia z api/*.php. Gdy PHP nie odpowiada (np. podgląd pliku bez serwera),
 * przełącza się w tryb DEMO, który działa w przeglądarce (localStorage) i zachowuje się tak samo.
 */
(function () {
  'use strict';

  const DEMO_KEY = 'stylowa_demo_v1';
  const DEMO_PASS = 'stylowa2026';
  const STATUSES = ['nowe', 'przyjete', 'przygotowanie', 'gotowe', 'wydane', 'anulowane'];
  const DEFAULT_HOURS = { 1: ['10:00', '22:00'], 2: ['10:00', '22:00'], 3: ['10:00', '22:00'], 4: ['10:00', '22:00'], 5: ['10:00', '23:00'], 6: ['10:00', '23:00'], 0: ['13:00', '21:00'] };

  class ApiError extends Error {
    constructor(msg, status) { super(msg); this.status = status || 400; }
  }

  // ------------------------------------------------------------ pomocnicze
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (dateStr, n) => { const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const fromMin = (m) => pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60);
  const nowStr = () => { const d = new Date(); return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const nowFull = () => { const d = new Date(); return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); };
  const rnd = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* tryb prywatny */ } },
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return memSS[k] || null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { memSS[k] = v; } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { delete memSS[k]; } },
  };
  const memSS = {};

  // ------------------------------------------------------------ backend demo
  const Demo = {
    db: null,

    async load(base) {
      let db = store.get(DEMO_KEY);
      if (!db || !db.categories) {
        const res = await fetch(base + 'assets/data/menu.json');
        const seed = await res.json();
        db = {
          settings: {
            ordering_enabled: '1', slot_minutes: '15', slot_capacity: '8', lead_minutes: '20', days_ahead: '2',
            packaging_fee: '100', hours: DEFAULT_HOURS, option_groups: seed.optionGroups || '', notice: '', phone: '+48 698 563 103',
          },
          categories: seed.categories.map((c, ci) => ({
            id: c.id, name: c.name, desc: c.desc || '', icon: c.icon || '', food: !!c.food, opts: !!c.opts, adult: !!c.adult,
            extras: !!c.extras, sort: ci,
            items: c.items.map((it, ii) => ({ id: it.id, name: it.name, size: it.size || '', price: Math.round(it.price * 100), deposit: Math.round((it.deposit || 0) * 100), active: true, sort: ii })),
          })),
          orders: [], blocks: {}, nextId: 1, adminPass: null,
        };
        this.db = db;
        this.seedExamples();
        this.save();
      }
      this.db = db;
    },

    save() { store.set(DEMO_KEY, this.db); },

    // Kilka przykładowych zamówień na dziś, żeby panel nie był pusty w podglądzie.
    seedExamples() {
      const today = ymd(new Date());
      const slots = this.daySlots(today, false).filter((s) => toMin(s.t) >= toMin(fromMin(new Date().getHours() * 60 + new Date().getMinutes())) + 15);
      const pick = (i) => (slots[i] || slots[slots.length - 1] || { t: '18:00' }).t;
      const ex = [
        { name: 'Anna (przykład)', phone: '600100200', type: 'wynos', slot: pick(0), status: 'nowe', items: [{ id: 'pita-duza', qty: 2, opts: { 'Mięso': 'kurczak', Sos: 'czosnkowy' }, extras: ['feta'] }, { id: 'napoj-05', qty: 2 }] },
        { name: 'Tomek (przykład)', phone: '511222333', type: 'na_miejscu', slot: pick(1), status: 'przyjete', source: 'telefon', items: [{ id: 'kapsalon-duzy', qty: 1, opts: { 'Mięso': 'mieszane', Sos: 'ostry' } }, { id: 'piwo-duze', qty: 1 }] },
        { name: 'Kasia (przykład)', phone: '722333444', type: 'wynos', slot: pick(1), status: 'przygotowanie', items: [{ id: 'box-sredni', qty: 3, opts: { 'Mięso': 'kurczak', Sos: 'łagodny' } }] },
        { name: 'Marek (przykład)', phone: '698000111', type: 'wynos', slot: pick(4), status: 'nowe', items: [{ id: 'lawasz-duzy', qty: 1, opts: { 'Mięso': 'wołowina', Sos: 'mieszany' }, extras: ['jalapeno', 'ser-zolty'] }, { id: 'frytki-duze', qty: 1 }] },
      ];
      ex.forEach((o) => {
        try { this.createOrder(Object.assign({ date: today, payment: 'gotowka', source: o.source || 'online' }, o), true, true); } catch (e) { /* poza godzinami */ }
      });
    },

    s(k) { return this.db.settings[k]; },

    optionGroups() {
      return String(this.s('option_groups') || '').split(/\r?\n/).map((line) => {
        const i = line.indexOf(':');
        if (i < 0) return null;
        const name = line.slice(0, i).trim();
        const choices = line.slice(i + 1).split(',').map((x) => x.trim()).filter(Boolean);
        return name && choices.length ? { name, choices } : null;
      }).filter(Boolean);
    },

    publicSettings() {
      return {
        ordering: this.s('ordering_enabled') === '1', hours: this.s('hours'), slotMinutes: +this.s('slot_minutes'),
        slotCapacity: +this.s('slot_capacity'), leadMinutes: +this.s('lead_minutes'), daysAhead: +this.s('days_ahead'),
        packagingFee: +this.s('packaging_fee'), notice: this.s('notice'), phone: this.s('phone'),
      };
    },

    menu(withInactive) {
      return this.db.categories.slice().sort((a, b) => a.sort - b.sort).map((c) => Object.assign({}, c, {
        items: c.items.filter((i) => withInactive || i.active).slice().sort((a, b) => a.sort - b.sort || a.price - b.price),
      }));
    },

    dayHours(date) {
      const w = new Date(date + 'T12:00:00').getDay();
      const h = this.s('hours')[w];
      return Array.isArray(h) && h[0] && h[1] ? h : null;
    },

    daySlots(date, forPublic) {
      const hours = this.dayHours(date);
      if (!hours) return [];
      const step = Math.max(5, +this.s('slot_minutes'));
      const cap = Math.max(1, +this.s('slot_capacity'));
      const lead = forPublic ? +this.s('lead_minutes') : 0;
      const used = {}, ids = {};
      this.db.orders.filter((o) => o.date === date && o.status !== 'anulowane').forEach((o) => {
        used[o.slot] = (used[o.slot] || 0) + o.portions;
        (ids[o.slot] = ids[o.slot] || []).push(o.id);
      });
      const bl = this.db.blocks[date] || {};
      const today = ymd(new Date());
      const n = new Date();
      const nowMin = date === today ? n.getHours() * 60 + n.getMinutes() : (date < today ? 100000 : -1);
      const open = toMin(hours[0]);
      let close = toMin(hours[1]);
      if (close <= open) close += 1440;
      const out = [];
      for (let m = open; m <= close - step; m += step) {
        const t = fromMin(m % 1440);
        const u = used[t] || 0;
        let state = 'free';
        if (bl['*'] || bl[t]) state = 'blocked';
        else if (m < nowMin + lead) state = 'past';
        else if (u >= cap) state = 'full';
        out.push({ t, state, used: u, cap, left: Math.max(0, cap - u), blocked: !!bl[t], orders: ids[t] || [] });
      }
      return out;
    },

    accepts(slot, portions) { return slot.state === 'free' && (slot.used === 0 || slot.used + portions <= slot.cap); },

    orderDays() {
      const n = Math.max(0, Math.min(14, +this.s('days_ahead')));
      const today = ymd(new Date());
      const out = [];
      for (let i = 0; i <= n; i++) { const d = addDays(today, i); out.push({ date: d, open: !!this.dayHours(d), hours: this.dayHours(d) }); }
      return out;
    },

    priceCart(cart, type) {
      if (!cart || !cart.length) throw new ApiError('Koszyk jest pusty.');
      const items = {}, extras = {};
      this.db.categories.forEach((c) => c.items.forEach((i) => { items[i.id] = Object.assign({ cat: c }, i); if (c.extras) extras[i.id] = i; }));
      const groups = {};
      this.optionGroups().forEach((g) => { groups[g.name] = g.choices; });
      const pack = +this.s('packaging_fee');
      let total = 0, portions = 0;
      const lines = cart.map((row) => {
        const it = items[row.id];
        const qty = parseInt(row.qty, 10);
        if (!it || it.cat.extras) throw new ApiError('Pozycja nie istnieje w menu.');
        if (!it.active) throw new ApiError('„' + it.name + '” jest chwilowo niedostępne.');
        if (!(qty >= 1 && qty <= 30)) throw new ApiError('Nieprawidłowa ilość dla „' + it.name + '”.');
        let unit = it.price;
        const opts = {}, ex = [];
        if (it.cat.opts) {
          Object.entries(row.opts || {}).forEach(([g, v]) => { if (groups[g] && groups[g].includes(v)) opts[g] = v; });
          [...new Set(row.extras || [])].forEach((eid) => {
            if (!extras[eid] || !extras[eid].active) return;
            ex.push({ id: eid, name: extras[eid].name, price: extras[eid].price });
            unit += extras[eid].price;
          });
        }
        const food = it.cat.food;
        let line = unit * qty + it.deposit * qty;
        if (type === 'wynos' && food) line += pack * qty;
        if (food) portions += qty;
        total += line;
        return { id: it.id, name: it.name, qty, unit, deposit: it.deposit, packaging: type === 'wynos' && food ? pack : 0, opts, extras: ex, note: String(row.note || '').slice(0, 120), line, food };
      });
      return { lines, total, portions };
    },

    createOrder(inp, manual, silentSeed) {
      let name = String(inp.name || '').trim();
      const phone = String(inp.phone || '').replace(/[^\d+]/g, '');
      const type = inp.type === 'na_miejscu' ? 'na_miejscu' : 'wynos';
      const source = manual ? (['telefon', 'lokal', 'online'].includes(inp.source) && silentSeed ? inp.source : (['telefon', 'lokal'].includes(inp.source) ? inp.source : 'telefon')) : 'online';
      if (!manual) {
        if (this.s('ordering_enabled') !== '1') throw new ApiError('Zamówienia online są chwilowo wstrzymane. Zadzwoń do nas: ' + this.s('phone'));
        if (name.length < 2 || name.length > 60) throw new ApiError('Podaj imię (2–60 znaków).');
        if (phone.replace(/\D/g, '').length < 9) throw new ApiError('Podaj poprawny numer telefonu.');
        if (!this.orderDays().some((d) => d.date === inp.date)) throw new ApiError('Ten dzień nie jest dostępny do zamówień.');
      } else if (!name) name = source === 'lokal' ? 'Gość w lokalu' : 'Zamówienie telefoniczne';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(inp.date || '')) throw new ApiError('Wybierz dzień odbioru.');
      if (!/^\d{2}:\d{2}$/.test(inp.slot || '')) throw new ApiError('Wybierz godzinę odbioru.');
      const { lines, total, portions } = this.priceCart(inp.items, type);
      if (!manual) {
        const slot = this.daySlots(inp.date, true).find((s) => s.t === inp.slot);
        if (!slot) throw new ApiError('W tym dniu lub o tej godzinie lokal jest zamknięty.');
        if (slot.state === 'past') throw new ApiError('Na ' + inp.slot + ' nie zdążymy już przygotować zamówienia. Wybierz późniejszą godzinę.', 409);
        if (slot.state === 'blocked') throw new ApiError('Godzina ' + inp.slot + ' jest niedostępna. Wybierz inną.', 409);
        if (!this.accepts(slot, portions)) throw new ApiError('Godzina ' + inp.slot + ' właśnie się zapełniła. Wybierz inną.', 409);
      }
      const id = this.db.nextId++;
      const t = nowFull();
      const o = {
        id, number: '#' + String(id).padStart(3, '0'), token: rnd(12), createdAt: t, updatedAt: t, date: inp.date, slot: inp.slot,
        type, source, payment: inp.payment === 'karta' ? 'karta' : 'gotowka', name: name.slice(0, 60), phone,
        notes: String(inp.notes || '').slice(0, 400), status: manual && STATUSES.includes(inp.status) ? inp.status : (manual ? 'przyjete' : 'nowe'),
        total, portions, items: lines,
      };
      this.db.orders.push(o);
      this.save();
      return Object.assign({}, o);
    },

    authed() { return ss.get('stylowa_demo_auth') === '1'; },

    // Odwzorowanie akcji public.php
    pub(a, p, b) {
      switch (a) {
        case 'ping': return { ok: true, backend: 'demo', now: nowStr() };
        case 'menu': return { ok: true, categories: this.menu(false), options: this.optionGroups(), settings: this.publicSettings(), days: this.orderDays(), now: nowStr() };
        case 'slots': {
          const portions = Math.max(0, parseInt(p.portions || 1, 10));
          const slots = this.daySlots(p.date, true).map((s) => ({ t: s.t, state: s.state === 'free' && !this.accepts(s, portions) ? 'full' : s.state, left: s.left }));
          return { ok: true, date: p.date, slots, days: this.orderDays() };
        }
        case 'order': { const o = this.createOrder(b, false); delete o.id; return { ok: true, order: o }; }
        case 'status': {
          const o = this.db.orders.find((x) => x.token === p.token);
          if (!o) throw new ApiError('Nie znaleziono zamówienia.', 404);
          const c = Object.assign({}, o); delete c.id; return { ok: true, order: c };
        }
      }
      throw new ApiError('Nieznana akcja.', 404);
    },

    // Odwzorowanie akcji admin.php
    adm(a, p, b) {
      const db = this.db;
      if (a === 'me') return { ok: true, auth: this.authed(), csrf: 'demo', defaultPassword: !db.adminPass };
      if (a === 'login') {
        if (b.password !== (db.adminPass || DEMO_PASS)) throw new ApiError('Nieprawidłowe hasło.', 401);
        ss.set('stylowa_demo_auth', '1');
        return { ok: true, csrf: 'demo', defaultPassword: !db.adminPass };
      }
      if (!this.authed()) throw new ApiError('Zaloguj się ponownie.', 401);
      const today = ymd(new Date());
      const find = (id) => { const o = db.orders.find((x) => x.id === +id); if (!o) throw new ApiError('Nie ma takiego zamówienia.', 404); return o; };
      const sorted = (list) => list.slice().sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : x.slot.localeCompare(y.slot) || x.id - y.id));
      switch (a) {
        case 'logout': ss.del('stylowa_demo_auth'); return { ok: true };
        case 'bootstrap': {
          const s = Object.assign({}, db.settings);
          return { ok: true, categories: this.menu(true), options: this.optionGroups(), settings: s, now: nowStr(), today };
        }
        case 'orders': {
          let list = db.orders;
          if (p.date) list = list.filter((o) => o.date === p.date);
          if (p.from) list = list.filter((o) => o.date >= p.from);
          if (p.to) list = list.filter((o) => o.date <= p.to);
          if (p.status) list = list.filter((o) => o.status === p.status);
          if (p.q) { const q = p.q.toLowerCase(); const n = q.replace(/^#?0*/, ''); list = list.filter((o) => o.name.toLowerCase().includes(q) || o.phone.includes(q) || String(o.id) === n); }
          return { ok: true, orders: sorted(list).slice(0, 500) };
        }
        case 'poll': {
          const list = db.orders.filter((o) => (o.date >= today && !['wydane', 'anulowane'].includes(o.status)) || o.date === today)
            .sort((x, y) => (x.date + x.slot).localeCompare(y.date + y.slot) || x.id - y.id);
          return { ok: true, orders: list, latestId: db.nextId - 1, ordering: this.s('ordering_enabled') === '1', now: nowStr(), today };
        }
        case 'slots': {
          const days = [];
          for (let i = -1; i <= 6; i++) {
            const d = addDays(p.date, i);
            const os = db.orders.filter((o) => o.date === d && o.status !== 'anulowane');
            days.push({ date: d, count: os.length, sum: os.reduce((s, o) => s + o.total, 0), open: !!this.dayHours(d) });
          }
          return { ok: true, date: p.date, hours: this.dayHours(p.date), dayBlocked: !!(db.blocks[p.date] || {})['*'], slots: this.daySlots(p.date, false), days };
        }
        case 'order_create': return { ok: true, order: this.createOrder(b, true) };
        case 'order_update': {
          const o = find(b.id);
          if (b.status !== undefined) { if (!STATUSES.includes(b.status)) throw new ApiError('Nieznany status.'); o.status = b.status; }
          ['date', 'slot', 'name', 'notes', 'payment'].forEach((k) => { if (b[k] !== undefined) o[k] = String(b[k]); });
          if (b.phone !== undefined) o.phone = String(b.phone).replace(/[^\d+]/g, '');
          o.updatedAt = nowFull();
          this.save();
          return { ok: true, order: Object.assign({}, o) };
        }
        case 'order_delete': db.orders = db.orders.filter((o) => o.id !== +b.id); this.save(); return { ok: true };
        case 'block': {
          const d = (db.blocks[b.date] = db.blocks[b.date] || {});
          if (b.on) d[b.slot] = true; else delete d[b.slot];
          this.save();
          return { ok: true };
        }
        case 'item_save': {
          const it = b.item || {};
          const cat = db.categories.find((c) => c.id === it.cat);
          if (!cat) throw new ApiError('Nieznana kategoria.');
          if (!String(it.name || '').trim()) throw new ApiError('Podaj nazwę pozycji.');
          const price = Math.round(parseFloat(String(it.price).replace(',', '.')) * 100) || 0;
          const deposit = Math.round(parseFloat(String(it.deposit || 0).replace(',', '.')) * 100) || 0;
          let existing = null;
          db.categories.forEach((c) => { const i = c.items.findIndex((x) => x.id === it.id); if (i >= 0) { existing = c.items[i]; c.items.splice(i, 1); } });
          const rec = Object.assign(existing || { id: it.cat + '-' + rnd(3), sort: 999 }, { name: it.name.trim(), size: String(it.size || '').trim(), price, deposit, active: !!it.active });
          cat.items.push(rec);
          this.save();
          return { ok: true, categories: this.menu(true) };
        }
        case 'item_delete': db.categories.forEach((c) => { c.items = c.items.filter((x) => x.id !== b.id); }); this.save(); return { ok: true, categories: this.menu(true) };
        case 'settings_save': {
          const s = b.settings || {};
          Object.keys(s).forEach((k) => {
            if (k === 'hours') db.settings.hours = s.hours;
            else if (k === 'ordering_enabled') db.settings.ordering_enabled = s[k] ? '1' : '0';
            else db.settings[k] = String(s[k]);
          });
          this.save();
          return { ok: true };
        }
        case 'password':
          if (b.current !== (db.adminPass || DEMO_PASS)) throw new ApiError('Obecne hasło jest nieprawidłowe.');
          if (String(b.next || '').length < 8) throw new ApiError('Nowe hasło musi mieć co najmniej 8 znaków.');
          db.adminPass = b.next; this.save(); return { ok: true };
        case 'stats': {
          const from = p.from, to = p.to;
          const list = db.orders.filter((o) => o.date >= from && o.date <= to && o.status !== 'anulowane');
          const byDay = {}, top = {}, sources = { online: 0, telefon: 0, lokal: 0 };
          list.forEach((o) => {
            byDay[o.date] = (byDay[o.date] || 0) + o.total;
            sources[o.source] = (sources[o.source] || 0) + 1;
            o.items.forEach((l) => { top[l.name] = (top[l.name] || 0) + l.qty; });
          });
          return {
            ok: true, count: list.length, sum: list.reduce((s, o) => s + o.total, 0), byDay, sources,
            top: Object.entries(top).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([name, qty]) => ({ name, qty })),
          };
        }
      }
      throw new ApiError('Nieznana akcja.', 404);
    },

    reset() { try { localStorage.removeItem(DEMO_KEY); } catch (e) { /* */ } },
  };

  // ------------------------------------------------------------ klient
  const Api = {
    mode: null,
    base: '',
    csrf: '',
    ApiError,

    async init(base) {
      this.base = base || '';
      if (this.mode) return this.mode;
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 4000);
        const res = await fetch(this.base + 'api/public.php?a=ping', { signal: ctl.signal, cache: 'no-store' });
        clearTimeout(timer);
        const j = await res.json();
        if (j && j.backend === 'php') { this.mode = 'php'; return this.mode; }
      } catch (e) { /* brak PHP — tryb demo */ }
      await Demo.load(this.base);
      this.mode = 'demo';
      return this.mode;
    },

    async call(scope, action, params, body) {
      params = params || {};
      if (this.mode === 'demo') {
        await new Promise((r) => setTimeout(r, 120));
        return scope === 'admin' ? Demo.adm(action, params, body || {}) : Demo.pub(action, params, body || {});
      }
      const qs = new URLSearchParams(Object.assign({ a: action }, params)).toString();
      const opts = { headers: { 'Accept': 'application/json' }, credentials: 'same-origin', cache: 'no-store' };
      if (body !== undefined) {
        opts.method = 'POST';
        opts.headers['Content-Type'] = 'application/json';
        if (this.csrf) opts.headers['X-CSRF'] = this.csrf;
        opts.body = JSON.stringify(body);
      }
      let res, j;
      try {
        res = await fetch(this.base + 'api/' + (scope === 'admin' ? 'admin' : 'public') + '.php?' + qs, opts);
        j = await res.json();
      } catch (e) {
        throw new ApiError('Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.', 0);
      }
      if (!j.ok) throw new ApiError(j.error || 'Coś poszło nie tak.', res.status);
      if (j.csrf) this.csrf = j.csrf;
      return j;
    },

    pub(a, p, b) { return this.call('public', a, p, b); },
    adm(a, p, b) { return this.call('admin', a, p, b); },
    resetDemo() { Demo.reset(); },

    // formatowanie
    zl(gr) { const v = (gr || 0) / 100; return (Number.isInteger(v) ? v : v.toFixed(2).replace('.', ',')) + ' zł'; },
    ymd, addDays, toMin, fromMin, pad,
    STATUSES,
    STATUS_LABEL: { nowe: 'Nowe', przyjete: 'Przyjęte', przygotowanie: 'W przygotowaniu', gotowe: 'Gotowe do odbioru', wydane: 'Wydane', anulowane: 'Anulowane' },
  };

  window.StylowaApi = Api;
})();
