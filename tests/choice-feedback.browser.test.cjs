const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = process.env.MISTAKERY_CHOICE_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href;
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name}/${motion}: a choice sends immediately while automatic outgoing messages still type`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
        await page.addInitScript(() => {
          window.choiceAudio = [];
          const Audio = window.AudioContext || window.webkitAudioContext;
          const create = Audio.prototype.createBufferSource;
          Audio.prototype.createBufferSource = function (...args) {
            const context = this, source = create.apply(this, args), start = source.start;
            source.start = function (time = context.currentTime) {
              const kind = Object.entries(MISTAKERY_SOUND_SAMPLES).find(([, sample]) => atob(sample.pcm).length / 2 === source.buffer.length)?.[0];
              choiceAudio.push({ kind, requestedAt: Date.now(), scheduledDelay: time - context.currentTime });
              return start.call(this, time);
            };
            return source;
          };
        });
        await page.goto(url + '?story=live-agent');
        await page.waitForFunction(() => MistakeryApp?.view === 'playing');
        await page.locator('[data-test-inspect]').click(); await page.locator('[data-details-close]').click();
        await page.waitForTimeout(100);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        await page.evaluate(() => {
          MistakerySound.stop();
          const app = MistakeryApp;
          app.state = structuredClone(app.runStartState); app.cardDelivery = null; app.locked = false; app.render();
        });
        assert.equal(await page.locator('.founder-composer i').count(), 3, 'automatic first outgoing still has dots');
        assert.equal(await page.locator('[data-chat-current].self-message').count(), 0);
        await page.clock.runFor(650);
        assert.equal(await page.locator('[data-chat-current].self-message').count(), 1);
        await page.locator('button.typing-bubble').press('Enter');
        const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
        const label = await page.locator('[data-choice=left]').innerText();
        await page.evaluate(() => { MistakerySound.stop(); MistakerySound.play('incoming'); });
        await page.evaluate(() => {
          choiceAudio.length = 0; window.choiceTime = Date.now();
          document.querySelector('[data-choice=left]').click();
          document.querySelector('[data-choice=right]').click();
        });
        const immediate = await page.evaluate(() => {
          const reply = document.querySelector('[data-player-reply]');
          return { state: structuredClone(MistakeryApp.state), dots: !!document.querySelector('[data-composing-reply]'),
            reply: reply?.textContent, opacity: reply && Number(getComputedStyle(reply).opacity),
            animations: reply?.getAnimations().length, audio: choiceAudio, click: choiceTime };
        });
        assert.equal(immediate.dots, false, 'choice must never simulate player typing');
        assert.equal(immediate.reply, label, 'selected bubble exists in the click turn');
        assert.equal(immediate.opacity, 1); assert.equal(immediate.animations, 0, 'selected reply has no delayed entrance');
        assert.equal(immediate.state.history.length, before.history.length + 1);
        assert.equal(immediate.state.history.at(-1).side, 'left', 'second tap cannot resolve twice');
        assert.equal(immediate.state.resources.cash, before.resources.cash - .5);
        assert.deepEqual(immediate.audio.map(e => e.kind), ['send'], 'click interrupts incoming without waiting or overlapping');
        assert.ok(immediate.audio[0].requestedAt - immediate.click < 100);
        assert.ok(immediate.audio[0].scheduledDelay <= .011, 'only the brief interruption fade is permitted');
        await page.clock.runFor(10000);
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), immediate.state, 'no deferred second commit');
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before, 'Back restores exact pre-click state and RNG');
        await page.evaluate(() => {
          MistakerySound.stop(); const app = MistakeryApp;
          app.state = structuredClone(app.runStartState); app.state.gameOver = true; app.state.endingId = 'team_high';
          app.state.route.ending = { causes: ['team_high'], rawResources: { ...app.state.resources } };
          app.cardDelivery = null; app.locked = false; app.render();
        });
        await page.clock.runFor(15000);
        await page.evaluate(() => document.querySelector('[data-choice=left]').click());
        assert.equal(await page.locator('[data-player-reply]').evaluate(n => n.getAnimations().length), 0,
          'resource-ending replies also appear without an entrance animation');
        assert.equal(await page.locator('[data-player-reply]').evaluate(n => Number(getComputedStyle(n).opacity)), 1);
        assert.equal(await page.locator('[data-loss-finale]').evaluate(n => n.open), true);

      } finally { await browser.close(); }
    });
  }
}
