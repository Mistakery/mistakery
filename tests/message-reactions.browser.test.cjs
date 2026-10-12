const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;

async function open(type, width = 320, motion = 'no-preference') {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width, height: 650 }, reducedMotion: motion });
  await page.clock.install();
  await page.addInitScript(() => {
    window.reactionMoves = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const a = animate.apply(this, args);
      if (this.matches('.message-reaction')) reactionMoves.push({ node: this, a });
      return a;
    };
  });
  await page.goto(url + '?story=live-agent');
  await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
  await page.evaluate(() => {
    window.reactionCues = []; const play = MistakerySound.play;
    MistakerySound.play = (...args) => { reactionCues.push(args); return play(...args); };
  });
  return { browser, page };
}
async function seed(page, id = 'LIVE_AGENT_01') {
  await page.evaluate(id => {
    const a = MistakeryApp; MistakerySound.stop();
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'authored-reactions' });
    a.state.currentCardId = id;
    a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
    a.state.schedulerResources = { ...a.state.resources };
    a.state.route.gap = { target: 4, played: [], usedUnit: null };
    if (id === 'INFLUENCER_05') a.state.route.influencerPreviousCardId = 'INFLUENCER_04';
    a.view = 'playing'; a.cardDelivery = null; a.locked = false; a.render();
    reactionMoves.length = 0;
  }, id);
}
async function metrics(page) {
  return page.evaluate(() => {
    const c = document.querySelector('[data-chat]');
    return { top: c.scrollTop, height: c.scrollHeight,
      state: JSON.stringify(MistakeryApp.state), cues: reactionCues.length, disabled: Boolean(document.querySelector('[data-choice]:disabled')) };
  });
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const width of [320, 390]) {
    test(`${name}/${width}: reactions wait a full second and arrive on compact bubbles`, async () => {
      const { browser, page } = await open(type, width);
      try {
        await seed(page);
        const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
        assert.equal(await page.locator('.message-reactions').count(), 0, 'future reacted bubbles stay inside delivery queue');
        await page.clock.runFor(4000);
        assert.equal(await page.locator('.message-reactions').count(), 1, 'Sales joke gets an authored row after delivery');
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 0, 'reaction waits for bubble arrival');
        await page.clock.runFor(650);
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 0, 'reading pause remains noticeable after the message entrance');
        const footprint = await page.locator('.message-reactions').evaluateAll(rows => rows.map(row => {
          const bubble = row.parentElement, before = bubble.offsetHeight;
          const display = row.style.display; row.style.display = 'none';
          const original = bubble.offsetHeight; row.style.display = display;
          return { before, original };
        }));
        assert.ok(footprint.every(x => x.before === x.original), 'waiting reactions add no empty space to the message');
        const arrival = await page.locator('[data-chat-current]').evaluateAll(nodes => nodes.flatMap(n => n.getAnimations().map(a => ({
          timing: a.effect.getTiming(), frames: a.effect.getKeyframes(),
        }))));
        assert.ok(arrival.length > 0);
        assert.ok(arrival.every(a => a.timing.duration === 325 && a.frames.length > 2), 'gentle coordinated message spring remains intact');
        // Native WA delivery animations use a real timeline, independent of the mock clock.
        await page.evaluate(() => document.querySelectorAll('[data-chat-current]').forEach(n => n.getAnimations().forEach(a => a.finish())));
        const before = await metrics(page);
        assert.equal(before.disabled, true, 'choices still wait for the remaining conversation');
        await page.clock.runFor(200);
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 0, 'still no reaction 900ms after joke delivery');
        await page.clock.runFor(125);
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 1);
        assert.equal((await metrics(page)).cues, before.cues, 'reaction reveal plays no new sounds');
        assert.equal(await page.locator('.message-reaction:not([data-pending]) .message-reaction-count').textContent(), '1');
        await page.clock.runFor(2000);
        // Final row has appeared; its count can grow without shifting the chat.
        await page.evaluate(() => document.querySelectorAll('[data-chat-current]').forEach(n => n.getAnimations().forEach(a => a.finish())));
        const countsBefore = await metrics(page);
        await page.clock.runFor(400);
        const after = await metrics(page);
        assert.deepEqual(after, countsBefore, 'count growth affects neither state nor scroll/layout');
        assert.equal(after.cues, countsBefore.cues, 'reaction count growth plays no new sounds');
        assert.equal(after.disabled, false);
        assert.equal(after.state, state);
        assert.deepEqual(await page.locator('.message-reaction-count').allTextContents(), ['3', '2', '2']);
        assert.equal(await page.locator('[data-pending]').count(), 0);
        const samples = await page.evaluate(() => reactionMoves.map(({ node, a }) => {
          const frames = a.effect.getKeyframes(); a.pause();
          const opacity = [0, a.effect.getTiming().duration / 2, a.effect.getTiming().duration].map(t => {
            a.currentTime = t; return getComputedStyle(node).opacity;
          });
          a.cancel(); return { frames, opacity };
        }));
        assert.ok(samples.length >= 5, 'entrances and count growth both pop');
        assert.ok(samples.every(s => s.frames.every(f => !('opacity' in f)) && s.opacity.every(o => o === '1')), 'no fade on first or repeated pop');
        const fit = await page.locator('.message-reactions').evaluateAll(rows => rows.every(row => {
          const r = row.getBoundingClientRect(), b = row.parentElement.getBoundingClientRect();
          return r.left >= b.left && r.right <= b.right && r.height >= 25;
        }));
        assert.ok(fit, 'pills fit their actual bubbles');
        const count = await page.evaluate(() => reactionMoves.length);
        await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(1500);
        assert.equal(await page.evaluate(() => reactionMoves.length), count, 'rerender is static');
        await page.evaluate(() => document.querySelector('[data-choice=left]').click());
        await page.clock.runFor(850);
        await page.locator('[data-test-back]').click();
        const backCount = await page.evaluate(() => reactionMoves.length);
        await page.clock.runFor(1500);
        assert.equal(await page.evaluate(() => reactionMoves.length), backCount, 'Back cannot replay');
        assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
        assert.deepEqual(await page.locator('.message-reaction-count').allTextContents(), ['3', '2', '2']);
      } finally { await browser.close(); }
    });
  }
  test(`${name}: authored copy guards cover sparse meaningful messages and retained history stays static`, async () => {
    const { browser, page } = await open(type);
    try {
      const expected = { LIVE_AGENT_01: 2, LIVE_AGENT_02: 2, LIVE_AGENT_03: 1,
        LIVE_AGENT_08: 1, INFLUENCER_01: 2, INFLUENCER_05: 1, INFLUENCER_07: 1,
        INFLUENCER_08: 2, DREAM_TEAM: 2, FILL_AI_DEV: 1, FILL_PAYROLL_2: 1 };
      const vocabulary = new Set();
      for (const [id, rows] of Object.entries(expected)) {
        await seed(page, id); await page.clock.runFor(12000);
        assert.equal(await page.locator('.message-reactions').count(), rows, id);
        assert.equal(await page.locator('.message-reaction[data-pending]').count(), 0, id);
        (await page.locator('.message-reaction-emoji').allTextContents()).forEach(emoji => vocabulary.add(emoji));
        assert.ok(await page.locator('.message-reactions').evaluateAll(nodes => nodes.every(n => n.closest('.team-bubble, .message, .self-message') && !n.closest('.image-bubble'))));
      }
      assert.ok(vocabulary.size >= 10, 'reaction vocabulary covers different emotions instead of repeating eyes and fire');
      await seed(page);
      await page.clock.runFor(10000);
      await page.evaluate(() => document.querySelector('[data-choice=left]').click());
      await page.clock.runFor(850);
      const before = await page.evaluate(() => reactionMoves.length);
      await page.clock.runFor(12000);
      assert.ok(await page.locator('[data-chat-history] .message-reactions').count() > 0);
      assert.ok(await page.locator('[data-chat-current] .message-reactions').count() > 0);
      const finalMoves = await page.evaluate(() => reactionMoves.length);
      assert.ok(finalMoves > before, 'new card has fresh reactions');
      await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(2000);
      assert.equal(await page.evaluate(() => reactionMoves.length), finalMoves, 'neither retained history nor rerender replays');
      // Content changed at the same bubble position: omit, never misassign.
      await page.evaluate(() => {
        const card = MistakeryApp.deck.cards.find(c => c.id === 'LIVE_AGENT_01');
        window.oldReactionCopy = card.messages[2].text;
        card.messages[2].text = 'Different message';
      });
      await seed(page); await page.clock.runFor(10000);
      assert.equal(await page.locator('.message-reactions').count(), 1, 'copy guard omits mismatched joke');
      await page.evaluate(() => { MistakeryApp.deck.cards.find(c => c.id === 'LIVE_AGENT_01').messages[2].text = oldReactionCopy; });
      await seed(page, 'LIVE_AGENT_OUTCOME_1'); await page.clock.runFor(12000);
      assert.equal(await page.locator('.message-reactions').count(), 0, 'result presentation is not decorated');
    } finally { await browser.close(); }
  });
  test(`${name}: settling waiting rows keeps the newest retained messages visible`, async () => {
    const { browser, page } = await open(type);
    try {
      for (const event of ['hidden', 'reduce']) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await seed(page); await page.clock.runFor(10000);
        await page.evaluate(() => document.querySelector('[data-choice=left]').click());
        await page.clock.runFor(850);
        await page.locator('button.typing-bubble').press('Enter');
        assert.ok(await page.locator('[data-chat-history]').count() > 0);
        assert.ok(await page.locator('.message-reactions[data-waiting]').count() > 0);
        if (event === 'hidden') await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        else {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => !document.querySelector('.message-reactions[data-waiting]'));
        }
        const fits = await page.evaluate(() => {
          const chat = document.querySelector('[data-chat]');
          const last = [...chat.querySelectorAll('[data-chat-current]')].at(-1);
          return last.offsetTop + last.offsetHeight - chat.scrollTop <= chat.clientHeight + 1;
        });
        assert.ok(fits, `${event}: final expansion still follows the latest delivered message`);
        if (event === 'hidden') await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      }
    } finally { await browser.close(); }
  });
  test(`${name}: reduced motion, hidden and navigation settle reactions without stale callbacks`, async () => {
    const { browser, page } = await open(type, 320, 'reduce');
    try {
      await seed(page); await page.clock.runFor(4650);
      assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 0, 'reduced motion keeps the same reading pause');
      await page.clock.runFor(3000);
      assert.equal(await page.evaluate(() => reactionMoves.length), 0);
      assert.equal(await page.locator('[data-pending]').count(), 0);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
      await seed(page); await page.clock.runFor(5000);
      const pendingCount = await page.evaluate(() => reactionMoves.length);
      await page.evaluate(() => MistakeryApp.render());
      assert.deepEqual(await page.locator('.message-reaction-count').allTextContents(), ['3', '2']);
      await page.clock.runFor(100);
      assert.equal(await page.evaluate(() => reactionMoves.length), pendingCount, 'mid-growth rerender restores final without replay');
      await seed(page); await page.clock.runFor(5000);
      await page.evaluate(() => {
        window.oldPills = [...document.querySelectorAll('.message-reaction')];
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.deepEqual(await page.locator('.message-reaction-count').allTextContents(), ['3', '2']);
      const count = await page.evaluate(() => reactionMoves.length);
      await page.clock.runFor(10000);
      await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
      await page.clock.runFor(2000);
      assert.equal(await page.evaluate(() => reactionMoves.length), count, 'hidden deliveries have no late replay');
      assert.equal(await page.evaluate(() => oldPills.every(n => n.style.willChange === '' && n.getAnimations().length === 0)), true);
      await seed(page); await page.clock.runFor(5000);
      await seed(page, 'IRL_PADEL_01'); await page.clock.runFor(10000);
      assert.equal(await page.locator('.message-reactions').count(), 0);
      assert.equal(await page.evaluate(() => reactionMoves.length), 0, 'navigation discards previous callbacks');
      await seed(page, 'LIVE_AGENT_03'); await page.clock.runFor(5000);
      assert.equal(await page.locator('.message-reaction').count(), 1);
      assert.equal(await page.locator('.message-reaction-count').textContent(), '', 'personal reactions have no group counter');
      await page.evaluate(() => window.personalPill = document.querySelector('.message-reaction'));
      await page.locator('[data-test-restart]').click(); await page.clock.runFor(10000);
      assert.equal(await page.evaluate(() => personalPill.isConnected), false, 'restart discards previous conversation');
      assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), 'LIVE_AGENT_01');
      assert.deepEqual(await page.locator('.message-reaction-count').allTextContents(), ['3', '2', '2'], 'fresh attempt may display its newly delivered authored reactions');
    } finally { await browser.close(); }
  });
}
