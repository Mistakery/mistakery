const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?story=live-agent';
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const width of [320, 390]) {
    test(`${name}/${width}: message entrances accelerate gently and settle together without a snap`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width, height: 650 } });
        await page.clock.install(); await page.goto(url);
        await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
        await page.evaluate(() => {
          const a = MistakeryApp; a.state = MistakeryRoute.startRun(a.deck, { seed: 'gentle-arrival' });
          a.state.currentCardId = 'LIVE_AGENT_01'; a.cardDelivery = null; a.view = 'playing'; a.render();
        });
        const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
        for (const wait of [650, 600, 500, 700]) {
          await page.clock.runFor(wait);
          const sample = await page.evaluate(() => {
            const nodes = [...document.querySelectorAll('[data-chat-current], .typing-row, .message-stack > .typing-bubble')];
            const fresh = [...document.querySelectorAll('[data-chat-current]')].at(-1);
            const animations = nodes.map(n => n.getAnimations());
            if (animations.some(a => a.length !== 1)) return { counts: animations.map(a => a.length) };
            const all = animations.flat(), duration = all[0].effect.getTiming().duration;
            all.forEach(a => a.pause());
            function point(time) {
              all.forEach(a => a.currentTime = time);
              const bounds = nodes.map(n => n.getBoundingClientRect());
              return { y: nodes.map(n => new DOMMatrix(getComputedStyle(n).transform).m42),
                scales: nodes.map(n => { const m = new DOMMatrix(getComputedStyle(n).transform); return [m.a, m.d]; }),
                gaps: bounds.slice(1).map((b, i) => b.top - bounds[i].bottom),
                opacity: Number(getComputedStyle(fresh).opacity) };
            }
            const start = point(0), early = point(40), readable = point(120);
            const frames = Array.from({ length: 41 }, (_, i) => point(i * duration / 40));
            const timings = all.map(a => ({ duration: a.effect.getTiming().duration, start: a.startTime }));
            all.forEach(a => a.finish());
            return { duration, start, early, readable, frames, timings };
          });
          assert.ok(!sample.counts, 'one shared native entrance per row');
          const travel = Math.abs(sample.start.y[0]);
          assert.ok(travel > 0);
          const earlyProgress = 1 - Math.abs(sample.early.y[0]) / travel;
          assert.ok(earlyProgress < .3, `first40ms must not contain a sudden half-travel leap: ${earlyProgress}`);
          assert.ok(sample.duration >= 250 && sample.duration <= 450, 'gentle sampled spring, within normal reading pause');
          assert.equal(sample.start.opacity, 0);
          assert.equal(sample.readable.opacity, 1, 'message text becomes readable before the movement settles');
          let previous = travel;
          for (const frame of sample.frames) {
            const remaining = Math.abs(frame.y[0]);
            assert.ok(remaining <= previous + .02, 'no bounce or reverse jerk');
            assert.ok(previous - remaining <= travel * .09 + .02, 'no abrupt jump between sampled frames');
            previous = remaining;
            for (const y of frame.y) assert.ok(Math.abs(y - frame.y[0]) < .02, 'new message and neighbors share a trajectory');
            assert.ok(frame.scales.every(([x, y]) => x === 1 && y === 1), 'text never scales');
            frame.gaps.forEach((gap, i) => assert.ok(Math.abs(gap - sample.frames.at(-1).gaps[i]) < .1, 'bubble gaps remain stable'));
          }
          assert.ok(previous < .02);
          assert.ok(sample.timings.every(t => t.duration === sample.duration && t.start === sample.timings[0].start));
        }
        assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
        assert.equal(await page.locator('[data-choice]:disabled').count(), 0, 'delivery choices keep their existing deadline');
      } finally { await browser.close(); }
    });
  }
}
