const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = (process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href) + '?test=route';
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
async function seed(page, id) {
  await page.evaluate(id => {
    const a = MistakeryApp;
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'filler-chat' });
    a.state.currentCardId = id; a.state.route.phase = 'fillers';
    a.state.route.gap = { target: 5, played: [], usedUnit: a.deck.cards.find(c => c.id === id).filler.unit };
    a.state.route.usedUnits = [a.state.route.gap.usedUnit];
    a.state.flags = ['assistant_available', 'pitch_sent', 'pitch_video'];
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
  }, id);
}
async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
  await page.goto(url); await page.waitForFunction(() => window.MistakeryApp?.state);
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return page;
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: linked fillers retain the selected reply only within the same messenger`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser); const errors = []; page.on('pageerror', e => errors.push(e.message));
      for (const [id, side, target, retained] of [
        ['OPEN_01', 'left', 'OPEN_02a', true], ['OPEN_01', 'right', 'OPEN_02b', true],
        ['FILL_COMA_1', 'left', 'FILL_COMA_2A', true], ['FILL_COMA_1', 'right', 'FILL_COMA_2B', true],
        ['FILL_SALES_1', 'left', 'FILL_SALES_2', true], ['FILL_DOMAIN_1', 'right', 'FILL_DOMAIN_2', true],
        ['FILL_POLICE_1', 'left', 'FILL_POLICE_2', true], ['FILL_POLICE_1', 'right', 'FILL_POLICE_2', true],
        ['FILL_PAYROLL_1', 'left', 'FILL_PAYROLL_2', false],
        ['FILL_MOM_CALL_1', 'left', 'FILL_MOM_CALL_2', false],
        ['FILL_VIDEO_1', 'left', 'FILL_VIDEO_2', false], ['FILL_VIDEO_1', 'right', 'FILL_VIDEO_2', false],
        ['FILL_SALES_1', 'right', null, false], ['FILL_DOMAIN_1', 'left', null, false],
      ]) {
        await seed(page, id); await page.clock.runFor(6000);
        const before = await snapshot(page);
        const oldMessages = (await page.locator('[data-chat-current]').allTextContents()).slice(-2);
        const label = await page.locator(`[data-choice=${side}]`).innerText();
        await page.locator(`[data-choice=${side}]`).click();
        assert.equal(await page.locator('[data-sending-reply]').count(), retained ? 1 : 0, `${id}/${side}`);
        if (retained) {
          assert.deepEqual(await snapshot(page), before);
          await page.clock.runFor(199); assert.deepEqual(await snapshot(page), before);
          await page.clock.runFor(1);
          assert.deepEqual(await page.locator('[data-chat-history]').allTextContents(), oldMessages);
          assert.equal(await page.locator('[data-player-reply]').innerText(), label);
          assert.equal(await page.locator('[data-choice=left]').isDisabled(), true);
        } else assert.equal(await page.locator('[data-player-reply]').count(), 0);
        const after = await snapshot(page);
        if (target) assert.equal(after.currentCardId, target);
        else assert.notEqual(after.currentCardId, id);
        assert.equal(after.history.length, 1);
        await page.clock.runFor(6000);
        assert.equal(await page.locator('[data-choice=left]').isEnabled(), true);
        await page.evaluate(() => MistakeryApp.render());
        assert.deepEqual(await snapshot(page), after);
        assert.equal(await page.locator('[data-player-reply]').count(), retained ? 1 : 0);
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await snapshot(page), before);
        assert.equal(await page.locator('[data-player-reply]').count(), 0);
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
  test(`${name}: three-card filler chains keep continuation and cancel pending sends safely`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser);
      await page.evaluate(() => {
        const a = MistakeryApp; const second = a.deck.cards.find(c => c.id === 'FILL_POLICE_2');
        const third = structuredClone(second); third.id = 'FILL_POLICE_3'; third.text = 'We are waiting for you.';
        a.deck.cards.push(third); a.activeCardIds.push(third.id); second.choices.left.next = third.id;
      });
      await seed(page, 'FILL_POLICE_1');
      for (const next of ['FILL_POLICE_2', 'FILL_POLICE_3']) {
        await page.clock.runFor(6000); const before = await snapshot(page);
        await page.locator('[data-choice=left]').click();
        assert.equal(await page.locator('[data-sending-reply]').count(), 1);
        await page.clock.runFor(200); const after = await snapshot(page);
        assert.equal(after.currentCardId, next);
        assert.equal(await page.locator('[data-player-reply]').count(), 1);
        await page.locator('[data-test-back]').click(); assert.deepEqual(await snapshot(page), before);
        await page.clock.runFor(6000); await page.locator('[data-choice=left]').click(); await page.clock.runFor(200);
        assert.deepEqual(await snapshot(page), after);
      }
      for (const action of ['back', 'restart', 'render']) {
        await seed(page, 'FILL_COMA_1'); await page.clock.runFor(6000);
        await page.locator('[data-choice=left]').click();
        assert.equal(await page.locator('[data-sending-reply]').count(), 1);
        if (action === 'render') await page.evaluate(() => MistakeryApp.render());
        else await page.locator(`[data-test-${action}]`).click();
        await page.clock.runFor(6000);
        assert.equal((await snapshot(page)).history.length, 0);
        assert.equal(await page.locator('[data-sending-reply]').count(), 0);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(page, 'FILL_POLICE_1'); await page.clock.runFor(6000);
      await page.locator('[data-choice=left]').click();
      assert.equal((await snapshot(page)).currentCardId, 'FILL_POLICE_2');
      assert.equal(await page.locator('[data-player-reply]').count(), 1);
      assert.equal(await page.locator('[data-sending-reply]').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: investor mantra arrives as three messages inside one card`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser); await seed(page, 'FILL_MANTRA');
      assert.equal(await page.locator('[data-chat-current]').count(), 1);
      assert.equal(await page.locator('[data-choice=left]').isDisabled(), true);
      await page.clock.runFor(499); assert.equal(await page.locator('[data-chat-current]').count(), 1);
      await page.clock.runFor(1); assert.equal(await page.locator('[data-chat-current]').count(), 2);
      await page.clock.runFor(499); assert.equal(await page.locator('[data-choice=left]').isDisabled(), true);
      await page.clock.runFor(1); assert.equal(await page.locator('[data-chat-current]').count(), 3);
      assert.equal((await snapshot(page)).currentCardId, 'FILL_MANTRA');
      assert.equal((await snapshot(page)).history.length, 0);
      assert.equal(await page.locator('[data-choice=left]').isEnabled(), true);
    } finally { await browser.close(); }
  });
}
