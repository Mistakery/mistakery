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
  const clippedHistory = await page.locator('[data-chat-history]').evaluateAll(nodes => nodes.filter(node => {
    const chat = node.closest('[data-chat]');
    const remaining = node.offsetTop + node.offsetHeight - chat.scrollTop;
    const partlyClipped = node.offsetTop < chat.scrollTop && remaining > 0 && remaining <= 24;
    return partlyClipped && getComputedStyle(node).visibility !== 'hidden';
  }).map(node => node.textContent));
  assert.deepEqual(clippedHistory, [], 'partially clipped history must not leave a strip under the header');
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
      await page.locator('[data-chat]').evaluate(async chat => {
        chat.scrollTop = 0;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      assert.equal(await page.locator('[data-chat-history]').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).visibility === 'visible')), true, 'scrolling up must reveal the complete history');
      await page.evaluate(() => MistakeryApp.render());
      for (const viewport of [{ width: 320, height: 650 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await assertContinuationVisible(page);
        await page.evaluate(() => MistakeryApp.render());
        await assertContinuationVisible(page);
        await page.screenshot({ path: `/tmp/mistakery-continuation-${viewport.width}-${reducedMotion}.png` });
      }
      await page.locator('[data-choice="left"]').click();
      assert.equal(await page.locator('[data-card-id]').textContent(), 'LIVE_AGENT_04B');
      const retainedPhoto = page.locator('[data-chat-history] img');
      assert.equal(await retainedPhoto.count(), 1, 'continuing the chat must retain the previous photo');
      const historyPhoto = await retainedPhoto.evaluate(image => {
        const bubble = image.closest('[data-chat-history]');
        const chat = image.closest('[data-chat]');
        return { visibility: getComputedStyle(bubble).visibility,
          visibleHeight: bubble.offsetTop + bubble.offsetHeight - chat.scrollTop };
      });
      assert.ok(historyPhoto.visibleHeight > 24, 'the photo should occupy visible chat space');
      assert.equal(historyPhoto.visibility, 'visible', 'a clipped photo must not disappear leaving blank space');
      await page.locator('[data-chat]').evaluate(async chat => {
        chat.scrollTop = 0;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      assert.equal(await retainedPhoto.evaluate(image => getComputedStyle(image.closest('[data-chat-history]')).visibility), 'visible');
      await page.close();
    }
  } finally { await browser.close(); }
});
