const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

test('Live Agent previews outcome resources without drawing or applying an outcome', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    for (const [id, sides] of [
      ['LIVE_AGENT_01', { left: ['customers', 'team'], right: ['cash', 'team'] }],
      ['LIVE_AGENT_04', { left: [], right: [] }],
      ['LIVE_AGENT_07B', { left: ['customers'], right: ['cash', 'customers', 'founder', 'team'] }],
      ['LIVE_AGENT_OUTCOME_1', { left: [], right: [] }],
      ['OPEN_01', { left: ['founder'], right: ['founder'] }],
      ['LIVE_AGENT_08', { left: ['cash', 'customers', 'founder', 'team'], right: ['cash', 'customers', 'founder', 'team'] }],
    ]) {
      await page.mouse.move(0, 0);
      await page.evaluate(id => {
        const a = window.MistakeryApp;
        a.state = window.MistakeryEngine.startRun(a.deck);
        a.state.currentCardId = id;
        a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
        a.state.schedulerResources = { ...a.state.resources };
        a.liveAgentScore = 5;
        a.locked = false;
        window.draws = 0;
        Math.random = () => { window.draws++; return .99; };
        a.render();
      }, id);
      await page.waitForFunction(() => !window.MistakeryApp.locked && !document.querySelector('[data-choice]:disabled'));
      const before = await page.evaluate(() => JSON.stringify(window.MistakeryApp.state));
      for (const [side, expected] of Object.entries(sides)) {
        const button = page.locator(`[data-choice="${side}"]`);
        await button.hover();
        const resources = page.locator('[data-resource].is-preview');
        assert.deepEqual(await resources.evaluateAll(nodes => nodes.map(n => n.dataset.resource).sort()), expected, `${id}.${side}`);
        if (expected.length) {
          await page.waitForFunction(() => [...document.querySelectorAll('[data-resource].is-preview')].every(n => new DOMMatrixReadOnly(getComputedStyle(n).transform).m42 === -2));
        }
        await page.mouse.move(0, 0);
        assert.equal(await resources.count(), 0, 'mouse leave clears the preview');
        await button.focus();
        assert.deepEqual(await resources.evaluateAll(nodes => nodes.map(n => n.dataset.resource).sort()), expected, 'keyboard focus matches hover');
        await button.blur();
        assert.equal(await resources.count(), 0, 'blur clears the preview');
        assert.equal(await page.evaluate(() => JSON.stringify(window.MistakeryApp.state)), before);
        assert.equal(await page.evaluate(() => window.draws), 0, 'preview never rolls an outcome');
      }
    }
    await page.locator('[data-choice="right"]').click();
    const result = await page.evaluate(() => ({ id: window.MistakeryApp.state.currentCardId, resources: window.MistakeryApp.state.resources, draws: window.draws }));
    assert.deepEqual(result, { id: 'LIVE_AGENT_OUTCOME_4', resources: { cash: 19.5, team: 35, customers: 25, founder: 25 }, draws: 1 });
    assert.equal(await page.locator('[data-resource].is-preview').count(), 0);
  } finally { await browser.close(); }
});
