const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const path = require('node:path');
const fixtures = require('./founder-profile.fixture.json');
const { witnesses } = require('../docs/qa/resource-endings.json');
const root = path.resolve(__dirname, '..');
const origin = 'https://mistakery.test';
const key = 'mistakery.browser-save';

async function setup(type, options = {}) {
  const browser = await type.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const events = [], errors = [];
  await context.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
  // All traffic is fulfilled locally, including the public ingestion endpoint.
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'eu.i.posthog.com') {
      if (request.method() === 'POST') events.push(request.postDataJSON());
      if (options.offline) return route.abort('internetdisconnected');
      return route.fulfill({ status: 200, body: '{}', headers: {
        'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
      } });
    }
    if (url.origin !== origin) return route.abort();
    if (url.pathname === '/assets/analytics-config.js' && !options.defaultConfig) return route.fulfill({
      contentType: 'text/javascript', body: `window.MISTAKERY_ANALYTICS_CONFIG=${JSON.stringify({ enabled: true,
        projectKey: 'phc_test_public_key', apiHost: 'https://eu.i.posthog.com', build: 'browser-test', allowedOrigins: [origin] })};`,
    });
    const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    await route.fulfill({ path: file, contentType: ({ '.js': 'text/javascript', '.css': 'text/css',
      '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' })[path.extname(file)] || 'text/html' });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.goto(origin + '/?seed=14');
  await page.locator('[data-title-play]').waitFor();
  await page.clock.pauseAt(new Date());
  return { browser, page, events, errors };
}
async function start(page) {
  await page.clock.runFor(300); await page.locator('[data-title-play]').click();
  for (let n = 0; n < 12 && await page.evaluate(() => MistakeryApp.view !== 'playing'); n++) {
    await page.clock.runFor(20000); await page.locator('[data-choice="left"]').click();
  }
  assert.equal(await page.evaluate(() => MistakeryApp.view), 'playing');
}
async function flush(page) {
  await page.waitForLoadState('networkidle');
}
async function continueRun(page) {
  await page.reload(); await page.locator('[data-title-continue]').waitFor();
  await page.clock.runFor(300); await page.locator('[data-title-continue]').click();
}
async function beforeOutcome(page, witness) {
  await page.evaluate(w => {
    const a = MistakeryApp;
    a.state = MistakeryRoute.startRun(a.deck, { seed: w.seed });
    for (const step of w.steps.slice(0, -1)) a.state = MistakeryRoute.resolveChoice(a.deck, a.state, step.side).state;
    a.view = 'playing'; a.cardDelivery = null; a.locked = false; a.render();
  }, witness);
  await page.clock.runFor(30000);
}
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: analytics records entry, decisions and replay; Continue and render never duplicate choices`, { timeout: 30000 }, async () => {
    const { browser, page, events, errors } = await setup(type);
    try {
      await start(page); await flush(page);
      assert.deepEqual(events.map(e => e.event), ['game_opened', 'game_started', 'intro_completed', 'run_started']);
      const first = events.at(-1), player = first.distinct_id;
      assert.equal(first.properties.run_id, await page.evaluate(k => JSON.parse(localStorage.getItem(k)).runId, key));
      await page.clock.runFor(20000); await page.locator('[data-choice="left"]').click();
      await flush(page);
      assert.equal(events.filter(e => e.event === 'choice_made').length, 1);
      const saved = await page.evaluate(k => localStorage.getItem(k), key);
      await continueRun(page); await page.evaluate(() => MistakeryApp.render()); await flush(page);
      assert.equal(await page.evaluate(k => localStorage.getItem(k), key), saved);
      assert.equal(events.filter(e => e.event === 'choice_made').length, 1);
      assert.equal(events.filter(e => e.event === 'run_started').length, 1);
      assert.equal(events.filter(e => e.event === 'run_resumed').length, 1);
      await page.clock.runFor(20000);
      await page.locator('[data-restart-run]').click(); await page.locator('[data-quit-confirm]').click();
      await page.clock.runFor(300); await page.locator('[data-title-new]').click();
      await page.locator('[data-new-run-confirm]').click(); await flush(page);
      const second = events.filter(e => e.event === 'run_started').at(-1);
      assert.equal(second.properties.attempt_number, 2);
      assert.notEqual(second.properties.run_id, first.properties.run_id);
      assert.ok(events.every(e => e.distinct_id === player && e.properties.$process_person_profile === false));
      assert.equal(events.filter(e => e.event === 'intro_completed').length, 1);
      assert.equal(new Set(events.map(e => e.uuid)).size, events.length);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
  test(`${name}: analytics records the CEO unlock and terminal story loss once, ignoring stale writes`, { timeout: 30000 }, async () => {
    const { browser, page, events, errors } = await setup(type);
    try {
      await start(page);
      await beforeOutcome(page, fixtures.flex);
      await page.locator(`[data-choice="${fixtures.flex.steps.at(-1).side}"]`).click(); await flush(page);
      assert.deepEqual(events.slice(-4).map(e => e.event), ['choice_made', 'story_completed', 'run_ended', 'ceo_unlocked']);
      assert.equal(events.at(-1).properties.ceo_type, 'flex');
      const count = events.length;
      await page.reload(); await page.locator('[data-title-profile]').waitFor(); await page.clock.runFor(300);
      await page.locator('[data-title-profile]').click(); await flush(page);
      assert.deepEqual(events.slice(count).map(e => e.event), ['game_opened']);
      await page.locator('[data-profile-replay]').click();
      await beforeOutcome(page, witnesses.judgment_day);
      await page.locator(`[data-choice="${witnesses.judgment_day.steps.at(-1).side}"]`).click(); await flush(page);
      assert.deepEqual(events.slice(-3).map(e => e.event), ['choice_made', 'story_completed', 'run_ended']);
      assert.equal(events.at(-1).properties.ending, 'judgment_day');
      assert.equal(events.at(-2).properties.story, 'live_agent');
      assert.equal(events.filter(e => e.event === 'ceo_unlocked').length, 1);
      await page.reload(); await page.locator('[data-title-new]').waitFor(); await page.clock.runFor(300);
      await page.locator('[data-title-new]').click(); await page.clock.runFor(20000); await flush(page);
      await page.evaluate(k => { const record = JSON.parse(localStorage.getItem(k)); record.revision++; localStorage.setItem(k, JSON.stringify(record)); }, key);
      const prior = events.length;
      await page.locator('[data-choice="left"]').click(); await page.locator('[data-save-conflict]').waitFor(); await flush(page);
      assert.equal(events.length, prior, 'rejected stale-tab action must not enter analytics');
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
  test(`${name}: unavailable analytics cannot block saves; QA and shipped configuration send nothing`, { timeout: 30000 }, async () => {
    const { browser, page, events, errors } = await setup(type, { offline: true });
    try {
      await start(page); await page.clock.runFor(20000); await page.locator('[data-choice="left"]').click(); await flush(page);
      assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).state.history.length, key), 1);
      const stored = await page.evaluate(() => localStorage.getItem('mistakery.analytics'));
      const prior = events.length;
      for (const query of ['test=route', 'story=live-agent', 'preview=losses']) {
        await page.goto(origin + '/?' + query); await page.waitForFunction(() => MistakeryApp.state); await page.clock.runFor(20000); await flush(page);
        assert.equal(events.length, prior);
        assert.equal(await page.evaluate(() => localStorage.getItem('mistakery.analytics')), stored);
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
    const disabled = await setup(type, { defaultConfig: true });
    try {
      await start(disabled.page); await flush(disabled.page);
      assert.equal(disabled.events.length, 0);
      assert.equal(await disabled.page.evaluate(() => localStorage.getItem('mistakery.analytics')), null);
      assert.deepEqual(disabled.errors, []);
    } finally { await disabled.browser.close(); }
  });
}
