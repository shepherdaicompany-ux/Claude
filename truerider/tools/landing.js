// Campaign link checks: node tools/landing.js <baseUrl> <outDir>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [base, out, czaprak] = process.argv.slice(2);
  const b = await chromium.launch(process.env.HTTPS_PROXY ? { args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] } : {});
  const errs = [];
  const run = async (name, url, fn, mobile) => {
    const ctx = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ' pageerror: ' + e.message));
    await p.goto(base + url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(2600);
    if (fn) await fn(p);
    const info = await p.evaluate(() => ({ path: location.pathname + location.hash, lines: document.querySelectorAll('#cartPage .line').length, picks: document.querySelectorAll('#cartPage .pick').length, total: (document.querySelector('#cartPage .sum-row.total .num') || {}).textContent, timer: !!document.querySelector('#cartPage [data-until]'), hello: (document.querySelector('.hello h2') || {}).textContent }));
    console.log(name, JSON.stringify(info));
    await p.screenshot({ path: `${out}/l-${name}.png` });
    await ctx.close();
  };
  await run('size', '/dodaj/legginsy-marta-rose-gold-diamond?rozmiar=XS&rabat=LANDING5&utm_campaign=test');
  await run('nosize', '/dodaj/legginsy-marta-rose-gold-diamond?rabat=LANDING5', async (p) => { await p.click('.pick .size:not(.out)'); await p.waitForTimeout(1200); });
  await run('soldout', '/dodaj/legginsy-marta-rose-gold-diamond?rozmiar=S');
  await run('multi', '/dodaj?p=legginsy-marta-rose-gold-diamond:XS,' + czaprak + '&rabat=LANDING10', null, true);
  await run('missing', '/dodaj/nie-ma-takiego-produktu?rabat=LANDING5');
  await run('reload', '/dodaj/legginsy-marta-rose-gold-diamond?rozmiar=XS', async (p) => { await p.reload(); await p.waitForTimeout(2000); });
  await run('generator', '/generator-linkow', async (p) => {
    await p.fill('#gQ', 'marta rose gold diamond'); await p.waitForTimeout(800);
    await p.click('[data-gadd]'); await p.waitForTimeout(400);
    await p.selectOption('[data-gs="0"]', 'XS'); await p.fill('#gCamp', 'Jesień legginsy'); await p.waitForTimeout(300);
    console.log('generated:', await p.inputValue('#gLink'));
    await p.screenshot({ path: `${out}/l-generator-form.png` });
    await p.click('#gTest'); await p.waitForTimeout(2500);
  });
  console.log('errors:\n' + errs.join('\n'));
  await b.close();
})();
