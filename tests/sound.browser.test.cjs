const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = process.env.MISTAKERY_SOUND_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href;
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: approved clips, event mapping, deduplication, Back and persisted mute`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.audioClips = []; window.audioEvents = [];
        const Audio = window.AudioContext || window.webkitAudioContext;
        const original = Audio.prototype.createBufferSource;
        Audio.prototype.createBufferSource = function (...args) {
          const context = this, source = original.apply(this, args), start = source.start, stop = source.stop;
          let record;
          source.stop = function (time = context.currentTime) {
            if (record) record.stop = time;
            return stop.call(this, time);
          };
          source.start = function (...args) {
            const data = source.buffer.getChannelData(0);
            const kind = Object.entries(window.MISTAKERY_SOUND_SAMPLES || {}).find(([, sample]) => {
              const pcm = atob(sample.pcm);
              if (pcm.length !== data.length * 2 || sample.sampleRate !== source.buffer.sampleRate) return false;
              for (let i = 0; i < data.length; i++) {
                const value = pcm.charCodeAt(i * 2) | pcm.charCodeAt(i * 2 + 1) << 8;
                if (data[i] !== (value >= 32768 ? value - 65536 : value) / 32768) return false;
              }
              return true;
            })?.[0];
            window.audioClips.push(kind || 'unrecognized');
            record = { kind, start: args[0] ?? context.currentTime, end: (args[0] ?? context.currentTime) + source.buffer.duration };
            window.audioEvents.push(record);
            return start.apply(this, args);
          };
          return source;
        };
      });
      await page.goto(url + '?story=live-agent');
      await page.waitForFunction(() => window.MistakeryApp?.state && !document.querySelector('[data-choice]').disabled);
      assert.deepEqual(await page.evaluate(() => audioClips), [], 'no autoplay');
      await page.locator('[data-test-inspect]').click(); await page.locator('[data-details-close]').click();
      assert.deepEqual(await page.evaluate(() => audioClips), [], 'ordinary controls are quiet');
      await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      await page.locator('[data-choice="left"]').click(); await page.clock.runFor(15000);
      const delivered = await page.evaluate(() => audioClips);
      assert.equal(delivered.filter(kind => kind === 'send').length, 1, 'choice/send is one cue');
      assert.ok(delivered.includes('incoming'), 'approved B accompanies fresh messages');
      await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(15000);
      assert.deepEqual(await page.evaluate(() => audioClips), delivered, 'rerender does not replay');
      await page.locator('[data-test-back]').click(); await page.clock.runFor(15000);
      assert.deepEqual(await page.evaluate(() => audioClips), delivered, 'Back does not replay');
      async function assertExclusive() {
        const events = await page.evaluate(() => audioEvents);
        for (let i = 1; i < events.length; i++) {
          const previous = events[i - 1];
          assert.ok(events[i].start + .000001 >= Math.min(previous.end, previous.stop ?? Infinity),
            `${previous.kind} overlaps ${events[i].kind}: ${JSON.stringify(events)}`);
        }
      }
      await assertExclusive();
      // Fixtures change presentation only; the normal choice path above covers real sending.
      async function show(id, endingId, complete = true) {
        await page.evaluate(({ id, endingId }) => {
          MistakerySound.stop();
          const app = MistakeryApp;
          app.state = structuredClone(app.runStartState);
          app.state.currentCardId = id; app.state.history = [];
          app.state.gameOver = Boolean(endingId); app.state.endingId = endingId;
          if (endingId) app.state.route.ending = { causes: endingId === 'judgment_day' ? [] : [endingId], rawResources: { ...app.state.resources } };
          app.cardDelivery = null; app.locked = false; app.view = 'playing';
          audioClips.length = 0; audioEvents.length = 0; app.render();
        }, { id, endingId });
        if (complete) await page.clock.runFor(15000);
        return page.evaluate(() => audioClips);
      }
      assert.deepEqual(await show('LIVE_AGENT_OUTCOME_4'), ['story-loss']);
      assert.deepEqual(await show('LIVE_AGENT_OUTCOME_1'), ['story-win']);
      assert.deepEqual(await show('LIVE_AGENT_OUTCOME_2', 'judgment_day'), ['story-loss']);
      const padel = await page.evaluate(() => MistakeryApp.deck.cards.filter(c => c.mode === 'irl').map(c => ({ id: c.id, tone: c.outcomeTone })));
      for (const card of padel) {
        const expected = [card.tone ? card.tone === 'success' ? 'story-win' : 'story-loss' : 'padel'];
        assert.deepEqual(await show(card.id), expected, `${card.id}: result overrides ball; ordinary IRL arrivals use ball`);
        await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(15000);
        assert.deepEqual(await page.evaluate(() => audioClips), expected, `${card.id}: no replay`);
      }
      for (const side of ['left', 'right']) {
        await show('IRL_PADEL_06');
        await page.evaluate(() => { audioClips.length = 0; });
        await page.locator(`[data-choice="${side}"]`).click();
        const outcome = await page.evaluate(() => MistakeryApp.deck.cards.find(c => c.id === MistakeryApp.state.currentCardId));
        assert.ok(outcome.outcomeTone, 'real padel choice enters an outcome');
        assert.deepEqual(await page.evaluate(() => audioClips), [outcome.outcomeTone === 'success' ? 'story-win' : 'story-loss'], 'instant outcome emits only its main cue');
        await assertExclusive();
      }
      const loss = await show('LIVE_AGENT_01', 'team_high');
      assert.equal(loss.filter(kind => kind === 'resource-loss').length, 1);
      assert.ok(loss.every(kind => ['incoming', 'resource-loss'].includes(kind)));
      await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(15000);
      assert.deepEqual(await page.evaluate(() => audioClips), loss);
      await page.locator('[data-choice="left"]').click();
      assert.deepEqual((await page.evaluate(() => audioClips)).slice(loss.length), ['ai-finale'], 'finale replaces simultaneous send');
      await assertExclusive();
      await page.keyboard.press('Escape');
      await page.locator('[data-sound-toggle]').click();
      assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'false');
      assert.deepEqual(await show('IRL_PADEL_01'), [], 'muting suppresses every cue');
      await page.clock.resume(); await page.reload();
      await page.waitForFunction(() => window.MistakeryApp?.state && !document.querySelector('[data-choice]').disabled);
      assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'false');
      assert.deepEqual(await page.evaluate(() => audioClips), []);
      await page.locator('[data-sound-toggle]').click();
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => audioClips), [], 'enabling sound does not replay old arrivals');
      await page.locator('[data-choice="left"]').click();
      await page.waitForFunction(() => audioClips.includes('send'));
      // Use real time: the browser clock does not advance AudioContext.currentTime.
      // These are authored deliveries without a choice click, including a PDF and four consecutive sends.
      for (const fixture of [
        { id: 'LIVE_AGENT_01', sends: 1 }, { id: 'DREAM_TEAM', sends: 1 },
        { id: 'LIVE_AGENT_01', ending: 'founder_low', sends: 1 },
        { id: 'LIVE_AGENT_01', ending: 'founder_high', sends: 4 },
      ]) {
        await show(fixture.id, fixture.ending, false);
        const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
        await page.waitForFunction(() => MistakeryApp.cardDelivery?.delivered);
        const clips = await page.evaluate(() => audioClips);
        assert.equal(clips.filter(kind => kind === 'send').length, fixture.sends,
          `${fixture.ending || fixture.id}: each automatic outgoing delivery has its send cue`);
        await assertExclusive();
        await page.evaluate(() => MistakeryApp.render());
        assert.deepEqual(await page.evaluate(() => audioClips), clips, 'rerender never repeats automatic sends');
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before, 'automatic audio never changes gameplay');
      }
      assert.deepEqual(errors, []);
      assert.ok((await page.evaluate(() => audioClips)).every(kind => kind !== 'unrecognized'));
      if (process.env.MISTAKERY_SOUND_SCREENSHOT) await page.screenshot({ path: process.env.MISTAKERY_SOUND_SCREENSHOT.replace('.png', `-${name}.png`) });
    } finally { await browser.close(); }
  });
}
