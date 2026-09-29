const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
const profiles = [
  { name: 'small phone', viewport: { width: 320, height: 650 }, deviceScaleFactor: 2, hasTouch: true },
  { name: 'phone', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true },
  { name: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true },
  { name: 'desktop', viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
  { name: 'touch landscape', viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true },
];
async function seed(page, id) {
  await page.evaluate(id => {
    const app = window.MistakeryApp;
    app.state = window.MistakeryEngine.startRun(app.deck);
    app.state.currentCardId = id;
    app.cardDelivery = null; app.locked = false; app.liveAgentScore = 5;
    app.influencerPreviousCardId = 'INFLUENCER_04';
    app.view = 'playing'; app.render();
  }, id);
  await page.waitForTimeout(350); // Let the initial card entrance finish (CSS uses real time).
}
async function deliver(page) {
  const remaining = await page.evaluate(() => Math.max(0, MistakeryApp.cardDelivery.deadline - Date.now()));
  await page.clock.runFor(remaining);
}
async function open(browser, profile = profiles[0]) {
  const page = await browser.newPage(profile);
  await page.goto(url);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return page;
}
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: coordinated arrivals share trajectory and stable gaps across screen profiles`, async () => {
    const browser = await engine.launch();
    try {
      for (const profile of profiles) {
        const page = await open(browser, profile);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        const scenes = [
          ['LIVE_AGENT_01'], ['LIVE_AGENT_03'], ['LIVE_AGENT_05'], ['LIVE_AGENT_07'],
          ['INFLUENCER_02'], ['INFLUENCER_08'], ['INFLUENCER_02A'],
          ['LIVE_AGENT_02', 'LIVE_AGENT_01'], ['LIVE_AGENT_04', 'LIVE_AGENT_03'],
          ['LIVE_AGENT_04B', 'LIVE_AGENT_04'], ['LIVE_AGENT_07B', 'LIVE_AGENT_07'],
          ['LIVE_AGENT_03', 'LIVE_AGENT_02'],
        ];
        for (const [card, previous] of scenes) {
          await seed(page, previous || card);
          if (previous) {
            await page.locator('button.typing-bubble').press('Enter');
            await page.locator('[data-choice="left"]').click();
            await page.waitForTimeout(350);
            assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'), card);
            assert.equal(await page.locator('[data-player-reply]').count(), card === 'LIVE_AGENT_03' ? 0 : 1);
          }
          while (await page.evaluate(() => !MistakeryApp.cardDelivery.delivered)) {
            await deliver(page);
            const sample = await page.evaluate(() => {
              const nodes = [...document.querySelectorAll('[data-chat-current], [data-chat-history], [data-player-reply], .typing-row, .message-stack > .typing-bubble')];
              const fresh = [...document.querySelectorAll('[data-chat-current]')].at(-1);
              const animations = nodes.map(node => node.getAnimations().filter(a => a.playState === 'running'));
              if (animations.some(list => list.length !== 1)) return { counts: animations.map(list => list.length) };
              const all = animations.flat();
              const timings = all.map(a => ({ ...a.effect.getTiming(), start: a.startTime }));
              all.forEach(a => a.pause());
              const points = [0, 50, 100, 150, 200].map(time => {
                all.forEach(a => { a.currentTime = time; });
                const bounds = nodes.map(node => node.getBoundingClientRect());
                return { matrices: nodes.map(node => {
                  const m = new DOMMatrix(getComputedStyle(node).transform);
                  return [m.m42, m.a, m.d];
                }), gaps: bounds.slice(1).map((b, i) => [b.left - bounds[i].right, b.top - bounds[i].bottom]),
                opacity: Number(getComputedStyle(fresh).opacity) };
              });
              all.forEach(a => a.finish());
              return { timings, points };
            });
            const label = `${name}/${profile.name}/${card}`;
            assert.ok(!sample.counts, `${label}: one coordinated animation per row: ${sample.counts}`);
            for (const timing of sample.timings) {
              assert.equal(timing.duration, 200, label);
              assert.equal(timing.easing, 'cubic-bezier(0.2, 0, 0, 1)', label);
              assert.equal(timing.start, sample.timings[0].start, `${label}: shared start`);
            }
            for (const point of sample.points) {
              for (const [y, xScale, yScale] of point.matrices) {
                assert.ok(Math.abs(y - point.matrices[0][0]) < .02, `${label}: equal displacement`);
                assert.deepEqual([xScale, yScale], [1, 1], `${label}: no scaling`);
              }
              point.gaps.forEach((gap, i) => gap.forEach((value, axis) => {
                assert.ok(Math.abs(value - sample.points[4].gaps[i][axis]) < .1, `${label}: stable gaps`);
              }));
            }
            assert.equal(sample.points[0].opacity, 0, label);
            assert.equal(sample.points[4].opacity, 1, label);
            const dots = await page.locator('.typing-bubble i').count();
            assert.ok(dots === 0 || dots === 3, `${label}: original dots`);
          }
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: changing chats gives the first incoming text a short lead-in without delaying continuations`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      for (const [previous, card, nextPause] of [
        ['LIVE_AGENT_02', 'LIVE_AGENT_03', 1000],
        ['LIVE_AGENT_04B', 'LIVE_AGENT_05', 500],
        ['LIVE_AGENT_06', 'LIVE_AGENT_07', 2000],
        ['INFLUENCER_01', 'INFLUENCER_02', 700],
      ]) {
        await seed(page, previous);
        await page.locator('button.typing-bubble').press('Enter');
        await page.locator('[data-choice="left"]').click();
        assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'), card);
        assert.equal(await page.locator('[data-chat-current]').count(), 0, `${card}: first wait`);
        assert.equal(await page.locator('.typing-bubble i').count(), 3);
        const state = await page.evaluate(() => structuredClone(MistakeryApp.state));
        await page.clock.runFor(250);
        await page.evaluate(() => MistakeryApp.render());
        await page.clock.runFor(249);
        assert.equal(await page.locator('[data-chat-current]').count(), 0, `${card}: original deadline survives rerender`);
        await page.clock.runFor(1);
        assert.equal(await page.locator('[data-chat-current]').count(), 1);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), state);
        assert.equal(await page.evaluate(() => MistakeryApp.cardDelivery.deadline - Date.now()), nextPause,
          `${card}: subsequent reading/authored pause unchanged`);
        await page.locator('button.typing-bubble').press('Space');
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), state);
      }
      // Same-thread continuation and the photo entry still appear immediately.
      for (const [previous, card] of [['LIVE_AGENT_07', 'LIVE_AGENT_07B'], ['LIVE_AGENT_03', 'LIVE_AGENT_04'], ['INFLUENCER_04', 'INFLUENCER_05']]) {
        await seed(page, previous);
        await page.locator('button.typing-bubble').press('Enter');
        await page.locator(`[data-choice="${previous === 'INFLUENCER_04' ? 'right' : 'left'}"]`).click();
        assert.equal(await page.locator('[data-scene]').getAttribute('data-active-card'), card);
        assert.equal(await page.locator('[data-chat-current]').count(), 1);
      }
      await seed(page, 'LIVE_AGENT_02');
      await page.locator('button.typing-bubble').press('Enter');
      await page.locator('[data-choice="left"]').click();
      await page.locator('button.typing-bubble').press('Enter');
      await page.clock.runFor(300);
      await page.locator('[data-choice="left"]').click();
      await page.locator('[data-test-back]').click();
      assert.equal(await page.locator('[data-chat-current]').count(), 4, 'Back does not repeat the lead-in');
      assert.equal(await page.locator('.typing-bubble').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: arrival cancellation respects input, resize, rerender, navigation and reduced motion`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      for (const trigger of ['pointerdown', 'wheel', 'keydown', 'resize', 'rerender', 'restart', 'reduced']) {
        await seed(page, 'LIVE_AGENT_01');
        await deliver(page);
        await page.evaluate(() => {
          window.arrivals = [...document.querySelectorAll('[data-chat-current], .typing-row')]
            .flatMap(n => n.getAnimations().filter(a => a.playState === 'running'));
          window.arrivals.forEach(a => a.pause());
        });
        assert.ok(await page.evaluate(() => window.arrivals.length > 1));
        if (trigger === 'reduced') await page.emulateMedia({ reducedMotion: 'reduce' });
        else await page.evaluate(trigger => {
          if (trigger === 'rerender') MistakeryApp.render();
          else if (trigger === 'restart') document.querySelector('[data-restart-run]').click();
          else (trigger === 'resize' ? window : document).dispatchEvent(new Event(trigger));
        }, trigger);
        await page.waitForFunction(() => window.arrivals.every(a => a.playState === 'idle'));
        if (trigger === 'restart') {
          await page.clock.runFor(10000);
          assert.equal(await page.locator('[data-chat-current], .typing-bubble').count(), 0);
        }
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
      for (const reader of [false, true]) {
        await page.emulateMedia({ reducedMotion: reader ? 'no-preference' : 'reduce' });
        await seed(page, 'LIVE_AGENT_01');
        if (reader) await page.evaluate(() => { MistakeryApp.cardDelivery.follow = false; });
        await deliver(page);
        assert.equal(await page.evaluate(() => [...document.querySelectorAll('[data-chat-current]')]
          .flatMap(n => n.getAnimations()).filter(a => a.playState === 'running').length), 0);
      }
    } finally { await browser.close(); }
  });
  test(`${name}: reading pauses stay compact while giving longer text and photos more time`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      const expected = {
        LIVE_AGENT_01: [600, 500, 700], LIVE_AGENT_03: [1000, 2000, 500],
        LIVE_AGENT_05: [500, 2000, 500], LIVE_AGENT_07: [2000, 900],
        LIVE_AGENT_07B: [500, 1250], INFLUENCER_02: [700, 900],
        INFLUENCER_05: [600, 1100], INFLUENCER_08: [1000, 800],
      };
      for (const [card, pauses] of Object.entries(expected)) {
        await seed(page, card);
        for (const pause of pauses) {
          const before = await page.locator('[data-chat-current]').count();
          await page.clock.runFor(pause - 1);
          assert.equal(await page.locator('[data-chat-current]').count(), before, `${card}: not before ${pause} ms`);
          await page.clock.runFor(1);
          assert.equal(await page.locator('[data-chat-current]').count(), before + 1, `${card}: at ${pause} ms`);
        }
        assert.equal(await page.locator('.typing-bubble').count(), 0, card);
      }
    } finally { await browser.close(); }
  });
}
