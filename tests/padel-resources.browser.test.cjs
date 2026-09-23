const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { decisions, outcomes } = require('./padel-resources.fixture.cjs');
const deck = require('../cards.json');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const base = { cash: 50, team: 50, customers: 50, founder: 50 };
const { afterTurn: sum } = require('./turn-resources.fixture.cjs');
async function seed(page, id, score = 0, resources = base, draws = [.99]) {
  await page.evaluate(({ id, score, resources, draws }) => {
    const a = window.MistakeryApp;
    clearTimeout(a.introTypingTimer);
    a.state = window.MistakeryEngine.startRun(a.deck);
    a.state.currentCardId = id;
    a.state.resources = resources;
    a.state.schedulerResources = { ...resources };
    a.state.flags = ['live_agent_completed']; // Padel remains playable without crises after the agent story.
    a.state.turn = 40; // The prototype loop does not expire in the middle of a match.
    a.padelCeoScore = score;
    a.view = 'playing';
    a.locked = false;
    window.draws = 0;
    Math.random = () => draws[window.draws++] ?? .99;
    a.render();
  }, { id, score, resources, draws });
}
async function click(page, side) {
  await page.waitForFunction(() => !window.MistakeryApp.locked);
  await page.locator(`[data-choice="${side}"]`).click();
}
async function state(page) {
  return page.evaluate(() => ({ ...window.MistakeryApp.state, view: window.MistakeryApp.view, score: window.MistakeryApp.padelCeoScore, draws: window.draws }));
}

test('Padel canonical effects match the approved document, with no duplicate refusal penalty', () => {
  for (const [id, expected] of Object.entries(decisions)) {
    const card = deck.cards.find(c => c.id === id);
    for (const [index, side] of ['left', 'right'].entries()) assert.deepEqual(card.choices[side].effects, expected[index], `${id}.${side}`);
  }
  for (const [n, expected] of Object.entries(outcomes)) {
    const card = deck.cards.find(c => c.id === `PADEL_OUTCOME_${n}`);
    assert.deepEqual(card.outcomeEffects, expected, card.id);
    assert.deepEqual(card.choices.left.effects, {});
    assert.deepEqual(card.choices.right.effects, {});
  }
});

test('Padel decisions and each outcome apply once, preview resources, and preserve RNG', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(`${url}?story=live-agent`);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    for (const [id, effects] of Object.entries(decisions).filter(([id]) => id !== 'IRL_PADEL_06')) {
      for (const [index, side] of ['left', 'right'].entries()) {
        await seed(page, id);
        await page.locator(`[data-choice="${side}"]`).hover();
        assert.deepEqual(await page.locator('[data-resource].is-preview').evaluateAll(ns => ns.map(n => n.dataset.resource).sort()), Object.keys(effects[index]).sort());
        await click(page, side);
        assert.deepEqual((await state(page)).resources, sum(base, effects[index]), `${id}.${side}`);
      }
    }
    for (const [n, side, draws] of [[1,'right',[0,0]], [2,'right',[0,.99]], [3,'left',[0]], [4,'left',[.99]], [5,'right',[.99,0]], [6,'right',[.99,.99]], [7,'right',[]]]) {
      const early = n === 7;
      const id = early ? 'IRL_PADEL_05' : 'IRL_PADEL_06';
      await seed(page, id, early ? 3 : 0, base, draws);
      const before = await state(page);
      const button = page.locator(`[data-choice="${side}"]`);
      await button.hover();
      assert.equal(await page.locator('[data-resource].is-preview').count(), 4);
      assert.equal((await state(page)).draws, 0);
      await click(page, side);
      const entered = await state(page);
      assert.equal(entered.currentCardId, `PADEL_OUTCOME_${n}`);
      assert.deepEqual(entered.resources, sum(base, decisions[id][side === 'left' ? 0 : 1], outcomes[n]));
      assert.equal(entered.draws, draws.length);
      await page.evaluate(() => window.MistakeryApp.render());
      assert.deepEqual((await state(page)).resources, entered.resources);
      await click(page, 'left');
      assert.equal((await state(page)).view, 'saved');
      assert.deepEqual((await state(page)).resources, sum(entered.resources));
      await page.locator('[data-test-back]').click();
      assert.deepEqual((await state(page)).resources, entered.resources, 'Back does not reapply outcome effects');
      await page.locator('[data-test-back]').click();
      assert.deepEqual((await state(page)).resources, before.resources, 'Back restores resources before the final choice');
    }
  } finally { await browser.close(); }
});

test('zero resource boundaries stay playable without crises or double refusal penalties', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${url}?story=live-agent`);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    for (const cash of [40, 25, 10, 0]) {
      await seed(page, 'PADEL_INVITE', 0, { ...base, cash });
      await click(page, 'right');
      const outcome = await state(page);
      assert.equal(outcome.currentCardId, 'PADEL_OUTCOME_0');
      assert.equal(outcome.resources.cash, Math.max(0, cash - 25.5));
      assert.equal(outcome.activeCrisisId, null);
      assert.equal(outcome.gameOver, false);
      await click(page, 'right');
      const finished = await state(page);
      assert.equal(finished.view, 'saved');
      assert.deepEqual(finished.resources, sum(outcome.resources));
      assert.equal(finished.activeCrisisId, null);
      assert.equal(finished.gameOver, false);
    }
    await seed(page, 'IRL_PADEL_04', 0, { ...base, cash: 1, founder: 1 });
    await click(page, 'left');
    assert.equal((await state(page)).currentCardId, 'IRL_PADEL_05');
    assert.equal((await state(page)).score, -1);
    assert.deepEqual((await state(page)).resources, { cash: 0, team: 50, customers: 50, founder: 0 });
    await click(page, 'left');
    assert.equal((await state(page)).currentCardId, 'IRL_PADEL_06');
    await click(page, 'right');
    assert.equal((await state(page)).currentCardId, 'PADEL_OUTCOME_6');
    assert.equal((await state(page)).activeCrisisId, null);
    assert.equal((await state(page)).gameOver, false);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
