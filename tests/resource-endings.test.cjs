const test = require('node:test');
const assert = require('node:assert/strict');
const base = require('../cards.json');
const route = require('../assets/route.js');
const ids = ['cash_low', 'team_low', 'team_high', 'customers_low', 'founder_low', 'founder_high'];
const safe = { cash: 60, team: 60, customers: 60, founder: 60 };
function fixture() {
  const deck = structuredClone(base);
  deck.meta.route.resourceEndings = ids;
  for (const id of ids) Object.assign(deck.endings[id], {
    resource: deck.crises[id].resource, edge: deck.crises[id].edge,
    source: deck.crises[id].source, reaction: deck.crises[id].text,
  });
  const choice = (effects = {}, next) => ({ label: 'Continue', effects, ...(next ? { next } : {}) });
  const add = (id, spec, effects = {}, next) => deck.cards.push({ id, source: '@bigdeals',
    text: 'A test event.', choices: { left: choice(effects, next), right: choice(effects, next) }, ...spec });
  add('TEST_SINGLE', { filler: { unit: 'test', role: 'single', theme: 'test' } });
  add('TEST_LINK', { filler: { unit: 'testlink', role: 'entry', theme: 'test' } }, { cash: -10 }, 'TEST_FOLLOW');
  add('TEST_FOLLOW', { filler: { unit: 'testlink', role: 'followup', theme: 'test' } }, { cash: 6 });
  add('TEST_PLOT', { plot: 'live_agent' }, { cash: -10 }, 'TEST_MID');
  add('TEST_MID', { plot: 'live_agent' }, {}, 'TEST_OUTCOME');
  add('TEST_OUTCOME', { plot: 'live_agent', outcomeTone: 'success', outcomeEffects: { cash: 6 } });
  return deck;
}
function at(deck, id, resources = safe) {
  const s = route.startRun(deck, { seed: 6, firstPlot: 'live_agent' });
  s.currentCardId = id; s.resources = { ...resources };
  if (id === 'TEST_SINGLE' || id === 'TEST_LINK') {
    s.route.phase = 'fillers'; s.activeArc = null;
    s.route.gap = { target: 4, played: [], usedUnit: null };
  }
  return s;
}
const answer = (deck, state, side = 'left', options) => route.resolveChoice(deck, state, side, options).state;

test('ordinary Padel replies cost only half a Cash on short and early-pitch paths', () => {
  for (const earlyPitch of [false, true]) {
    let state = route.startRun(base, { seed: 681, firstPlot: 'padel' });
    const replies = ['left', 'left', earlyPitch ? 'right' : 'left',
      ...(earlyPitch ? ['left'] : []), 'left', 'right', 'left', 'left'];
    for (const side of replies) {
      const card = base.cards.find(c => c.id === state.currentCardId);
      state = answer(base, state, side, { outcomeRng: () => .99 });
      const target = base.cards.find(c => c.id === state.currentCardId);
      const payout = !card.outcomeTone && target.outcomeTone ? target.outcomeEffects.cash || 0 : 0;
      const h = state.history.at(-1);
      assert.equal(h.rawAfter.cash - h.rawBefore.cash - payout, -.5, card.id);
    }
    assert.deepEqual(state.route.completed, ['padel']);
    assert.equal(state.resources.cash, earlyPitch ? 36 : 36.5);
  }
});

test('both investor replies cost only the shared half Cash', () => {
  for (const side of ['left', 'right']) {
    const state = at(base, 'OPEN_INVESTOR');
    state.route.phase = 'fillers'; state.activeArc = null;
    state.route.gap = { target: 4, played: [], usedUnit: null };
    const next = answer(base, state, side);
    assert.equal(next.resources.cash, safe.cash - .5);
  }
});

