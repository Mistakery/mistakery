const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const ids = require('../cards.json').cards.filter(c => c.mode === 'irl' && c.plot === 'padel').map(c => c.id);
const url = pathToFileURL(path.join(root, 'index.html')).href;

test('every active IRL card has a unique compact WebP background', () => {
  const manifest = path.join(root, 'assets/padel-backgrounds.js');
  assert.ok(fs.existsSync(manifest), 'missing Padel background manifest');
  const window = {};
  vm.runInNewContext(fs.readFileSync(manifest, 'utf8'), { window });
  const backgrounds = window.MISTAKERY_PADEL_BACKGROUNDS;
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(index.indexOf('assets/padel-backgrounds.js') < index.indexOf('app.js'));
  assert.deepEqual(Object.keys(backgrounds).sort(), [...ids].sort());
  assert.equal(new Set(Object.values(backgrounds).map(b => b.src)).size, 12);
  let total = 0;
  for (const background of Object.values(backgrounds)) {
    const data = fs.readFileSync(path.join(root, background.src));
    assert.equal(data.subarray(0, 4).toString(), 'RIFF');
    assert.equal(data.subarray(8, 12).toString(), 'WEBP');
    assert.ok(data.length < 130 * 1024, background.src);
    total += data.length;
  }
  assert.ok(total < 1100 * 1024, `background set is too large: ${total}`);
});

async function show(page, id) {
  await page.evaluate(id => {
    const a = MistakeryApp;
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'backgrounds' });
    a.state.currentCardId = id;
    a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
    a.state.schedulerResources = { ...a.state.resources };
    a.state.flags = ['live_agent_completed'];
    a.state.turn = 40; a.cardDelivery = null; a.locked = false; a.view = 'playing';
    a.render();
  }, id);
}

test('slow and failed backgrounds keep a stable fallback without blocking play or late swaps', async () => {
  const server = http.createServer((request, response) => {
    const name = new URL(request.url, 'http://local').pathname;
    const file = path.join(root, name === '/' ? 'index.html' : name);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { response.writeHead(404).end(); return; }
      const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' }[path.extname(file)];
      response.writeHead(200, { 'Content-Type': type || 'application/octet-stream' }); response.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  let release;
  const hold = new Promise(resolve => { release = resolve; });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/assets/padel-backgrounds/*.webp', async route => {
      if (route.request().url().includes('irl-padel-01-')) {
        await hold;
        await route.fulfill({ path: path.join(root, 'assets/padel-backgrounds/irl-padel-01-v1.webp'), contentType: 'image/webp' });
      } else if (route.request().url().includes('irl-padel-03b-')) await route.abort();
      else await route.continue();
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?story=live-agent`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => MistakeryApp?.view === 'playing', null, { timeout: 7000 });
    await show(page, 'IRL_PADEL_01');
    assert.equal(await page.locator('.irl-background').count(), 0);
    assert.match(await page.locator('[data-scene]').evaluate(n => getComputedStyle(n, '::after').backgroundImage), /irl-padel-court.webp/);
    const finished = page.waitForEvent('requestfinished', r => r.url().includes('irl-padel-01-v1.webp'));
    release(); await finished;
    // Frames after a late decode must not replace the scene under the player.
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.irl-background').count(), 0);
    await show(page, 'IRL_PADEL_04');
    await show(page, 'IRL_PADEL_01');
    assert.equal(await page.locator('.irl-background').count(), 1, 'late decode is retained for the next visit');
    await show(page, 'IRL_PADEL_03B');
    assert.equal(await page.locator('.irl-background').count(), 0, 'failed file cannot leave the previous card picture behind');
    assert.deepEqual(errors, []);
  } finally { release(); await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

for (const [name, type] of Object.entries({ chromium, webkit })) {
  test(`${name}: all Padel backgrounds are decoded before display and reused without transition requests`, async () => {
    const browser = await type.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const requests = [];
      const errors = [];
      page.on('request', r => { if (r.url().includes('/assets/padel-backgrounds/')) requests.push(r.url()); });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(url + '?story=live-agent');
      await page.waitForFunction(() => MistakeryApp?.view === 'playing');
      assert.equal(requests.length, 12, 'warm the complete branch at startup');
      for (const id of [...ids, ...ids.slice().reverse()]) {
        await show(page, id);
        const result = await page.locator('.irl-background').evaluate(n => {
          const image = n.getBoundingClientRect();
          const scene = n.parentElement.getBoundingClientRect();
          return {
          src: n.getAttribute('src'), ready: n.complete && n.naturalWidth > 0,
          width: n.naturalWidth, hidden: n.getAttribute('aria-hidden'),
          fits: n.getBoundingClientRect().width > 300,
          visible: getComputedStyle(n).display !== 'none',
          expected: MISTAKERY_PADEL_BACKGROUNDS[MistakeryApp.state.currentCardId].src,
          covers: image.top <= scene.top + 1 && image.left <= scene.left + 1
            && image.bottom >= scene.bottom - 1 && image.right >= scene.right - 1,
          blur: Number(getComputedStyle(n).filter.match(/blur\(([^p]+)px\)/)?.[1] || 0),
        }; });
        assert.equal(result.src, result.expected, id);
        assert.equal(result.ready, true, id);
        assert.equal(result.hidden, 'true');
        assert.ok(result.width <= 1000);
        assert.equal(result.fits && result.visible, true);
        assert.equal(result.covers, true, `${id}: background must extend behind the header`);
        assert.ok(result.blur >= 4, `${id}: background must keep faces indistinct`);
      }
      assert.equal(requests.length, 12, 'rendering and returning cannot fetch pictures again');
      await show(page, 'IRL_PADEL_01');
      await page.waitForFunction(() => !MistakeryApp.locked);
      await page.locator('[data-choice=right]').click();
      assert.equal(await page.locator('.irl-background').getAttribute('src'),
        await page.evaluate(() => MISTAKERY_PADEL_BACKGROUNDS.IRL_PADEL_03B.src));
      await page.locator('[data-test-back]').click();
      assert.equal(await page.locator('.irl-background').getAttribute('src'),
        await page.evaluate(() => MISTAKERY_PADEL_BACKGROUNDS.IRL_PADEL_01.src));
      await show(page, 'LIVE_AGENT_01');
      assert.equal(await page.locator('.irl-background').count(), 0, 'no court leaks into chats');
      assert.equal(requests.length, 12);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
