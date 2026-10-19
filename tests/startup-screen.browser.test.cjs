const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
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
    const firstFrame = await page.evaluate(() => {
     document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 0; });
     return getComputedStyle(document.querySelector('[data-startup-status]')).opacity;
    });
    assert.equal(firstFrame, '1', 'startup feedback is visible from the first frame');
    assert.equal(await page.locator('[data-startup-status]').innerText(), 'Preparing questionable decisions…');
    assert.equal(await page.locator('[data-startup-art]').isVisible(), true);
    assert.equal(await page.locator('[data-startup-art] .startup-typing i').count(), 3);
    assert.deepEqual(await page.locator('[data-startup-art] .startup-typing i').evaluateAll(nodes => nodes.map(n => {
     const s = getComputedStyle(n); return [s.animationName,s.animationDuration,s.animationDelay];
    })), [['typingBlink','1.1s','0s'],['typingBlink','1.1s','0.18s'],['typingBlink','1.1s','0.36s']]);
    const styles = await page.evaluate(() => {
     const reference=document.createElement('div');reference.className='typing-bubble';
     reference.innerHTML='<i></i><i></i><i></i>';document.body.append(reference);
     const read=n=>{const s=getComputedStyle(n);return [s.width,s.height,s.padding,s.gap,s.backgroundColor,s.borderRadius,s.boxShadow];};
     const result={loader:read(document.querySelector('.startup-typing')),messenger:read(reference)};
     reference.remove();return result;
    });
    assert.deepEqual(styles.loader,styles.messenger,'loader uses the existing messenger bubble styling');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('[data-startup-screen]').evaluate(n => n.getAnimations({subtree:true}).length), 0, 'reduced motion keeps the typing dots still');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(() => document.activeElement?.getAttribute('data-sound-toggle')), '', 'hidden chat controls cannot receive focus');
    // WebKit screenshots wait for document.fonts.ready, which waits for the held
    // request. Both engines still run every visibility and interaction assertion.
    if (process.env.MISTAKERY_QA_DIR && name === 'Chromium') await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`${name}-${path.basename(heldFile)}-loading.png`),timeout:5000});
    release();
    await page.locator('[data-title-play]').waitFor();
    assert.equal(await page.locator('.title-logo').evaluate(n => n.complete && n.naturalWidth > 0), true);
    assert.equal(await page.locator('[data-startup-screen]').isVisible(), false);
    assert.equal(await page.locator('.typing-bubble').count(), 0, 'loading dots are not in-game message delivery');
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
   assert.equal(await page.locator('[data-startup-art]').isVisible(), false, 'an error must stop the loading animation');
   assert.equal(await page.locator('[data-scene]').isVisible(), false);
   assert.equal(await page.locator('[data-title-play]').count(), 0);
  } finally { await browser.close(); }
 });
 test(`${name}: typing loader works without external styles, scripts or images`, async () => {
  const browser = await engine.launch();
  try {
   const page = await browser.newPage();
   const requests = [];
   await page.route('**/*', r => {requests.push(r.request().url()); return r.abort();});
   const html = fs.readFileSync(path.join(root,'index.html'),'utf8')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
   await page.setContent(html);
   const dots = page.locator('[data-startup-art] .startup-typing i');
   assert.equal(await dots.count(),3);
   assert.equal(await page.locator('[data-startup-status]').isVisible(),true);
   const animation = await dots.first().evaluate(n => {
    const a=n.getAnimations()[0]; if(!a)return null;
    a.pause();a.currentTime=0;const start=getComputedStyle(n).opacity;
    a.currentTime=330;return {start,peak:getComputedStyle(n).opacity};
   });
   assert.deepEqual(animation,{start:'0.32',peak:'1'});
   assert.deepEqual(requests,[],'loader needs no network requests');
  } finally {await browser.close();}
 });
}
