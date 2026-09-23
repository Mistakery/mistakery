const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit, devices } = require('playwright');
const base = process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
async function snapshot(page) {
  return page.evaluate(() => { const a = window.MistakeryApp; return { state: a.state, score: a.liveAgentScore, padel: a.padelCeoScore, previous: a.influencerPreviousCardId, view: a.view }; });
}
async function geometry(page) {
  return page.locator('[data-game]').evaluate(n => ({ width: n.clientWidth, height: n.clientHeight,
    contact: n.querySelector('.contact').offsetHeight, choices: n.querySelector('[data-choices]').offsetHeight }));
}
async function rotate(page, angle) {
  await page.setViewportSize(angle ? { width: 844, height: 390 } : { width: 390, height: 844 });
  await page.evaluate(angle => { window.testAngle = angle; window.dispatchEvent(new Event('orientationchange')); }, angle);
  await page.waitForTimeout(80);
}
async function assertVisible(page, selector) {
  const node = typeof selector === 'string' ? page.locator(selector) : selector;
  const rect = await node.evaluate(n => {
    const a = n.getBoundingClientRect(), b = document.querySelector('[data-chat]').getBoundingClientRect();
    return { left: a.left, right: a.right, top: a.top, bottom: a.bottom,
      chatLeft: b.left, chatRight: b.right, chatTop: b.top, chatBottom: b.bottom };
  });
  assert.ok(rect.left >= rect.chatLeft - 1 && rect.right <= rect.chatRight + 1
    && rect.top >= rect.chatTop - 1 && rect.bottom <= rect.chatBottom + 1, JSON.stringify(rect));
}
for (const [name, engine, device] of [['Chromium', chromium, 'Pixel 7'], ['WebKit', webkit, 'iPhone 13']]) {
  test(`${name}: phone keeps portrait layout in both rotations without notices or losing progress`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ ...devices[device], viewport: { width: 390, height: 844 } });
      await page.addInitScript(() => { window.testAngle = 0; Object.defineProperty(Object.getPrototypeOf(screen.orientation), 'angle', { get: () => window.testAngle }); });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${base}?story=live-agent`);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.locator('[data-choice="left"]').tap();
      await page.waitForFunction(() => !window.MistakeryApp.locked);
      const before = await snapshot(page), originalGeometry = await geometry(page);
      await page.locator('[data-test-inspect]').tap();
      for (const angle of [90, 270]) {
        await rotate(page, angle);
        assert.deepEqual(await geometry(page), originalGeometry, 'layout must stay portrait sized');
        assert.equal(await page.locator('[data-portrait-guard]').count(), 0, 'no rotation notices');
        assert.deepEqual(await snapshot(page), before);
        assert.equal(await page.locator('[data-test-details]').isVisible(), true);
        const app = await page.locator('[data-app]').evaluate(n => ({ transform: getComputedStyle(n).transform, inert: n.inert }));
        assert.equal(app.inert, false);
        assert.match(app.transform, angle === 90 ? /matrix\(0, -1, 1, 0,/ : /matrix\(0, 1, -1, 0,/);
        const rect = await page.locator('[data-test-details]').boundingBox();
        assert.ok(rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= 845 && rect.y + rect.height <= 391, JSON.stringify(rect));
      }
      await page.locator('[data-details-close]').tap();
      await page.locator('[data-choice="left"]').tap();
      assert.notEqual((await snapshot(page)).state.currentCardId, before.state.currentCardId);
      await page.locator('[data-test-back]').tap();
      assert.deepEqual(await snapshot(page), before);
      await rotate(page, 0);
      assert.deepEqual(await geometry(page), originalGeometry);
      assert.deepEqual(await snapshot(page), before);
      // Padel text must use the full portrait height even in a horizontal viewport.
      await page.evaluate(() => { const a = window.MistakeryApp; a.state.currentCardId = 'PADEL_OUTCOME_7'; a.render(); });
      await rotate(page, 90);
      const fits = await page.locator('.irl-chat').evaluate(n => n.querySelector('.irl-dialog').offsetHeight <= n.clientHeight - 40);
      assert.equal(fits, true);
      if (name === 'WebKit') await page.screenshot({ path: '/tmp/mistakery-fixed-portrait.png' });
      // Small-phone breakpoints and both local scroll directions must stay usable.
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      for (const angle of [90, 270]) {
        await page.setViewportSize({ width: 320, height: 650 });
        await page.evaluate(() => { const a = window.MistakeryApp; a.state.currentCardId = 'LIVE_AGENT_01'; a.render(); });
        const smallGeometry = await geometry(page);
        await page.setViewportSize({ width: 650, height: 320 });
        await page.evaluate(angle => { window.testAngle = angle; window.dispatchEvent(new Event('orientationchange')); }, angle);
        assert.deepEqual(await geometry(page), smallGeometry);
        await page.evaluate(() => { const a = window.MistakeryApp; a.state.history = []; a.state.currentCardId = 'LIVE_AGENT_07B'; a.cardDelivery = null; a.render(); });
        await page.clock.runFor(2500);
        await assertVisible(page, '.typing-bubble');
        await page.clock.runFor(2000);
        await assertVisible(page, '[data-chat-current]:last-child');
        // The photo continuation also uses portrait-sized fitting after rotation.
        await page.evaluate(() => { const a = window.MistakeryApp; a.state.currentCardId = 'LIVE_AGENT_03'; a.render(); });
        await page.clock.runFor(2500);
        await page.locator('[data-choice="left"]').tap();
        await page.clock.runFor(600);
        for (const node of await page.locator('[data-chat-current]').all()) await assertVisible(page, node);
      }
      await page.clock.resume();
      // Normal entry also remains playable when initially loaded in landscape.
      await page.goto(base); await page.waitForFunction(() => window.MistakeryApp?.deck && !window.MistakeryApp.locked);
      await page.locator('[data-choice="left"]').tap();
      assert.equal(await page.evaluate(() => window.MistakeryApp.onboardingIndex), 1);
      assert.deepEqual(errors, []);
      const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await desktop.goto(`${base}?story=live-agent`); await desktop.waitForFunction(() => window.MistakeryApp?.deck);
      assert.equal(await desktop.locator('[data-app]').evaluate(n => getComputedStyle(n).transform), 'none');
      await desktop.locator('[data-choice="left"]').click();
      assert.equal((await snapshot(desktop)).state.currentCardId, 'LIVE_AGENT_02');
    } finally { await browser.close(); }
  });
}
