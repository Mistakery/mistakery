const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');

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

    for (const [cardId, filename] of [['OPEN_BOSS', 'exboss'], ['OPEN_INVESTOR', 'investor'], ['INFLUENCER_02', 'ai-influencer']]) {
      await page.evaluate(id => { MistakeryApp.state.currentCardId = id; MistakeryApp.render(); }, cardId);
      for (const selector of ['[data-avatar] img', '[data-message-avatar] img']) {
        const image = page.locator(selector);
        await image.evaluate(image => image.decode());
        assert.match(await image.getAttribute('src'), new RegExp(`avatar-${filename}\\.webp$`));
      }
      const size = await page.locator('[data-avatar] img').evaluate(image => ({ width: image.clientWidth, height: image.clientHeight }));
      assert.deepEqual(size, { width: 36, height: 36 });
    }
    await page.evaluate(() => { MistakeryApp.state.currentCardId = 'OPEN_DEV'; MistakeryApp.render(); });
    assert.equal(await page.locator('[data-avatar] img').count(), 0);
    assert.equal(await page.locator('[data-avatar]').textContent(), 'E');

    const sources = await page.evaluate(() => Object.values(MistakeryApp.deck.sources).filter(source => source.avatarImage));
    assert.equal(sources.length, 9);
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
