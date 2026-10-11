const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
async function seed(page, id) {
  await page.evaluate(id => {
    const a = MistakeryApp;
    a.state = window.MistakeryRoute.startRun(a.deck, { seed: 'fixture' }); a.state.route.gap = { target: 4, played: [], usedUnit: null }; a.state.currentCardId = id;
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
    document.querySelector('button.typing-bubble')?.click();
  }, id);
  await page.waitForTimeout(250);
}
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: founder sends a whole bubble only into a retained conversation`, async () => {
    const browser = await engine.launch();
    try {
      for (const profile of [
        { viewport: { width: 320, height: 650 }, hasTouch: true },
        { viewport: { width: 390, height: 844 }, hasTouch: true },
        { viewport: { width: 1280, height: 900 } },
        { viewport: { width: 844, height: 390 }, hasTouch: true },
      ]) {
        const page = await browser.newPage(profile);
        await page.goto(url); await page.waitForFunction(() => MistakeryApp?.view === 'playing');
        await page.clock.install(); await page.clock.pauseAt(new Date());
        for (const id of ['LIVE_AGENT_01', 'LIVE_AGENT_03', 'LIVE_AGENT_04', 'LIVE_AGENT_07']) {
          await seed(page, id);
          const initial = await page.evaluate(() => structuredClone(MistakeryApp.state));
          const label = await page.locator('[data-choice="left"]').innerText();
          await page.evaluate(() => {
            document.querySelector('[data-choice="left"]').click();
            document.querySelector('[data-choice="right"]').click();
          });
          assert.equal(await page.locator('[data-composing-reply], [data-sending-reply]').count(), 0);
          assert.equal(await page.locator('[data-player-reply]').innerText(), label);
          const reply = await page.locator('[data-player-reply]').evaluate(node => ({
            opacity: Number(getComputedStyle(node).opacity), animations: node.getAnimations().length,
            width: node.getBoundingClientRect().width, textWidth: node.querySelector('p').scrollWidth,
            innerWidth: node.querySelector('p').clientWidth,
          }));
          assert.equal(reply.opacity, 1); assert.equal(reply.animations, 0);
          assert.ok(reply.width > 0); assert.ok(reply.textWidth <= reply.innerWidth + 1);
          const after = await page.evaluate(() => structuredClone(MistakeryApp.state));
          assert.equal(after.history.length, initial.history.length + 1);
          assert.equal(after.history.at(-1).side, 'left');
          await page.clock.runFor(10000);
          assert.deepEqual(await page.evaluate(() => MistakeryApp.state), after, 'no deferred action');
          await page.locator('[data-test-back]').click();
          assert.deepEqual(await page.evaluate(() => MistakeryApp.state), initial);

        }
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: separate cards switch immediately without sending a founder bubble`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url); await page.waitForFunction(() => MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      for (const [id, side] of [
        ['LIVE_AGENT_01', 'right'], ['LIVE_AGENT_02', 'left'], ['LIVE_AGENT_04B', 'left'],
        ['LIVE_AGENT_05', 'left'], ['LIVE_AGENT_07B', 'left'], ['INFLUENCER_02', 'left'],
        ['OPEN_INVESTOR', 'left'],
      ]) {
        await seed(page, id);
        await page.locator(`[data-choice="${side}"]`).click();
        assert.equal(await page.locator('[data-sending-reply]').count(), 0, `${id}/${side}: no send bubble`);
        const resolved = await page.evaluate(() => structuredClone(MistakeryApp.state));
        assert.notEqual(resolved.currentCardId, id, `${id}/${side}: immediate card switch`);
        assert.equal(resolved.history.length, 1);
        assert.equal(await page.locator('[data-player-reply]').count(), 0, 'no retained founder reply on a separate card');
        await page.clock.runFor(850);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), resolved, 'no deferred extra action');
      }
      // The same source card can have a stitched route and a separate outcome.
      for (const id of ['LIVE_AGENT_03', 'LIVE_AGENT_04', 'LIVE_AGENT_07']) {
        await seed(page, id);
        await page.locator('[data-choice="right"]').click();
        assert.equal(await page.locator('[data-composing-reply]').count(), 0);
        assert.equal(await page.locator('[data-player-reply]').count(), 1);
      }
    } finally { await browser.close(); }
  });
  test(`${name}: immediate sends undo on Back, reset on restart and remain committed on rerender`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url); await page.waitForFunction(() => MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      for (const action of ['back', 'restart', 'render']) {
        await seed(page, 'LIVE_AGENT_03');
        await page.locator('[data-choice="left"]').click();
        assert.equal(await page.locator('[data-composing-reply]').count(), 0);
        if (action === 'render') await page.evaluate(() => MistakeryApp.render());
        else await page.locator(`[data-test-${action}]`).click();
        await page.clock.runFor(1000);
        assert.equal(await page.evaluate(() => MistakeryApp.state.history.length), action === 'render' ? 1 : 0);
        assert.equal(await page.evaluate(() => MistakeryApp.locked), false);
        assert.equal(await page.locator('[data-sending-reply]').count(), 0);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(page, 'LIVE_AGENT_01');
      await page.locator('[data-choice="left"]').click();
      await page.clock.runFor(650);
      assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), 'LIVE_AGENT_02');
      assert.equal(await page.locator('[data-sending-reply]').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: sending after a fitted photo preserves its size and history gaps`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 568 }, hasTouch: true });
      await page.goto(url); await page.waitForFunction(() => MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      await seed(page, 'LIVE_AGENT_03');
      await page.locator('[data-choice="left"]').click(); await page.clock.runFor(850);
      await page.locator('.typing-bubble').press('Enter'); await page.clock.runFor(300);
      const photoWidth = await page.locator('[data-chat-current].image-bubble').evaluate(n => n.offsetWidth);
      await page.locator('[data-choice="left"]').click(); await page.clock.runFor(850);
      assert.equal(await page.locator('[data-chat-history].image-bubble').evaluate(n => n.offsetWidth), photoWidth);
      const gap = await page.evaluate(() => {
        document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).forEach(a => { a.pause(); a.currentTime = 0; });
        const rows = [...document.querySelectorAll('[data-chat-history]')];
        return rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom;
      });
      assert.ok(gap >= 5, 'retained photo must not overlap the next text bubble');
      await page.evaluate(() => MistakeryApp.render());
      assert.equal(await page.locator('[data-chat-history].image-bubble').evaluate(n => n.offsetWidth), photoWidth, 'rerender retains the transferred photo size');
    } finally { await browser.close(); }
  });
}
