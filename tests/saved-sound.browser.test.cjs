const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = process.env.MISTAKERY_SAVED_SOUND_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href;
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: the automatic Saved update sends once at delivery, including overdue rerender`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage();
      await page.addInitScript(() => {
        window.savedCues = [];
        const Audio = window.AudioContext || window.webkitAudioContext;
        const create = Audio.prototype.createBufferSource;
        Audio.prototype.createBufferSource = function (...args) {
          const source = create.apply(this, args), start = source.start;
          source.start = function (...args) {
            savedCues.push(Object.entries(MISTAKERY_SOUND_SAMPLES).find(([, s]) => atob(s.pcm).length / 2 === source.buffer.length)?.[0]);
            return start.apply(this, args);
          };
          return source;
        };
      });
      await page.goto(url + '?test=route');
      await page.waitForFunction(() => MistakeryApp?.view === 'saved');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.evaluate(() => { MistakerySound.stop(); savedCues.length = 0; });
      const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
      await page.clock.runFor(600); await page.evaluate(() => MistakeryApp.render());
      await page.clock.runFor(399);
      assert.deepEqual(await page.evaluate(() => savedCues), []);
      await page.clock.runFor(1);
      assert.deepEqual(await page.evaluate(() => savedCues), ['send'], 'automatic Saved bubble gets its approved send cue');
      await page.evaluate(() => MistakeryApp.render());
      assert.deepEqual(await page.evaluate(() => savedCues), ['send'], 'rerender never replays the update');
      assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before);
      await page.locator('[data-test-back]').click();
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.evaluate(() => { MistakerySound.stop(); savedCues.length = 0; });
      await page.clock.setSystemTime(await page.evaluate(() => Date.now() + 1001));
      await page.evaluate(() => MistakeryApp.render());
      assert.deepEqual(await page.evaluate(() => savedCues), ['send'], 'overdue delivery sounds once when rendered');
      await page.evaluate(() => MistakeryApp.render());
      assert.deepEqual(await page.evaluate(() => savedCues), ['send']);
      await page.locator('[data-test-back]').click();
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.locator('[data-sound-toggle]').click();
      await page.evaluate(() => { savedCues.length = 0; });
      await page.clock.runFor(1000);
      assert.deepEqual(await page.evaluate(() => savedCues), [], 'muted automatic delivery stays quiet');
    } finally { await browser.close(); }
  });
}
