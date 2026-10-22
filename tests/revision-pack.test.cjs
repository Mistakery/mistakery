const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const deck = require('../cards.json');
const { changes, parentFor } = require('./revision-pack.fixture.cjs');
const root = path.resolve(__dirname, '..');
test('revision pack retains exactly the owner-approved EN/RU fields', () => {
  for (const change of changes) {
    const [obj, key] = parentFor(deck, change);
    assert.deepEqual(obj[key], change.after, `${change.id}.${change.field}`);
  }
});
test('supplied request queue and YC avatar are compact WebP assets', () => {
  for (const [file, limit] of [['influencer-request-queue.webp', 160 * 1024], ['avatar-yc-founder.webp', 30 * 1024]]) {
    const data = fs.readFileSync(path.join(root, 'assets', file));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.ok(data.length < limit, file);
  }
});
test('voice attachment has an irregular duration and no visible title', () => {
  const voice = fs.readFileSync(path.join(root, 'assets/filler-mantra-voice-v2.svg'), 'utf8');
  assert.match(voice, /3:47:28/);
  assert.doesNotMatch(voice, /wealth mantra|4:00:00|four.hour|4.hour/i);
  assert.equal((voice.match(/<text /g) || []).length, 2, 'only duration and playback speed');
});
