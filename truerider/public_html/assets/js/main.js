/* True Rider storefront — boot */
(function () {
  'use strict';
  const TR = window.TR;
  const { $, $$ } = TR;
  document.documentElement.classList.add('js');
  $('#year').textContent = new Date().getFullYear();
  // stagger the intro letters
  $$('.intro__word span').forEach((s, i) => s.style.setProperty('--i', i));
  // duplicate the top bar text so the marquee loops seamlessly
  const tb = $('#topbarTrack'); tb.innerHTML += tb.innerHTML;
  // remember scroll per history entry so Back lands where the visitor was
  window.addEventListener('scroll', TR.debounce(() => { try { history.replaceState({ y: window.scrollY }, ''); } catch (e) { /* sandboxed frame */ } }, 150), { passive: true });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  TR.route(() => true, (m, o) => TR.notFound(o));

  const intro = $('#intro');
  const seen = TR.store.get('introSeen', 0) > Date.now() - 1000 * 60 * 30;
  const t0 = performance.now();
  const minIntro = seen || TR.reduced() ? 0 : 1300;

  TR.loadCatalog().then(async () => {
    TR.buildNav();
    TR.counts();
    TR.renderCart();
    await TR.render();
    const wait = Math.max(0, minIntro - (performance.now() - t0));
    setTimeout(() => {
      intro.classList.add('out');
      setTimeout(() => intro.remove(), 950);
      TR.store.set('introSeen', Date.now());
    }, wait);
  }).catch((err) => {
    console.error(err);
    intro.remove();
    $('#main').innerHTML = '<div class="wrap"><div class="empty" style="padding-block:140px"><h3>Nie udało się wczytać katalogu</h3><p class="muted">Sprawdź połączenie z internetem i odśwież stronę.</p><button class="btn" type="button" onclick="location.reload()"><span>Odśwież</span></button></div></div>';
  });
})();
