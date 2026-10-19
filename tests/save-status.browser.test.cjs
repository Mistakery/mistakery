const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const origin = 'http://mistakery.test/';

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const [failure, hasTouch] of [['read', true], ['write', true], ['read', false]]) {
    test(`${name}: ${failure}/${hasTouch ? 'touch' : 'mouse'} storage failure keeps warning and exit accessible at short heights`, { timeout: 45000 }, async () => {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch });
        const activate = locator => locator[hasTouch ? 'tap' : 'click']();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.addInitScript(failure => {
          localStorage.setItem('mistakery.sound', 'off');
          window.denySave = true;
          const method = failure === 'read' ? 'getItem' : 'setItem';
          const original = Storage.prototype[method];
          Storage.prototype[method] = function(key, ...args) {
            if (window.denySave && key === 'mistakery.browser-save') throw new DOMException('Blocked', 'SecurityError');
            return original.call(this, key, ...args);
          };
        }, failure);
        await page.route(origin + '**', async route => {
          const pathname = new URL(route.request().url()).pathname;
          const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
          await route.fulfill({ path: file, contentType: ({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)] || 'text/html' });
        });
        await page.clock.install();
        await page.goto(origin + '?seed=14');
        await page.locator('[data-title-play]').waitFor();
        await page.clock.pauseAt(new Date()); await page.clock.runFor(300);
        await activate(page.locator('[data-title-play]'));
        for (let n = 0; n < 5; n++) { await page.clock.runFor(20000); await activate(page.locator('[data-choice="left"]')); }
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
        await page.clock.runFor(20000);
        const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
        for (const [width, height] of [[320,480],[320,568],[390,650],[390,844],hasTouch ? [844,390] : [1280,720]]) {
          await page.setViewportSize({ width, height });
          await page.clock.runFor(300);
          const geometry = await page.evaluate(() => {
            const notice = document.querySelector('[data-save-status]');
            const n = notice.getBoundingClientRect(), b = document.querySelector('[data-restart-run]').getBoundingClientRect();
            return { overlap: Math.min(n.right,b.right)>Math.max(n.left,b.left) && Math.min(n.bottom,b.bottom)>Math.max(n.top,b.top),
              fits: n.left>=-1 && n.top>=-1 && n.right<=innerWidth+1 && n.bottom<=innerHeight+1,
              readable: notice.scrollHeight<=notice.clientHeight+1, text: notice.textContent };
          });
          assert.equal(geometry.overlap, false, `${width}x${height}: warning must not cover exit`);
          assert.equal(geometry.fits && geometry.readable, true, JSON.stringify(geometry));
          assert.match(geometry.text, /Progress is not being saved/);
          if (process.env.MISTAKERY_QA_DIR && failure === 'read') {
            await page.screenshot({ path: path.join(process.env.MISTAKERY_QA_DIR, `${name}-${hasTouch ? 'touch' : 'mouse'}-warning-${width}x${height}.png`) });
          }
          await page.locator('[data-restart-run]')[hasTouch ? 'tap' : 'click']({ timeout: 2000 });
          assert.match(await page.locator('[data-quit-dialog]').innerText(), /Progress couldn’t be saved/);
          await activate(page.locator('[data-quit-cancel]'));
          assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        }
        // Successful retry removes the warning and restores the original phone layout.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => { window.denySave = false; });
        await activate(page.locator('[data-restart-run]'));
        await activate(page.locator('[data-quit-confirm]'));
        await page.locator('[data-title-continue]').waitFor();
        assert.equal(await page.locator('[data-save-status]').count(), 0);
        assert.deepEqual(await page.locator('.phone').evaluate(n => [n.offsetWidth,n.offsetHeight]), [340,700]);
        await page.clock.runFor(300); await activate(page.locator('[data-title-continue]'));
        assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        await activate(page.locator('[data-restart-run]'));
        assert.match(await page.locator('[data-quit-dialog]').innerText(), /Your progress is saved/);
        await activate(page.locator('[data-quit-cancel]'));
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
}
