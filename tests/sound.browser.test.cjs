const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = process.env.MISTAKERY_SOUND_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href;
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: real audio, delivery deduplication, Back, alerts and persisted mute`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.audioTones = 0;
        const Audio = window.AudioContext || window.webkitAudioContext;
        const original = Audio.prototype.createOscillator;
        Audio.prototype.createOscillator = function (...args) {
          window.audioTones++;
          return original.apply(this, args);
        };
      });
      await page.goto(url + '?story=live-agent');
      await page.waitForFunction(() => window.MistakeryApp?.state);
      assert.equal(await page.locator('[data-sound-toggle]').count(), 1, 'sound control exists');
      await page.waitForFunction(() => !document.querySelector('[data-choice]').disabled);
      assert.equal(await page.evaluate(() => audioTones), 0, 'no autoplay');
      await page.locator('[data-test-inspect]').click();
      await page.waitForFunction(() => audioTones > 0);
      await page.locator('[data-details-close]').click();
      await page.clock.install(); await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      await page.clock.runFor(1000);
      const before = await page.evaluate(() => audioTones);
      await page.locator('[data-choice="left"]').click();
      await page.clock.runFor(15000);
      assert.ok(await page.evaluate(() => audioTones) > before + 1, 'click plus incoming delivery');
      const delivered = await page.evaluate(() => audioTones);
      if (process.env.MISTAKERY_SOUND_SCREENSHOT) await page.screenshot({ path: process.env.MISTAKERY_SOUND_SCREENSHOT.replace('.png', `-${name}.png`) });
      await page.evaluate(() => MistakeryApp.render());
      await page.clock.runFor(15000);
      assert.equal(await page.evaluate(() => audioTones), delivered, 'rerender is silent');
      await page.locator('[data-test-back]').click();
      await page.clock.runFor(15000);
      assert.equal(await page.evaluate(() => audioTones), delivered + 1, 'Back clicks once without replaying messages');
      // Resource-loss delivery and popup: each alert is emitted once.
      await page.clock.resume();
      await page.goto(url + '?preview=losses&card=DOC_LOSS_3');
      await page.waitForFunction(() => window.MistakeryApp?.state);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
      await page.locator('[data-test-inspect]').click();
      await page.locator('[data-details-close]').click();
      await page.clock.runFor(15000);
      const loss = await page.evaluate(() => audioTones);
      await page.evaluate(() => MistakeryApp.render()); await page.clock.runFor(15000);
      assert.equal(await page.evaluate(() => audioTones), loss, 'defeat does not replay');
      await page.locator('[data-choice="left"]').click();
      await new Promise(resolve => setTimeout(resolve, 50));
      assert.equal(await page.evaluate(() => audioTones), loss + 3);
      await page.keyboard.press('Escape');
      await page.locator('[data-sound-toggle]').click();
      assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'false');
      const quiet = await page.evaluate(() => audioTones);
      await page.locator('[data-loss-next]').click(); await page.clock.runFor(15000);
      assert.equal(await page.evaluate(() => audioTones), quiet, 'mute suppresses click, message and alert');
      await page.clock.resume();
      await page.reload(); await page.waitForFunction(() => window.MistakeryApp?.state);
      assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'false');
      assert.equal(await page.evaluate(() => audioTones), 0);
      await page.locator('[data-sound-toggle]').click();
      await page.waitForFunction(() => audioTones > 0);
      assert.equal(await page.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
