const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const route = require('../route.js');
const deck = require('../cards.json');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const seeds = [...new Map(Array.from({ length: 80 }, (_, seed) => [route.startRun(deck, { seed: String(seed) }).route.order.join(','), seed])).values()];
async function open(page, suffix) {
  await page.goto(url + suffix);
  await page.waitForFunction(() => window.MistakeryApp?.state);
  await page.clock.install(); await page.clock.pauseAt(new Date());
}
async function click(page, side = 'left') {
  await page.clock.runFor(6000);
  await page.locator(`[data-choice="${side}"]`).click();
}
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: normal and route test share Saved timing and the seeded queue`, async () => {
    const browser = await browserType.launch();
    try {
      const states = [];
      for (const prefix of ['?seed=7', '?test=route&seed=7']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await open(page, prefix);
        if (!prefix.includes('test=')) {
          assert.equal(await page.evaluate(() => MistakeryApp.view), 'onboarding');
          for (let i = 0; i < 3; i++) await click(page);
        }
        assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
        await page.locator('[data-choice="left"]').click();
        assert.equal(await page.locator('.note-message').count(), 1);
        await page.clock.runFor(999);
        assert.equal(await page.locator('[data-choice="left"]').isDisabled(), true);
        await page.clock.runFor(1);
        assert.equal(await page.locator('.note-message').count(), 2);
        await page.locator('[data-choice="left"]').click();
        states.push(await snapshot(page));
        assert.ok(!states.at(-1).currentCardId.startsWith('OPEN_'));
        assert.deepEqual(errors, []);
        await page.close();
      }
      assert.deepEqual(states[0], states[1]);
    } finally { await browser.close(); }
  });
  test(`${name}: all six plot orders finish two filler gaps, Back and Restart replay exactly`, async () => {
    const browser = await browserType.launch();
    try {
      for (const seed of seeds) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await open(page, `?test=route&seed=${seed}`);
        const initial = await snapshot(page);
        await click(page); await click(page);
        let count = 0;
        while ((await snapshot(page)).route.cycle === 1 && count++ < 30) {
          const before = await snapshot(page);
          const c = deck.cards.find(c => c.id === before.currentCardId);
          const side = c.plot && !c.outcomeTone ? 'right' : count % 2 ? 'right' : 'left';
          await click(page, side);
          const after = await snapshot(page);
          if (c.filler || c.outcomeTone) {
            await page.locator('[data-test-back]').click();
            assert.deepEqual(await snapshot(page), before);
            await click(page, side);
            assert.deepEqual(await snapshot(page), after);
          }
        }
        const end = await snapshot(page);
        assert.equal(end.gameOver, false);
        assert.equal(end.route.cycle, 2);
        assert.equal(await page.locator('.typing-bubble').count(), 1, 'new cycle replays message delivery');
        assert.equal(await page.locator('[data-choice="left"]').isDisabled(), true);
        assert.deepEqual(end.route.lastCycle.completed, initial.route.order);
        assert.equal(end.route.lastCycle.gaps.length, 2);
        assert.ok(end.route.lastCycle.gaps.every(g => g.played.length === g.target && [4,5].includes(g.target)));
        assert.equal(new Set(end.route.lastCycle.fillers).size, end.route.lastCycle.fillers.length);
        assert.equal(await page.locator('[data-card-id]').textContent(), deck.meta.route.plots[end.route.order[0]]);
        await page.locator('[data-test-restart]').click();
        assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
        assert.deepEqual(await snapshot(page), initial);
        assert.equal(await page.locator('[data-test-back]').isDisabled(), true);
        await page.clock.runFor(15000);
        assert.equal(await page.locator('.note-message').count(), 1, 'no stale plot delivery after restart');
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: route restart/back cancels Saved and filler timers and media fits`, async () => {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await open(page, '?test=route&seed=16');
      await page.locator('[data-choice="left"]').click();
      await page.clock.runFor(500);
      await page.locator('[data-test-back]').click();
      await page.clock.runFor(1000);
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      assert.equal(await page.locator('.note-message').count(), 1);
      await page.locator('[data-choice="right"]').click();
      await page.clock.runFor(500);
      await page.locator('[data-test-restart]').click();
      await page.clock.runFor(1000);
      assert.equal(await page.locator('.note-message').count(), 1);
      for (const c of deck.cards.filter(c => c.filler)) {
        await page.evaluate(id => {
          const a = MistakeryApp; a.state.currentCardId = id; a.view = 'playing'; a.locked = false; a.cardDelivery = null; a.render();
        }, c.id);
        await page.clock.runFor(6000);
        await page.locator('[data-test-inspect]').click();
        assert.ok((await page.locator('[data-details-translation]').innerText()).length > 0);
        await page.locator('[data-details-close]').click();
        const overflow = await page.locator('[data-chat]').evaluate(el => el.scrollWidth - el.clientWidth);
        assert.ok(overflow <= 1, `${c.id} overflows ${overflow}`);
        assert.ok(await page.locator('[data-choice="left"]').isEnabled());
      }
      await page.evaluate(() => {
        const a = MistakeryApp; a.state.currentCardId = 'FILL_VIDEO_2'; a.view = 'playing'; a.cardDelivery = null; a.render();
      });
      await page.locator('.message-image').evaluate(img => img.decode());
      assert.equal(await page.locator('.message-image').evaluate(img => img.naturalWidth), 1200);
      await page.locator('[data-test-restart]').click();
      await page.clock.runFor(15000);
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
