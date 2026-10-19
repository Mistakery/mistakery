const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://mistakery.test/';

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
 for (const heldFile of ['app.js', 'assets/mistakery-logo-optimized.png']) {
  test(`${name}: startup never exposes chat while ${heldFile} is loading`, { timeout: 20000 }, async () => {
   const browser = await engine.launch();
   let release, requested;
   const held = new Promise(resolve => { release = resolve; });
   const arrived = new Promise(resolve => { requested = resolve; });
   try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
    await page.route(origin + '**', async route => {
     const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
     if (relative === heldFile) { requested(); await held; }
     await route.fulfill({ path: path.join(root, relative), contentType: ({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(relative)] || 'text/html' });
    });
    await page.goto(origin, { waitUntil: 'commit' });
    await arrived;
    await page.locator('[data-scene]').waitFor({ state: 'attached' });
    assert.equal(await page.locator('[data-scene]').isVisible(), false, 'chat must be hidden before the first title');
    assert.equal(await page.locator('[data-title-play]').count(), 0, 'no active Play before startup completes');
    await page.waitForFunction(() => {
     const status = document.querySelector('[data-startup-status]');
     return status && getComputedStyle(status).opacity === '1';
    });
    assert.equal(await page.locator('[data-startup-status]').innerText(), 'Loading…');
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement?.getAttribute('data-sound-toggle')), '', 'hidden chat controls cannot receive focus');
    // WebKit screenshots wait for document.fonts.ready, which waits for the held
    // request. Both engines still run every visibility and interaction assertion.
    if (process.env.MISTAKERY_QA_DIR && name === 'Chromium') await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`${name}-${path.basename(heldFile)}-loading.png`),timeout:5000});
    release();
    await page.locator('[data-title-play]').waitFor();
    assert.equal(await page.locator('.title-logo').evaluate(n => n.complete && n.naturalWidth > 0), true);
    assert.equal(await page.locator('[data-startup-screen]').isVisible(), false);
    assert.equal(await page.locator('[data-scene]').isVisible(), false);
    await page.waitForFunction(() => !MistakeryApp.locked);
    await page.locator('[data-title-play]').click();
    assert.equal(await page.locator('[data-scene]').isVisible(), true, 'intro appears only after Play');
   } finally { release(); await browser.close(); }
  });
 }
 test(`${name}: failed startup shows its error without exposing chat`, async () => {
  const browser = await engine.launch();
  try {
   const page = await browser.newPage();
   await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
   await page.route(origin + '**', async route => {
    const relative = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if (relative === 'cards.bundle.js') return route.fulfill({contentType:'text/javascript',body:'window.MISTAKERY_DECK = {};'});
    await route.fulfill({path:path.join(root,relative),contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(relative)]||'text/html'});
   });
   await page.goto(origin);
   await page.waitForFunction(() => document.querySelector('[data-startup-status]')?.textContent.startsWith('Could not start Mistakery:'));
   assert.equal(await page.locator('[data-startup-status]').evaluate(n => getComputedStyle(n).opacity), '1');
   assert.equal(await page.locator('[data-scene]').isVisible(), false);
   assert.equal(await page.locator('[data-title-play]').count(), 0);
  } finally { await browser.close(); }
 });
}
