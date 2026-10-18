const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const deck = require('../cards.json');
const route = require('../assets/route.js');
const engine = require('../game.js');
const baseline = require('../docs/qa/deck-cleanup/baseline.json');
const witnesses = require('../docs/qa/deck-cleanup/witnesses.json');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const retired = new Set(baseline.retired.map(row => row.mechanics.id));

test('production deck excludes isolated legacy cards and scheduler references', () => {
  assert.equal(deck.cards.length, baseline.afterCount);
  assert.equal(baseline.beforeCount - baseline.afterCount, retired.size);
  assert.deepEqual(deck.cards.filter(card => retired.has(card.id)), []);
  assert.deepEqual(deck.meta.scheduler, { boundaries: [], protectedPairs: [], locks: [] });
  for (const [file, data] of [['cards.json', deck], ['cards.bundle.js', require('../cards.bundle.js')]]) {
    assert.deepEqual(data.cards.map(c => c.id), Object.keys(baseline.retainedCardSha256), file);
    for (const id of retired) assert(!Object.hasOwn(data.testTranslations, id), `${file}: ${id} translation`);
  }
  const catalog = fs.readFileSync(path.resolve(__dirname, '../MISTAKERY_CARDS_EN_RU.md'), 'utf8');
  const builder = fs.readFileSync(path.resolve(__dirname, '../scripts/build-card-catalog.cjs'), 'utf8');
  for (const id of retired) {
    assert(!catalog.includes(`## ${id} —`), `catalog: ${id}`);
    assert(!builder.includes(`${id}:`), `fallback translation: ${id}`);
  }
});

test('every retained card, translation and founder reward remains exactly approved', () => {
  for (const card of deck.cards) assert.equal(hash(card), baseline.retainedCardSha256[card.id], card.id);
  assert.equal(hash(deck.testTranslations), baseline.translationsSha256);
  // PEARL / 02 approved copy changes; all other reward data retains the cleanup baseline.
  const founder = structuredClone(deck.meta.founderProfile);
  assert.equal(founder.issuer, 'approved by b2buddy • Mistakery Game');
  assert.equal(founder.types.yes.line, 'Your strongest argument is “Yes, of course”');
  assert.equal(founder.types.hard.line, 'You’d rather crash the company than admit you’re wrong');
  assert.equal(founder.invitation, "You didn’t just succeed — you built a legacy! 🚀\nAnd to celebrate this milestone, I’ve created your highly personalized founder profile!\nShall we take a look?");
  founder.invitation = "Incredible work, Founder! 🚀\nBased on your decisions, I've created a highly personalized founder profile!\nLet's discover your true entrepreneurial potential!";
  founder.issuer = 'approved by @b2buddy • Mistakery Game';
  founder.types.yes.line = 'Your strongest argument is “Yes, of course.”';
  founder.types.hard.line = 'You’d rather crash the company than admit you’re wrong.';
  assert.equal(hash(founder), baseline.founderProfileSha256);
});

test('real seeded production runs reach every retained card with all resource gates enabled', () => {
  assert.deepEqual(Object.keys(witnesses).sort(), deck.cards.map(c => c.id).sort());
  for (const [id, { seed, actions }] of Object.entries(witnesses)) {
    let state = route.startRun(deck, { seed });
    for (const action of actions) {
      assert(!state.gameOver, `premature ending before ${id}`);
      state = route.resolveChoice(deck, state, action === 'L' ? 'left' : 'right').state;
    }
    assert.equal(state.currentCardId, id, `seed ${seed}: ${actions}`);
  }
});

// This graph deliberately over-approximates resource feasibility. Exclusion from
// it proves unreachability; inclusion alone does not (the replay test does that).
test('all route contexts, random targets and filler followups stay inside the live deck', () => {
  assert.deepEqual(engine.validateDeck(deck), []);
  const byId = new Map(deck.cards.map(c => [c.id, c]));
  const seen = new Set(), reached = new Set();
  const queue = Object.keys(deck.meta.route.plots).map(firstPlot => route.startRun(deck, { seed: 1, firstPlot }));
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i], card = byId.get(state.currentCardId);
    assert(card?.plot, state.currentCardId);
    const key = JSON.stringify([card.id, state.route.influencerPreviousCardId, state.route.liveAgentScore, state.route.padelCeoScore]);
    if (seen.has(key)) continue;
    seen.add(key); reached.add(card.id);
    if (card.outcomeTone || card.terminalEnding) continue;
    for (const side of ['left', 'right']) {
      const choice = route.choicesFor(card, state)[side];
      for (const id of route.choiceTargets(deck, state, card, side)) {
        assert.equal(byId.get(id)?.plot, card.plot, `${card.id} -> ${id}`);
        const next = structuredClone(state);
        next.currentCardId = id;
        next.route.influencerPreviousCardId = card.id;
        next.route.liveAgentScore += Number(choice.botScore || 0);
        next.route.padelCeoScore += Number(choice.ceoScore || 0);
        queue.push(next);
      }
    }
  }
  assert.deepEqual([...reached].sort(), deck.cards.filter(c => c.plot).map(c => c.id).sort());
  for (const card of deck.cards.filter(c => c.filler)) {
    for (const choice of Object.values(card.choices)) if (choice.next) {
      const target = byId.get(choice.next);
      assert.equal(target?.filler?.role, 'followup', `${card.id} -> ${choice.next}`);
      assert.equal(target.filler.unit, card.filler.unit);
    }
  }
  function references(value, field = 'deck') {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      assert(!retired.has(key), `${field}.${key}`);
      if (typeof item === 'string') assert(!retired.has(item), `${field}.${key}: ${item}`);
      else references(item, `${field}.${key}`);
    }
  }
  references(deck);
});