for (const [plot, outcome] of [['padel', 'PADEL_OUTCOME_0'], ['influencer', 'INFLUENCER_OUTCOME_1']]) {
  test(`initial ${plot} refusal leaves 9 Cash and continues after either outcome reply`, () => {
    for (const reply of ['left', 'right']) {
      let state = route.startRun(base, { seed: 681, firstPlot: plot });
      state = answer(base, state, 'right');
      assert.equal(state.currentCardId, outcome);
      assert.equal(state.resources.cash, 9.5);
      assert.equal(state.gameOver, false);
      state = answer(base, state, reply);
      assert.equal(state.resources.cash, 9);
      assert.equal(state.gameOver, false);
      assert.equal(state.route.phase, 'fillers');
      assert.deepEqual(state.route.completed, [plot]);
      assert.equal(state.history.length, 2);
    }
  });
}

test('canonical route enables exactly the six approved resource endings', () => {
  assert.deepEqual(base.meta.route.resourceEndings, ids);
  for (const id of ids) {
    const e = base.endings[id];
    assert.ok(base.sources[e.source]); assert.ok(e.reaction);
    assert.equal(e.resource, base.crises[id].resource);
    assert.equal(e.edge, base.crises[id].edge);
  }
});

for (const id of ids) test(`${id} ends a completed single without Last Chance or next draw`, () => {
  const d = fixture(); const { resource, edge } = d.endings[id];
  const value = edge === 'high' ? 100 : resource === 'cash' ? .5 : 0;
  const s = at(d, 'TEST_SINGLE', { ...safe, [resource]: value });
  const next = answer(d, s);
  assert.equal(next.gameOver, true); assert.equal(next.endingId, id);
  assert.equal(next.currentCardId, 'TEST_SINGLE');
  assert.equal(next.activeCrisisId, null); assert.equal(next.rescueAttempts, 0);
  assert.equal(next.route.randomState, s.route.randomState);
  assert.equal(next.history.length, 1);
});

test('unselected Cash/Customers high edges do not use archived endings', () => {
  const d = fixture(); const s = at(d, 'TEST_SINGLE', { ...safe, cash: 100, customers: 100 });
  const next = answer(d, s);
  assert.equal(next.gameOver, false); assert.equal(next.endingId, null);
});

test('plot shows its outcome, preserves negative expenses, then ends on acknowledgement', () => {
  const d = fixture(); let s = at(d, 'TEST_PLOT', { ...safe, cash: 5 });
  s = answer(d, s); assert.equal(s.gameOver, false); assert.equal(s.resources.cash, 0);
  s = answer(d, s); assert.equal(s.currentCardId, 'TEST_OUTCOME'); assert.equal(s.gameOver, false);
  assert.equal(s.resources.cash, 0, 'income must first cover episode expenses');
  s = answer(d, s); assert.equal(s.endingId, 'cash_low');
  assert.equal(s.route.ending.rawResources.cash, -.5);
});

test('genuine recovery before the plot boundary does not retain an earlier death', () => {
  const d = fixture(); d.cards.find(c => c.id === 'TEST_OUTCOME').outcomeEffects.cash = 20;
  let s = at(d, 'TEST_PLOT', { ...safe, cash: 5 });
  s = answer(d, s); s = answer(d, s); s = answer(d, s);
  assert.equal(s.gameOver, false); assert.equal(s.resources.cash, 13.5);
  assert.equal(s.route.resourceLedger, null);
});

test('linked filler completes before settlement and does not forgive expenses at zero', () => {
  const d = fixture(); let s = at(d, 'TEST_LINK', { ...safe, cash: 5 });
  s = answer(d, s); assert.equal(s.currentCardId, 'TEST_FOLLOW'); assert.equal(s.gameOver, false);
  s = answer(d, s); assert.equal(s.endingId, 'cash_low'); assert.equal(s.resources.cash, 0);
  assert.deepEqual(s.route.gap.played, ['TEST_LINK', 'TEST_FOLLOW']);
});

