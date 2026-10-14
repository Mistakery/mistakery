const test = require('node:test');
const assert = require('node:assert/strict');
// Isolate scheduling/topology from deaths. Production endings have their own
// boundary tests and real-route reachability replay tests.
const deck = structuredClone(require('../cards.json'));
deck.meta.route.resourceEndings = [];
deck.cards.forEach(card => { delete card.terminalEnding; });
const fs = require('node:fs');
const path = require('node:path');
const routePath = path.resolve(__dirname, '../assets/route.js');

test('route module starts three seeded plots without an OPEN prerequisite', () => {
  assert.ok(fs.existsSync(routePath), 'Missing the shared story/filler route');
  const route = require(routePath);
  const orders = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const a = route.startRun(deck, { seed });
    assert.deepEqual(a, route.startRun(deck, { seed }));
    assert.equal(a.route.order.length, 3);
    assert.equal(new Set(a.route.order).size, 3);
    assert.equal(a.currentCardId, deck.meta.route.plots[a.route.order[0]]);
    assert.equal(a.route.phase, 'plot');
    orders.add(a.route.order.join(','));
  }
  assert.equal(orders.size, 6);
});

const R = () => require(routePath);
const card = id => deck.cards.find(c => c.id === id);
function answer(state, side = 'left', options) { return R().resolveChoice(deck, state, side, options).state; }
function gap(seed = 1, order) {
  let s = R().startRun(deck, { seed, order });
  s = answer(s, 'right'); // each plot has an explicit early refusal
  return answer(s); // acknowledge outcome
}

test('each finite run completes all plots once with exactly two 4–5-card gaps', () => {
  const orders = new Set();
  for (let seed = 0; seed < 600; seed++) {
    let s = R().startRun(deck, { seed });
    const originalOrder = [...s.route.order];
    orders.add(originalOrder.join(','));
    let steps = 0;
    while (!s.gameOver && steps++ < 70) {
      const c = card(s.currentCardId);
      s = answer(s, c.plot && !c.outcomeTone && deck.meta.route.plots[c.plot] === c.id ? 'right' : seed % 2 ? 'left' : 'right');
      for (const value of Object.values(s.resources)) assert.ok(value >= 0 && value <= 100);
    }
    assert.equal(s.route.cycle, 1);
    assert.equal(s.gameOver, true, `stuck seed ${seed}`);
    assert.equal(s.endingId, 'run_complete');
    assert.deepEqual(s.route.completed, originalOrder);
    assert.equal(s.route.gaps.length, 2);
    assert.equal(new Set(s.fillerCards).size, s.fillerCards.length);
    assert.ok(!s.win);
    for (const g of s.route.gaps) {
      assert.ok([4, 5].includes(g.played.length));
      assert.equal(g.played.length, g.target);
      assert.equal(g.played.filter(id => card(id).filler.role === 'entry').length, 1);
      assert.ok(g.played.filter(id => card(id).filler.role === 'single').length >= 2);
      for (let i = 0; i < g.played.length; i++) {
        const c = card(g.played[i]);
        if (c.filler.role === 'followup') assert.equal(card(g.played[i - 1]).filler.unit, c.filler.unit);
      }
    }
  }
  assert.equal(orders.size, 6);
});

test('all authored conditional follow-ups are immediate and absent branches get singles', () => {
  const expected = {
    OPEN_01: ['OPEN_02a', 'OPEN_02b'],
    FILL_PAYROLL_1: ['FILL_PAYROLL_2', null],
    FILL_MOM_CALL_1: ['FILL_MOM_CALL_2', null],
    FILL_COMA_1: ['FILL_COMA_2A', 'FILL_COMA_2B'],
    FILL_SALES_1: ['FILL_SALES_2', null],
    FILL_DOMAIN_1: [null, 'FILL_DOMAIN_2'],
    FILL_VIDEO_1: ['FILL_VIDEO_2', 'FILL_VIDEO_2'],
    FILL_POLICE_1: ['FILL_POLICE_2', 'FILL_POLICE_2'],
  };
  const entries = deck.cards.filter(c => c.filler?.role === 'entry');
  assert.equal(entries.length, 8);
  assert.equal(deck.cards.filter(c => c.id.startsWith('FILL_')).length, 25);
  for (const c of entries) for (const side of ['left', 'right']) {
    let s = gap(6);
    s.currentCardId = c.id;
    s.flags = [...new Set([...(c.requires || []), 'pitch_sent', 'pitch_video', 'assistant_available'])];
    s.route.gap.usedUnit = c.filler.unit;
    s.route.gap.played = [];
    s = answer(s, side);
    const followup = expected[c.id][side === 'left' ? 0 : 1];
    if (followup) assert.equal(s.currentCardId, followup, `${c.id} ${side}`);
    else assert.equal(card(s.currentCardId).filler.role, 'single');
    while (s.route.phase === 'fillers') s = answer(s);
    const g = s.route.gaps.at(-1);
    assert.equal(g.played.length, g.target);
    assert.equal(g.played.filter(id => card(id).filler.role === 'entry').length, 1);
  }
});

