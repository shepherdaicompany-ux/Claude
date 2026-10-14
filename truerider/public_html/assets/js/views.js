/* True Rider storefront — views: home, category, product, search, wishlist, info pages, 404 */
(function () {
  'use strict';
  const TR = window.TR;
  const { $, $$, esc, pln, fold, ICON } = TR;
  const D = TR.data, S = TR.state;
  const main = $('#main');
  const triggers = [];
  let cleanup = [];

  /* ---------- mount helper with transition ---------- */
  TR.mount = async function (html, opts, after) {
    opts = opts || {};
    const prog = $('#progress');
    prog.className = 'progress run';
    const old = main.firstElementChild;
    if (old && !opts.pop && !TR.reduced()) { old.classList.add('out'); await new Promise((r) => setTimeout(r, 180)); }
    cleanup.forEach((fn) => { try { fn(); } catch (e) { /* view already gone */ } });
    cleanup = [];
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach((t) => t.kill());
    main.innerHTML = '<div class="view">' + html + '</div>';
    if (!opts.keepScroll) window.scrollTo(0, opts.pop ? (history.state && history.state.y) || 0 : 0);
    TR.hydrate(main);
    TR.fixLinks(main);
    $$('[data-split]', main).forEach((el) => TR.split(el));
    TR.reveal(main);
    TR.rail(main);
    if (after) after(main.firstElementChild);
    prog.className = 'progress done';
    TR.megaClose();
    main.focus({ preventScroll: true });
    if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 60);
  };
  TR.onLeave = (fn) => cleanup.push(fn);
  const title = (t) => { document.title = t ? t + ' — True Rider' : 'True Rider — nowa generacja odzieży jeździeckiej'; };
  const crumbs = (list) => '<nav class="crumbs" aria-label="Okruszki"><a href="/">True Rider</a>' + list.map((c) => '<span aria-hidden="true">/</span>' + (c[0] ? '<a href="/' + c[0] + '">' + esc(c[1]) + '</a>' : '<span>' + esc(c[1]) + '</span>')).join('') + '</nav>';
  const plural = (n, a, b, c) => n + ' ' + (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  TR.plural = plural;
  const prodCount = (n) => plural(n, 'produkt', 'produkty', 'produktów');

  /* ============================== HOME ============================== */
  function homeHTML() {
    const H = D.home;
    const byS = (s) => D.catBySlug.get(s);
    const live = D.products.filter((p) => p.av).length;
    const heroImgs = (H.hero || []).map((im, i) => TR.img(im, 1000, 'True Rider — kolekcja jesień/zima', i === 0 ? 'on' : '')).join('');
    const segs = [
      ['kobieta', 'Kobieta', 'Legginsy, bluzy, koszule konkursowe', 'assets/img/thermo.jpg'],
      ['mlodzi-jezdzcy', 'Młodzież', 'Rozmiary 116–164 i XXS', 'assets/img/kat-mlodziez.jpg'],
      ['mezczyzna', 'Mężczyzna', 'Bryczesy, bluzy, kamizelki', null],
      ['dla-konia', 'Dla <em>konia</em>', 'Czapraki, nauszniki, derki, kantary', 'assets/img/kat-kobieta.jpg'],
      ['do-stajni', 'Do <em>stajni</em>', 'Kurtyny, bramki, torby', null],
    ].map((s, i) => {
      const c = byS(s[0]);
      const n = c ? TR.catProducts(c).length : 0;
      let img = s[3];
      let tag = img ? '<img src="' + img + '" alt="" loading="lazy">' : '';
      if (!img && c) { const p = TR.catProducts(c).find((x) => x.av) || TR.catProducts(c)[0]; if (p) tag = TR.img(p.im[0], 700, ''); }
      return '<a class="seg__row rv" href="/' + s[0] + '" data-float="' + i + '"><span class="seg__thumb">' + tag + '</span><span class="seg__idx">' + String(i + 1).padStart(2, '0') + '</span><span class="seg__name">' + s[1] + '</span><span class="seg__meta">' + esc(s[2]) + '<br>' + prodCount(n) + '</span><template>' + tag + '</template></a>';
    }).join('');
    const newIds = (H.nowosci || []).map((id) => D.byId.get(id)).filter(Boolean);
    const recIds = (H.polecane || []).map((id) => D.byId.get(id)).filter(Boolean);
    const colls = (D.colls || []).map((k, i) => {
      const c = byS(k.s); if (!c) return '';
      const items = TR.catProducts(c);
      const p = (k.pick && D.byId.get(k.pick)) || items.find((x) => x.av) || items[0];
      if (!p) return '';
      return '<a class="coll__card" href="/' + c.s + '" data-cursor="Kolekcja"><div class="arch">' + TR.img(p.im[0], 1000, k.n) + '<span class="coll__num">' + prodCount(items.length) + '</span></div>' +
        '<h3 class="coll__name"><span class="coll__dot" style="background:' + esc(k.hx) + '"></span>' + k.html + '</h3><p class="coll__desc">' + esc(k.d) + '</p></a>';
    }).join('');
    const tech = [['strona/technologie', 'Tech<em>line</em>', 'Materiał poprawia mikrokrążenie i dotlenienie mięśni, świetnie oddycha i chroni przed promieniowaniem UV.'],
      ['strona/technologie', 'Prima<em>Loft®</em>', 'Wypełnienie kurtek, które izoluje jak gęsi puch, ale nie przemaka i nie zbija się po praniu.'],
      ['strona/technologie', 'OEKO-TEX<em>®</em>', 'Materiały ze Standardem 100: przyjazne dla skóry, nie podrażniają i nie wywołują uczuleń.'],
      ['strona/technologie', 'Soft<em>shell</em>', 'Trójwarstwowa technologia na wilgoć, wiatr, deszcz i niskie temperatury — na pięć miesięcy jesieni i zimy w siodle.']]
      .map((t) => '<a href="/' + t[0] + '" class="rv"><b>' + t[1] + '</b><p>' + t[2] + '</p><span>Zobacz produkty →</span></a>').join('');
    const reviews = [
      ['Legginsy są ultra wygodne, ładnie dopasowują się do ciała oraz mają bardzo komfortową gumę w pasie, która nie ogranicza ruchów. Podczas jazdy lej idealnie klei się do siodła.', '@kamijamii'],
      ['Legginsy zimowe True Rider są naprawdę cieplutkie, a jakościowo są wykonane naprawdę super — dodatkowo bardzo wygodny materiał.', '@aleksaa_acz'],
      ['Kolor kurteczki Performance Hybrid — pudrowy róż, to był totalny strzał w 10! Na żywo wygląda jeszcze lepiej niż na stronie, pięknie się mieni.', '@koniulkaa'],
      ['Ciuszki są po prostu cudowne, materiał po lekkim pobrudzeniu w stajni wystarczy przetrzeć ręką i już są jak nowe.', '@attaccama_yt'],
      ['Kamizelka jest bardzo starannie wykonana. Każdy detal jest dopracowany, a wodoodporny materiał sprawdza się w deszczowe i cieplejsze dni.', '@equestrian_team_olexyy'],
      ['Legginsy Summer z różowym brokatem to coś wspaniałego! Tak ślicznie błyszczy się napis na nogawce, że mój koń także jest zafascynowany!', '@kokietka_equine'],
      ['Świetna jakość materiałów i dbałość o detale. W połączeniu z funkcjonalnością ciuchy stanowią świetny wybór do stajni.', '@talar_fanpage'],
      ['Bardzo elastyczny i komfortowy golf. Nie uciska szyi, a zdobienie nie niszczy się po praniu.', 'Joanna'],
    ].map((r) => '<figure class="review"><q>' + esc(r[0]) + '</q><footer><span>' + esc(r[1]) + '</span><span class="stars" aria-label="5 na 5">★★★★★</span></footer></figure>').join('');
    const igPics = (H.ig || []).map((x) => { const p = D.byId.get(x[0]); return p ? '<a href="' + TR.url(p) + '" data-cursor="Zobacz">' + TR.img(x[1], 700, p.n) + '</a>' : ''; }).join('');
    const news = (H.news || []).map((n) => '<a class="newsitem rv" href="/' + n.s + '"><time>' + esc(n.d) + '</time><h3>' + esc(n.t) + '</h3><span class="link-u">Czytaj ' + ICON.arrow + '</span></a>').join('');
    const match = H.match || [];
    const mA = D.byId.get(match[0]), mB = D.byId.get(match[1]);
    const badgeText = 'SZYTE W POLSCE · WŁOSKIE MATERIAŁY · OD JEŹDŹCÓW DLA JEŹDŹCÓW · ';

    return '' +
    '<section class="hero"><div class="wrap hero__grid">' +
      '<div class="hero__copy"><p class="eyebrow eyebrow--gold">Kolekcja jesień / zima 2026</p>' +
        '<h1 class="hero__title"><span class="row"><span>Nowa generacja</span></span><span class="row"><span>odzieży</span></span><span class="row"><span><em>jeździeckiej</em></span></span></h1>' +
        '<p class="hero__sub">Legginsy z żelowym gripem, bluzy Komma, kurtki Scuba i komplety dla konia. Każdy dzień w stajni inspiruje nasze projekty, a szyjemy je w Polsce z włoskich materiałów.</p>' +
        '<div class="hero__cta"><a class="btn" href="/kobieta-kolekcja-jesien-zima"><span>Kup kolekcję</span>' + ICON.arrow + '</a><a class="btn btn--ghost" href="/pl/new"><span>Nowości</span></a></div>' +
        '<div class="hero__facts"><div><b>2014</b><span>Rok założenia</span></div><div><b class="num">' + live + '</b><span>Modeli dostępnych od ręki</span></div><div><b>24 h</b><span>Wysyłka</span></div><div><b>UPF 50+</b><span>Ochrona w legginsach</span></div></div>' +
      '</div>' +
      '<div class="hero__art"><div class="arch hero__a1 parallax" data-speed="-.06">' + heroImgs + '<span class="hero__label" id="heroLabel"></span></div>' +
        '<div class="arch hero__a2 parallax" data-speed=".08"><img src="assets/img/portret.jpg" alt="Amazonka w odzieży Thermo True Rider" loading="eager"></div>' +
        '<div class="arch hero__a3 parallax" data-speed=".14"><img src="assets/img/kat-kon.jpg" alt="Amazonka z koniem w bluzie True Rider" loading="eager"></div>' +
        '<div class="hero__badge"><svg viewBox="0 0 128 128" aria-hidden="true"><defs><path id="circ" d="M64 64m-52 0a52 52 0 1 1 104 0a52 52 0 1 1-104 0"/></defs><text font-family="DM Mono, monospace" font-size="9.4" letter-spacing="2.2" fill="currentColor"><textPath href="#circ">' + badgeText + '</textPath></text></svg><b>TR</b></div>' +
        '<canvas class="hero__sparkle" id="sparkle" aria-hidden="true"></canvas>' +
      '</div></div></section>' +
    '<div class="usp" aria-label="Dlaczego True Rider"><div class="usp__track">' + Array(2).fill(['Szyjemy w Polsce', 'Włoskie materiały premium', 'Od jeźdźców dla jeźdźców', 'Personalizowane projekty', 'Wysyłka w 24 h', 'Tworzymy społeczność True Riders'].map((t) => '<span class="usp__item">' + ICON.star + t + '</span>').join('')).join('') + '</div></div>' +

    '<section class="sec"><div class="wrap seg"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Sklep</p><h2 data-split>Dla kogo <em>dziś</em> jeździmy?</h2></div><p>Odzież dla amazonek, młodych jeźdźców i jeźdźców, a do tego wyposażenie dla konia i stajni — w jednym stylu.</p></div>' +
      '<div class="seg__list">' + segs + '</div><div class="seg__float" id="segFloat"></div></div></section>' +

    '<section class="sec sec--bone"><div class="wrap"><div class="sec__head"><div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-tab="new"><em>Nowości</em></button><button role="tab" aria-selected="false" data-tab="rec">Polecane</button></div>' +
      '<div class="rail__ctrl"><a class="link-u" href="/pl/new">Wszystkie nowości ' + ICON.arrow + '</a><button class="rail__btn" data-rail="-1" aria-label="Przewiń w lewo">' + ICON.left + '</button><button class="rail__btn" data-rail="1" aria-label="Przewiń w prawo">' + ICON.right + '</button></div></div>' +
      '<div class="rail" id="homeRail"><div class="rail__track" data-new>' + newIds.map((p) => TR.card(p)).join('') + '</div><div class="rail__bar"><i></i></div></div><template id="recTpl">' + recIds.map((p) => TR.card(p, { rv: false })).join('') + '</template></div></section>' +

    '<section class="coll"><div class="wrap coll__intro"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Według kolekcji</p><h2 data-split>Każda kolekcja to <em>komplet</em></h2></div><p>Kolory dobieramy tak, żeby legginsy, bluza, czaprak i nauszniki tworzyły jedną stylizację — od padoku po parkur.</p></div></div>' +
      '<div class="coll__pin" id="collPin"><div class="coll__track" id="collTrack">' + colls + '</div></div></section>' +

    '<section class="sec"><div class="wrap story"><div class="story__img"><div class="arch rv-img"><img src="assets/img/portret.jpg" alt="Amazonka w odzieży Thermo na koniu" loading="lazy" class="parallax" data-speed=".05" style="height:115%"></div></div>' +
      '<div class="story__copy"><p class="eyebrow eyebrow--gold">Thermo — komfort w chłodne dni</p><h2 data-split>Kiedy temperatura spada, liczy się <em>każda warstwa</em></h2>' +
      '<p class="lede">Odzież Thermo True Rider została stworzona z myślą o jeździe w chłodniejsze dni, zapewniając ciepło i swobodę ruchów bez zbędnego obciążenia.</p>' +
      '<div class="spec"><div><b>Thermo Golfy</b><span>Pod bluzę i kurtkę</span></div><div><b>Thermo Legginsy</b><span>Na chłodne treningi</span></div><div><b>Marta Winter</b><span>Ocieplane legginsy</span></div></div>' +
      '<div><a class="btn" href="/kobieta-odziez-termoaktywna"><span>Odzież termoaktywna</span>' + ICON.arrow + '</a></div></div></div></section>' +

    (mA && mB ? '<section class="sec sec--sand"><div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Matchy-matchy</p><h2 data-split>Jeździec i koń w <em>jednym kolorze</em></h2></div><p>Kolekcje Rose Gold, Black &amp; Gold, Sparkle i Born to Ride mają wersje dla jeźdźca i dla konia. Dobierz parę do swojej stylizacji.</p></div>' +
      '<div class="match"><div class="match__card rv">' + matchCard(mA, 'Dla jeźdźca') + '</div><div class="match__mid rv"><span class="match__plus">+</span><p class="eyebrow">Razem ' + pln(mA.p + mB.p) + '</p><button class="btn" type="button" data-match="' + mA.id + ',' + mB.id + '"><span>Zobacz komplet</span>' + ICON.arrow + '</button></div><div class="match__card rv">' + matchCard(mB, 'Dla konia') + '</div></div></div></section>' : '') +

    '<section class="sec"><div class="wrap story story--rev"><div class="story__img"><div class="arch wide rv-img"><img src="assets/img/o-nas.webp" alt="Personalizowane kurtki i kamizelki klubowe z haftem" loading="lazy"></div></div>' +
      '<div class="story__copy"><p class="eyebrow eyebrow--gold">Personalizacja i zamówienia klubowe</p><h2 data-split>Wyglądaj jak jeden <em>team</em></h2>' +
      '<p class="lede">Haft imienia i nazwiska, flaga narodowa, duży haft na plecach albo napis na czapraku i derce. Robimy pojedyncze personalizacje i zamówienia dla całych klubów.</p>' +
      '<div class="hero__cta"><a class="btn" href="/kategoria/znakowanie-odziezy"><span>Personalizuj odzież</span>' + ICON.arrow + '</a><a class="btn btn--ghost" href="/strona/zamowienia-indywidualne"><span>Zamówienia klubowe</span></a></div></div></div></section>' +

    '<section class="sec sec--navy"><div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Technologie</p><h2 data-split>Materiały, które <em>pracują</em> z Tobą</h2></div><p>Każda linia ma inne zadanie: oddychać, grzać, chronić przed deszczem i wiatrem albo dbać o skórę.</p></div><div class="tech">' + tech + '</div></div></section>' +

    '<section class="sec sec--bone"><div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Opinie</p><h2 data-split>Co mówią <em>True Riders</em></h2></div><div class="rail__ctrl"><button class="rail__btn" data-rev="-1" aria-label="Poprzednie opinie">' + ICON.left + '</button><button class="rail__btn" data-rev="1" aria-label="Następne opinie">' + ICON.right + '</button></div></div><div class="reviews" id="reviews">' + reviews + '</div></div></section>' +

    (news ? '<section class="sec"><div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Aktualności</p><h2 data-split>Z <em>naszej</em> stajni</h2></div></div><div class="newsgrid">' + news + '</div></div></section>' : '') +

    (igPics ? '<section class="sec" style="padding-top:0"><div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">#trueriderteam</p><h2 data-split>Dołącz do <em>społeczności</em></h2></div><a class="link-u" href="https://www.instagram.com/truerider_brand/" target="_blank" rel="noopener">Instagram ' + ICON.arrow + '</a></div><div class="ig">' + igPics + '</div></div></section>' : '');
  }
  function matchCard(p, label) {
    return '<a class="arch" href="' + TR.url(p) + '" data-cursor="Zobacz">' + TR.img(p.im[0], 1000, p.n) + '</a><p class="eyebrow eyebrow--gold">' + label + '</p><h3 class="card__name" style="font-size:1.1rem"><a href="' + TR.url(p) + '">' + esc(p.n) + '</a></h3><div class="card__price"><b>' + pln(p.p) + '</b></div>';
  }

  function homeAfter(root) {
    // hero image rotation
    const imgs = $$('.hero__a1 img', root);
    const label = $('#heroLabel');
    const labels = D.home.heroLabels || [];
    let hi = 0;
    if (label && labels[0]) label.textContent = labels[0];
    if (imgs.length > 1) {
      TR.loadNow($('.hero__a1', root));
      const t = setInterval(() => { imgs[hi].classList.remove('on'); hi = (hi + 1) % imgs.length; imgs[hi].classList.add('on'); if (label) label.textContent = labels[hi] || ''; }, 4200);
      TR.onLeave(() => clearInterval(t));
    }
    requestAnimationFrame(() => root.classList.add('ready'));
    sparkle($('#sparkle', root));
    // segment float image
    const fl = $('#segFloat', root);
    if (fl && window.matchMedia('(pointer: fine)').matches) {
      let fx = 0, fy = 0, tx = 0, ty = 0, raf;
      const loop = () => { fx += (tx - fx) * 0.15; fy += (ty - fy) * 0.15; fl.style.left = fx + 'px'; fl.style.top = fy + 'px'; raf = requestAnimationFrame(loop); };
      $$('.seg__row', root).forEach((row) => {
        row.addEventListener('mouseenter', () => { fl.innerHTML = $('template', row).innerHTML; TR.hydrate(fl); TR.loadNow(fl); fl.classList.add('on'); });
        row.addEventListener('mouseleave', () => fl.classList.remove('on'));
        row.addEventListener('mousemove', (e) => { tx = e.clientX + 150; ty = e.clientY; });
      });
      loop();
      TR.onLeave(() => cancelAnimationFrame(raf));
    }
    // tabs
    const track = $('[data-new]', root);
    const newHTML = track.innerHTML;
    $$('[data-tab]', root).forEach((b) => b.addEventListener('click', () => {
      $$('[data-tab]', root).forEach((x) => x.setAttribute('aria-selected', x === b));
      track.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(-20px)' }], { duration: 220, easing: 'ease-in' }).onfinish = () => {
        track.innerHTML = b.dataset.tab === 'new' ? newHTML : $('#recTpl', root).innerHTML;
        $$('.rv', track).forEach((c) => c.classList.add('in'));
        TR.hydrate(track); track.scrollLeft = 0;
        track.animate([{ opacity: 0, transform: 'translateX(20px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2,.7,.1,1)' });
      };
    }));
    // reviews scroll
    $$('[data-rev]', root).forEach((b) => b.addEventListener('click', () => { const r = $('#reviews', root); r.scrollBy({ left: +b.dataset.rev * r.clientWidth * 0.9, behavior: 'smooth' }); }));
    // match set
    const mb = $('[data-match]', root);
    if (mb) mb.addEventListener('click', () => {
      const ids = mb.dataset.match.split(',').map(Number);
      TR.modal('<div class="modal__pad"><h2>Komplet <em>matchy-matchy</em></h2><p class="muted">Wybierz rozmiar na karcie każdego produktu.</p><div class="grid" style="--cols:2;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:24px">' + ids.map((id) => TR.card(D.byId.get(id), { rv: false })).join('') + '</div></div>');
    });
    // GSAP: parallax + pinned horizontal collections
    if (window.gsap && window.ScrollTrigger && !TR.reduced()) {
      gsap.registerPlugin(ScrollTrigger);
      $$('.parallax', root).forEach((el) => {
        gsap.to(el, { yPercent: +el.dataset.speed * 100, ease: 'none', scrollTrigger: { trigger: el.closest('section'), start: 'top top', end: 'bottom top', scrub: true } });
      });
      const pin = $('#collPin', root), trk = $('#collTrack', root);
      if (trk) TR.loadNow(trk);
      if (pin && trk && window.matchMedia('(min-width: 900px)').matches) {
        const dist = () => Math.max(0, trk.scrollWidth - window.innerWidth);
        gsap.to(trk, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
        $$('.coll__card .arch img', trk).forEach((img) => gsap.fromTo(img, { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true } }));
      }
    }
  }

  /* gold glints over the hero — a nod to the Diamond and Sparkle lines */
  function sparkle(cv) {
    if (!cv || TR.reduced()) return;
    const ctx = cv.getContext('2d');
    let w, h, dpr = Math.min(2, window.devicePixelRatio || 1), parts = [], raf, mx = -1, my = -1, alive = true;
    const size = () => { const r = cv.getBoundingClientRect(); w = r.width; h = r.height; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const ro = new ResizeObserver(size); ro.observe(cv);
    const spawn = (x, y, big) => parts.push({ x: x == null ? Math.random() * w : x, y: y == null ? Math.random() * h : y, r: (big ? 5 : 2) + Math.random() * (big ? 6 : 4), life: 0, max: 60 + Math.random() * 80, rot: Math.random() * Math.PI, vy: -0.15 - Math.random() * 0.3 });
    cv.parentElement.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (Math.random() < 0.5) spawn(mx + (Math.random() - 0.5) * 40, my + (Math.random() - 0.5) * 40, true); });
    const star = (p) => {
      const t = p.life / p.max, a = Math.sin(t * Math.PI);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + t); ctx.globalAlpha = a;
      const r = p.r * (0.6 + a * 0.6);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.2);
      g.addColorStop(0, 'rgba(255,244,214,.9)'); g.addColorStop(1, 'rgba(216,192,143,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath(); ctx.moveTo(0, -r * 1.8); ctx.quadraticCurveTo(0, 0, r * 1.8, 0); ctx.quadraticCurveTo(0, 0, 0, r * 1.8); ctx.quadraticCurveTo(0, 0, -r * 1.8, 0); ctx.quadraticCurveTo(0, 0, 0, -r * 1.8); ctx.fill();
      ctx.restore();
    };
    const loop = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, w, h);
      if (parts.length < 26 && Math.random() < 0.18) spawn();
      parts = parts.filter((p) => (p.life++ < p.max));
      parts.forEach((p) => { p.y += p.vy; star(p); });
      raf = requestAnimationFrame(loop);
    };
    loop();
    TR.onLeave(() => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); });
  }

  TR.route((p) => p === '/', (m, o) => { title(''); return TR.mount(homeHTML(), o, homeAfter); });

  /* ============================== LISTING ============================== */
  const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  function sizeRank(s) {
    const u = s.toUpperCase();
    const m = u.match(/^(\d{2,3})/);
    if (m) return +m[1];
    const i = SIZE_ORDER.indexOf(u.split('/')[0].trim());
    if (i >= 0) return 1000 + i;
    return 2000 + u.charCodeAt(0);
  }
  const SORTS = { rec: 'Polecane', new: 'Nowości', asc: 'Cena: od najniższej', desc: 'Cena: od najwyższej', sale: 'Promocje', az: 'Nazwa A–Z' };
  const fstate = new Map();
  function listing(cfg, o) {
    // cfg: { key, title, titleHTML, crumbs, desc, items, subs }
    const st = fstate.get(cfg.key) || { sort: 'rec', sizes: [], colors: [], min: '', max: '', avail: false, shown: 24, cols: 4 };
    fstate.set(cfg.key, st);
    const all = cfg.items;
    const sizes = Array.from(new Set(all.flatMap((p) => (p.sz || []).map((s) => s[0])).filter(Boolean))).sort((a, b) => sizeRank(a) - sizeRank(b));
    const colorMap = new Map();
    all.forEach((p) => { if (p.cg) { const c = colorMap.get(p.cg[0]) || { n: p.cg[0], hx: p.cg[1], c: 0 }; c.c++; colorMap.set(p.cg[0], c); } });
    const colors = Array.from(colorMap.values()).sort((a, b) => b.c - a.c);
    const subs = cfg.subs || [];

    const html = '<div class="wrap">' + crumbs(cfg.crumbs) +
      '<header class="cat-hero"><h1 data-split>' + (cfg.titleHTML || esc(cfg.title)) + '</h1>' +
      (cfg.desc ? '<div class="cat-hero__desc rv"><div class="more rich">' + cfg.desc + '</div><button class="link-u" type="button" data-more>Czytaj więcej</button></div>' : '<div></div>') + '</header>' +
      (subs.length ? '<div class="subcats rv">' + subs.map((s) => '<a class="chip' + (s.on ? ' on' : '') + '" href="/' + s.s + '">' + esc(s.n) + ' <small>' + s.c + '</small></a>').join('') + '</div>' : '') +
      '</div>' +
      '<div class="toolbar" style="margin-top:24px"><div class="wrap toolbar__in"><span class="toolbar__count" id="lcount"></span>' +
      '<button class="chip" type="button" id="openFilters">' + ICON.filter + ' Filtry <small id="fcount"></small></button>' +
      '<label class="select"><span class="sr">Sortowanie</span><select id="sortSel">' + Object.keys(SORTS).map((k) => '<option value="' + k + '"' + (st.sort === k ? ' selected' : '') + '>' + SORTS[k] + '</option>').join('') + '</select></label>' +
      '<div class="dens"><button type="button" data-cols="3" aria-label="3 kolumny" aria-pressed="' + (st.cols === 3) + '"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 4h4v16h-4z" fill="currentColor"/></svg></button><button type="button" data-cols="4" aria-label="4 kolumny" aria-pressed="' + (st.cols === 4) + '"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 4h3v16H3zM8 4h3v16H8zM13 4h3v16h-3zM18 4h3v16h-3z" fill="currentColor"/></svg></button></div>' +
      '</div></div>' +
      '<div class="wrap"><div class="active-filters" id="afilters"></div><div class="grid" id="lgrid" style="--cols:' + st.cols + '"></div><div class="more-wrap" id="lmore"></div></div>' +
      '<div class="filters" id="filters" hidden role="dialog" aria-modal="true" aria-label="Filtry"><div class="filters__scrim mnav__scrim" data-close></div><aside class="filters__panel"><div class="filters__head"><h2>Filtry</h2><button class="icon-btn" data-close aria-label="Zamknij filtry">' + ICON.close + '</button></div><div class="filters__body">' +
        '<div class="fgroup"><label class="switch"><span>Tylko dostępne od ręki</span><input type="checkbox" id="fAvail"' + (st.avail ? ' checked' : '') + '></label></div>' +
        (sizes.length ? '<div class="fgroup"><h3>Rozmiar</h3><div class="opts">' + sizes.map((s) => '<button type="button" class="chip" data-fs="' + esc(s) + '" aria-pressed="' + st.sizes.includes(s) + '">' + esc(s) + '</button>').join('') + '</div></div>' : '') +
        (colors.length > 1 ? '<div class="fgroup"><h3>Kolor</h3><div class="opts">' + colors.map((c) => '<button type="button" class="chip" data-fc="' + esc(c.n) + '" aria-pressed="' + st.colors.includes(c.n) + '"><i class="swatch" style="background:' + esc(c.hx) + '"></i>' + esc(c.n) + ' <small>' + c.c + '</small></button>').join('') + '</div></div>' : '') +
        '<div class="fgroup"><h3>Cena (zł)</h3><div class="price-range"><label class="sr" for="fMin">Cena od</label><input id="fMin" type="number" inputmode="numeric" min="0" placeholder="od" value="' + esc(st.min) + '"><span>—</span><label class="sr" for="fMax">Cena do</label><input id="fMax" type="number" inputmode="numeric" min="0" placeholder="do" value="' + esc(st.max) + '"></div></div>' +
      '</div><div class="filters__foot"><button class="btn btn--ghost" type="button" id="fClear"><span>Wyczyść</span></button><button class="btn" type="button" data-close id="fApply"><span>Pokaż</span></button></div></aside></div>';

    return TR.mount(html, o, (root) => {
      const grid = $('#lgrid', root), more = $('#lmore', root);
      const filtered = () => {
        let list = all.slice();
        if (st.avail) list = list.filter((p) => p.av);
        if (st.sizes.length) list = list.filter((p) => (p.sz || []).some((s) => st.sizes.includes(s[0]) && (!st.avail || s[1] > 0)));
        if (st.colors.length) list = list.filter((p) => p.cg && st.colors.includes(p.cg[0]));
        if (st.min !== '') list = list.filter((p) => p.p >= +st.min);
        if (st.max !== '') list = list.filter((p) => p.p <= +st.max);
        const avail = (p) => (p.av ? 0 : 1);
        if (st.sort === 'rec') list.sort((a, b) => avail(a) - avail(b));
        if (st.sort === 'new') list.sort((a, b) => (b.nw || 0) - (a.nw || 0) || b.id - a.id);
        if (st.sort === 'asc') list.sort((a, b) => avail(a) - avail(b) || a.p - b.p);
        if (st.sort === 'desc') list.sort((a, b) => avail(a) - avail(b) || b.p - a.p);
        if (st.sort === 'sale') list.sort((a, b) => TR.salePct(b) - TR.salePct(a) || avail(a) - avail(b));
        if (st.sort === 'az') list.sort((a, b) => a.n.localeCompare(b.n, 'pl'));
        return list;
      };
      const draw = (keepShown) => {
        const list = filtered();
        if (!keepShown) st.shown = 24;
        $('#lcount', root).textContent = prodCount(list.length);
        const nf = st.sizes.length + st.colors.length + (st.avail ? 1 : 0) + (st.min !== '' || st.max !== '' ? 1 : 0);
        $('#fcount', root).textContent = nf ? '(' + nf + ')' : '';
        $('#fApply', root).querySelector('span').textContent = 'Pokaż ' + prodCount(list.length);
        const chips = [];
        if (st.avail) chips.push(['avail', '', 'Dostępne od ręki']);
        st.sizes.forEach((s) => chips.push(['size', s, 'Rozmiar ' + s]));
        st.colors.forEach((c) => chips.push(['color', c, c]));
        if (st.min !== '' || st.max !== '') chips.push(['price', '', (st.min || 0) + '–' + (st.max || '∞') + ' zł']);
        $('#afilters', root).innerHTML = chips.map((c) => '<button class="chip" type="button" data-rmf="' + c[0] + '" data-v="' + esc(c[1]) + '">' + esc(c[2]) + ' ×</button>').join('') + (chips.length > 1 ? '<button class="chip" type="button" data-rmf="all">Wyczyść wszystko</button>' : '');
        if (!list.length) {
          grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><h3>Brak produktów dla tych filtrów</h3><p class="muted">Zmień rozmiar lub kolor albo wyczyść filtry.</p><button class="btn btn--ghost" type="button" data-rmf="all"><span>Wyczyść filtry</span></button></div>';
          more.innerHTML = '';
          return;
        }
        grid.innerHTML = list.slice(0, st.shown).map((p) => TR.card(p)).join('');
        TR.hydrate(grid); TR.reveal(grid);
        more.innerHTML = list.length > st.shown ? '<small>Oglądasz ' + st.shown + ' z ' + list.length + '</small><div class="more-bar"><i style="transform:scaleX(' + st.shown / list.length + ')"></i></div><button class="btn btn--ghost" type="button" id="loadMore"><span>Pokaż więcej</span></button>' : '<small>To już wszystkie produkty — ' + list.length + '</small>';
      };
      draw(true);
      // infinite-ish load
      root.addEventListener('click', (e) => {
        if (e.target.closest('#loadMore')) {
          const before = st.shown; st.shown += 24;
          const list = filtered();
          grid.insertAdjacentHTML('beforeend', list.slice(before, st.shown).map((p) => TR.card(p)).join(''));
          TR.hydrate(grid); TR.reveal(grid);
          more.innerHTML = list.length > st.shown ? '<small>Oglądasz ' + st.shown + ' z ' + list.length + '</small><div class="more-bar"><i style="transform:scaleX(' + st.shown / list.length + ')"></i></div><button class="btn btn--ghost" type="button" id="loadMore"><span>Pokaż więcej</span></button>' : '<small>To już wszystkie produkty — ' + list.length + '</small>';
        }
        const r = e.target.closest('[data-rmf]');
        if (r) {
          const k = r.dataset.rmf, v = r.dataset.v;
          if (k === 'all') { st.sizes = []; st.colors = []; st.avail = false; st.min = st.max = ''; }
          if (k === 'avail') st.avail = false;
          if (k === 'size') st.sizes = st.sizes.filter((x) => x !== v);
          if (k === 'color') st.colors = st.colors.filter((x) => x !== v);
          if (k === 'price') st.min = st.max = '';
          syncFilterUI(); draw();
        }
        const mo = e.target.closest('[data-more]');
        if (mo) { const m = $('.more', root); m.classList.toggle('open'); mo.textContent = m.classList.contains('open') ? 'Zwiń' : 'Czytaj więcej'; }
        const dc = e.target.closest('[data-cols]');
        if (dc) { st.cols = +dc.dataset.cols; grid.style.setProperty('--cols', st.cols); $$('[data-cols]', root).forEach((b) => b.setAttribute('aria-pressed', b === dc)); }
      });
      const syncFilterUI = () => {
        $('#fAvail', root).checked = st.avail;
        $$('[data-fs]', root).forEach((b) => b.setAttribute('aria-pressed', st.sizes.includes(b.dataset.fs)));
        $$('[data-fc]', root).forEach((b) => b.setAttribute('aria-pressed', st.colors.includes(b.dataset.fc)));
        $('#fMin', root).value = st.min; $('#fMax', root).value = st.max;
      };
      const desc = $('.more', root);
      if (desc && desc.scrollHeight <= desc.clientHeight + 8) { desc.classList.add('open'); const b = $('[data-more]', root); if (b) b.hidden = true; }
      $('#sortSel', root).addEventListener('change', (e) => { st.sort = e.target.value; draw(); });
      $('#openFilters', root).addEventListener('click', () => TR.openLayer($('#filters', root)));
      const fl = $('#filters', root);
      fl.addEventListener('click', (e) => {
        const s = e.target.closest('[data-fs]'), c = e.target.closest('[data-fc]');
        if (s) { const v = s.dataset.fs; st.sizes = st.sizes.includes(v) ? st.sizes.filter((x) => x !== v) : st.sizes.concat(v); }
        if (c) { const v = c.dataset.fc; st.colors = st.colors.includes(v) ? st.colors.filter((x) => x !== v) : st.colors.concat(v); }
        if (s || c) { syncFilterUI(); draw(); }
      });
      $('#fAvail', root).addEventListener('change', (e) => { st.avail = e.target.checked; draw(); });
      const price = TR.debounce(() => { st.min = $('#fMin', root).value; st.max = $('#fMax', root).value; draw(); }, 300);
      $('#fMin', root).addEventListener('input', price); $('#fMax', root).addEventListener('input', price);
      $('#fClear', root).addEventListener('click', () => { st.sizes = []; st.colors = []; st.avail = false; st.min = st.max = ''; syncFilterUI(); draw(); });
    });
  }
  TR.listing = listing;

  function catView(c, o) {
    title(c.n);
    const parent = c.par && D.catById.get(c.par);
    const top = parent ? (parent.par && D.catById.get(parent.par)) || parent : c;
    const crumbList = [];
    let x = c.par && D.catById.get(c.par);
    const chain = [];
    while (x) { chain.unshift([x.s, x.n]); x = x.par && D.catById.get(x.par); }
    crumbList.push(...chain, ['', c.n]);
    let subs = c.kids.map((k) => ({ s: k.s, n: k.n, c: TR.catProducts(k).length })).filter((k) => k.c);
    if (!subs.length && parent) subs = parent.kids.map((k) => ({ s: k.s, n: k.n, c: TR.catProducts(k).length, on: k === c })).filter((k) => k.c);
    const words = c.n.split(' ');
    const titleHTML = words.length > 1 ? esc(words.slice(0, -1).join(' ')) + ' <em>' + esc(words[words.length - 1]) + '</em>' : '<em>' + esc(c.n) + '</em>';
    return listing({ key: 'c' + c.id, title: c.n, titleHTML, crumbs: crumbList, desc: c.d, items: TR.catProducts(c), subs }, o);
  }
  TR.route((p) => {
    const s = p.slice(1).toLowerCase().replace(/\/\d+$/, '');
    return D.catBySlug.get(s) || (s === 'pl/new' ? 'new' : null);
  }, (c, o) => {
    if (c === 'new') {
      title('Nowości');
      const items = D.products.filter((p) => p.nw).concat(D.products.filter((p) => !p.nw).sort((a, b) => b.id - a.id).slice(0, 36));
      return listing({ key: 'new', title: 'Nowości', titleHTML: 'Nowości w <em>True Rider</em>', crumbs: [['', 'Nowości']], desc: '<p>Najnowsze modele i restocki: legginsy Marta Diamond, kurtki Scuba, Air Mesh z kryształkami i jesienne bluzy Komma.</p>', items, subs: D.nav.filter((n) => n.cols).map((n) => ({ s: n.s, n: n.n, c: TR.catProducts(D.catBySlug.get(n.s) || { it: [], kids: [] }).length })) }, o);
    }
    return catView(c, o);
  });

  /* search results */
  TR.route((p) => p === '/szukaj', (m, o) => {
    const q = TR.query().get('q') || '';
    title('Szukaj: ' + q);
    return listing({ key: 's:' + q, title: q, titleHTML: 'Wyniki: <em>' + esc(q) + '</em>', crumbs: [['', 'Wyszukiwanie']], items: TR.searchProducts(q) }, o);
  });

  /* wishlist */
  TR.route((p) => p === '/ulubione', (m, o) => {
    title('Ulubione');
    const items = S.wish.map((id) => D.byId.get(id)).filter(Boolean);
    const html = '<div class="wrap">' + crumbs([['', 'Ulubione']]) + '<h1 class="page-title" data-split>Twoje <em>ulubione</em></h1>' +
      (items.length ? '<div class="grid">' + items.map((p) => TR.card(p)).join('') + '</div>' : '<div class="empty"><h3>Nic tu jeszcze nie ma</h3><p class="muted">Kliknij serce na produkcie, żeby zapisać go na później.</p><a class="btn" href="/pl/new">Zobacz nowości</a></div>') + '</div><div style="height:100px"></div>';
    return TR.mount(html, o);
  });

  /* ============================== PRODUCT ============================== */
  function guessSizeOpt(o) { return /rozmiar|size|wielko/i.test(o.label); }
  async function productView(p, o) {
    title(p.n);
    const det = await TR.detail(p);
    if (TR.cfg.BUNDLE) await TR.packReady();
    const imgs = (det.img || [p.im[0]]).filter((im) => !TR.cfg.BUNDLE || TR.packHas(im[0]));
    if (!imgs.length) imgs.push(p.im[0]);
    TR.pushRecent(p.id);
    const fam = TR.family(p);
    const opts = (det.opts || []).filter((x) => x.shown);
    const keys = Object.keys(det.st || {});
    const crumbList = (det.cr || []).map((c) => [c[0], c[1]]).concat([['', p.n]]);
    const sizeSec = (det.sec || []).find((s) => /rozmiar/i.test(s.t));
    const mat = (det.sec || []).find((s) => /skład/i.test(s.t));
    const origin = (det.sec || []).find((s) => /pochodzen/i.test(s.t));
    const txt = (h) => (h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const st0 = TR.stockState(p);

    const optHTML = opts.map((op) => {
      const present = op.values.filter((v) => keys.some((k) => k.split(',').includes(String(v.id))));
      const isSize = guessSizeOpt(op);
      const isColor = !isSize && present.some((v) => v.hex);
      return '<div class="opt" data-opt="' + op.id + '"><div class="opt__head"><span class="opt__label">' + esc(op.label) + ': <b data-optval></b></span>' + (isSize && sizeSec ? '<button class="opt__guide" type="button" data-guide>Tabela rozmiarów</button>' : '') + '</div>' +
        (isSize ? '<div class="sizes">' + present.map((v) => '<button type="button" class="size' + (v.name.length > 5 ? ' wide' : '') + '" data-v="' + v.id + '">' + esc(v.name) + '</button>').join('') + '</div>'
          : isColor ? '<div class="opts" style="display:flex;flex-wrap:wrap;gap:8px">' + present.map((v) => '<button type="button" class="chip" data-v="' + v.id + '"><i class="swatch" style="background:' + esc(v.hex || '#ccc') + '"></i>' + esc(v.name) + '</button>').join('') + '</div>'
            : '<div class="opts" style="display:flex;flex-wrap:wrap;gap:8px">' + present.map((v) => '<button type="button" class="chip" data-v="' + v.id + '">' + esc(v.name) + '</button>').join('') + '</div>') + '</div>';
    }).join('');

    const famHTML = fam.length > 1 ? '<div class="opt"><div class="opt__head"><span class="opt__label">Kolor: <b>' + esc(p.cl || '') + '</b></span><span class="opt__label">' + fam.length + ' warianty</span></div><div class="colors">' + fam.map((x) => '<a class="color' + (x.id === p.id ? ' on' : '') + '" href="' + TR.url(x) + '" title="' + esc(x.n) + '"><span class="color__img">' + TR.img(x.im[0], 400, x.n) + '</span>' + esc(x.cl || '') + '</a>').join('') + '</div></div>' : '';

    const sections = (det.sec || []).filter((s) => s !== sizeSec);
    const vids = det.vid || [];
    const vidHTML = vids.map((v) => TR.cfg.BUNDLE
      ? '<a class="video-link" href="https://www.youtube.com/watch?v=' + esc(v) + '" target="_blank" rel="noopener"><i>' + ICON.play + '</i>Zobacz film o produkcie na YouTube</a>'
      : '<button class="video-link" type="button" data-yt="' + esc(v) + '" style="width:100%"><i>' + ICON.play + '</i>Odtwórz film o produkcie</button>').join('');

    const html = '<div class="wrap"><div class="pdp">' +
      '<div class="gal"><div class="gal__grid" id="gal">' + imgs.map((im, i) => '<button type="button" class="gal__item' + (i > 0 ? ' rv' : '') + '" data-gi="' + i + '" aria-label="Powiększ zdjęcie ' + (i + 1) + '" data-cursor="Powiększ">' + TR.img(im, 1000, p.n + ' — zdjęcie ' + (i + 1), '', i === 0 ? ' fetchpriority="high" data-sizes="(min-width:1000px) 55vw, 86vw"' : ' data-sizes="(min-width:1000px) 28vw, 86vw"') + '</button>').join('') + '</div>' +
        '<div class="gal__dots" id="galDots">' + imgs.map((_, i) => '<i' + (i === 0 ? ' class="on"' : '') + '></i>').join('') + '</div></div>' +
      '<div class="buy">' + crumbs(crumbList.slice(0, -1)).replace('class="crumbs"', 'class="crumbs buy__crumbs"') +
        '<h1>' + esc(p.n) + '</h1>' +
        '<div class="buy__price" id="price"></div>' +
        '<p class="buy__paypo"><b>PayPo</b> Kup teraz, zapłać za 30 dni — bez dodatkowych kosztów</p>' +
        famHTML + optHTML +
        '<div class="stockline" id="stockline"></div>' +
        '<div class="buy__row"><div class="qty"><button type="button" data-pq="-1" aria-label="Zmniejsz ilość">−</button><span id="pqty">1</span><button type="button" data-pq="1" aria-label="Zwiększ ilość">+</button></div>' +
          '<button class="btn" type="button" id="addBtn"><span>Dodaj do koszyka</span></button>' +
          '<button class="wish-big' + (TR.isWish(p.id) ? ' on' : '') + '" type="button" data-wish="' + p.id + '" aria-label="Dodaj do ulubionych" aria-pressed="' + TR.isWish(p.id) + '">' + ICON.heart + '</button></div>' +
        '<ul class="perks"><li>' + ICON.truck + '<span>Wysyłka w ' + esc(det.dl || '24h').replace('24h', '24 h') + ' · DPD, InPost lub odbiór w Mierzynie</span></li><li>' + ICON.swap + '<span>14 dni na zwrot lub wymianę rozmiaru</span></li><li>' + ICON.needle + '<span>Zaprojektowane i szyte w Polsce</span></li><li>' + ICON.card + '<span>BLIK, karta, PayPal, PayPo, przelew lub pobranie</span></li></ul>' +
        (mat || origin ? '<div class="highlights">' + (mat ? '<div><b>Skład</b>' + esc(txt(mat.h)).slice(0, 140) + '</div>' : '') + (origin ? '<div><b>Pochodzenie</b>' + esc(txt(origin.h)).slice(0, 140) + '</div>' : '') + (det.sku ? '<div><b>Kod</b><span class="num" id="skuCode">' + esc(det.sku) + '</span></div>' : '') + '</div>' : '') +
        '<div class="acc">' +
          (det.intro || vids.length ? '<details open><summary>Opis</summary><div class="acc__body rich">' + TR.rich(det.intro) + vidHTML + '</div></details>' : '') +
          sections.map((s) => '<details><summary>' + esc(s.t) + '</summary><div class="acc__body rich"><div class="table-wrap">' + TR.rich(s.h) + '</div></div></details>').join('') +
          (sizeSec ? '<details><summary>Tabela rozmiarów</summary><div class="acc__body rich">' + TR.rich(sizeSec.h) + '</div></details>' : '') +
          '<details><summary>Wysyłka i zwroty</summary><div class="acc__body rich"><ul><li>DPD kurier — 17,50 zł (za pobraniem 21,99 zł)</li><li>Paczkomaty InPost — 15,50 zł (za pobraniem 18,50 zł)</li><li>Odbiór osobisty w Mierzynie (ul. Welecka 13) — bezpłatnie</li><li>Zwrot lub wymiana w ciągu 14 dni od otrzymania paczki</li></ul><p><a href="/strona/wymiana-i-zwroty">Jak zwrócić lub wymienić produkt</a></p></div></details>' +
        '</div>' +
      '</div></div></div>' +
      '<section class="sec sec--bone" id="pdpMore"></section>' +
      '<div class="sticky-buy" id="stickyBuy">' + TR.img(p.im[0], 400, '') + '<div><p>' + esc(p.n) + '</p><span id="stickyPrice">' + pln(p.p) + '</span></div><button class="btn" type="button" id="stickyAdd"><span>Do koszyka</span></button></div>';

    return TR.mount(html, o, (root) => {
      const sb = $('#stickyBuy', root);
      TR.loadNow(sb);
      TR.richImgs(root);
      const sel = {};
      let qty = 1;
      // preselect single-value or hidden options
      (det.opts || []).forEach((op) => {
        const present = op.values.filter((v) => keys.some((k) => k.split(',').includes(String(v.id))));
        if (!op.shown || present.length === 1) sel[op.id] = present[0] && String(present[0].id);
      });
      const optEls = $$('[data-opt]', root);
      const matchKeys = (s) => keys.filter((k) => { const ids = k.split(','); return Object.values(s).every((v) => !v || ids.includes(v)); });
      const current = () => {
        const need = opts.filter((op) => !sel[op.id]);
        if (need.length && opts.length) return { need };
        if (!keys.length) return { v: { key: '', label: '', price: p.p, stock: p.av ? 99 : 0, buy: p.av } };
        const m = matchKeys(sel);
        if (m.length !== 1) return { need: opts };
        const v = TR.variantInfo(p, det, m[0]);
        v.buy = !!det.st[m[0]][1];
        return { v };
      };
      const update = () => {
        optEls.forEach((el) => {
          const id = +el.dataset.opt;
          const op = opts.find((x) => x.id === id);
          $$('[data-v]', el).forEach((b) => {
            const trial = Object.assign({}, sel, { [id]: b.dataset.v });
            const ks = matchKeys(trial);
            const buyable = ks.some((k) => det.st[k][1]);
            const low = ks.length === 1 && det.st[ks[0]][1] && det.st[ks[0]][0] > 0 && det.st[ks[0]][0] <= 2;
            b.classList.toggle('out', !buyable);
            b.classList.toggle('on', sel[id] === b.dataset.v);
            b.setAttribute('aria-pressed', sel[id] === b.dataset.v);
            const sm = b.querySelector('small');
            if (low && b.classList.contains('size')) { if (!sm) b.insertAdjacentHTML('beforeend', '<small>' + (det.st[ks[0]][0] === 1 ? 'ostatnia' : 'ostatnie') + '</small>'); } else if (sm) sm.remove();
          });
          const v = op.values.find((x) => String(x.id) === sel[id]);
          $('[data-optval]', el).textContent = v ? v.name : 'wybierz';
        });
        const c = current();
        const price = c.v ? c.v.price : p.p;
        const regular = p.r && p.r > price ? p.r : null;
        $('#price', root).innerHTML = (regular ? '<b class="sale num">' + pln(price) + '</b><del class="num">' + pln(regular) + '</del><span class="badge badge--sale">−' + Math.round((1 - price / regular) * 100) + '%</span><span class="buy__omni">Najniższa cena z 30 dni przed obniżką: ' + pln(p.o || regular) + '</span>' : '<b class="num">' + pln(price) + '</b>');
        $('#stickyPrice', sb).textContent = pln(price);
        const sl = $('#stockline', root), add = $('#addBtn', root);
        sl.className = 'stockline';
        if (c.need) {
          sl.innerHTML = st0 === 'out' ? '<i></i>Produkt chwilowo niedostępny' : '<i></i>Wybierz ' + c.need.map((x) => x.label.toLowerCase()).join(' i ') + ', a pokażemy dostępność';
          if (st0 === 'out') sl.classList.add('out');
          add.querySelector('span').textContent = st0 === 'out' ? 'Powiadom o dostępności' : 'Dodaj do koszyka';
        } else if (c.v.buy && c.v.stock !== 0) {
          const low = c.v.stock > 0 && c.v.stock <= 2;
          sl.innerHTML = '<i></i>' + (low ? (c.v.stock === 1 ? 'Ostatnia sztuka' : 'Ostatnie ' + c.v.stock + ' sztuki') + ' — wysyłka w 24 h' : 'Dostępny — wysyłka w 24 h');
          if (low) sl.classList.add('low');
          add.querySelector('span').textContent = 'Dodaj do koszyka · ' + pln(price * qty);
          if (det.sku && c.v.code && $('#skuCode', root)) $('#skuCode', root).textContent = c.v.code;
        } else {
          sl.classList.add('out');
          sl.innerHTML = '<i></i>Brak w tym wariancie — zapiszemy Cię na powiadomienie';
          add.querySelector('span').textContent = 'Powiadom o dostępności';
        }
        $('#pqty', root).textContent = qty;
      };
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-opt] [data-v]');
        if (b) { const id = b.closest('[data-opt]').dataset.opt; sel[id] = sel[id] === b.dataset.v && opts.length > 1 ? null : b.dataset.v; update(); }
        const q = e.target.closest('[data-pq]');
        if (q) { const c = current(); const max = c.v && c.v.stock > 0 ? c.v.stock : 99; qty = TR.clamp(qty + +q.dataset.pq, 1, max); update(); }
        const g = e.target.closest('[data-gi]');
        if (g) TR.lightbox(imgs, +g.dataset.gi, p.n);
        if (e.target.closest('[data-guide]') && sizeSec) TR.richImgs(TR.modal('<div class="modal__pad rich"><h2>Tabela rozmiarów</h2>' + TR.rich(sizeSec.h) + '<p class="muted" style="margin-top:14px">Wszystkie produkty mierzone są na płasko, wymiary w cm. Podwój pomiar, aby uzyskać obwód.</p></div>'));
        const yt = e.target.closest('[data-yt]');
        if (yt) yt.outerHTML = '<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/' + yt.dataset.yt + '?autoplay=1&rel=0" title="Film o produkcie" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
        const im = e.target.closest('.rich img');
        if (im && im.src) TR.modal('<div class="modal__pad"><img src="' + im.src + '" alt=""></div>');
      });
      const addFn = (fromSticky) => {
        const c = current();
        if (c.need) {
          if (st0 === 'out') return notify();
          const el = optEls.find((x) => !sel[x.dataset.opt]);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-4px)' }, { transform: 'none' }], { duration: 420 }); }
          if (fromSticky) TR.toast('<span>Najpierw wybierz ' + c.need.map((x) => x.label.toLowerCase()).join(' i ') + '</span>');
          return;
        }
        if (!c.v.buy || c.v.stock === 0) return notify(c.v);
        TR.addToCart(p, c.v, qty, $('#gal img', root));
      };
      const notify = (v) => {
        const box = TR.modal('<div class="modal__pad"><h2>Powiadom mnie o dostępności</h2><p class="muted">' + esc(p.n) + (v && v.label ? ' · ' + esc(v.label) : '') + '</p><form id="notifyForm" class="fields" style="margin-top:20px" novalidate><div class="field full"><label for="nEmail">E-mail</label><input id="nEmail" type="email" required placeholder="imie@domena.pl"></div><div class="full"><button class="btn" type="submit"><span>Zapisz powiadomienie</span></button></div><p class="full muted" id="nMsg" role="status"></p></form></div>');
        $('#notifyForm', box).addEventListener('submit', (e) => {
          e.preventDefault();
          const em = $('#nEmail', box).value.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { $('#nMsg', box).textContent = 'Wpisz poprawny adres e-mail.'; return; }
          const list = TR.store.get('notify', []); list.push({ id: p.id, v: v ? v.key : '', em, t: Date.now() }); TR.store.set('notify', list);
          $('#nMsg', box).textContent = 'Gotowe. Napiszemy na ' + em + ', gdy produkt wróci.';
        });
      };
      $('#addBtn', root).addEventListener('click', () => addFn(false));
      $('#stickyAdd', sb).addEventListener('click', () => addFn(true));
      update();
      // sticky bar after the buy button leaves the screen
      const obs = new IntersectionObserver(([e]) => sb.classList.toggle('on', !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      obs.observe($('#addBtn', root));
      TR.onLeave(() => { obs.disconnect(); sb.remove(); });
      document.body.appendChild(sb);
      // tall buy column: stick by its bottom edge so the accordions stay reachable
      const buy = $('.buy', root);
      const fit = () => { const vh = window.innerHeight, hh = buy.offsetHeight; buy.style.top = hh + 90 > vh ? (vh - hh - 24) + 'px' : ''; };
      const bro = new ResizeObserver(fit); bro.observe(buy); window.addEventListener('resize', fit);
      TR.onLeave(() => { bro.disconnect(); window.removeEventListener('resize', fit); });
      // zoom origin follows the cursor
      $$('.gal__item', root).forEach((it) => it.addEventListener('mousemove', (e) => { const r = it.getBoundingClientRect(); it.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%'); it.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%'); }));
      // mobile gallery dots
      const gal = $('#gal', root), dots = $$('#galDots i', root);
      gal.addEventListener('scroll', () => { const i = Math.round(gal.scrollLeft / (gal.scrollWidth / imgs.length)); dots.forEach((d, j) => d.classList.toggle('on', j === i)); }, { passive: true });
      TR.loadNow(gal.firstElementChild);
      // more products
      const more = $('#pdpMore', root);
      const seen = new Set([p.id].concat(fam.map((x) => x.id)));
      const pool = [];
      (det.cr || []).slice().reverse().forEach((c) => { const k = D.catBySlug.get(c[0]); if (k) TR.catProducts(k).forEach((x) => { if (!seen.has(x.id) && x.av) { seen.add(x.id); pool.push(x); } }); });
      const look = pool.filter((x) => x.fam !== p.fam).slice(0, 12);
      const recent = S.recent.filter((id) => id !== p.id).map((id) => D.byId.get(id)).filter(Boolean).slice(0, 8);
      more.innerHTML = (look.length ? '<div class="wrap"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Z tej samej kategorii</p><h2>Uzupełnij <em>stylizację</em></h2></div><div class="rail__ctrl"><button class="rail__btn" data-rail="-1" aria-label="Przewiń w lewo">' + ICON.left + '</button><button class="rail__btn" data-rail="1" aria-label="Przewiń w prawo">' + ICON.right + '</button></div></div><div class="rail"><div class="rail__track">' + look.map((x) => TR.card(x)).join('') + '</div><div class="rail__bar"><i></i></div></div></div>' : '') +
        (recent.length ? '<div class="wrap" style="margin-top:80px"><div class="sec__head"><div class="sec__head-l"><p class="eyebrow">Historia</p><h2>Ostatnio <em>oglądane</em></h2></div></div><div class="rail"><div class="rail__track">' + recent.map((x) => TR.card(x)).join('') + '</div></div></div>' : '');
      if (!look.length && !recent.length) more.remove();
      TR.hydrate(more); TR.reveal(more); TR.rail(more);
    });
  }
  TR.route((p) => D.bySlug.get(p.slice(1).toLowerCase()) || null, (p, o) => productView(p, o));

  /* ============================== INFO PAGES ============================== */
  const PAGE_GROUPS = [
    ['#trueriderbrand', ['about-us', 'philosophy', 'values', 'mission-vision', 'technologie', 'ambassadors', 'partners', 'trueriderbrand', 'video']],
    ['Zakupy', ['order', 'sposoby-platnosci', 'wymiana-i-zwroty', 'tabela-rozmiarow', 'zamowienia-indywidualne', 'faq', 'contact']],
    ['Dokumenty', ['rules', 'privacy-policy', 'policy_cookies', 'copyright']],
  ];
  const PAGE_TITLES = { 'about-us': 'O nas', philosophy: 'Filozofia', values: 'Wartości', 'mission-vision': 'Misja i wizja', technologie: 'Technologie', ambassadors: 'Ambasadorzy', partners: 'Partnerzy', trueriderbrand: 'True Rider Brand', video: 'Wideo', order: 'Dostawa', 'sposoby-platnosci': 'Płatności', 'wymiana-i-zwroty': 'Wymiana i zwroty', 'tabela-rozmiarow': 'Tabela rozmiarów', 'zamowienia-indywidualne': 'Personalizacja', faq: 'FAQ', contact: 'Kontakt', rules: 'Regulamin', 'privacy-policy': 'Polityka prywatności', policy_cookies: 'Polityka cookies', copyright: 'Prawa autorskie' };
  async function pageView(slug, o) {
    const pages = await TR.loadPages();
    const pg = pages[slug];
    if (!pg) return notFound(o);
    title(pg.t);
    const tw = pg.t.split(' ');
    const h1 = tw.length > 1 ? esc(tw.slice(0, -1).join(' ')) + ' <em>' + esc(tw[tw.length - 1]) + '</em>' : '<em>' + esc(pg.t) + '</em>';
    let body = pg.h;
    let extra = '';
    if (slug === 'contact') {
      extra = '<div class="contact-grid"><div class="contact-card"><span>Obsługa klienta</span><b>+48 519 559 462</b><p>Zamówienia internetowe, zwroty, rozmiary</p></div><div class="contact-card"><span>Kluby i hurt</span><b>+48 601 562 806</b><p>Zamówienia klubowe i sprzedaż hurtowa</p></div><div class="contact-card"><span>E-mail</span><b>orders@truerider.eu</b><p>Odpowiadamy w dni robocze</p></div><div class="contact-card"><span>Sklep stacjonarny</span><b>ul. Welecka 13, Mierzyn</b><p>Wjazd od ul. Topolowej · pn–pt 9:00–17:00</p></div></div>';
      body = body.replace(/<p>\s*Tagi[\s\S]*$/i, '');
    }
    if (slug === 'faq') body = faqify(body);
    const aside = PAGE_GROUPS.map((g) => '<div style="margin-bottom:22px"><h4>' + g[0] + '</h4>' + g[1].filter((s) => pages[s]).map((s) => '<a href="/strona/' + s + '"' + (s === slug ? ' class="on"' : '') + '>' + esc(PAGE_TITLES[s] || pages[s].t) + '</a>').join('') + '</div>').join('');
    const html = '<div class="wrap">' + crumbs([['', pg.t]]) + '<header class="page-hero"><h1 data-split>' + h1 + '</h1></header><div class="page-body"><nav class="page-aside" aria-label="Informacje">' + aside + '</nav><article class="page-content rich rv">' + extra + TR.rich(body) + '</article></div></div>';
    return TR.mount(html, o, (root) => {
      TR.richImgs(root);
      $$('.page-content a[href]', root).forEach((a) => {
        const h = a.getAttribute('href');
        const m = h.match(/^https?:\/\/(?:www\.)?truerider\.eu(\/[^#?]*)/);
        if (m) a.setAttribute('href', m[1]);
        else if (/^https?:/.test(h)) { a.target = '_blank'; a.rel = 'noopener'; }
      });
      $$('.page-content img', root).forEach((im) => { im.loading = 'lazy'; if (TR.cfg.BUNDLE && /^https?:/.test(im.src)) im.remove(); });
      $$('.page-content iframe', root).forEach((f) => { if (TR.cfg.BUNDLE) f.outerHTML = '<a class="video-link" href="' + f.src.replace('/embed/', '/watch?v=') + '" target="_blank" rel="noopener"><i>' + ICON.play + '</i>Zobacz film na YouTube</a>'; });
    });
  }
  function faqify(h) {
    h = h.replace(/<hr\s*\/?>/g, '');
    const parts = h.split(/<p>\s*<strong>([^<]{4,120}\?)\s*<\/strong>\s*<\/p>/);
    if (parts.length < 3) return h;
    let out = parts[0] + '<div class="acc faq">';
    for (let i = 1; i < parts.length; i += 2) out += '<details' + (i === 1 ? ' open' : '') + '><summary>' + esc(parts[i]) + '</summary><div class="acc__body rich">' + parts[i + 1] + '</div></details>';
    return out + '</div>';
  }
  TR.route((p) => { const m = p.match(/^\/strona\/([^/]+)$/); return m ? m[1] : null; }, (slug, o) => pageView(slug, o));

  /* ============================== 404 ============================== */
  function notFound(o) {
    title('Nie znaleziono');
    const pick = D.products.filter((p) => p.av).slice(0, 4);
    return TR.mount('<div class="wrap"><div class="notfound"><div><b>404</b><h1 class="h-m display" style="margin:10px 0">Zrzutka na tej przeszkodzie</h1><p class="muted">Tej strony nie ma — mogła zmienić adres po przeprowadzce sklepu.</p><p style="margin-top:22px"><a class="btn" href="/">Wróć na start</a></p></div></div><div class="grid" style="margin-bottom:100px">' + pick.map((p) => TR.card(p)).join('') + '</div></div>', o);
  }
  TR.notFound = notFound;
})();
