// Zrzuty ekranu: node shot.js <url> <outPrefix> [script]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [url, out, mode] = process.argv.slice(2);
  const browser = await chromium.launch();
  const sizes = mode === 'desk' ? [['d', 1366, 860, false]] : mode === 'mob' ? [['m', 390, 844, true]] : [['m', 390, 844, true], ['d', 1366, 860, false]];
  for (const [tag, w, h, mobile] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, timezoneId: 'Europe/Warsaw', locale: 'pl-PL', reducedMotion: process.env.RM ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}-${tag}-hero.png` });
    await page.screenshot({ path: `${out}-${tag}-full.png`, fullPage: true });
    const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    console.log(tag, 'scrollWidth/innerWidth', sw, errs.join('\n'));
    await ctx.close();
  }
  await browser.close();
})();
