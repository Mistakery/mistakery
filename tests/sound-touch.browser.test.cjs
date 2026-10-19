const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const gameOrigin = 'https://game.test';
const hostOrigin = 'https://host.test';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const embedded of [false, true]) {
    test(`${name}: touch starts sound ${embedded ? 'inside a cross-origin iframe' : 'on a standalone page'}`, async () => {
      const browser = await engine.launch();
      try {
        const context = await browser.newContext({ hasTouch: true, isMobile: true,
          viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        await context.addInitScript(() => {
          window.audioStarts = [];
          const Audio = window.AudioContext || window.webkitAudioContext;
          const create = Audio.prototype.createBufferSource;
          const createGain = Audio.prototype.createGain;
          // Exercise real Web Audio activation without sending sound to the host speakers.
          Audio.prototype.createGain = function (...args) {
            const gain = createGain.apply(this, args), connect = gain.connect;
            gain.connect = function (target, ...rest) {
              if (target === this.context.destination) return target;
              return connect.call(this, target, ...rest);
            };
            return gain;
          };
          Audio.prototype.createBufferSource = function (...args) {
            const source = create.apply(this, args), start = source.start, audio = this;
            source.start = function (...args) {
              window.audioStarts.push({ state: audio.state, samples: source.buffer?.length });
              return start.apply(this, args);
            };
            return source;
          };
        });
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.origin === hostOrigin) return route.fulfill({ contentType: 'text/html', body:
            `<meta name="viewport" content="width=device-width"><button onclick="document.querySelector('iframe').src='${gameOrigin}/index.html?story=live-agent';this.remove()">Run game</button><iframe title="Game" style="width:340px;height:700px;border:0" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin"></iframe>` });
          if (url.origin !== gameOrigin) return route.abort();
          try {
            const file = path.join(root, decodeURIComponent(url.pathname));
            return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) });
          } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
        });
        const page = await context.newPage();
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(embedded ? hostOrigin : `${gameOrigin}/index.html?story=live-agent`);
        if (embedded) await page.getByRole('button', { name: 'Run game' }).tap();
        const frame = embedded ? await (await page.waitForSelector('iframe')).contentFrame() : page;
        await frame.waitForFunction(() => window.MistakeryApp?.state && !document.querySelector('[data-choice]').disabled);
        assert.equal(await frame.evaluate(() => audioStarts.length), 0, 'no playback before a game gesture');
        await frame.locator('[data-choice="left"]').tap();
        await frame.waitForFunction(() => audioStarts.length > 0);
        assert.ok((await frame.evaluate(() => audioStarts)).every(clip => clip.state === 'running' && clip.samples > 0));
        await frame.locator('[data-sound-toggle]').tap();
        assert.equal(await frame.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'false');
        const mutedStarts = await frame.evaluate(() => audioStarts.length);
        await frame.waitForFunction(() => !document.querySelector('[data-choice]').disabled);
        await frame.locator('[data-choice="left"]').tap();
        assert.equal(await frame.evaluate(() => audioStarts.length), mutedStarts, 'muted choices stay silent');
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
}
