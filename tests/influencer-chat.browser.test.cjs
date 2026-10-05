const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href + '?test=route';
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
async function seed(page, id, previous = 'INFLUENCER_04', target, side = 'left') {
  await page.evaluate(({ id, previous, target, side }) => {
    const a = MistakeryApp;
    for (let seed = 0; ; seed++) {
      a.state = MistakeryRoute.startRun(a.deck, { seed, firstPlot: 'influencer' });
      a.state.currentCardId = id;
      a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
      a.state.route.resourceLedger = { ...a.state.resources };
      a.influencerPreviousCardId = previous;
      if (!target || MistakeryRoute.resolveChoice(a.deck, a.state, side).state.currentCardId === target) break;
    }
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
  }, { id, previous, target, side });
  await page.clock.runFor(10000);
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: accepted Influencer deal publishes the challenge in Dream Team`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser);
      for (const [id, previous] of [['INFLUENCER_05', 'INFLUENCER_04'], ['INFLUENCER_05', 'INFLUENCER_06'], ['INFLUENCER_06', 'INFLUENCER_05']]) {
        await seed(page, id, previous);
        const before = await snapshot(page);
        await page.locator('[data-choice=left]').click();
        assert.equal((await snapshot(page)).currentCardId, 'INFLUENCER_07');
        assert.equal(await page.locator('[data-sender]').innerText(), 'Dream Team');
        assert.equal(await page.locator('[data-chat-history], [data-player-reply]').count(), 0);
        assert.equal(await page.locator('[data-chat-current].team-row .message-image').count(), 1);
        assert.equal(await page.locator('[data-choice=left]').isDisabled(), true);
        await page.clock.runFor(10000);
        assert.deepEqual(await page.locator('[data-chat-current]').evaluateAll(ns => ns.map(n => n.dataset.source)), ['@ai_evangelist', '@ai_evangelist', '@ai_evangelist']);
        assert.deepEqual(await page.locator('[data-chat-current] p').evaluateAll(ns => ns.map(n => n.textContent.replaceAll('\u00a0', ' '))), ['Video’s live. Don’t screw this up, team!!!', 'Or do. That’s just more views lol 😂']);
        assert.equal(await page.locator('[data-chat] .message-caption').count(), 0);
        assert.equal(await page.locator('[data-choice=left]').innerText(), 'DELETE THIS!!!');
        assert.equal(await page.locator('[data-choice=right]').innerText(), 'Anything for views');
        const after = await snapshot(page);
        await page.evaluate(() => MistakeryApp.render());
        assert.equal(await page.locator('[data-chat-current]').count(), 3);
        assert.deepEqual(await snapshot(page), after);
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await snapshot(page), before);
        assert.equal(await page.locator('[data-sender]').innerText(), '@ai_evangelist');
      }
    } finally { await browser.close(); }
  });
}
async function open(browser, motion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
  await page.goto(url); await page.waitForFunction(() => MistakeryApp?.state);
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return page;
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name}/${motion}: approved Influencer links keep actual replies and resolve once`, async () => {
      const browser = await type.launch();
      try {
        const page = await open(browser, motion); const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        for (const [id, previous, side, target] of [
          ['INFLUENCER_02', null, 'right', 'INFLUENCER_02A'],
          ['INFLUENCER_04', null, 'right', 'INFLUENCER_05'],
          ['INFLUENCER_04', null, 'left', 'INFLUENCER_06'],
          ['INFLUENCER_05', 'INFLUENCER_04', 'right', 'INFLUENCER_06'],
          ['INFLUENCER_06', 'INFLUENCER_04', 'left', 'INFLUENCER_05'],
          ['INFLUENCER_08', null, 'left', 'INFLUENCER_OUTCOME_5'],
          ['INFLUENCER_08', null, 'right', 'INFLUENCER_OUTCOME_7'],
        ]) {
          await seed(page, id, previous, target, side);
          const before = await snapshot(page);
          const expected = await page.evaluate(side => MistakeryRoute.resolveChoice(MistakeryApp.deck, MistakeryApp.state, side).state, side);
          const old = (await page.locator('[data-chat-current]').allTextContents()).slice(-2);
          const label = await page.locator(`[data-choice=${side}]`).innerText();
          await page.locator(`[data-choice=${side}]`).click();
          assert.equal(await page.locator('[data-composing-reply]').count(), 1, id);
          assert.deepEqual(await snapshot(page), before);
          assert.equal(await page.locator('[data-resource="cash"]').getAttribute('data-direction'), 'down');
          const duration = motion === 'reduce' ? 650 : 850;
          await page.clock.runFor(duration - 1); assert.deepEqual(await snapshot(page), before);
          await page.clock.runFor(1);
          assert.deepEqual(await snapshot(page), expected, `${id}: same RNG, signed ledger and cost as one resolver call`);
          assert.deepEqual(await page.locator('[data-chat-history]').allTextContents(), old);
          assert.equal(await page.locator('[data-player-reply]').innerText(), label);
          assert.equal(await page.locator('[data-choice=left]').isDisabled(), true);
          await page.clock.runFor(10000);
          const current = await page.locator('[data-chat-current]').allTextContents();
          await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(10000);
          assert.deepEqual(await page.locator('[data-chat-current]').allTextContents(), current);
          assert.equal(await page.locator('[data-player-reply]').count(), 1);
          assert.deepEqual(await snapshot(page), expected);
          await page.locator('[data-test-back]').click(); assert.deepEqual(await snapshot(page), before);
        }
        // A real three-card chain must retain the contextual answer, including after Back.
        await seed(page, 'INFLUENCER_04');
        for (const [side, target, reply] of [['left', 'INFLUENCER_06', 'Have fun'], ['left', 'INFLUENCER_05', 'Alternatives?'], ['right', 'INFLUENCER_08', null]]) {
          const before = await snapshot(page);
          const label = await page.locator(`[data-choice=${side}]`).innerText();
          await page.locator(`[data-choice=${side}]`).click(); await page.clock.runFor(10000);
          assert.equal((await snapshot(page)).currentCardId, target);
          assert.equal(await page.locator('[data-player-reply]').count(), reply ? 1 : 0);
          if (reply) assert.equal(await page.locator('[data-player-reply]').innerText(), label);
          const after = await snapshot(page);
          await page.locator('[data-test-back]').click(); assert.deepEqual(await snapshot(page), before);
          await page.clock.runFor(10000); await page.locator(`[data-choice=${side}]`).click(); await page.clock.runFor(10000);
          assert.deepEqual(await snapshot(page), after);
        }
        // Cancellation never commits the prepared outcome/RNG/ledger.
        for (const action of ['back', 'render', 'restart']) {
          await seed(page, 'INFLUENCER_08', null, 'INFLUENCER_OUTCOME_5');
          const before = await snapshot(page);
          await page.locator('[data-choice=left]').click(); await page.clock.runFor(250);
          if (action === 'render') await page.evaluate(() => MistakeryApp.render());
          else await page.locator(`[data-test-${action}]`).click();
          await page.clock.runFor(10000);
          if (action !== 'restart') assert.deepEqual(await snapshot(page), before);
          else assert.equal((await snapshot(page)).history.length, 0);
          assert.equal(await page.locator('[data-composing-reply]').count(), 0);
        }
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
  test(`${name}: Influencer episode boundaries open separate chats; approved quote and image render`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser);
      for (const [id, previous, side, target] of [
        ['INFLUENCER_01', null, 'left', 'INFLUENCER_02'], ['INFLUENCER_01', null, 'right', 'INFLUENCER_OUTCOME_1'],
        ['INFLUENCER_02', null, 'left', 'INFLUENCER_03'], ['INFLUENCER_02A', null, 'right', 'INFLUENCER_03'],
        ['INFLUENCER_03', null, 'left', 'INFLUENCER_04'], ['INFLUENCER_05', 'INFLUENCER_04', 'left', 'INFLUENCER_07'],
        ['INFLUENCER_06', 'INFLUENCER_05', 'left', 'INFLUENCER_07'], ['INFLUENCER_06', 'INFLUENCER_05', 'right', 'INFLUENCER_08'],
        ['INFLUENCER_07', null, 'left', 'INFLUENCER_OUTCOME_2'], ['INFLUENCER_07', null, 'right', 'INFLUENCER_OUTCOME_3'],
        ['INFLUENCER_08', null, 'left', 'INFLUENCER_OUTCOME_4'], ['INFLUENCER_08', null, 'right', 'INFLUENCER_OUTCOME_6'],
      ]) {
        await seed(page, id, previous, target, side);
        await page.locator(`[data-choice=${side}]`).click();
        assert.equal(await page.locator('[data-composing-reply]').count(), 0, id);
        await page.clock.runFor(10000);
        assert.equal((await snapshot(page)).currentCardId, target);
        assert.equal(await page.locator('[data-chat-history], [data-player-reply]').count(), 0);
      }
      await seed(page, 'INFLUENCER_03');
      assert.equal((await page.locator('[data-chat] em').innerText()).replaceAll('\u00a0', ' '), 'make me $1B app. make zero mistakes');
      assert.equal(await page.locator('[data-chat] em').evaluate(n => getComputedStyle(n).fontStyle), 'italic');
      await seed(page, 'INFLUENCER_08');
      const image = page.locator('[data-chat-current][data-source="@bigdeals"] .message-image');
      assert.match(await image.getAttribute('src'), /ai-influencer-fake-lead-review\.webp/);
      assert.ok(await image.evaluate(n => n.complete && n.naturalWidth === 1600));
      assert.equal(await page.locator('[data-chat-current][data-source="@bigdeals"] .message-caption').innerText(), '😔');
    } finally { await browser.close(); }
  });
}
