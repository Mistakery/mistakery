const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup({ muted = false, unsupported = false, storageBlocked = false } = {}) {
  const played = [], store = new Map(muted ? [['mistakery.sound', 'off']] : []);
  class AudioContext {
    state = 'suspended'; currentTime = 0; destination = {};
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { return { gain: { setValueAtTime() {} }, connect() {} }; }
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      return { length, sampleRate, getChannelData: () => data };
    }
    createBufferSource() { return { connect() {}, disconnect() {}, start(time) { played.push({ buffer: this.buffer, time, source: this }); }, stop() { this.stopped = true; } }; }
  }
  const window = { AudioContext: unsupported ? undefined : AudioContext,
    MISTAKERY_SOUND_SAMPLES: Object.fromEntries(['incoming', 'send', 'story-loss', 'resource-loss', 'ai-finale', 'story-win', 'padel'].map(kind => [kind, { sampleRate: 48000, pcm: Buffer.from([0, 0, 0, 64, 0, 192]).toString('base64') }])),
    localStorage: { getItem(key) { if (storageBlocked) throw Error(); return store.get(key); }, setItem(key, value) { if (storageBlocked) throw Error(); store.set(key, value); } } };
  const listeners = {};
  const document = { hidden: false, addEventListener(name, callback) { listeners[name] = callback; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/sound.js'), 'utf8'), { window, document, atob: value => Buffer.from(value, 'base64').toString('binary') });
  return { sound: window.MistakerySound, played, store, document, listeners };
}
test('approved PCM clips play once at their original rate only after activation', () => {
  const { sound, played } = setup();
  sound.play('incoming'); assert.equal(played.length, 0);
  sound.unlock();
  for (const kind of ['incoming', 'send', 'story-loss', 'resource-loss', 'ai-finale', 'story-win', 'padel']) sound.play(kind);
  assert.equal(played.length, 7);
  assert.equal(played[0].buffer.sampleRate, 48000);
  assert.deepEqual([...played[0].buffer.getChannelData(0)], [0, .5, -.5]);
  sound.play('unknown'); assert.equal(played.length, 7);
});
test('mute cancels active and scheduled clips and persists the preference', () => {
  const { sound, played, store } = setup();
  sound.unlock(); sound.play('incoming'); sound.play('story-win', .36);
  assert.equal(played[1].time, .36);
  sound.setEnabled(false);
  assert.ok(played.every(item => item.source.stopped));
  sound.play('send'); assert.equal(played.length, 2);
  assert.equal(store.get('mistakery.sound'), 'off');
  sound.setEnabled(true); sound.unlock(); sound.play('send'); assert.equal(played.length, 3);
});
test('hidden tabs discard playback including scheduled cues', () => {
  const { sound, played, document, listeners } = setup();
  sound.unlock(); sound.play('story-loss', .36);
  document.hidden = true; listeners.visibilitychange(); sound.play('incoming');
  assert.equal(played.length, 1); assert.equal(played[0].source.stopped, true);
  document.hidden = false; listeners.visibilitychange(); assert.equal(played.length, 1);
});
test('muted preference, blocked storage and missing audio fail quietly', () => {
  const muted = setup({ muted: true }); muted.sound.unlock(); muted.sound.play('incoming'); assert.equal(muted.played.length, 0);
  for (const options of [{ unsupported: true }, { storageBlocked: true }]) {
    const { sound } = setup(options); assert.doesNotThrow(() => { sound.unlock(); sound.play('send'); sound.setEnabled(false); });
  }
});
