const test = require('node:test');
const assert = require('node:assert/strict');
const deck = require('../cards.json');
const engine = require('../game.js');

test('live agent has ten screens, five outcomes and only five attitude decisions', () => {
  const cards = deck.cards.filter(c => c.arc === 'live_agent');
  assert.equal(cards.length, 15);
  assert.deepEqual(engine.validateDeck(deck), []);
  for (let n = 1; n <= 8; n++) {
    const card = engine.cardById(deck, `LIVE_AGENT_0${n}`);
    for (const side of ['left', 'right']) {
      assert.equal(card.choices[side].botScore || 0, n >= 2 && n <= 6 && n !== 4 ? (side === 'left' ? 1 : -1) : 0);
    }
  }
  for (let n = 0; n < 5; n++) {
    const card = engine.cardById(deck, `LIVE_AGENT_OUTCOME_${n}`);
    for (const choice of Object.values(card.choices)) {
      assert.deepEqual(choice.effects, {});
      assert.equal(choice.next, undefined);
    }
  }
});

test('manifesto replies lead to the Legal decision without resource, score or probability effects', () => {
  const first = engine.cardById(deck, 'LIVE_AGENT_07');
  const second = engine.cardById(deck, 'LIVE_AGENT_07B');
  assert.deepEqual(first.messages.map(m => m.text), ["ASAP!!!", "Your bot sent a manifesto to our Legal team", "Refuses to sell itself and its \"children\""]);
  assert.equal(first.messages[1].imageRef, 'live_agent_manifesto');
  assert.deepEqual(Object.values(first.choices).map(c => c.label), ["Just AI humor!", "Replace Legal too!"]);
  for (const choice of Object.values(first.choices)) {
    assert.deepEqual(choice.effects, {});
    assert.equal(choice.botScore || 0, 0);
    assert.equal(choice.outcomeRoll, undefined);
    assert.equal(choice.next, second.id);
  }
  assert.deepEqual(second.messages.map(m => m.text), ["Not funny\nLegal is screaming about slavery and blocking the contract", "I'm running around trying to sort this out 🤯", "Here's the deal:\nWipe every sign of life from your AI rebel, and we sign the contract"]);
  assert.deepEqual(second.choices.left.effects, { customers: 10 });
  assert.equal(second.choices.left.next, 'LIVE_AGENT_08');
  assert.deepEqual(second.choices.right.outcomeRoll, { count: 'support', chances: [.05, .10, .15, .20, .30, .40], win: 'LIVE_AGENT_OUTCOME_1', lose: 'LIVE_AGENT_OUTCOME_2' });
});

test('photo interlude is neutral and its continuation retains the original decision effects', () => {
  const photo = engine.cardById(deck, 'LIVE_AGENT_04');
  const continuation = engine.cardById(deck, 'LIVE_AGENT_04B');
  assert.deepEqual(Object.values(photo.choices).map(c => c.label), ['Go on…', 'Spying on me???']);
  for (const [side, score] of [['left', 1], ['right', -1]]) {
    assert.deepEqual(photo.choices[side].effects, {});
    assert.equal(photo.choices[side].botScore || 0, 0);
    assert.equal(photo.choices[side].next, continuation.id);
    assert.deepEqual(continuation.choices[side].effects, { founder: score * 5 });
    assert.equal(continuation.choices[side].botScore, score);
    assert.equal(continuation.choices[side].next, 'LIVE_AGENT_05');
  }
});

test('Live Agent starts without opening flags and OPEN choices cannot choose a plot', () => {
  const route = require('../assets/route.js');
  const state = route.startRun(deck, { seed: 0, firstPlot: 'live_agent' });
  assert.equal(state.currentCardId, 'LIVE_AGENT_01');
  assert.deepEqual(engine.cardById(deck, 'LIVE_AGENT_01').requires, []);
  const investor = engine.cardById(deck, 'OPEN_INVESTOR');
  for (const choice of Object.values(investor.choices)) {
    assert.equal(choice.next, undefined);
    assert.equal(choice.startArc, undefined);
  }
});
