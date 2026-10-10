const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const source = require('./loss-finale-source.fixture.cjs');
const { witnesses } = require('../docs/qa/resource-endings.json');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
// Owner confirmed the current button labels for the three renamed Doc replies.
const mapping = { DOC_LOSS_1: [0, 1], DOC_LOSS_2: [1, 0], DOC_LOSS_3: [1, 0],
  DOC_LOSS_4: [1, 0], DOC_LOSS_5: [0, 1], DOC_LOSS_6: [1, 0] };
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: finale copy follows both resource replies in preview and regular game`, async () => {
    const browser = await type.launch();
    try {
      for (const preview of [true, false]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(url + (preview ? '?preview=losses' : '?test=route'));
        await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        await page.clock.runFor(1000);
        for (const [id, order] of Object.entries(mapping)) {
          for (const [index, side] of ['left', 'right'].entries()) {
            if (preview) await page.locator('[data-loss-select]').selectOption(id);
            else await page.evaluate(w => {
              const a = MistakeryApp;
              a.state = MistakeryRoute.startRun(a.deck, { seed: w.seed });
              for (const step of w.steps) a.state = MistakeryRoute.resolveChoice(a.deck, a.state, step.side).state;
              a.view = 'ended'; a.cardDelivery = null; a.render();
            }, witnesses[['cash_low', 'team_low', 'team_high', 'customers_low', 'founder_low', 'founder_high'][Number(id.slice(-1)) - 1]]);
            // Cancel and restart delivery before choosing; stale callbacks must not show a finale.
            await page.clock.runFor(100);
            await page.evaluate(() => MistakeryApp.render());
            await page.clock.runFor(15000);
            assert.equal(await page.locator('[data-loss-finale]').count(), 0);
            await page.locator('[data-test-inspect]').click();
            const ru = source.find(card => card.id === id).ru;
            const inspected = await page.locator('[data-details-body] > p').allTextContents();
            assert.deepEqual(inspected.slice(2, 6), ru, `${id}: current shared RU translation`);
            await page.locator('[data-details-close]').click();
            const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
            await page.locator(`[data-choice="${side}"]`).click();
            const expected = source.find(card => card.id === id).responses[order[index]].en;
            assert.deepEqual(await page.locator('[data-loss-finale] .message p').allTextContents(), expected, `${preview ? 'preview' : 'game'} ${id} ${side}`);
            assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
            await page.keyboard.press('Escape');
            await page.evaluate(() => MistakeryApp.render());
            await page.clock.runFor(20000);
            assert.equal(await page.locator('[data-loss-finale]').count(), 0);
            assert.equal(await page.locator('[data-player-reply]').count(), 1);
            assert.equal(await page.locator('[data-choice]:enabled').count(), 0);
            assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
          }
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
}
