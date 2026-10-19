const { exitAndPlay } = require('./exit-flow.fixture.cjs');
const { continueWinFeedback } = require('./chat-delivery.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const { witnesses } = require('../docs/qa/resource-endings.json');
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
async function click(page, side = 'left') {
  await page.clock.runFor(12000);
  await page.locator(`[data-choice="${side}"]`).click();
  await continueWinFeedback(page);
}
for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: new attempt survives Saved, replay preserves its fillers, Back restores the old attempt`, async () => {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      const w = witnesses.founder_low;
      await page.goto(`${url}?test=route&seed=${w.seed}`);
      await page.waitForFunction(() => window.MistakeryApp?.state);
      await page.clock.install(); await page.clock.pauseAt(new Date());
      const initial = await snapshot(page);
      await click(page); await click(page);
      for (const step of w.steps) await click(page, step.side);
      const ended = await snapshot(page);
      assert.equal(ended.endingId, 'founder_low');
      await exitAndPlay(page);
      const next = await snapshot(page);
      assert.notEqual(String(next.seed), String(initial.seed));
      assert.notEqual(next.route.order[0], initial.route.order[0]);
      assert.ok(next.route.recentFillerUnits.length > 0);
      assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
      await page.locator('[data-test-back]').click();
      assert.equal(await page.evaluate(() => MistakeryApp.view), 'title');
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await snapshot(page), ended);
      // Replay restores the starting layout of the OLD attempt after crossing Back.
      await page.locator('[data-test-restart]').click();
      assert.deepEqual(await snapshot(page), initial);
      await click(page); await click(page);
      for (const step of w.steps) await click(page, step.side);
      await exitAndPlay(page);
      assert.deepEqual(await snapshot(page), next, 'redoing Start again uses the same next layout');
      assert.deepEqual(await snapshot(page), next, 'Play goes directly to the prepared plot');
      await page.locator('[data-test-restart]').click();
      assert.deepEqual(await snapshot(page), next, 'Restart story replays the CURRENT attempt');
      assert.equal(await page.locator('[data-test-back]').isDisabled(), true);
      // Repeat an actual filler episode through both replay paths.
      const paths = [];
      for (let repeat = 0; repeat < 2; repeat++) {
        await click(page); await click(page);
        const path = [];
        for (let turn = 0; turn < 25; turn++) {
          const before = await snapshot(page);
          if (before.gameOver) break;
          path.push(before.currentCardId);
          const side = await page.evaluate(() => {
            const a = MistakeryApp, card = a.deck.cards.find(c => c.id === a.state.currentCardId);
            // Refuse Live Agent, otherwise follow the main plot toward an outcome.
            return card.id === 'LIVE_AGENT_01' ? 'right' : 'left';
          });
          await click(page, side);
          if ((await snapshot(page)).fillerCards.length >= 2) break;
        }
        paths.push({ path, state: await snapshot(page) });
        await page.locator('[data-test-restart]').click();
        assert.deepEqual(await snapshot(page), next);
      }
      assert.deepEqual(paths[0], paths[1]);
      assert.ok(paths[0].state.fillerCards.length >= 2, 'the replay covers real filler selections');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
  test(`${name}: ordinary Start again changes the opening even with a fixed URL seed`, async () => {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: 'reduce' });
      const w = witnesses.cash_low;
      await page.clock.install();
      await page.goto(`${url}?seed=${w.seed}`);
      await page.waitForFunction(() => window.MistakeryApp?.state);
      await page.clock.pauseAt(new Date());
      const initial = await snapshot(page);
      await page.locator('[data-title-play]').waitFor();
      await page.clock.runFor(300);
      await page.locator('[data-title-play]').click();
      for (let i = 0; i < 5; i++) await click(page);
      for (const step of w.steps) await click(page, step.side);
      assert.equal((await snapshot(page)).endingId, 'cash_low');
      await exitAndPlay(page);
      const next = await snapshot(page);
      assert.notEqual(next.seed, initial.seed);
      assert.notEqual(next.currentCardId, initial.currentCardId);
      assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
      assert.deepEqual(await snapshot(page), next);
      assert.equal(await page.locator('[data-test-controls]').isVisible(), false);
    } finally { await browser.close(); }
  });
}
