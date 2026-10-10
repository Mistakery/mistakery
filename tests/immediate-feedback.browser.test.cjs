const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;

for (const [name, type] of Object.entries({ Chromium: chromium, WebKit: webkit })) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name} ${motion}: Saved update first bubble visibly arrives once without changing delivery deadline`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
        await page.goto(url + '?test=route');
        await page.waitForFunction(() => MistakeryApp?.view === 'saved');
        await page.clock.install(); await page.clock.pauseAt(new Date());
        const sample = await page.evaluate(() => {
          document.querySelector('[data-choice]').click();
          const bubble = document.querySelector('.note-message');
          const animation = bubble.getAnimations()[0];
          if (!animation) return null;
          animation.pause();
          const frames = [0, 100, 200].map(time => {
            animation.currentTime = time;
            const css = getComputedStyle(bubble);
            return { opacity: Number(css.opacity), y: new DOMMatrix(css.transform).m42 };
          });
          animation.finish();
          return { frames, duration: animation.effect.getTiming().duration };
        });
        assert.ok(sample, 'new first bubble needs a visible entrance');
        assert.equal(sample.duration, 200);
        assert.equal(sample.frames[0].opacity, 0);
        assert.ok(sample.frames[1].opacity > 0 && sample.frames[1].opacity < 1);
        assert.equal(sample.frames[2].opacity, 1);
        if (motion === 'reduce') assert.ok(sample.frames.every(f => f.y === 0));
        else assert.ok(sample.frames[0].y > sample.frames[1].y && sample.frames[1].y > sample.frames[2].y);
        await page.clock.runFor(600); await page.evaluate(() => MistakeryApp.render());
        assert.equal(await page.locator('.note-message').first().evaluate(n => n.getAnimations().length), 0);
        await page.clock.runFor(399); assert.equal(await page.locator('.note-message').count(), 1);
        await page.clock.runFor(1); assert.equal(await page.locator('.note-message').count(), 2);
      } finally { await browser.close(); }
    });

    test(`${name} ${motion}: meters respond on retained reply click, cancel cleanly and never replay at send`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ reducedMotion: motion });
        await page.goto(url + '?story=live-agent');
        await page.waitForFunction(() => MistakeryApp?.view === 'playing');
        await page.clock.install(); await page.clock.pauseAt(new Date());
        await page.locator('button.typing-bubble').press('Enter');
        const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
        await page.evaluate(() => {
          document.querySelector('[data-choice=left]').click();
          window.clickAnimations = document.querySelector('[data-resource=cash] .bar i').getAnimations();
        });
        const immediate = await page.evaluate(() => {
          const cash = document.querySelector('[data-resource=cash]');
          const team = document.querySelector('[data-resource=team]');
          window.clickAnimations = cash.querySelector('.bar i').getAnimations();
          return { cash: cash.dataset.direction, team: team.dataset.direction,
            width: cash.querySelector('.bar i').style.width,
            animationFrames: window.clickAnimations.map(a => a.effect.getKeyframes().map(f => f.width)) };
        });
        assert.equal(immediate.cash, 'down', 'fractional Cash cue starts at click, before typing');
        assert.equal(immediate.team, 'up');
        assert.equal(immediate.width, '24.5%');
        assert.deepEqual(immediate.animationFrames, motion === 'reduce' ? [] : [['25%', '24.5%']]);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before, 'visual feedback cannot commit the choice early');
        await page.clock.runFor(300);
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before);
        assert.equal(await page.locator('[data-resource=cash]').getAttribute('data-direction'), null);
        assert.equal(await page.locator('[data-resource=cash] .bar i').evaluate(n => n.style.width), '25%');
        await page.clock.runFor(5000);
        if (await page.locator('button.typing-bubble').count()) await page.locator('button.typing-bubble').press('Enter');
        await page.evaluate(() => {
          document.querySelector('[data-choice=left]').click();
          window.clickAnimations = document.querySelector('[data-resource=cash] .bar i').getAnimations();
        });
        await page.locator('[data-choice=right]').dispatchEvent('click');
        await page.clock.runFor(motion === 'reduce' ? 649 : 849);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before);
        await page.clock.runFor(1);
        const after = await page.evaluate(() => structuredClone(MistakeryApp.state));
        assert.equal(after.history.length, 1); assert.equal(after.resources.cash, 24.5); assert.equal(after.resources.team, 65);
        assert.equal(await page.locator('[data-resource=cash] .bar i').evaluate(n => n.getAnimations().every(a => window.clickAnimations.includes(a))), true, 'send cannot start a second fill animation');
        assert.equal(await page.locator('[data-resource=cash]').getAttribute('data-direction'), 'down');
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before, 'Back restores complete snapshot including RNG');
      } finally { await browser.close(); }
    });
  }
}
