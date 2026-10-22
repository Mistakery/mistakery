const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: delivered title art has exactly the original decoded pixels`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
      await page.route('http://mistakery.test/**', async route => {
        const pathname = new URL(route.request().url()).pathname;
        const file = path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1));
        await route.fulfill({ path: file, contentType: ({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)] || 'text/html' });
      });
      await page.goto('http://mistakery.test/');
      await page.locator('.title-logo').waitFor();
      const compared = await page.evaluate(async () => {
        const logo = document.querySelector('.title-logo');
        const original = new Image(); original.src = 'assets/mistakery-logo.png';
        await Promise.all([logo.decode(), original.decode()]);
        const canvas = document.createElement('canvas'); canvas.width = original.naturalWidth; canvas.height = original.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pixels = img => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0); return ctx.getImageData(0, 0, canvas.width, canvas.height).data; };
        const a = pixels(original), b = pixels(logo);
        let changed = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) changed++;
        return { changed, dimensions: [logo.naturalWidth, logo.naturalHeight], bytesCompared: a.length };
      });
      assert.deepEqual(compared, { changed: 0, dimensions: [2172,724], bytesCompared: 2172*724*4 });
    } finally { await browser.close(); }
  });
}
