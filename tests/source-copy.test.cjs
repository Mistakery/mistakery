const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const deck = require('../cards.json');
const {mapping,expected,get,mechanics,ownerOverrides} = require('../scripts/source-audit-lib.cjs');
const invariants = require('../docs/qa/source-audit/invariants.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
test('all 71 source-backed cards match freshly read Docs fields and include every active card in coverage', () => {
 const covered=new Set(mapping.entries.map(e=>e.id));
 assert.equal(covered.size,71);
 assert.deepEqual(deck.cards.filter(c=>c.plot||c.filler).map(c=>c.id).sort(),[...covered,...mapping.unmappedCards].sort());
 for(const entry of mapping.entries) assert.equal(get(deck.cards.find(c=>c.id===entry.id),entry.field,deck),expected(entry),`${entry.id}.${entry.field} ← doc${entry.doc}:${entry.start}`);
 for(const entry of ownerOverrides.layout||[])assert.equal(get(deck.cards.find(c=>c.id===entry.id),entry.field,deck),entry.value,`${entry.id}.${entry.field}: owner presentation restored`);
 for(const entry of ownerOverrides.omitFields||[])assert.equal(get(deck.cards.find(c=>c.id===entry.id),entry.field,deck),undefined,`${entry.id}.${entry.field}: added caption removed`);
 for(const entry of ownerOverrides.preservedEmoji) {
  const text=get(deck.cards.find(c=>c.id===entry.id),entry.field,deck);
  const emojis=String(text).match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*/gu)||[];
  let next=0;
  for(const emoji of emojis)if(emoji===entry.emoji[next])next++;
  assert.equal(next,entry.emoji.length,`${entry.id}.${entry.field}: previous emoji retained`);
 }
 function checkPhrases(obj,id) {
  for(const [key,value]of Object.entries(obj)) {
   if(typeof value==='string'&&['text','label','caption','alt','left','right'].includes(key))
    assert.doesNotMatch(value,/(^|[^.])\.(?=[”"'’\)\]]*(?:[ \t]|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D)*$)/mu,`${id}.${key}: no closing full stop`);
   else if(value&&typeof value==='object')checkPhrases(value,id);
  }
 }
 for(const card of deck.cards.filter(c=>c.plot||c.filler)){checkPhrases(card,card.id);checkPhrases(deck.testTranslations[card.id],card.id+'.ru');}
});
test('text reconciliation preserves mechanics and separately approved endings', () => {
 assert.equal(hash(JSON.stringify(mechanics(deck))),invariants.mechanicsSha256);
 for(const [file,sha]of Object.entries(invariants.files))assert.equal(hash(fs.readFileSync(path.resolve(__dirname,'..',file))),sha,file);
});
