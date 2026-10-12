const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?story=live-agent';

for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const width of [320, 390]) {
    test(`${name}/${width}: INFLUENCER_08 compact reactions expand smoothly without interrupting message arrival`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width, height: 650 } });
        await page.clock.install(); await page.goto(url);
        await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
        await page.evaluate(() => {
          const a = MistakeryApp;
          a.state = MistakeryRoute.startRun(a.deck, { seed: 'reaction-layout' });
          a.state.currentCardId = 'INFLUENCER_08';
          a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
          a.cardDelivery = null; a.view = 'playing'; a.render();
        });
        const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
        await page.clock.runFor(4800);
        assert.equal(await page.locator('[data-chat-current]').count(), 3);
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 1, 'earlier message reaction has already arrived during the pause');
        assert.ok(await page.locator('.message-reactions[data-waiting]').evaluateAll(rows => rows.every(row => {
          const before = row.parentElement.offsetHeight;
          row.style.display = 'none'; const compact = row.parentElement.offsetHeight; row.style.display = '';
          return before === compact;
        })), 'no preallocated reaction area on arrival');
        // With longer reading beats the earlier reaction has already appeared.
        // Settle its real-time layout before freezing the last message entrance.
        await page.evaluate(() => document.getAnimations().filter(a =>
          a.effect.target?.matches('.reaction-bubble-surface, .message-reaction')
          || a.effect.getKeyframes().some(f => 'translate' in f)).forEach(a => a.finish()));
        await page.waitForFunction(() => !document.querySelector('.reaction-bubble-surface'));
        const before = await page.evaluate(() => {
          window.entrances = [...document.querySelectorAll('[data-chat-current]')].flatMap(n => n.getAnimations());
          entrances.forEach(a => { a.pause(); a.currentTime = 100; });
          const animate = Element.prototype.animate;
          window.expansionAnimations = [];
          Element.prototype.animate = function(frames, options) {
            const animation = animate.call(this, frames, options);
            if (frames.some(f => 'translate' in f) || this.matches('.reaction-bubble-surface')) {
              animation.pause(); animation.currentTime = 0;
              expansionAnimations.push({ node: this, animation, frames });
            }
            return animation;
          };
          window.measureReactionScene = () => {
            const chat = document.querySelector('[data-chat]');
            return { scroll: chat.scrollTop, boxes: [...chat.querySelectorAll('.member-avatar, [data-chat-current] p')].map(n => {
              const b = n.getBoundingClientRect();
              return [b.top, b.bottom, b.height, getComputedStyle(n).opacity];
            }) };
          };
          return measureReactionScene();
        });
        // Advance reaction timers while the native entrance is midway through its
        // trajectory. Revealing emoji must neither cancel it nor restart it.
        await page.clock.runFor(1600);
        assert.deepEqual(await page.evaluate(() => measureReactionScene().boxes), before.boxes,
          'the first expansion frame preserves text and avatar positions');
        assert.ok(await page.evaluate(() => entrances.every(a => a.playState === 'paused' && a.currentTime === 100)),
          'the original message animations survive unchanged');
        const motion = await page.evaluate(() => {
          const surface = expansionAnimations.find(x => x.node.matches('.reaction-bubble-surface'));
          if (!surface) return null;
          const duration = surface.animation.effect.getTiming().duration;
          const heights = [0, duration / 2, duration].map(t => {
            surface.animation.currentTime = t; return surface.node.getBoundingClientRect().height;
          });
          return { heights, layout: expansionAnimations.filter(x => !x.node.matches('.reaction-bubble-surface')).map(x => x.frames) };
        });
        assert.ok(motion && motion.heights[0] < motion.heights[1] && motion.heights[1] < motion.heights[2], 'only the background smoothly grows into the reaction area');
        assert.ok(motion.layout.length && motion.layout.every(frames => frames.every(f => !('transform' in f) && !('opacity' in f))), 'layout correction uses a separate translate layer');
        await page.evaluate(() => expansionAnimations.forEach(({ animation }) => animation.finish()));
        assert.deepEqual(await page.locator('.message-reaction-emoji').allTextContents(), ['😬', '🤯']);
        assert.equal(await page.locator('.message-reaction:not([data-pending])').count(), 2);
        assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
        assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
      } finally { await browser.close(); }
    });
  }
}

for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: real-time DREAM_TEAM delivery and reaction expansion preserve frame continuity`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.evaluate(() => {
        const a = MistakeryApp;
        a.state = MistakeryRoute.startRun(a.deck, { seed: 'reaction-continuity' });
        a.state.currentCardId = 'DREAM_TEAM';
        a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
        a.cardDelivery = null; a.view = 'playing'; a.render();
        window.samples = []; window.previous = new Map(); window.capture = true;
        const sample = time => {
          const chat = document.querySelector('[data-chat]');
          const moves = [...chat.querySelectorAll('[data-chat-current] p')].flatMap(node => {
            const rect = node.getBoundingClientRect(), old = previous.get(node);
            previous.set(node, { time, y: rect.top, height: rect.height });
            return old && time - old.time < 40 ? [{ delta: Math.abs(rect.top - old.y), scale: Math.abs(rect.height - old.height) }] : [];
          });
          samples.push({ moves, compact: [...chat.querySelectorAll('.message-reactions[data-waiting]')].every(row => row.offsetHeight === 0) });
          if (capture) requestAnimationFrame(sample);
        }; requestAnimationFrame(sample);
      });
      const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
      await page.waitForFunction(() => MistakeryApp.cardDelivery.delivered
        && !document.querySelector('.message-reaction[data-pending], .reaction-bubble-surface')
        && [...document.querySelectorAll('.message-reaction-count')].every(n => n.textContent === '2'));
      const samples = await page.evaluate(() => { capture = false; return window.samples; });
      assert.ok(samples.length > 40 && samples.every(s => s.compact));
      // A 36px row must unfold across frames, never jump into place at once.
      assert.ok(samples.flatMap(s => s.moves).every(m => m.delta < 20 && m.scale < .1), 'no instant reaction shift or text scaling');
      assert.equal(await page.locator('.is-reaction-expanding').count(), 0, 'temporary surfaces are released');
      assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
    } finally { await browser.close(); }
  });
}
