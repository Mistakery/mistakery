const test = require('node:test');
const assert = require('node:assert/strict');
const deck = require('../cards.json');
const route = require('../assets/route.js');
const { witnesses } = require('../docs/qa/resource-endings.json');

function finish(id) {
  const w = witnesses[id];
  let state = route.startRun(deck, { seed: w.seed });
  for (const step of w.steps) state = route.resolveChoice(deck, state, step.side).state;
  return state;
}

test('new attempts change seed and opening plot, including after several cycles', () => {
  assert.equal(typeof route.nextRun, 'function');
  const starts = new Set();
  let state = route.startRun(deck, { seed: 681 });
  for (let n = 0; n < 200; n++) {
    const before = structuredClone(state);
    const first = state.route.initialPlot;
    state = route.nextRun(deck, state);
    assert.notEqual(String(state.seed), String(before.seed));
    assert.notEqual(state.route.order[0], first);
    assert.equal(state.route.initialPlot, state.route.order[0]);
    assert.deepEqual(state.route.order.slice().sort(), Object.keys(deck.meta.route.plots).sort());
    assert.equal(state.currentCardId, deck.meta.route.plots[state.route.order[0]]);
    starts.add(state.route.initialPlot);
    // A later prototype cycle must not erase which plot opened this attempt.
    state.route.order.reverse(); state.route.cycle = 3;
  }
  assert.equal(starts.size, 3);
});

test('a new attempt resets the company, and redoing Start again after Back is deterministic', () => {
  assert.equal(typeof route.nextRun, 'function');
  const ended = finish('founder_low');
  const before = structuredClone(ended);
  const next = route.nextRun(deck, ended);
  assert.deepEqual(ended, before);
  assert.deepEqual(next, route.nextRun(deck, before));
  assert.deepEqual(next.resources, { cash: 25, team: 60, customers: 15, founder: 65 });
  assert.equal(next.gameOver, false); assert.equal(next.endingId, null);
  assert.deepEqual(next.history, []); assert.deepEqual(next.route.usedUnits, []);
  assert.deepEqual(next.route.completed, []); assert.deepEqual(next.flags, ['assistant_available']);
  assert.equal(next.route.resourceLedger, null);
});

test('recent filler units are less likely, not forbidden, and memory includes a visible unanswered card', () => {
  assert.equal(typeof route.nextRun, 'function');
  const previous = route.startRun(deck, { seed: 1 });
  previous.history = [{ cardId: 'FILL_POLICE_1' }, { cardId: 'FILL_POLICE_2' }];
  previous.currentCardId = 'FILL_MANTRA';
  const next = route.nextRun(deck, previous);
  const units = ['FILL_POLICE_1', 'FILL_MANTRA'].map(id => deck.cards.find(c => c.id === id).filler.unit);
  assert.deepEqual(next.route.recentFillerUnits, units, 'a link occupies one memory slot');
  const fresh = structuredClone(next); fresh.route.recentFillerUnits = [];
  const freshPool = route.fillerPool(deck, fresh);
  const pool = route.fillerPool(deck, next);
  assert.deepEqual(pool.map(e => e.card.id), freshPool.map(e => e.card.id), 'world gates stay intact');
  for (const entry of pool) {
    const weight = freshPool.find(e => e.card.id === entry.card.id).weight;
    if (units.includes(entry.card.filler.unit)) assert.ok(entry.weight > 0 && entry.weight < weight);
    else assert.equal(entry.weight, weight);
    assert.notEqual(entry.card.filler.role, 'followup');
  }
  // Even if every eligible unit was seen, no empty pool or broken link is created.
  next.route.recentFillerUnits = pool.map(e => e.card.filler.unit);
  assert.ok(route.fillerPool(deck, next).every(e => e.weight > 0));
});

test('recent filler memory survives short attempts and stays bounded across longer runs', () => {
  assert.equal(typeof route.nextRun, 'function');
  let state = finish('founder_low');
  state = route.nextRun(deck, state);
  const remembered = [...state.route.recentFillerUnits];
  assert.ok(remembered.length > 0 && remembered.length <= 8);
  assert.deepEqual(route.nextRun(deck, state).route.recentFillerUnits, remembered);
  state.history = deck.cards.filter(c => c.filler).map(c => ({ cardId: c.id }));
  const next = route.nextRun(deck, state);
  assert.equal(next.route.recentFillerUnits.length, 8);
  assert.equal(new Set(next.route.recentFillerUnits).size, 8);
});
