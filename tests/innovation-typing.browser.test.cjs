const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
const expected = [
  'Hi! I just received an email from you guys',
  "Your AI attacked me personally. Still can't get over it. It’s disgusting, honestly",
  'But damn, it works so well! 🔥🔥🔥',
  "I'm from the Innovation Department — we need about 500 custom AI agents to replace our entire staff. Can you build this?",
];
async function messages(page) {
  return page.locator('[data-chat] .message').evaluateAll(nodes => nodes.map(node => node.innerText.replace(/\s+/g, ' ').trim()));
}
test('innovation DM delivers two bubbles, typing, then two more; rerender, Back and Restart remain safe', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 650 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await page.evaluate(() => {
        const app = window.MistakeryApp;
        app.state.currentCardId = 'LIVE_AGENT_04B';
        app.render();
      });
      await page.locator('[data-choice="left"]').click();
      assert.deepEqual(await messages(page), expected.slice(0, 2));
      assert.equal(await page.locator('.typing-bubble i').count(), 3);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 2);
      await page.clock.runFor(700);
      await page.evaluate(() => window.MistakeryApp.render());
      assert.deepEqual(await messages(page), expected.slice(0, 2));
      await page.clock.runFor(1300);
      assert.deepEqual(await messages(page), expected);
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
      await page.clock.runFor(400);
      const geometry = await page.evaluate(() => {
        const chat = document.querySelector('[data-chat]');
        return { pageOverflow: document.documentElement.scrollWidth - innerWidth,
          chatOverflow: chat.scrollWidth - chat.clientWidth,
          choicesBottom: document.querySelector('[data-choices]').getBoundingClientRect().bottom };
      });
      assert.ok(geometry.pageOverflow <= 1 && geometry.chatOverflow <= 1 && geometry.choicesBottom <= viewport.height + 1, JSON.stringify(geometry));
      if (viewport.width === 390) await page.screenshot({ path: '/tmp/mistakery-innovation-delivered.png', animations: 'disabled' });
      await page.locator('[data-choice="left"]').click();
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await messages(page), expected, 'Back restores delivered messages');
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      await page.locator('[data-test-back]').click();
      await page.locator('[data-choice="left"]').click();
      assert.equal(await page.locator('.typing-bubble').count(), 1);
      await page.locator('[data-test-restart]').click();
      await page.clock.runFor(2000);
      assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'), 'LIVE_AGENT_01');
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.equal(await page.locator('[data-chat]').getByText('But damn, it works so well! 🔥🔥🔥').count(), 0);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
});
