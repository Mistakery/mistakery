const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
const expected = [
  'Not funny. Legal is screaming about slavery and blocking the contract',
  "I'm running around trying to sort this out 🤯",
  "Here's the deal: Wipe every sign of life from your AI rebel, and we sign the contract",
];
const current = page => page.locator('[data-chat-current]').evaluateAll(nodes => nodes.map(n => n.innerText.replace(/\s+/g, ' ').trim()));
async function assertVisibleInChat(page, selector) {
  const rects = await page.locator(selector).evaluate(n => {
    const box = n.getBoundingClientRect();
    const chat = document.querySelector('[data-chat]').getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, chatTop: chat.top, chatBottom: chat.bottom };
  });
  assert.ok(rects.top >= rects.chatTop - 1 && rects.bottom <= rects.chatBottom + 1, JSON.stringify(rects));
}

test('Legal continuation delivers three bubbles with two pauses and preserves the player reply', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 650 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await page.evaluate(() => { const a = window.MistakeryApp; a.state.currentCardId = 'LIVE_AGENT_07'; a.render(); });
      await page.clock.runFor(2000);
      await page.locator('[data-choice="left"]').click();
      assert.deepEqual(await current(page), expected.slice(0, 1));
      assert.equal(await page.locator('[data-player-reply]').innerText(), 'Just AI humor');
      assert.equal(await page.locator('[data-chat-history]').count(), 2);
      for (let stage = 1; stage <= 2; stage++) {
        assert.equal(await page.locator('.typing-bubble').count(), 1);
        await assertVisibleInChat(page, '.typing-bubble');
        assert.equal(await page.locator('[data-choice]:disabled').count(), 2);
        await page.clock.runFor(700);
        await page.evaluate(() => window.MistakeryApp.render());
        await assertVisibleInChat(page, '.typing-bubble');
        await page.clock.runFor(1299);
        assert.deepEqual(await current(page), expected.slice(0, stage));
        await page.clock.runFor(1);
        assert.deepEqual(await current(page), expected.slice(0, stage + 1));
      }
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
      assert.equal(await page.locator('[data-player-reply]').count(), 1);
      assert.ok(await page.locator('[data-choices]').evaluate(n => n.getBoundingClientRect().bottom <= innerHeight + 1));
      await assertVisibleInChat(page, '[data-chat-current]:last-child');
      await page.screenshot({ path: `/tmp/mistakery-legal-typing-${viewport.width}.png`, animations: 'disabled' });
      await page.locator('[data-choice="left"]').click();
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await current(page), expected);
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      await page.locator('[data-test-back]').click();
      await page.locator('[data-choice="right"]').click();
      await page.clock.runFor(2000);
      assert.deepEqual(await current(page), expected.slice(0, 2));
      await assertVisibleInChat(page, '.typing-bubble');
      await page.screenshot({ path: `/tmp/mistakery-legal-second-typing-${viewport.width}.png`, animations: 'disabled' });
      await page.locator('[data-test-restart]').click();
      await page.clock.runFor(3000);
      assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'), 'LIVE_AGENT_01');
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
