const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const { decisions, contextual, outcomes, sum, decision } = require('./influencer-resources.fixture.cjs');
const deck = require('../cards.json');
const url = process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const base = { cash: 50, team: 50, customers: 50, founder: 50 };
const sides = ['left', 'right'];
async function seed(page, id, previous = 'INFLUENCER_04', resources = base, roll = .4) {
  await page.evaluate(({ id, previous, resources, roll }) => {
    const a = window.MistakeryApp;
    clearTimeout(a.introTypingTimer);
    a.state = window.MistakeryEngine.startRun(a.deck);
    a.state.currentCardId = id;
    a.state.resources = resources;
    a.state.schedulerResources = { ...resources };
    a.state.flags = []; // No Live Agent completion needed to suppress crises.
    a.state.turn = 100;
    a.influencerPreviousCardId = previous;
    a.view = 'playing';
    a.locked = false;
    window.draws = 0;
    Math.random = () => { window.draws++; return roll; };
    a.render();
  }, { id, previous, resources, roll });
}
async function state(page) {
  return page.evaluate(() => ({ state: window.MistakeryApp.state, previous: window.MistakeryApp.influencerPreviousCardId, view: window.MistakeryApp.view, draws: window.draws }));
}
async function click(page, side) {
  await page.waitForFunction(() => !window.MistakeryApp.locked);
  await page.locator(`[data-choice="${side}"]`).click();
}
async function preview(page, side, keys) {
  const before = await state(page);
  const button = page.locator(`[data-choice="${side}"]`);
  for (const method of ['hover', 'focus']) {
    await button[method]();
    assert.deepEqual(await page.locator('[data-resource].is-preview').evaluateAll(ns => ns.map(n => n.dataset.resource).sort()), keys.slice().sort());
    if (keys.length) await page.waitForFunction(() => [...document.querySelectorAll('[data-resource].is-preview')].every(n => new DOMMatrixReadOnly(getComputedStyle(n).transform).m42 === -2));
    assert.deepEqual(await state(page), before, `${method} is read-only and never rolls`);
    await page.mouse.move(0, 0);
    await button.blur();
    assert.equal(await page.locator('[data-resource].is-preview').count(), 0);
  }
}
async function withPage(fn, width = 390) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 650 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${url}?story=live-agent`);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    await fn(page);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}

test('Influencer canonical effects match the full document including contextual replies', () => {
  for (const [id, expected] of Object.entries(decisions)) {
    const card = deck.cards.find(c => c.id === id);
    sides.forEach((side, i) => assert.deepEqual(card.choices[side].effects, expected[i], `${id}.${side}`));
    for (const [previous, effects] of Object.entries(contextual[id] || {})) {
      sides.forEach((side, i) => assert.deepEqual(card.contextualChoices[previous][side].effects, effects[i], `${id}.${previous}.${side}`));
    }
  }
  for (const [n, expected] of Object.entries(outcomes)) {
    const card = deck.cards.find(c => c.id === `INFLUENCER_OUTCOME_${n}`);
    assert.deepEqual(card.outcomeEffects, expected, card.id);
    sides.forEach(side => assert.deepEqual(card.choices[side].effects, {}));
  }
});

test('every Influencer decision/context previews and applies the displayed choice once; Back restores context', async () => {
  await withPage(async page => {
    for (const id of Object.keys(decisions).filter(id => !['INFLUENCER_07', 'INFLUENCER_08'].includes(id))) {
      for (const previous of ['INFLUENCER_04', ...Object.keys(contextual[id] || {})]) {
        for (const side of sides) {
          await seed(page, id, previous);
          const before = await state(page);
          const effects = decision(id, side, previous);
          const outcome = id === 'INFLUENCER_01' && side === 'right' ? outcomes[1] : {};
          await preview(page, side, [...new Set([...Object.keys(effects), ...Object.keys(outcome)])]);
          await click(page, side);
          const after = await state(page);
          const card = deck.cards.find(c => c.id === id);
          assert.equal(after.state.currentCardId, (card.contextualChoices?.[previous] || card.choices)[side].next);
          assert.deepEqual(after.state.resources, sum(base, effects, outcome), `${id}.${previous}.${side}`);
          assert.equal(after.state.history.length, 1);
          assert.equal(after.draws, 0);
          assert.equal(after.state.gameOver, false);
          assert.equal(after.state.activeCrisisId, null);
          await page.evaluate(() => window.MistakeryApp.render());
          assert.deepEqual(await state(page), after);
          await page.locator('[data-test-back]').click();
          assert.deepEqual(await state(page), before);
        }
      }
    }
  });
});

test('all random outcomes use exact 40/60 odds, combined deltas, neutral replies and reversible history', async () => {
  await withPage(async page => {
    for (const id of ['INFLUENCER_07', 'INFLUENCER_08']) {
      for (const side of sides) {
        for (const roll of [.399999, .4]) {
          for (const reply of sides) {
            const win = id === 'INFLUENCER_07' ? 2 : side === 'left' ? 4 : 6;
            const n = win + (roll < .4 ? 0 : 1);
            await seed(page, id, 'INFLUENCER_06', base, roll);
            const before = await state(page);
            await preview(page, side, Object.keys(base));
            await click(page, side);
            const entered = await state(page);
            const expected = sum(base, decision(id, side), outcomes[n]);
            assert.equal(entered.state.currentCardId, `INFLUENCER_OUTCOME_${n}`);
            assert.deepEqual(entered.state.resources, expected);
            assert.equal(entered.draws, 1);
            assert.equal(entered.state.history.length, 1);
            assert.deepEqual(entered.state.history[0].deltas, Object.fromEntries(Object.keys(base).map(k => [k, expected[k] - base[k]])));
            await page.evaluate(() => window.MistakeryApp.render());
            assert.deepEqual(await state(page), entered);
            await preview(page, reply, []);
            await click(page, reply);
            const finished = await state(page);
            assert.equal(finished.view, 'saved');
            assert.deepEqual(finished.state.resources, sum(expected));
            assert.equal(finished.draws, 1);
            assert.equal(finished.state.history.length, 2);
            await page.locator('[data-test-back]').click();
            assert.deepEqual(await state(page), entered, 'Back restores outcome without reroll or reapplication');
            await page.locator('[data-test-back]').click();
            assert.deepEqual(await state(page), { ...before, draws: 1 }, 'Back restores pre-choice resources and context');
          }
        }
      }
    }
  });
});

test('zero and upper bounds stay playable with half-Cash burn without crisis or turn-cap ending', async () => {
  await withPage(async page => {
    for (const cash of [0, 10, 25, 40]) {
      for (const reply of sides) {
        const resources = { ...base, cash, founder: 1 };
        await seed(page, 'INFLUENCER_01', 'OPEN_INVESTOR', resources);
        await click(page, 'right');
        const entered = await state(page);
        assert.equal(entered.state.currentCardId, 'INFLUENCER_OUTCOME_1');
        assert.deepEqual(entered.state.resources, { ...base, cash: Math.max(0, cash - 25.5), founder: 0 });
        assert.equal(entered.state.history.length, 1);
        assert.equal(entered.draws, 0);
        await page.evaluate(() => window.MistakeryApp.render());
        assert.deepEqual(await state(page), entered);
        await preview(page, reply, []);
        await click(page, reply);
        const finished = await state(page);
        assert.equal(finished.view, 'saved');
        assert.deepEqual(finished.state.resources, sum(entered.state.resources));
        assert.equal(finished.state.activeCrisisId, null);
        assert.equal(finished.state.gameOver, false);
        assert.equal(finished.draws, 0);
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await state(page), entered);
      }
    }
    for (const value of [0, 1, 99, 100]) {
      const resources = Object.fromEntries(Object.keys(base).map(k => [k, value]));
      for (const [id, side, roll, n] of [['INFLUENCER_07', 'left', .4, 3], ['INFLUENCER_08', 'left', 0, 4], ['INFLUENCER_08', 'right', 0, 6], ['INFLUENCER_08', 'right', .4, 7]]) {
        await seed(page, id, 'INFLUENCER_06', resources, roll);
        await click(page, side);
        const entered = await state(page);
        assert.deepEqual(entered.state.resources, sum(resources, decision(id, side), outcomes[n]));
        assert.equal(entered.state.gameOver, false);
        assert.equal(entered.state.activeCrisisId, null);
        await click(page, 'right');
        const finished = await state(page);
        assert.equal(finished.view, 'saved');
        assert.deepEqual(finished.state.resources, sum(entered.state.resources));
        assert.equal(finished.state.gameOver, false);
        assert.equal(finished.state.activeCrisisId, null);
      }
    }
  }, 320);
});
