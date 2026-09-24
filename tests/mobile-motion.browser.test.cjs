const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit, devices } = require('playwright');
const root = path.resolve(__dirname, '..');
const url = `${process.env.MISTAKERY_TEST_URL || pathToFileURL(path.join(root, 'index.html')).href}?story=live-agent`;
async function seed(page, id) {
  await page.evaluate(id => {
    const a = window.MistakeryApp;
    a.state = window.MistakeryEngine.startRun(a.deck);
    a.state.currentCardId = id; a.cardDelivery = null;
    a.liveAgentScore = 5; a.locked = false; a.view = 'playing';
    Math.random = () => 0; a.render();
  }, id);
}
async function start(browser, device, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ ...devices[device], reducedMotion });
  await page.goto(url);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
  return page;
}
for (const [name, engine, device] of [['Chromium', chromium, 'Pixel 7'], ['WebKit', webkit, 'iPhone 13']]) {
  test(`${name}: phone typing keeps desktop cadence under either system motion setting`, async () => {
    const browser = await engine.launch();
    try {
      const page = await start(browser, device, 'reduce');
      await seed(page, 'LIVE_AGENT_05');
      assert.deepEqual(await page.locator('.typing-bubble i').evaluateAll(ns => ns.map(n => getComputedStyle(n).animationName)), ['typingBlink', 'typingBlink', 'typingBlink']);
      assert.match(await page.locator('.typing-bubble').getAttribute('aria-label'), /is typing$/);
      const mobileMotion = await page.locator('.typing-bubble i').evaluateAll(ns => ns.map(n => { const s = getComputedStyle(n); return [s.animationName, s.animationDuration, s.animationDelay, s.animationIterationCount]; }));
      const changes = await page.locator('.typing-bubble i').first().evaluate(async n => { const values = []; for (let i = 0; i < 5; i++) { values.push(getComputedStyle(n).opacity); await new Promise(r => setTimeout(r, 80)); } return new Set(values).size; });
      assert.ok(changes > 1, 'dots must visibly animate on phone');
      const desktop = await start(browser, 'Desktop Chrome');
      await seed(desktop, 'LIVE_AGENT_05');
      assert.deepEqual(await desktop.locator('.typing-bubble i').evaluateAll(ns => ns.map(n => { const s = getComputedStyle(n); return [s.animationName, s.animationDuration, s.animationDelay, s.animationIterationCount]; })), mobileMotion);
      await desktop.close();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      assert.equal(await page.locator('.typing-bubble i').first().evaluate(n => getComputedStyle(n).animationDuration), '1.1s');
      await page.waitForFunction(() => window.MistakeryApp.cardDelivery.delivered);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: raw repeated touch cannot skip outcome in either motion mode; Back and Restart stay available`, async () => {
    const browser = await engine.launch();
    try {
      for (const motion of ['no-preference', 'reduce']) {
        const page = await start(browser, device, motion);
        for (const [from, side, outcome] of [['LIVE_AGENT_08', 'left', 'LIVE_AGENT_OUTCOME_1'], ['LIVE_AGENT_01', 'right', 'LIVE_AGENT_OUTCOME_0']]) {
          await seed(page, from);
          await page.locator(`[data-choice="${side}"]`).tap();
          const before = await page.evaluate(() => structuredClone(window.MistakeryApp.state));
          const box = await page.locator('[data-choice="left"]').boundingBox();
          await page.waitForTimeout(310);
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          assert.equal(await page.evaluate(() => window.MistakeryApp.state.currentCardId), outcome);
          assert.deepEqual(await page.evaluate(() => window.MistakeryApp.state), before);
          if (outcome === 'LIVE_AGENT_OUTCOME_1') {
            await page.waitForTimeout(300);
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
            assert.deepEqual(await page.evaluate(() => window.MistakeryApp.state), before, 'full success glow remains protected under either system setting');
          }
          await page.waitForFunction(() => !window.MistakeryApp.locked, null, { timeout: 1500 });
          await page.locator('[data-choice="left"]').tap();
          await page.locator('[data-test-back]').tap();
          assert.equal(await page.evaluate(() => window.MistakeryApp.state.currentCardId), outcome);
          assert.equal(await page.locator('[data-game]').evaluate(n => n.classList.contains('is-outcome-entering')), false);
          assert.equal(await page.evaluate(() => window.MistakeryApp.locked), false);
        }
        await seed(page, 'LIVE_AGENT_08'); await page.locator('[data-choice="left"]').tap();
        await page.locator('[data-test-restart]').tap();
        assert.equal(await page.evaluate(() => window.MistakeryApp.state.currentCardId), 'LIVE_AGENT_01');
        await page.waitForTimeout(1000);
        assert.equal(await page.evaluate(() => window.MistakeryApp.state.currentCardId), 'LIVE_AGENT_01');
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: image motion waits for decode and stale/error/timeout completions do not animate`, async () => {
    const browser = await engine.launch();
    try {
      // Serve a controlled uncached copy even for file:// so the test exercises real image load/decode.
      const page = await start(browser, device);
      let release;
      await page.route('https://motion.test/image.webp*', async route => {
        await new Promise(resolve => { release = resolve; });
        await route.fulfill({ path: path.join(root, 'assets/live-agent-judgment-day.webp'), contentType: 'image/webp' });
      });
      await page.evaluate(() => {
        window.motionEvents = [];
        document.addEventListener('animationstart', e => { if (e.animationName === 'outcomeSignal') window.motionEvents.push({ ready: e.target.complete && e.target.naturalWidth > 0, card: window.MistakeryApp.state.currentCardId }); });
        // Override only the image URL; actual runtime and rendering remain unchanged.
        window.MistakeryApp.deck.images.placeholder_judgment_day.src = 'https://motion.test/image.webp?case=load';
      });
      await seed(page, 'LIVE_AGENT_OUTCOME_2');
      await page.waitForTimeout(650);
      assert.deepEqual(await page.evaluate(() => window.motionEvents), [], 'must not animate an unloaded photo');
      assert.ok(release, 'image request intercepted'); release();
      await page.waitForFunction(() => window.motionEvents.length === 1);
      assert.deepEqual(await page.evaluate(() => window.motionEvents), [{ ready: true, card: 'LIVE_AGENT_OUTCOME_2' }]);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.MistakeryApp.render());
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.motionEvents.length), 1, 'rerender does not replay');
      for (const action of ['restart', 'timeout', 'reduce']) {
        release = null;
        await page.evaluate(action => { window.MistakeryApp.deck.images.placeholder_judgment_day.src = `https://motion.test/image.webp?case=${action}`; }, action);
        await seed(page, 'LIVE_AGENT_OUTCOME_2');
        await page.waitForTimeout(80);
        assert.ok(release);
        if (action === 'restart') await page.locator('[data-test-restart]').tap();
        if (action === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
        if (action === 'timeout') await page.waitForTimeout(2650);
        release();
        await page.waitForTimeout(550);
        assert.equal(await page.evaluate(() => window.motionEvents.length), action === 'reduce' ? 2 : 1, action);
      }
      await page.unroute('https://motion.test/image.webp*');
      await page.route('https://motion.test/broken.webp', route => route.fulfill({ status: 404, body: '' }));
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => { window.MistakeryApp.deck.images.placeholder_judgment_day.src = 'https://motion.test/broken.webp'; });
      await seed(page, 'LIVE_AGENT_OUTCOME_2');
      await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => window.motionEvents.length), 2);
      await page.locator('[data-choice="left"]').tap();
      assert.equal(await page.evaluate(() => window.MistakeryApp.state.currentCardId), 'OPEN_INVESTOR');
    } finally { await browser.close(); }
  });
}
