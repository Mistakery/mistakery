const { afterTurn } = require('./turn-resources.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function state(page) {
  return page.evaluate(() => {
    const a = window.MistakeryApp;
    return { state: a.state, score: a.liveAgentScore, previous: a.influencerPreviousCardId, padel: a.padelCeoScore, view: a.view };
  });
}
async function choose(page, side) {
  await page.waitForFunction(() => !window.MistakeryApp.locked);
  await page.locator(`[data-choice="${side}"]`).click();
}

test('direct story test supports exact undo, alternate answers, outcome undo and clean restart', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${url}?story=live-agent`);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    assert.equal((await state(page)).state.currentCardId, 'LIVE_AGENT_01');
    assert.equal(await page.locator('[data-test-controls]').isVisible(), true);
    assert.equal(await page.locator('[data-test-back]').isEnabled(), false);
    const initial = await state(page);
    assert.deepEqual(initial.state.resources, { cash: 25, team: 60, customers: 15, founder: 65 });
    assert.equal(initial.score, 0);

    await choose(page, 'left');
    const beforeAttitude = await state(page);
    await choose(page, 'left');
    assert.equal((await state(page)).score, 1);
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), beforeAttitude);
    await choose(page, 'right');
    assert.equal((await state(page)).score, -1);
    assert.equal((await state(page)).state.resources.team, beforeAttitude.state.resources.team + 5);
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), beforeAttitude, 'repeated undo must not mutate saved snapshots');
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), initial);
    assert.equal(await page.locator('[data-test-back]').isEnabled(), false);

    // Reach the random finale through real UI, then undo total resource loss.
    for (let i = 0; i < 7; i++) await choose(page, 'left');
    const beforeManifesto = await state(page);
    assert.equal(beforeManifesto.state.currentCardId, 'LIVE_AGENT_07');
    await choose(page, 'right');
    assert.equal((await state(page)).state.currentCardId, 'LIVE_AGENT_07B');
    assert.deepEqual((await state(page)).state.resources, afterTurn(beforeManifesto.state.resources));
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), beforeManifesto);
    assert.equal(await page.locator('.typing-bubble').count(), 0);
    await choose(page, 'left');
    const beforeFinal = await state(page);
    assert.equal(beforeFinal.state.currentCardId, 'LIVE_AGENT_07B');
    assert.equal(beforeFinal.score, 5);
    await page.evaluate(() => { window.draws = 0; Math.random = () => { window.draws++; return .99; }; });
    await choose(page, 'right');
    const outcome = await state(page);
    assert.equal(outcome.state.currentCardId, 'LIVE_AGENT_OUTCOME_2');
    assert.deepEqual(outcome.state.resources, { cash: 0, team: 0, customers: 0, founder: 0 });
    await choose(page, 'left');
    assert.equal((await state(page)).state.currentCardId, 'OPEN_INVESTOR');
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), outcome, 'undo completion restores chosen outcome and hidden score');
    assert.equal(await page.evaluate(() => window.draws), 1, 'going back never rerolls an outcome');
    await page.locator('[data-test-back]').click();
    assert.deepEqual(await state(page), beforeFinal, 'undo finale restores resources before zeroing');
    await choose(page, 'left');
    assert.equal((await state(page)).state.currentCardId, 'LIVE_AGENT_08');
    assert.equal((await state(page)).state.resources.customers, beforeFinal.state.resources.customers + 10);

    await page.locator('[data-test-restart]').click();
    assert.deepEqual(await state(page), initial);
    assert.equal(await page.locator('[data-test-back]').isEnabled(), false);
    await choose(page, 'left');
    await page.reload();
    await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
    assert.deepEqual(await state(page), initial);

    for (const viewport of [{ width: 320, height: 650 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      const rects = await page.evaluate(() => {
        const controls = document.querySelector('[data-test-controls]').getBoundingClientRect();
        const phone = document.querySelector('[data-game]').getBoundingClientRect();
        const replies = document.querySelector('[data-choices]').getBoundingClientRect();
        return { controlsTop: controls.top, controlsBottom: controls.bottom, phoneTop: phone.top, repliesBottom: replies.bottom, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert.ok(rects.controlsTop >= 0 && rects.controlsBottom <= rects.phoneTop && rects.repliesBottom <= viewport.height && rects.overflow <= 1, JSON.stringify(rects));
      assert.ok(rects.phoneTop - rects.controlsBottom <= 12, 'test controls stay next to the phone');
    }

    for (const suffix of ['', '?story=unknown']) {
      await page.goto(`${url}${suffix}`);
      await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
      assert.equal((await state(page)).view, 'onboarding');
      assert.equal(await page.locator('[data-test-controls]').isVisible(), false);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
