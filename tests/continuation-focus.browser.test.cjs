const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;

async function assertContinuationVisible(page) {
  await page.locator('[data-chat]').evaluate(async node => {
    await Promise.all(node.getAnimations({ subtree: true }).map(animation => animation.finished));
  });
  const layout = await page.locator('[data-chat]').evaluate(chat => {
    const bounds = chat.getBoundingClientRect();
    return [...chat.querySelectorAll('[data-chat-current]')].map(node => {
      const rect = node.getBoundingClientRect();
      return { text: node.textContent, top: rect.top, bottom: rect.bottom, chatTop: bounds.top, chatBottom: bounds.bottom };
    });
  });
  for (const rect of layout) assert.ok(rect.top >= rect.chatTop - 1 && rect.bottom <= rect.chatBottom + 1, JSON.stringify(rect));
  const photo = await page.locator('[data-chat-current] img').evaluate(image => ({
    width: image.clientWidth, height: image.clientHeight,
    naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
    bubbleWidth: image.closest('.image-bubble').clientWidth,
  }));
  assert.ok(Math.abs(photo.height - photo.width * photo.naturalHeight / photo.naturalWidth) <= 1,
    `Photo must preserve its original proportions: ${JSON.stringify(photo)}`);
  assert.equal(photo.width, photo.bubbleWidth, 'photo must fill its bubble without side bars');
}

test('photo continuation stays fully visible with animation, rerender and viewport resize', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.evaluate(() => { MistakeryApp.state.currentCardId = 'LIVE_AGENT_03'; MistakeryApp.render(); });
      await page.locator('.typing-bubble').waitFor({ state: 'detached' });
      await page.locator('[data-choice="left"]').click();
      await assertContinuationVisible(page);
      for (const viewport of [{ width: 320, height: 650 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await assertContinuationVisible(page);
        await page.evaluate(() => MistakeryApp.render());
        await assertContinuationVisible(page);
        await page.screenshot({ path: `/tmp/mistakery-continuation-${viewport.width}-${reducedMotion}.png` });
      }
      await page.close();
    }
  } finally { await browser.close(); }
});
