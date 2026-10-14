// Screenshots + console errors: node tools/shot.js <baseUrl> <outDir> [paths...]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [base, out, ...paths] = process.argv.slice(2);
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { args: ['--proxy-server=' + process.env.HTTPS_PROXY, '--proxy-bypass-list=127.0.0.1;localhost'] } : {});
  const sizes = (process.env.SIZES || 'd').split(',').map((s) => (s === 'm' ? ['m', 390, 844, true] : ['d', 1440, 900, false]));
  for (const [tag, w, h, mobile] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL' });
    const page = await ctx.newPage();
    if (process.env.BLOCK) await page.route(new RegExp(process.env.BLOCK), (r) => r.abort());
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    page.on('requestfailed', (r) => errs.push('failed: ' + r.url().slice(0, 140) + ' ' + (r.failure() || {}).errorText));
    page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ' ' + r.url().slice(0, 140)); });
    for (const p of paths) {
      const name = p.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
      await page.goto(base + p, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => errs.push('goto ' + e.message));
      await page.waitForTimeout(+process.env.WAIT || 2500);
      if (process.env.FULL) {
        // scroll through so lazy images and reveals fire
        const H = await page.evaluate(() => document.body.scrollHeight);
        for (let y = 0; y < H; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(140); }
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(800);
        await page.screenshot({ path: `${out}/${tag}-${name}-full.png`, fullPage: true });
      }
      await page.screenshot({ path: `${out}/${tag}-${name}.png` });
      if (process.env.TOUR) {
        const H = await page.evaluate(() => document.body.scrollHeight);
        let k = 0;
        for (let y = h; y < H - 200 && k < 14; y += h * 0.95, k++) {
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await page.waitForTimeout(1600);
          await page.screenshot({ path: `${out}/${tag}-${name}-t${String(k).padStart(2, '0')}.png` });
        }
      }
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      console.log(tag, p, 'overflow:', sw[0] > sw[1] ? sw : 'no');
    }
    console.log(tag, 'errors:\n' + errs.join('\n'));
    await ctx.close();
  }
  await browser.close();
})();
