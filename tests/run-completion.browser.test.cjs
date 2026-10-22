const { playFromTitle } = require('./exit-flow.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const fixtures = require('./run-completion.fixture.json');
const { witnesses } = require('../docs/qa/resource-endings.json');
const { completeFounderSend } = require('./chat-delivery.fixture.cjs');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
async function reach(page, witness, beforeLast = false) {
  await page.evaluate(({ witness, beforeLast }) => {
    const a = MistakeryApp;
    clearTimeout(a.introTypingTimer);
    a.state = MistakeryRoute.startRun(a.deck, { seed: witness.seed });
    a.runStartState = structuredClone(a.state);
    const steps = beforeLast ? witness.steps.slice(0, -1) : witness.steps;
    for (const step of steps) {
      if (a.state.gameOver || a.state.currentCardId !== step.card) throw Error('Invalid real-route witness');
      a.state = MistakeryRoute.resolveChoice(a.deck, a.state, step.side).state;
    }
    a.view = 'playing'; a.cardDelivery = null; a.locked = false; a.render();
  }, { witness, beforeLast });
  await page.clock.runFor(20000);
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: mixed outcomes finish at the title without a CEO card or results table`, async () => {
    const browser = await type.launch();
    try {
      for (const [kind, witness] of Object.entries(fixtures)) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(() => localStorage.setItem('mistakery.sound','off'));
        await page.goto(url + '?test=route');
        await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        await reach(page, witness, true);
        const before = await snapshot(page);
        await page.locator(`[data-choice="${witness.steps.at(-1).side}"]`).click();
        await completeFounderSend(page, true);
        const end = await snapshot(page);
        assert.equal(end.endingId, 'run_complete');
        assert.equal(end.gameOver, true); assert.equal(end.win, false);
        assert.equal(end.route.completed.length, 3); assert.equal(end.route.cycle, 1);
        assert.equal(end.history.length, before.history.length + 1);
        assert.equal(end.resources.cash, before.resources.cash - .5);
        assert.equal(await page.locator('[data-founder-invitation]').count(), 0);
        if (kind === 'success') await page.locator('[data-win-finale-choice]').first().click();
        assert.equal(await page.locator('.founder-card').count(), 0);
        assert.equal(await page.locator('[data-run-result]').count(), 0);
        assert.equal(await page.locator('[data-run-summary]').count(), 0);
        assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
        assert.equal(await page.locator('[data-title-continue]').count(),0);
        assert.deepEqual(await snapshot(page),end);
        assert.ok(Object.keys(await page.evaluate(()=>MistakeryApp.progress.wins)).length<3);
        await page.clock.runFor(60000);
        await page.evaluate(() => MistakeryApp.render());
        assert.deepEqual(await snapshot(page), end, 'finish never starts or spends another run');
        assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
        assert.equal((await page.locator('[data-title-new]').textContent()).trim(),'New run');
        for (const viewport of [{ width: 320, height: 650 }, { width: 1280, height: 900 }]) {
          await page.setViewportSize(viewport);
          assert.equal(await page.evaluate(() => {
            const button = document.querySelector('[data-title-new]').getBoundingClientRect();
            return document.documentElement.scrollWidth <= innerWidth + 1
              && button.bottom <= innerHeight + 1 && button.top >= 0;
          }), true);
          if (process.env.MISTAKERY_QA_DIR && name === 'Chromium') {
            fs.mkdirSync(process.env.MISTAKERY_QA_DIR, { recursive: true });
            await page.screenshot({ path: path.join(process.env.MISTAKERY_QA_DIR, `complete-${kind}-${viewport.width}.png`) });
          }
        }
        await page.clock.runFor(300);
        await page.locator('[data-title-new]').press('Enter');
        const next = await snapshot(page);
        assert.equal(next.gameOver, false); assert.equal(next.history.length, 0);
        assert.notEqual(next.seed, end.seed); assert.notEqual(next.route.initialPlot, end.route.initialPlot);
        assert.deepEqual(next.resources, { cash: 25, team: 60, customers: 15, founder: 65 });
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await snapshot(page), end);
        assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: exit opens title after loss; Judgment Day and New run start fresh`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('mistakery.sound','off'));
      await page.goto(url + '?test=route');
      await page.waitForFunction(() => window.MistakeryApp?.state);
      await page.clock.install(); await page.clock.pauseAt(new Date());
      for (const id of ['cash_low', 'judgment_day']) {
        await reach(page, witnesses[id]);
        const end = await snapshot(page);
        if (id === 'cash_low') {
          await page.locator('[data-choice="left"]').click();
          await page.locator('[data-finale-choice]').first().click();
        } else {
          await page.locator('[data-choice="left"]').click();
          assert.equal((await snapshot(page)).gameOver,false);continue;
        }
        assert.equal(await page.locator('[data-quit-dialog][open]').count(),1);
        await page.locator('[data-quit-confirm]').click();
        await page.clock.runFor(60000);
        assert.deepEqual(await snapshot(page), end);
        assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
        assert.equal((await page.locator('[data-title-new]').textContent()).trim(),'New run');
        await playFromTitle(page);
        assert.equal((await snapshot(page)).gameOver, false);
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
      }
      await reach(page, witnesses.cash_low);
      const end = await snapshot(page);
      await page.locator('[data-choice="right"]').click();
      await page.locator('[data-finale-choice]').nth(1).click();
      const next = await snapshot(page);
      assert.equal(next.gameOver, false); assert.notEqual(next.seed, end.seed);
      assert.equal(next.history.length, 0);
    } finally { await browser.close(); }
  });
}
