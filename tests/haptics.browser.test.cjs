const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const game = 'https://game.test', host = 'https://itch-host.test';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

async function setup(engine, { embedded = false, native = false, missing = false, production = false } = {}) {
  const browser = await engine.launch();
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  await context.addInitScript(({ native, missing }) => {
    window.vibrations = [];
    Math.random = () => .1; // Direct-story outcome rolls must be repeatable.
    if (native) {
      const vibrate = navigator.vibrate?.bind(navigator);
      // Init scripts precede automation evaluate(), which can grant activation.
      window.initialVibration = vibrate ? vibrate(8) : 'missing';
      if (vibrate) Object.defineProperty(navigator, 'vibrate', { configurable: true, value(pattern) {
        const result = vibrate(pattern);
        vibrations.push({ pattern, result, activated: navigator.userActivation.hasBeenActive });
        return result;
      } });
    }
    if (missing) Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    else if (!native) Object.defineProperty(navigator, 'vibrate', { configurable: true, value(pattern) {
      window.vibrations.push({ pattern, tone: document.querySelector('[data-game]')?.dataset.outcome,
        delivered: !window.MistakeryApp?.cardDelivery || MistakeryApp.cardDelivery.delivered });
      return true;
    } });
  }, { native, missing });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === host) return route.fulfill({ contentType: 'text/html', body:
      `<meta name="viewport" content="width=device-width"><iframe title="Game" style="width:320px;height:700px;border:0" allow="autoplay; fullscreen" sandbox="allow-scripts allow-same-origin" src="${game}/index.html?story=live-agent"></iframe>` });
    if (url.origin !== game) return route.abort();
    try { const file = path.join(root, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: await fs.readFile(file) });
    } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
  });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const time = new Date('2026-10-19T12:00:00Z');
  await page.clock.install({ time }); await page.clock.pauseAt(time);
  await page.goto(embedded ? host : `${game}/index.html${production ? '?seed=14' : '?story=live-agent'}`);
  const frame = embedded ? await (await page.waitForSelector('iframe')).contentFrame() : page;
  await frame.waitForFunction(() => window.MistakeryApp?.state);
  const settle = () => page.clock.runFor(20000);
  const patterns = () => frame.evaluate(() => vibrations.filter(c => c.pattern !== 0).map(c => c.pattern));
  async function fixture(id, low = false) {
    await frame.evaluate(({ id, low }) => {
      MistakeryHaptics?.stop();
      const app = MistakeryApp; app.state = structuredClone(app.runStartState);
      app.state.currentCardId = id; app.state.history = [];
      if (low) { app.state.resources.cash = .1; app.state.route.resourceLedger = { ...app.state.resources }; }
      app.cardDelivery = null; app.locked = false; app.view = 'playing'; app.render();
    }, { id, low });
    await settle(); await frame.evaluate(() => { vibrations.length = 0; });
  }
  return { browser, page, frame, errors, patterns, settle, fixture };
}

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: accepted replies, visible outcomes, priority, blocked input and navigation`, async () => {
    const a = await setup(engine);
    try {
      await a.settle(); assert.deepEqual(await a.patterns(), [], 'initial messages are quiet');
      await a.frame.locator('[data-sound-toggle]').tap();
      await a.frame.locator('[data-choice="left"]').tap();
      assert.deepEqual(await a.patterns(), [8], 'haptics work with sound muted');
      await a.frame.evaluate(() => document.querySelector('[data-choice="left"]').click());
      assert.deepEqual(await a.patterns(), [8], 'typing/locked taps are quiet');
      await a.settle(); await a.frame.evaluate(() => MistakeryApp.render());
      assert.deepEqual(await a.patterns(), [8], 'messages and rerenders are quiet');
      await a.frame.locator('[data-test-back]').tap(); await a.settle();
      assert.deepEqual(await a.patterns(), [8], 'Back is quiet');
      const boxes = await a.frame.locator('[data-haptics-toggle], [data-sound-toggle]').evaluateAll(nodes => nodes.map(node => {
        const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width };
      }));
      assert.ok(boxes.every(b => b.width >= 36 && b.left >= 0 && b.right <= 320));
      assert.ok(boxes[0].right <= boxes[1].left, 'controls fit without overlap at 320px');
      if (process.env.MISTAKERY_HAPTICS_QA_DIR) await a.page.screenshot({ path: path.join(process.env.MISTAKERY_HAPTICS_QA_DIR, `${name}-controls.png`) });

      for (const [id, side, result] of [['LIVE_AGENT_01', 'right', 35], ['INFLUENCER_07', 'left', [12, 55, 12]]]) {
        await a.fixture(id);
        await a.frame.locator(`[data-choice="${side}"]`).tap();
        assert.deepEqual(await a.patterns(), [8], 'no outcome vibration before messages reveal it');
        await a.settle();
        assert.deepEqual(await a.patterns(), [8, result]);
        assert.equal(await a.frame.evaluate(() => vibrations.at(-1).delivered), true);
        await a.frame.evaluate(() => MistakeryApp.render()); await a.settle();
        assert.deepEqual(await a.patterns(), [8, result], 'outcome does not replay');
        if (Array.isArray(result)) {
          await a.frame.locator('[data-choice="left"]').tap(); await a.settle();
          assert.deepEqual(await a.patterns(), [8, result, 8], 'congratulations do not repeat success');
        }
      }
      await a.fixture('IRL_PADEL_06');
      await a.frame.locator('[data-choice="left"]').tap();
      const tone = await a.frame.evaluate(() => document.querySelector('[data-game]').dataset.outcome);
      assert.deepEqual(await a.patterns(), [tone === 'success' ? [12, 55, 12] : 35], 'immediate IRL result replaces choice');
      await a.fixture('LIVE_AGENT_OUTCOME_0', true);
      await a.frame.locator('[data-choice="left"]').tap();
      assert.deepEqual(await a.patterns(), [8], 'resource defeat waits for its dialogue');
      await a.settle(); assert.deepEqual(await a.patterns(), [8, 35]);
      await a.frame.evaluate(() => MistakeryApp.render()); await a.settle();
      assert.deepEqual(await a.patterns(), [8, 35]);
      await a.fixture('LIVE_AGENT_07B');
      await a.frame.evaluate(() => { MistakeryApp.state.route.liveAgentScore = 1; Math.random = () => .99; });
      await a.frame.locator('[data-choice="right"]').tap();
      assert.equal(await a.frame.evaluate(() => MistakeryApp.state.endingId), 'judgment_day');
      assert.deepEqual(await a.patterns(), [35], 'instant visible game over replaces choice');
      await a.fixture('LIVE_AGENT_01');
      await a.frame.locator('[data-choice="right"]').tap();
      await a.frame.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await a.settle(); assert.deepEqual(await a.patterns(), [8], 'hidden result is dropped');
      await a.frame.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); MistakeryApp.render(); });
      await a.settle(); assert.deepEqual(await a.patterns(), [8], 'return to visible never replays it');
      assert.deepEqual(a.errors, []);
    } finally { await a.browser.close(); }
  });
  test(`${name}: separate preference survives reload; Continue and unsupported browsers stay quiet`, async () => {
    const a = await setup(engine, { production: true });
    try {
      await a.settle(); await a.frame.locator('[data-title-play]').tap();
      for (let n = 0; n < 10 && await a.frame.evaluate(() => MistakeryApp.view !== 'playing'); n++) {
        await a.settle(); await a.frame.locator('[data-choice="left"]').tap();
      }
      await a.settle(); assert.deepEqual(await a.patterns(), [], 'onboarding/navigation are quiet');
      await a.frame.locator('[data-haptics-toggle]').tap();
      assert.equal(await a.frame.locator('[data-sound-toggle]').getAttribute('aria-pressed'), 'true');
      await a.frame.locator('[data-choice="left"]').tap(); await a.settle();
      assert.deepEqual(await a.patterns(), [], 'haptics off leaves choices quiet');
      assert.equal(await a.frame.evaluate(() => localStorage.getItem('mistakery.haptics')), 'off');
      await a.page.reload(); await a.frame.locator('[data-title-continue]').waitFor(); await a.settle();
      assert.equal(await a.frame.locator('[data-haptics-toggle]').getAttribute('aria-pressed'), 'false');
      await a.frame.locator('[data-title-continue]').tap(); await a.settle();
      assert.deepEqual(await a.patterns(), []);
      await a.frame.locator('[data-haptics-toggle]').tap();
      await a.page.reload(); await a.frame.locator('[data-title-continue]').waitFor(); await a.settle();
      await a.frame.locator('[data-title-continue]').tap(); await a.settle();
      assert.deepEqual(await a.patterns(), [], 'enabled Continue never replays');
      assert.deepEqual(a.errors, []);
    } finally { await a.browser.close(); }
    const b = await setup(engine, { missing: true });
    try {
      await b.settle(); assert.equal(await b.frame.locator('[data-haptics-toggle]').isVisible(), false);
      await b.frame.locator('[data-choice="left"]').tap(); await b.settle();
      assert.equal(await b.frame.evaluate(() => MistakeryApp.state.history.length), 1);
      assert.deepEqual(b.errors, []);
    } finally { await b.browser.close(); }
  });
  test(`${name}: native cross-origin iframe vibration respects activation and preserves gameplay`, async () => {
    const a = await setup(engine, { embedded: true, native: true });
    try {
      await a.settle();
      const before = await a.frame.evaluate(() => initialVibration);
      assert.equal(before, name === 'Chromium' ? false : 'missing', 'no vibration before frame activation');
      await a.frame.locator('[data-choice="left"]').tap();
      const result = await a.frame.evaluate(() => vibrations.at(-1)?.result ?? 'missing');
      assert.equal(result, name === 'Chromium' ? true : 'missing', 'activated Chromium accepts the API call; hardware output is unverified');
      if (name === 'Chromium') assert.equal(await a.frame.evaluate(() => vibrations.at(-1).activated), true);
      await a.settle();
      assert.equal(await a.frame.evaluate(() => MistakeryApp.state.history.length), 1);
      assert.deepEqual(a.errors, []);
    } finally { await a.browser.close(); }
  });
}
