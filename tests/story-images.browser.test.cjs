const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

for (const scenario of [
  { label: 'Live Agent', prefix: '/assets/live-agent-', cards: ['LIVE_AGENT_04', 'LIVE_AGENT_07', 'LIVE_AGENT_OUTCOME_2', 'LIVE_AGENT_OUTCOME_4'] },
  { label: 'AI Influencer', prefix: '/assets/ai-influencer-', cards: ['INFLUENCER_06', 'INFLUENCER_07', 'INFLUENCER_08', 'INFLUENCER_OUTCOME_2', 'INFLUENCER_OUTCOME_3', 'INFLUENCER_OUTCOME_4'] },
]) {
test(`slow ${scenario.label} pictures are decoded before play and ready on the first card render`, { timeout: 15000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  let release;
  const heldPictures = new Promise(resolve => { release = resolve; });
  try {
    const page = await browser.newPage();
    let pictureRequests = 0;
    await page.route('http://mistakery.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      if (pathname.startsWith(scenario.prefix)) { pictureRequests++; await heldPictures; }
      const contentType = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      await route.fulfill({ path: file, contentType });
    });
    await page.goto('http://mistakery.test/?story=live-agent', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    await page.waitForFunction(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/avatar-')).length === 12);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(pictureRequests, scenario.cards.length);
    assert.equal(await page.evaluate(() => MistakeryApp.view), 'loading', 'play must wait for its story pictures');
    release();
    await page.waitForFunction(() => MistakeryApp.view === 'playing');
    for (const id of scenario.cards) {
      const pictures = await page.evaluate(async id => {
        const chat = document.querySelector('[data-chat]');
        const inspect = () => [...chat.querySelectorAll('.message-image')].map(image => ({
          complete: image.complete, width: image.naturalWidth, decoding: image.decoding,
        }));
        MistakeryApp.influencerPreviousCardId = 'INFLUENCER_04';
        MistakeryApp.state.currentCardId = id; MistakeryApp.render();
        if (inspect().length) return inspect();
        // Some pictures arrive after a scripted typing pause. Inspect the insertion,
        // without waiting for a load event or calling decode in the assertion.
        return new Promise(resolve => {
          const observer = new MutationObserver(() => {
            const pictures = inspect();
            if (pictures.length) { observer.disconnect(); resolve(pictures); }
          });
          observer.observe(chat, { childList: true, subtree: true });
        });
      }, id);
      assert.equal(pictures.length, 1, id);
      assert.ok(pictures.every(image => image.complete && image.width > 0 && image.decoding === 'sync'), `${id}: picture must be ready in the same render as the caption`);
    }
    assert.equal(pictureRequests, scenario.cards.length, 'card transitions must reuse the prepared pictures');
  } finally { release(); await browser.close(); }
});
}

test('stalled story pictures cannot block play forever or pop into an existing message later', { timeout: 15000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  let release;
  const heldPictures = new Promise(resolve => { release = resolve; });
  try {
    const page = await browser.newPage();
    await page.route('http://mistakery.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      if (/^\/assets\/(live-agent|ai-influencer)-/.test(pathname)) await heldPictures;
      const contentType = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      await route.fulfill({ path: file, contentType });
    });
    await page.goto('http://mistakery.test/?story=live-agent', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MistakeryApp?.view === 'playing', null, { timeout: 6500 });
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'LIVE_AGENT_04'; MistakeryApp.render(); });
    assert.equal(await page.locator('[data-chat] .message-image').count(), 0);
    assert.equal(await page.locator('[data-asset-reference="placeholder_founder_photo"] [role="img"]').textContent(), 'Image unavailable');
    assert.match(await page.locator('[data-asset-reference="placeholder_founder_photo"] .message-caption').textContent(), /bank account/);
    release();
    await page.waitForFunction(() => performance.getEntriesByType('resource').filter(entry => /\/assets\/(live-agent|ai-influencer)-/.test(entry.name)).length === 10);
    await page.evaluate(() => MistakeryApp.render());
    assert.equal(await page.locator('[data-chat] .message-image').count(), 0, 'a late response must not replace the stable fallback');
    await page.evaluate(() => { MistakeryApp.influencerPreviousCardId = 'INFLUENCER_04'; MistakeryApp.state.currentCardId = 'INFLUENCER_06'; MistakeryApp.render(); });
    assert.equal(await page.locator('[data-chat] .message-image').count(), 0);
    assert.equal(await page.locator('[data-chat] .image-bubble [role=\"img\"]').textContent(), 'Image unavailable');
  } finally { release(); await browser.close(); }
});
