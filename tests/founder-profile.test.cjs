const test = require('node:test');
const assert = require('node:assert/strict');
const deck = require('../cards.json');
const route = require('../assets/route.js');
const profile = require('../assets/founder-profile.js');
const fixtures = require('./founder-profile.fixture.json');
const h = (cardId, side) => ({ cardId, side });
function replay(witness) {
  let state = route.startRun(deck, { seed: witness.seed });
  for (const step of witness.steps) {
    assert.equal(state.gameOver, false);
    assert.equal(state.currentCardId, step.card);
    assert.equal(profile.reward(deck, state), null, 'no early reward');
    state = route.resolveChoice(deck, state, step.side).state;
  }
  return state;
}
test('all eight combinations of three story votes map to one deterministic type', () => {
  for (let mask = 0; mask < 8; mask++) {
    const ai = Boolean(mask & 1), inf = Boolean(mask & 2), court = Boolean(mask & 4);
    const history = [h('LIVE_AGENT_07B','left'), h('LIVE_AGENT_08',ai?'left':'right'),
      h('INFLUENCER_04','right'), h('INFLUENCER_05',inf?'left':'right'),
      ...(!inf?[h('INFLUENCER_06','right')]:[]),
      ...['IRL_PADEL_04','IRL_PADEL_05','IRL_PADEL_06'].map(id=>h(id,court?'left':'right'))];
    assert.equal(profile.classify(deck,history), ['hard','own','flex','yes'][[ai,inf,court].filter(Boolean).length]);
    assert.equal(profile.classify(deck,[h('FILL_FRIDGE','left'),...history,h('FILL_FRIDGE','right')]), profile.classify(deck,history));
  }
  assert.equal(profile.classify(deck,[]),null);
});
test('contextual influencer returns and final AI reversal override earlier promises', () => {
  const fixed=[h('LIVE_AGENT_07B','right'),...['IRL_PADEL_04','IRL_PADEL_05','IRL_PADEL_06'].map(id=>h(id,'right'))];
  const history=[...fixed,h('INFLUENCER_04','left'),h('INFLUENCER_06','left')];
  assert.equal(profile.classify(deck,history),null);
  assert.equal(profile.classify(deck,[...history,h('INFLUENCER_05','right')]),'hard');
  assert.equal(profile.classify(deck,[...history,h('INFLUENCER_05','left')]),'own');
  assert.equal(profile.classify(deck,[...history,h('INFLUENCER_05','left'),h('LIVE_AGENT_08','left')]),'flex');
});
test('real routes unlock every profile; defeat, duplicate wins and new attempts cannot', () => {
  for(const [type,witness] of Object.entries(fixtures)) {
    const state=replay(witness),before=structuredClone(state);
    assert.equal(profile.reward(deck,state).type,type);
    assert.deepEqual(state,before);
    for(const endingId of ['cash_low','team_high','founder_low','judgment_day']) assert.equal(profile.reward(deck,{...state,endingId}),null);
    for(const plot of ['live_agent','influencer','padel']) {
      const partial=structuredClone(state);
      partial.history=partial.history.filter(step=>!deck.cards.some(c=>c.id===step.cardId&&c.plot===plot&&c.outcomeTone));
      partial.history.push(...partial.history.filter(step=>deck.cards.some(c=>c.id===step.cardId&&c.outcomeTone==='success')));
      assert.equal(profile.reward(deck,partial),null);
    }
    assert.equal(profile.reward(deck,route.nextRun(deck,state)),null);
  }
});
test('finishing with setbacks does not earn a CEO card', () => {
  for(const witness of Object.values(require('./run-completion.fixture.json'))) {
    const state=replay(witness);
    assert.equal(profile.reward(deck,state),null);
    assert.equal(profile.earnedReward(deck,profile.collectWins(deck,profile.emptyProgress(),state)),null);
  }
});