test('overflow within a linked episode is accounted for before a high-edge settlement', () => {
  const d = fixture();
  for (const side of ['left', 'right']) {
    d.cards.find(c => c.id === 'TEST_LINK').choices[side].effects = { team: 10 };
    d.cards.find(c => c.id === 'TEST_FOLLOW').choices[side].effects = { team: -4 };
  }
  let s = at(d, 'TEST_LINK', { ...safe, team: 97 });
  s = answer(d, s); assert.equal(s.resources.team, 100);
  s = answer(d, s); assert.equal(s.endingId, 'team_high');
  assert.equal(s.route.ending.rawResources.team, 103);
});

test('third plot settles before the route starts a new cycle', () => {
  const d = fixture(); const s = at(d, 'TEST_OUTCOME', { ...safe, cash: .5 });
  s.route.order = ['padel', 'influencer', 'live_agent']; s.route.completed = ['padel', 'influencer'];
  const next = answer(d, s);
  assert.equal(next.gameOver, true); assert.equal(next.route.cycle, 1);
  assert.deepEqual(next.route.completed, ['padel', 'influencer', 'live_agent']);
});

test('simultaneous boundaries retain every cause with deterministic primary precedence', () => {
  const d = fixture(); const s = at(d, 'TEST_SINGLE', { cash: .5, team: 0, customers: 0, founder: 100 });
  const next = answer(d, s);
  assert.equal(next.endingId, 'cash_low');
  assert.deepEqual(next.route.ending.causes, ['cash_low', 'team_low', 'customers_low', 'founder_high']);
});

test('finished run cannot apply another choice, draw, expense or rescue', () => {
  const d = fixture(); const end = answer(d, at(d, 'TEST_SINGLE', { ...safe, cash: .5 }));
  const frozen = structuredClone(end);
  const result = route.resolveChoice(d, end, 'right');
  assert.deepEqual(end, frozen); assert.deepEqual(result.state, frozen);
  assert.deepEqual(result.deltas, { cash: 0, team: 0, customers: 0, founder: 0 });
});

test('Back-style snapshots replay episode accounting and the same ending', () => {
  const d = fixture(); const s = answer(d, at(d, 'TEST_LINK', { ...safe, cash: 5 }));
  const saved = structuredClone(s);
  assert.deepEqual(answer(d, s), answer(d, saved)); assert.deepEqual(s, saved);
});

test('Judgment Day ends on entry and takes priority over its zero resource scales', () => {
  const d = fixture(); const target = d.cards.find(c => c.id === 'LIVE_AGENT_OUTCOME_2');
  assert.equal(target.terminalEnding, 'judgment_day');
  const parent = d.cards.find(c => c.plot && Object.values(c.choices).some(ch => ch.outcomeRoll?.lose === target.id));
  const side = Object.keys(parent.choices).find(k => parent.choices[k].outcomeRoll?.lose === target.id);
  const s = at(d, parent.id); s.route.liveAgentScore = 5;
  const next = answer(d, s, side, { outcomeRng: () => .99 });
  assert.equal(next.currentCardId, target.id); assert.equal(next.endingId, 'judgment_day');
  assert.equal(next.gameOver, true); assert.deepEqual(next.resources, { cash: 0, team: 0, customers: 0, founder: 0 });
});

for (const [id, witness] of Object.entries(require('../docs/qa/resource-endings.json').witnesses)) {
  test(`real decisions reach ${id} from the normal start in the first cycle`, () => {
    let state = route.startRun(base, { seed: witness.seed });
    for (const step of witness.steps) {
      assert.equal(state.gameOver, false);
      assert.equal(state.currentCardId, step.card);
      state = route.resolveChoice(base, state, step.side).state;
      assert.deepEqual(state.resources, step.after);
      assert.deepEqual(state.history.at(-1).rawAfter, step.rawAfter);
    }
    assert.equal(state.endingId, id);
    assert.equal(state.route.cycle, 1);
  });
}
