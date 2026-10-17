const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');

const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const notes = page => page.locator('[data-chat] .note-message');
const replies = page => page.locator('[data-choice]');

async function start(page) {
  await page.goto(url);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'onboarding');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'So long, corporate jail!' }).click();
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'Trust the process' }).click();
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'Open the Masterplan' }).click();
  assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
  assert.equal(await notes(page).count(), 1);
  assert.equal(await notes(page).first().evaluate(n => n.getAnimations().length), 0, 'first Saved has no entrance');
  assert.equal(await replies(page).filter({ hasText: 'Right on track' }).isEnabled(), true);
  await page.getByRole('button', { name: 'Right on track' }).click();
  assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_02_UPDATE');
}

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name} ${motion}: Saved update waits 1000 ms, gates replies and keeps its deadline on rerender`, async () => {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await start(page);
        assert.equal(await notes(page).count(), 1);
        assert.match((await notes(page).first().innerText()).replace(/\u00a0/g, ' '), /5 MONTHS AS A FOUNDER 🚀/);
        assert.equal(await replies(page).count(), 2);
        assert.equal(await replies(page).filter({ hasText: 'WE’RE SO BACK' }).isDisabled(), true);
        await replies(page).first().evaluate(button => button.click());
        assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_02_UPDATE');
        await page.clock.runFor(600);
        await page.evaluate(() => window.MistakeryApp.render());
        await notes(page).first().evaluate(node => { window.firstSavedBubble = node; });
        await page.clock.runFor(399);
        assert.equal(await notes(page).count(), 1);
        assert.equal(await replies(page).first().isDisabled(), true);
        const before = await page.evaluate(() => {
          const chat = document.querySelector('[data-chat]');
          return { note: chat.querySelector('.note-message').offsetTop - chat.scrollTop,
            dots: chat.querySelector('.founder-composer').offsetTop - chat.scrollTop };
        });
        await page.clock.runFor(1);
        assert.equal(await notes(page).count(), 2);
        assert.equal(await page.locator('[aria-label="Founder is typing"]').count(), 0);
        const arrival = await page.evaluate(() => {
          const chat = document.querySelector('[data-chat]');
          const nodes = [...chat.querySelectorAll('.note-message')];
          const animations = nodes.map(n => n.getAnimations().filter(a => a.playState === 'running'));
          if (animations.at(-1).length !== 1) return null;
          const all = animations.flat();
          all.forEach(a => a.pause());
          const frames = [0, 100, 200].map(time => {
            all.forEach(a => { a.currentTime = time; });
            const bounds = nodes.map(n => n.getBoundingClientRect());
            return { opacity: nodes.map(n => Number(getComputedStyle(n).opacity)),
              y: nodes.map(n => new DOMMatrix(getComputedStyle(n).transform).m42),
              top: nodes.map(n => n.offsetTop - chat.scrollTop + new DOMMatrix(getComputedStyle(n).transform).m42),
              gap: bounds[1].top - bounds[0].bottom };
          });
          window.savedArrivalAnimations = all;
          return { frames, counts: animations.map(a => a.length),
            timings: all.map(a => ({ duration: a.effect.getTiming().duration,
              easing: a.effect.getTiming().easing, start: a.startTime })) };
        });
        assert.ok(arrival, 'delivered Saved bubble must animate from the typing position');
        assert.deepEqual(arrival.counts, motion === 'reduce' ? [0, 1] : [1, 1]);
        for (const timing of arrival.timings) {
          assert.equal(timing.duration, 200);
          assert.equal(timing.easing, 'cubic-bezier(0.2, 0, 0, 1)');
          assert.equal(timing.start, arrival.timings[0].start, 'one shared timeline');
        }
        assert.deepEqual(arrival.frames[0].opacity, [1, 0], 'history stays opaque while new text fades in');
        assert.deepEqual(arrival.frames[2].opacity, [1, 1]);
        if (motion === 'reduce') assert.ok(arrival.frames.every(f => f.y.every(y => y === 0)));
        else {
          assert.ok(Math.abs(arrival.frames[0].top[0] - before.note) < 1, 'old note keeps its starting position');
          assert.ok(Math.abs(arrival.frames[0].top[1] - before.dots) < 1, 'new bubble starts at the dots');
          for (const frame of arrival.frames) {
            assert.ok(Math.abs(frame.y[0] - frame.y[1]) < .02, 'notes move together');
            assert.ok(Math.abs(frame.gap - arrival.frames[2].gap) < .1, 'gap stays stable');
          }
        }
        assert.equal(await notes(page).first().evaluate(node => node === window.firstSavedBubble), true, 'existing note is preserved');
        await page.evaluate(() => window.MistakeryApp.render());
        assert.equal(await page.evaluate(() => window.savedArrivalAnimations.every(a => a.playState === 'idle')), true,
          'rerender cancels the transition without replaying it');
        assert.equal(await notes(page).evaluateAll(ns => ns.flatMap(n => n.getAnimations()).length), 0);
        assert.match((await notes(page).last().innerText()).replace(/\u00a0/g, ' '), /IN PROGRESS:\s*9\. Unicorn 🦄🎯 \(30 DAYS UNTIL WE'RE BROKE!!\)/);
        assert.equal(await replies(page).first().isEnabled(), true);
        await page.clock.runFor(2000);
        await page.evaluate(() => window.MistakeryApp.render());
        assert.equal(await notes(page).count(), 2);
        assert.equal(await notes(page).evaluateAll(ns => ns.flatMap(n => n.getAnimations()).length), 0, 'render cannot replay Saved');
        await replies(page).first().focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => window.MistakeryApp.view), 'playing');
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
  test(`${name}: test Back cancels an old Saved delivery`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.goto(`${url}?story=live-agent`);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      await page.locator('[data-restart-run]').click();
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.clock.runFor(500);
      await page.locator('[data-test-back]').click();
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      await page.clock.runFor(700);
      assert.equal(await notes(page).count(), 1);
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.clock.runFor(999);
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(1);
      assert.equal(await notes(page).count(), 2);
    } finally { await browser.close(); }
  });
  test(`${name}: restart cancels stale Saved delivery and each revisit starts a fresh 1000 ms`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await start(page);
      await page.clock.runFor(500);
      await page.locator('[data-restart-run]').click();
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      await page.clock.runFor(700);
      assert.equal(await notes(page).count(), 1);
      await page.getByRole('button', { name: 'Right on track' }).click();
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(999);
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(1);
      assert.equal(await notes(page).count(), 2);
      await page.locator('[data-restart-run]').click();
      await page.getByRole('button', { name: 'Slightly behind' }).click();
      assert.equal(await notes(page).count(), 1);
      assert.equal(await replies(page).first().isDisabled(), true);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
