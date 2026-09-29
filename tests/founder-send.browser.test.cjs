const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
async function seed(page, id) {
  await page.evaluate(id => {
    const a = MistakeryApp;
    a.state = MistakeryEngine.startRun(a.deck); a.state.currentCardId = id;
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
          const sample = await page.evaluate(() => {
            const chat = document.querySelector('[data-chat]');
            const old = [...chat.querySelectorAll('[data-chat-current]')];
            const before = old.map(n => n.offsetTop - chat.scrollTop);
            document.querySelector('[data-choice="left"]').click();
            const reply = chat.querySelector('[data-sending-reply]');
            if (!reply) return null;
            const avatar = chat.querySelector('.message-avatar');
            const animations = [...old, reply, avatar].filter(Boolean).flatMap(n => n.getAnimations());
            animations.forEach(a => a.pause());
            const points = [0, 50, 100, 150, 200].map(time => {
              animations.forEach(a => { a.currentTime = time; });
              return { y: old.map(n => n.offsetTop - chat.scrollTop + new DOMMatrix(getComputedStyle(n).transform).m42),
                replyY: reply.offsetTop - chat.scrollTop + new DOMMatrix(getComputedStyle(reply).transform).m42,
                opacity: Number(getComputedStyle(reply).opacity),
                scale: new DOMMatrix(getComputedStyle(reply).transform).a };
            });
            return { before, points, durations: animations.map(a => a.effect.getTiming().duration),
              avatarGap: avatar ? avatar.getBoundingClientRect().bottom - old.at(-1).getBoundingClientRect().bottom : null };
          });
          assert.ok(sample, `${id}: selected reply must appear before switching cards`);
          assert.equal(await page.locator('[data-sending-reply]').innerText(), label);
          assert.deepEqual(await page.evaluate(() => MistakeryApp.state), initial);
          assert.ok(sample.durations.every(ms => ms === 200));
          sample.before.forEach((y, i) => assert.ok(Math.abs(y - sample.points[0].y[i]) < 1, `${id}: old bubble must not jump`));
          assert.equal(sample.points[0].opacity, 0); assert.equal(sample.points[4].opacity, 1);
          if (sample.avatarGap !== null && profile.viewport.height > profile.viewport.width)
            assert.ok(Math.abs(sample.avatarGap) < 4, 'incoming avatar stays with its author, not the founder reply');
          sample.points.forEach((point, i) => {
            assert.equal(point.scale, 1);
            if (i) assert.ok(point.replyY <= sample.points[i - 1].replyY + .01, 'no bounce');
          });
          await page.locator('[data-choice="right"]').dispatchEvent('click');
          await page.clock.runFor(199);
          assert.deepEqual(await page.evaluate(() => MistakeryApp.state), initial);
          await page.clock.runFor(1);
          assert.equal(await page.locator('[data-sending-reply]').count(), 0);
          assert.equal(await page.evaluate(() => MistakeryApp.state.history.length), initial.history.length + 1);
          assert.equal(await page.evaluate(() => MistakeryApp.state.history.at(-1).side), 'left');
          {
            assert.equal(await page.locator('[data-player-reply]').innerText(), label);
            const continued = await page.locator('[data-player-reply]').evaluate(node => {
              const animation = node.getAnimations()[0];
              if (!animation) return null;
              animation.pause(); animation.currentTime = 0;
              return { y: node.offsetTop - node.closest('[data-chat]').scrollTop
                + new DOMMatrix(getComputedStyle(node).transform).m42,
                opacity: Number(getComputedStyle(node).opacity) };
            });
            assert.ok(continued, 'retained reply must move into the continuation without a cut');
            assert.ok(Math.abs(continued.y - sample.points[4].replyY) < 1, 'reply position stays continuous');
            assert.equal(continued.opacity, 1, 'sent reply must not fade in a second time');
          }
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
        await page.clock.runFor(200);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), resolved, 'no deferred extra action');
      }
      // The same source card can have a stitched route and a separate outcome.
      for (const id of ['LIVE_AGENT_03', 'LIVE_AGENT_04', 'LIVE_AGENT_07']) {
        await seed(page, id);
        await page.locator('[data-choice="right"]').click();
        assert.equal(await page.locator('[data-sending-reply]').count(), 1);
        await page.clock.runFor(200);
        assert.equal(await page.locator('[data-player-reply]').count(), 1);
      }
    } finally { await browser.close(); }
  });
  test(`${name}: pending sends cancel on Back, restart and rerender; reduced motion stays immediate`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(url); await page.waitForFunction(() => MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      for (const action of ['back', 'restart', 'render']) {
        await seed(page, 'LIVE_AGENT_03');
        await page.locator('[data-choice="left"]').click();
        assert.equal(await page.locator('[data-sending-reply]').count(), 1);
        if (action === 'render') await page.evaluate(() => MistakeryApp.render());
        else await page.locator(`[data-test-${action}]`).click();
        await page.clock.runFor(1000);
        assert.equal(await page.evaluate(() => MistakeryApp.state.history.length), 0);
        assert.equal(await page.evaluate(() => MistakeryApp.locked), false);
        assert.equal(await page.locator('[data-sending-reply]').count(), 0);
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await seed(page, 'LIVE_AGENT_01');
      await page.locator('[data-choice="left"]').click();
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
      await page.locator('[data-choice="left"]').click(); await page.clock.runFor(200);
      await page.locator('.typing-bubble').press('Enter'); await page.clock.runFor(300);
      const photoWidth = await page.locator('[data-chat-current].image-bubble').evaluate(n => n.offsetWidth);
      await page.locator('[data-choice="left"]').click(); await page.clock.runFor(200);
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