test('world facts hard-gate entries and follow-ups never enter the draw', () => {
  let s = gap();
  s.flags = ['assistant_available'];
  const ids = () => R().fillerPool(deck, s).map(e => e.card.id);
  assert.ok(!ids().includes('FILL_USER_WIFE'));
  assert.ok(!ids().includes('FILL_SALES_1'));
  assert.ok(!ids().includes('FILL_VIDEO_1'));
  assert.ok(ids().includes('OPEN_01'));
  s.flags.push('free_users', 'pitch_sent', 'pitch_video', 'ever_customer');
  assert.ok(ids().includes('FILL_USER_WIFE'));
  assert.ok(ids().includes('FILL_SALES_1'));
  assert.ok(ids().includes('FILL_VIDEO_1'));
  assert.ok(!ids().includes('OPEN_01'));
  assert.ok(!ids().includes('OPEN_INVESTOR'));
  assert.ok(!ids().includes('FILL_PAYROLL_1'));
  assert.ok(ids().every(id => card(id).filler.role !== 'followup'));
  s.flags = [];
  assert.ok(!ids().includes('FILL_FRIDGE'));
  assert.ok(!ids().includes('FILL_THERAPY'));
});

test('resource cost and recent authors affect weight, not hard world facts', () => {
  let s = gap();
  s.flags = ['assistant_available'];
  s.resources = { cash: 60, team: 60, customers: 60, founder: 60 };
  const weight = id => R().fillerPool(deck, s).find(e => e.card.id === id)?.weight;
  const full = weight('FILL_FIGHT');
  s.resources.cash = 5;
  assert.ok(weight('FILL_FIGHT') < full);
  const fresh = weight('FILL_MANTRA');
  s.route.recentAuthors = ['@unicorn_hunter'];
  assert.ok(weight('FILL_MANTRA') < fresh);
});

test('replay restores random position, linked context and never mutates a snapshot', () => {
  const s = gap(31);
  const snapshot = JSON.parse(JSON.stringify(s));
  const a = answer(s, 'left');
  const b = answer(snapshot, 'left');
  assert.deepEqual(a, b);
  assert.deepEqual(s, snapshot);
  assert.deepEqual(R().startRun(deck, { seed: 31 }), R().startRun(deck, { seed: 31 }));
});

test('payment evidence and outcome effects apply exactly once; opt-out is not proof', () => {
  let s = R().startRun(deck, { seed: 8 });
  s.currentCardId = 'FILL_SALES_2'; s.route.phase = 'fillers';
  s.route.gap = { target: 4, played: ['FILL_SALES_1'], usedUnit: 'sales' };
  s = answer(s);
  assert.ok(s.flags.includes('optout_paid'));
  assert.ok(!s.flags.includes('product_paid'));
  s.route.phase = 'plot';
  s.currentCardId = 'LIVE_AGENT_08'; s.route.liveAgentScore = -5;
  const before = s.resources.cash;
  s = answer(s, 'right', { outcomeRng: () => 0 });
  assert.equal(s.currentCardId, 'LIVE_AGENT_OUTCOME_3');
  assert.equal(s.resources.cash, Math.min(100, before + 35 - .5));
  assert.ok(s.flags.includes('product_paid'));
  const cash = s.resources.cash;
  s = answer(s);
  assert.equal(s.resources.cash, Math.max(0, cash - .5));
});

test('completion freezes the run without declaring victory or drawing the next plot', () => {
  let s = R().startRun(deck, { seed: 2 });
  s.flags.push('product_paid', 'ever_customer');
  for (let turn = 0; !s.gameOver && turn < 70; turn++) {
    const c = card(s.currentCardId);
    const before = s;
    s = answer(s, c.plot && !c.outcomeTone ? 'right' : 'left');
    if (s.gameOver) {
      assert.equal(s.currentCardId, before.currentCardId);
      assert.equal(s.route.randomState, before.route.randomState);
    }
  }
  assert.equal(s.win, false);
  assert.equal(s.endingId, 'run_complete');
  assert.equal(s.route.phase, 'ended');
  assert.equal(s.route.completed.length, 3);
  assert.ok(s.flags.includes('ever_customer'));
  const frozen = structuredClone(s);
  assert.deepEqual(answer(s, 'right'), frozen);
  assert.deepEqual(s, frozen);
  const next = R().nextRun(deck, s);
  assert.equal(next.gameOver, false);
  assert.notEqual(next.seed, s.seed);
  assert.deepEqual(next.history, []);
  assert.deepEqual(next.resources, { cash: 25, team: 60, customers: 15, founder: 65 });
});

test('mixed decisions across finite runs cover every outcome without dead ends or repeat fillers', () => {
  const outcomes = new Set();
  for (let seed = 0; seed < 800; seed++) {
    let s = R().startRun(deck, { seed });
    let decisions = seed + 1;
    let turns = 0;
    while (!s.gameOver && turns++ < 70) {
      const c = card(s.currentCardId);
      if (c.outcomeTone) outcomes.add(c.id);
      const before = s;
      decisions = (Math.imul(decisions, 1664525) + 1013904223) >>> 0;
      s = answer(s, decisions < 2147483648 ? 'left' : 'right');
      assert.equal(new Set(s.fillerCards).size, s.fillerCards.length);
      assert.ok(Object.values(s.resources).every(value => value >= 0 && value <= 100));

    }
    assert.equal(s.endingId, 'run_complete', `stuck seed ${seed}`);
    assert.deepEqual(s.route.completed, s.route.order);
  }
  assert.deepEqual([...outcomes].sort(), deck.cards.filter(c => c.plot && c.outcomeTone).map(c => c.id).sort());
});
