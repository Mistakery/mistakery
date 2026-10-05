const { completeFounderSend } = require('./chat-delivery.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const deck = require('../cards.json');
const { witnesses } = require('../docs/qa/resource-endings.json');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));

for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: refusing either opening offer leaves 9 Cash and opens the filler`, async () => {
    const browser = await browserType.launch();
    try {
      for (const [seed, opener, outcome] of [[681, 'PADEL_INVITE', 'PADEL_OUTCOME_0'], [192, 'INFLUENCER_01', 'INFLUENCER_OUTCOME_1']]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}?test=route&seed=${seed}`);
        await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        for (let n = 0; n < 2; n++) {
          await page.clock.runFor(6000);
          await page.locator('[data-choice="left"]').click();
        }
        assert.equal((await snapshot(page)).currentCardId, opener);
        await page.clock.runFor(6000);
        await page.locator('[data-choice="right"]').click();
        assert.equal((await snapshot(page)).currentCardId, outcome);
        assert.equal((await snapshot(page)).resources.cash, 9.5);
        await page.clock.runFor(6000);
        await page.locator('[data-choice="left"]').click();
        const continued = await snapshot(page);
        assert.equal(continued.resources.cash, 9);
        assert.equal(continued.gameOver, false);
        assert.equal(continued.route.phase, 'fillers');
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
        assert.equal(await page.locator('[data-choice]').count(), 2);
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });

  test(`${name}: real seeded routes reach all endings, read clearly, Back and restart work`, async () => {
    const browser = await browserType.launch();
    try {
      for (const [id, witness] of Object.entries(witnesses)) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${url}?test=route&seed=${witness.seed}`);
        await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        const initial = await snapshot(page);
        await page.locator('[data-choice="left"]').click();
        await page.clock.runFor(1200);
        await page.locator('[data-choice="left"]').click();
        let before;
        for (const step of witness.steps) {
          await page.clock.runFor(6000);
          before = await snapshot(page);
          assert.equal(before.currentCardId, step.card);
          assert.equal(before.gameOver, false);
          await page.locator(`[data-choice="${step.side}"]`).click();
          await completeFounderSend(page, true);
          assert.deepEqual((await snapshot(page)).resources, step.after);
        }
        const ended = await snapshot(page);
        assert.equal(ended.endingId, id);
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'ended');
        if (id === 'judgment_day') {
          assert.equal(await page.locator('[data-card-id]').innerText(), 'LIVE_AGENT_OUTCOME_2');
          assert.match(await page.locator('[data-ending-summary]').innerText(), /GAME OVER · YOU LOST/);
          assert.equal(await page.locator('[data-choice]').innerText(), 'Start again');
          assert.equal(await page.locator('[data-loss-flash], [data-loss-finale]').count(), 0);
        } else {
        const cardId = `DOC_LOSS_${deck.meta.route.resourceEndings.indexOf(id) + 1}`;
        assert.equal(await page.locator('[data-card-id]').innerText(), cardId);
        assert.equal(await page.locator('[data-choice]').count(), 2);
        assert.equal(await page.locator('[data-resource].is-preview').count(), 0);
        await page.clock.runFor(15000);
        assert.equal(await page.locator('[data-loss-flash].is-defeated').count(), 1);
        await page.evaluate(() => MistakeryApp.render());
        assert.deepEqual(await snapshot(page), ended, 'time and rendering cannot spend resources or draw a card');
        await page.locator('[data-test-inspect]').click();
        assert.match(await page.locator('[data-details-body]').innerText(), /@b2buddy/);
        await page.locator('[data-details-close]').click();
        for (const side of ['left', 'right']) {
          // Back to the last real decision, then settle the same ending afresh.
          if (side === 'right') {
            await page.locator('[data-test-back]').click();
            await page.clock.runFor(6000);
            await page.locator(`[data-choice="${witness.steps.at(-1).side}"]`).click();
            await completeFounderSend(page, true);
            await page.clock.runFor(15000);
          }
          await page.locator(`[data-choice="${side}"]`).click();
          await completeFounderSend(page, true);
          assert.equal(await page.locator('[data-loss-finale][open]').count(), 1);
          assert.equal(await page.locator('[data-loss-finale]').getAttribute('data-card'), cardId);
          assert.equal(await page.locator('.loss-finale .message p').count(), 4);
          await page.locator('[data-finale-choice]').nth(side === 'left' ? 0 : 1).click();
          const restarted = await snapshot(page);
          assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
          assert.equal(restarted.gameOver, false);
          assert.notEqual(restarted.seed, ended.seed);
          assert.notEqual(restarted.route.initialPlot, ended.route.initialPlot);
          assert.deepEqual(restarted.resources, initial.resources);
          assert.equal(restarted.history.length, 0, 'skipping Saved costs nothing');
          assert.equal(await page.locator('[data-card-id]').innerText(), restarted.currentCardId);
          assert.equal(await page.locator('[data-loss-flash], [data-loss-finale], [data-loss-preview]').count(), 0);
          await page.clock.runFor(15000);
          assert.deepEqual(await snapshot(page), restarted, 'restart must not answer the opener');
          await page.locator('[data-test-back]').click();
          await page.keyboard.press('ArrowLeft');
          assert.deepEqual(await snapshot(page), ended);
          assert.equal(await page.locator('[data-loss-finale][open]').count(), 0);
          await page.evaluate(() => MistakeryApp.render());
          assert.equal(await page.locator('[data-player-reply]').count(), 1);
          assert.equal(await page.locator('[data-choice]:enabled').count(), 0);
        }
        }
        for (const viewport of [{ width: 320, height: 650 }, { width: 1280, height: 900 }]) {
          await page.setViewportSize(viewport);
          const geometry = await page.evaluate(() => ({
            pageOverflow: document.documentElement.scrollWidth - innerWidth,
            chatOverflow: document.querySelector('[data-chat]').scrollWidth - document.querySelector('[data-chat]').clientWidth,
            button: document.querySelector('[data-choice]').getBoundingClientRect().bottom,
            chatHeight: document.querySelector('[data-chat]').clientHeight,
            chatTop: document.querySelector('[data-chat]').getBoundingClientRect().top,
          }));
          assert.ok(geometry.pageOverflow <= 1 && geometry.chatOverflow <= 1, JSON.stringify(geometry));
          assert.ok(geometry.button <= viewport.height + 1 && geometry.chatHeight > 100, JSON.stringify(geometry));
          if (process.env.MISTAKERY_QA_DIR && name === 'Chromium') {
            fs.mkdirSync(process.env.MISTAKERY_QA_DIR, { recursive: true });
            await page.screenshot({ path: path.join(process.env.MISTAKERY_QA_DIR, `${id}-${viewport.width}.png`) });
          }
        }
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await snapshot(page), before);
        await page.clock.runFor(6000);
        await page.locator(`[data-choice="${witness.steps.at(-1).side}"]`).click();
        await completeFounderSend(page, true);
        assert.deepEqual(await snapshot(page), ended);
        await page.clock.runFor(1000);
        await page.locator(id === 'judgment_day' ? '[data-choice]' : '[data-restart-run]').click();
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'saved');
        assert.equal(await page.locator('[data-loss-flash], [data-loss-finale], [data-loss-preview]').count(), 0);
        const next = await snapshot(page);
        assert.notEqual(String(next.seed), String(initial.seed));
        assert.notEqual(next.route.order[0], initial.route.order[0]);
        assert.deepEqual(next.resources, initial.resources);
        assert.equal(next.gameOver, false);
        await page.locator('[data-test-restart]').click();
        assert.deepEqual(await snapshot(page), next, 'test replay keeps the new attempt');
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
}

for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: ordinary loss delivery, single pulse, Escape and pending-delivery cleanup`, async () => {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 480 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.state);
      await page.clock.install(); await page.clock.pauseAt(new Date());
      // Real decisions and settlement, rendered outside every preview/test mode.
      const reach = async id => page.evaluate(w => {
        const a = MistakeryApp;
        a.state = MistakeryRoute.startRun(a.deck, { seed: w.seed });
        for (const step of w.steps) a.state = MistakeryRoute.resolveChoice(a.deck, a.state, step.side).state;
        a.view = 'ended'; a.cardDelivery = null; a.render();
      }, witnesses[id]);
      await page.clock.runFor(1000);
      await reach('founder_high');
      const ended = await snapshot(page);
      assert.equal(await page.locator('.preview-composer').count(), 1);
      assert.equal(await page.locator('[data-preview-outgoing]').count(), 0);
      assert.equal(await page.locator('[data-loss-flash].is-defeated').count(), 0);
      await page.clock.runFor(650);
      assert.equal(await page.locator('[data-preview-outgoing]').count(), 1);
      await page.clock.runFor(2499);
      assert.equal(await page.locator('[data-preview-outgoing]').count(), 1);
      await page.clock.runFor(1);
      assert.equal(await page.locator('[data-preview-outgoing]').count(), 2);
      await page.locator('[data-chat]').click();
      assert.equal(await page.locator('[data-preview-outgoing]').count(), 4);
      const flash = page.locator('[data-loss-flash]');
      assert.equal(await flash.evaluate(n => getComputedStyle(n, '::before').animationDuration), '1.3s');
      assert.equal(await flash.evaluate(n => n.getBoundingClientRect().width === innerWidth && n.getBoundingClientRect().height === innerHeight), true);
      await page.clock.runFor(1500);
      await page.evaluate(() => MistakeryApp.render());
      assert.equal(await flash.evaluate(n => getComputedStyle(n, '::before').animationName), 'none');
      await page.locator('[data-choice="right"]').click();
      const dialog = page.locator('[data-loss-finale]');
      for (const viewport of [{ width: 320, height: 480 }, { width: 320, height: 650 }, { width: 1280, height: 900 }]) {
        await page.setViewportSize(viewport);
        assert.equal(await dialog.evaluate(n => {
          const r = n.getBoundingClientRect(), body = n.querySelector('.loss-finale__body');
          return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight
            && body.clientHeight > 80 && body.scrollWidth <= body.clientWidth;
        }), true);
      }
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);
      assert.equal(await page.locator('[data-restart-run]').evaluate(n => n === document.activeElement), true);
      await page.clock.runFor(20000);
      assert.deepEqual(await snapshot(page), ended);
      await page.locator('[data-restart-run]').click();
      assert.equal(await page.locator('[data-loss-flash], [data-loss-finale], [data-loss-preview]').count(), 0);
      await reach('founder_low');
      assert.equal(await page.locator('.preview-composer').count(), 1);
      await page.locator('[data-restart-run]').click();
      await page.clock.runFor(20000);
      assert.equal(await page.locator('[data-loss-flash], [data-loss-finale], [data-loss-preview], .preview-composer').count(), 0);
      assert.equal(await page.evaluate(() => MistakeryApp.view), 'saved');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
