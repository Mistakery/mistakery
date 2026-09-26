const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');

test('the first chat waits for slow avatar requests and displays decoded photos immediately', async () => {
  const browser = await chromium.launch({ headless: true });
  let release;
  const heldAvatars = new Promise(resolve => { release = resolve; });
  try {
    const page = await browser.newPage();
    let avatarRequests = 0;
    await page.route('http://mistakery.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      if (pathname.includes('/avatar-')) { avatarRequests++; await heldAvatars; }
      const contentType = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      await route.fulfill({ path: file, contentType });
    });
    await page.goto('http://mistakery.test/?story=live-agent', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('app.js')));
    assert.ok(avatarRequests > 0);
    assert.equal(await page.evaluate(() => MistakeryApp.view), 'loading', 'chat must not precede its photos');
    release();
    await page.waitForFunction(() => MistakeryApp.view === 'playing');
    const ready = await page.locator('.avatar-photo').evaluateAll(images => images.every(image => image.complete && image.naturalWidth === 128 && image.decoding === 'sync'));
    assert.equal(ready, true, 'the first rendered chat must contain ready photos');
  } finally { release(); await browser.close(); }
});

test('a stalled photo request cannot block play or replace initials later', async () => {
  const browser = await chromium.launch({ headless: true });
  let release;
  const heldAvatars = new Promise(resolve => { release = resolve; });
  try {
    const page = await browser.newPage();
    await page.route('http://mistakery.test/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
      if (pathname.includes('/avatar-')) await heldAvatars;
      const contentType = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.webp') ? 'image/webp' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
      await route.fulfill({ path: file, contentType });
    });
    await page.goto('http://mistakery.test/?story=live-agent', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MistakeryApp?.view === 'playing', null, { timeout: 5000 });
    assert.equal(await page.locator('.avatar-photo').count(), 0);
    assert.equal(await page.locator('[data-source="@bigdeals"] .member-avatar').first().textContent(), 'BD');
    release();
    await page.waitForFunction(() => performance.getEntriesByType('resource').filter(entry => entry.name.includes('/avatar-')).length === 12);
    await page.getByRole('button', { name: 'Restart story' }).click();
    assert.equal(await page.locator('.avatar-photo').count(), 0, 'late photos must not pop into the chat');
  } finally { release(); await browser.close(); }
});

test('character photos load in personal and team chats without changing avatar sizes', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${pathToFileURL(path.join(root, 'index.html')).href}?story=live-agent`);
    await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
    const sales = page.locator('[data-source="@bigdeals"] .member-avatar img').first();
    await sales.waitFor({ timeout: 3000 });
    await sales.evaluate(image => image.decode());
    assert.match(await sales.getAttribute('src'), /avatar-sales\.webp$/);
    const teamSize = await sales.evaluate(image => ({ width: image.clientWidth, height: image.clientHeight }));
    assert.deepEqual(teamSize, { width: 27, height: 27 });

    const teamHeader = page.locator('[data-avatar] img');
    await teamHeader.waitFor({ timeout: 1500 });
    assert.match(await teamHeader.getAttribute('src'), /avatar-dream-team\.webp$/);
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'LIVE_AGENT_02'; MistakeryApp.render(); });
    const bot = page.locator('[data-source="@b2buddy"] .member-avatar img');
    await bot.evaluate(image => image.decode());
    assert.match(await bot.getAttribute('src'), /avatar-b2buddy\.webp$/);

    for (const [cardId, filename] of [['OPEN_01', 'b2buddy'], ['LIVE_AGENT_03', 'b2buddy'], ['OPEN_BOSS', 'exboss'], ['OPEN_INVESTOR', 'investor'], ['INFLUENCER_02', 'ai-influencer']]) {
      await page.evaluate(id => { MistakeryApp.state.currentCardId = id; MistakeryApp.render(); }, cardId);
      for (const selector of ['[data-avatar] img', '[data-message-avatar] img']) {
        const image = page.locator(selector);
        await image.evaluate(image => image.decode());
        assert.match(await image.getAttribute('src'), new RegExp(`avatar-${filename}\\.webp$`));
      }
      const size = await page.locator('[data-avatar] img').evaluate(image => ({ width: image.clientWidth, height: image.clientHeight }));
      assert.deepEqual(size, { width: 36, height: 36 });
    }
    const irlReady = await page.evaluate(() => {
      MistakeryApp.state.currentCardId = 'IRL_PADEL_01'; MistakeryApp.render();
      const image = document.querySelector('[data-avatar] img');
      return image.complete && image.naturalWidth > 0 && image.decoding === 'sync';
    });
    assert.equal(irlReady, true, 'IRL header must use a ready portrait in the first render');
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'OPEN_DEV'; MistakeryApp.render(); });
    assert.match(await page.locator('[data-avatar] img').getAttribute('src'), /avatar-dev\.svg$/);
    assert.match(await page.locator('[data-message-avatar] img').getAttribute('src'), /avatar-dev\.svg$/);
    assert.equal(await page.locator('[data-pinned], .pin-sheet').count(), 0);
    assert.equal(await page.locator('[data-location]').isVisible(), false);
    const headerStable = await page.evaluate(() => {
      const photo = document.querySelector('[data-avatar] img');
      MistakeryApp.render();
      return photo === document.querySelector('[data-avatar] img');
    });
    assert.equal(headerStable, true, 'rerendering the same contact must retain the decoded header photo');
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'PADEL_INVITE'; MistakeryApp.render(); });
    const padelSrc = await page.locator('[data-avatar] img').getAttribute('src');
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'IRL_PADEL_01'; MistakeryApp.render(); });
    assert.equal(await page.locator('[data-avatar] img').getAttribute('src'), padelSrc);
    assert.equal(await page.locator('[data-location]').isVisible(), true);
    assert.ok((await page.locator('[data-location-score]').textContent()).length > 0);

    const sources = await page.evaluate(() => Object.values(MistakeryApp.deck.sources).filter(source => source.avatarImage?.includes('/avatar-')));
    assert.equal(new Set(sources.map(source => source.avatarImage)).size, 12);
    for (const source of sources) {
      assert.ok(fs.statSync(path.join(root, source.avatarImage)).size <= 12 * 1024, `${source.name}: avatar exceeds 12 KB`);
      const dimensions = await page.evaluate(async src => {
        const image = new Image(); image.src = src; await image.decode();
        return [image.naturalWidth, image.naturalHeight];
      }, source.avatarImage);
      assert.deepEqual(dimensions, [128, 128], source.name);
    }
  } finally { await browser.close(); }
});
