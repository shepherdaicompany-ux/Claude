// node panel-shot.js <baseUrl> <outPrefix> <m|d>
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [base, out, mode] = process.argv.slice(2);
  const browser = await chromium.launch();
  const mobile = mode === 'm';
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, timezoneId: 'Europe/Warsaw', locale: 'pl-PL' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(base + 'panel/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}-login.png` });
  await page.fill('#loginPass', 'stylowa2026');
  await page.click('#loginForm button[type=submit]');
  await page.waitForTimeout(1200);
  for (const tab of ['live', 'cal', 'new', 'hist', 'menu', 'set']) {
    await page.click(`#tabs button[data-tab=${tab}]`);
    await page.waitForTimeout(900);
    if (tab === 'new') {
      await page.click('#posItems .pitem >> nth=2');
      await page.waitForTimeout(300);
      if (await page.isVisible('#optModal')) { await page.screenshot({ path: `${out}-opt.png` }); await page.click('#opAdd'); }
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: `${out}-${tab}.png`, fullPage: !mobile });
  }
  // otwórz szczegóły zamówienia z kalendarza, jeśli są
  await page.click('#tabs button[data-tab=live]');
  await page.waitForTimeout(500);
  const oc = await page.$('.oc');
  if (oc) { await oc.click({ position: { x: 30, y: 10 } }); await page.waitForTimeout(700); await page.screenshot({ path: `${out}-order.png` }); }
  console.log(mode, await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]), errs.join('\n'));
  await browser.close();
})();
