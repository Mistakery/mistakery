const assert = require('node:assert/strict');
const changes = require('../docs/qa/revision-pack/approved-changes.json');
function parentFor(deck, { id, field }) {
  const parts = field.split('.');
  let obj = id.startsWith('@') ? deck.sources[id] : id === 'judgment_day' ? deck.endings[id]
    : parts[0] === 'ru' ? deck.testTranslations[id] : deck.cards.find(c => c.id === id);
  if (parts[0] === 'ru') parts.shift();
  for (const part of parts.slice(0, -1)) obj = obj[part];
  return [obj, parts.at(-1)];
}
function restoreApprovedChanges(deck) {
  const restored = structuredClone(deck);
  for (const change of changes) {
    const [obj, key] = parentFor(restored, change);
    assert.deepEqual(obj[key], change.after, `${change.id}.${change.field}: exact approved revision`);
    if (Object.hasOwn(change, 'before')) obj[key] = structuredClone(change.before);
    else delete obj[key];
  }
  return restored;
}
module.exports = { changes, parentFor, restoreApprovedChanges };
