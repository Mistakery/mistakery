const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
 test(`${name}: cold slow logo is ready on the first title frame; pending Quit can be cancelled`, { timeout: 20000 }, async () => {
  const browser = await type.launch();
  let release;
  const held = new Promise(resolve => { release = resolve; });
  try {
   const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
   let requested = false;
   await page.route('http://mistakery.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/mistakery-logo.png')) { requested = true; await held; }
    const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
    const ext = path.extname(file);
    await route.fulfill({ path: file, contentType: ({'.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.js':'text/javascript','.css':'text/css'})[ext] || 'text/html' });
   });
   await page.goto('http://mistakery.test/?test=route', { waitUntil: 'domcontentloaded' });
   await page.waitForFunction(() => window.MistakeryApp?.state);
   const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
   assert.equal(requested, true, 'request the logo before the first exit');
   await page.locator('[data-restart-run]').click();
   await page.locator('[data-quit-confirm]').click();
   await page.waitForTimeout(150);
   const frame = await page.evaluate(() => ({view:MistakeryApp.view, logo:!!document.querySelector('.title-logo')?.naturalWidth, prompt:!!document.querySelector('.title-prompt')}));
   console.log(`${name}: held image response, first exit frame: ${JSON.stringify(frame)}`);
   assert.notEqual(frame.view, 'title', 'never show Tap to play before its logo is decoded');
   await page.keyboard.press('Escape');
   release();
   await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => e.name.endsWith('/mistakery-logo.png')));
   await page.waitForTimeout(100);
   assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
   assert.equal(await page.evaluate(() => MistakeryApp.view), 'saved', 'cancelled async exit must not navigate later');
   await page.locator('[data-restart-run]').click();
   await page.locator('[data-quit-confirm]').click();
   await page.waitForFunction(() => MistakeryApp.view === 'title');
   assert.equal(await page.locator('.title-logo').evaluate(n => n.complete && n.naturalWidth > 0), true);
   const prompt = page.locator('.title-prompt');
   assert.ok(await prompt.evaluate(n => parseFloat(getComputedStyle(n).fontSize)) >= 24);
   assert.ok(await prompt.evaluate(n => n.getAnimations().length) > 0);
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await prompt.evaluate(n => n.getAnimations().length), 0);
   await page.waitForTimeout(300);
   await page.locator('[data-title-play]').dispatchEvent('click', {detail:2});
   assert.equal(await page.evaluate(() => MistakeryApp.view), 'title', 'exit double tap cannot activate Play');
   assert.equal(await page.locator('[data-title-play]').evaluate(n => !n.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',repeat:true,bubbles:true,cancelable:true}))), true, 'held Enter must cancel native activation');
   assert.equal(await page.evaluate(() => MistakeryApp.view), 'title');
   await page.keyboard.press('Enter');
   await page.waitForFunction(() => MistakeryApp.view === 'playing');
   const next = await page.evaluate(() => structuredClone(MistakeryApp.state));
   assert.equal(next.history.length, 0);
   assert.notEqual(next.seed, before.seed);
   await page.keyboard.press('Enter');
   assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), next);
   await page.locator('[data-restart-run]').click();
   await page.locator('[data-quit-confirm]').click();
   await page.waitForFunction(() => MistakeryApp.view === 'title');
   await page.waitForTimeout(300);
   await page.keyboard.press('Space');
   await page.waitForFunction(() => MistakeryApp.view === 'playing');
  } finally { release(); await browser.close(); }
 });
}

test('failed logo keeps Quit cancellable and can be retried without losing the run', {timeout:15000}, async () => {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage();
  let attempts = 0;
  await page.route('http://mistakery.test/**', async route => {
   const pathname = new URL(route.request().url()).pathname;
   if (pathname.endsWith('/mistakery-logo.png') && ++attempts === 1) return route.fulfill({status:404,body:''});
   const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
   const ext = path.extname(file);
   await route.fulfill({path:file,contentType:({'.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.js':'text/javascript','.css':'text/css'})[ext]||'text/html'});
  });
  await page.goto('http://mistakery.test/?test=route');
  await page.waitForFunction(() => window.MistakeryApp?.state);
  const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
  await page.locator('[data-restart-run]').click();
  await page.locator('[data-quit-confirm]').click();
  await page.locator('[data-quit-dialog] [role="status"]').waitFor();
  assert.equal(await page.locator('[data-quit-confirm]').isEnabled(), true);
  assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
  await page.locator('[data-quit-cancel]').click();
  await page.locator('[data-restart-run]').click();
  await page.locator('[data-quit-confirm]').click();
  await page.waitForFunction(() => MistakeryApp.view === 'title');
  assert.equal(await page.locator('.title-logo').evaluate(n => n.complete && n.naturalWidth > 0), true);
  assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
 } finally {await browser.close();}
});
