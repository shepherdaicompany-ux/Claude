// End-to-end flow: mega menu, search, filters, product -> cart -> checkout -> confirmation, info pages.
// node tools/flow.js <baseUrl> <outDir>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [base, out] = process.argv.slice(2);
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pl-PL' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ORB|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const shot = (n) => p.screenshot({ path: `${out}/f-${n}.png` });
  const step = (s) => console.log('→', s);
  await p.goto(base + '/', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(2200);
  step('mega menu'); await p.hover('#nav li:nth-child(2) a'); await p.waitForTimeout(900); await shot('mega');
  await p.mouse.move(700, 700); await p.waitForTimeout(400);
  step('search'); await p.click('#openSearch'); await p.waitForTimeout(500); await p.fill('#searchInput', 'marta winter'); await p.waitForTimeout(1500); await shot('search');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  step('category + filters'); await p.click('#nav a[href="/kobieta"]'); await p.waitForTimeout(1800);
  await p.click('#openFilters'); await p.waitForTimeout(600);
  await p.click('#filters [data-fs="M"]'); await p.waitForTimeout(300);
  const fc = await p.$('#filters [data-fc]'); if (fc) await fc.click();
  await p.waitForTimeout(500); await shot('filters');
  await p.click('#fApply'); await p.waitForTimeout(1200); await shot('filtered');
  console.log('count after filter:', await p.textContent('#lcount'));
  step('product'); await p.goto(base + '/legginsy-marta-rose-gold-diamond', { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1500);
  await p.click('#addBtn'); await p.waitForTimeout(600); // no size → shake
  const sizeBtn = await p.$('.sizes .size:not(.out)');
  await sizeBtn.click(); await p.waitForTimeout(300);
  console.log('stock:', await p.textContent('#stockline'));
  await p.click('#addBtn'); await p.waitForTimeout(1200); await shot('added');
  await p.click('#openCart'); await p.waitForTimeout(900); await shot('cart');
  console.log('cart lines:', await p.$$eval('#cartBody .line', (l) => l.length));
  step('checkout'); await p.click('#cartFoot a.btn'); await p.waitForTimeout(1500);
  await p.fill('#email', 'anna.kowalska@example.com'); await p.fill('#fname', 'Anna'); await p.fill('#lname', 'Kowalska'); await p.fill('#phone', '600 100 200');
  await p.fill('#locker', 'SZN01M'); await p.waitForTimeout(900);
  await p.fill('#code', 'TRUERIDER5'); await p.click('#codeBtn'); await p.waitForTimeout(400);
  await p.check('#terms'); await shot('checkout');
  await p.click('#placeBtn'); await p.waitForTimeout(2000); await shot('done');
  console.log('done url:', p.url());
  step('pages'); for (const pg of ['/strona/faq', '/strona/contact', '/strona/about-us', '/pl/new', '/ulubione', '/nie-ma-takiej-strony']) { await p.goto(base + pg, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(1300); await shot(pg.replace(/\W+/g, '_')); }
  // mobile menu
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await m.newPage(); await mp.goto(base + '/', { waitUntil: 'load', timeout: 60000 }); await mp.waitForTimeout(2000);
  await mp.click('#burger'); await mp.waitForTimeout(700); await mp.click('.mnav__body details summary'); await mp.waitForTimeout(500); await mp.screenshot({ path: `${out}/f-mnav.png` });
  console.log('errors:\n' + errs.join('\n'));
  await b.close();
})();
