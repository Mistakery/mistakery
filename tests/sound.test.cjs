const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup({ muted = false, unsupported = false, storageBlocked = false } = {}) {
  const tones = [], store = new Map(muted ? [['mistakery.sound', 'off']] : []);
  const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  class AudioContext {
    state = 'suspended'; currentTime = 0; destination = {};
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; }
    createOscillator() { return { frequency: param(), connect() {}, disconnect() {}, start() { tones.push(this); }, stop() {} }; }
  }
  const window = { AudioContext: unsupported ? undefined : AudioContext,
    localStorage: { getItem(key) { if (storageBlocked) throw Error(); return store.get(key); }, setItem(key, value) { if (storageBlocked) throw Error(); store.set(key, value); } } };
  const document = { hidden: false };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/sound.js'), 'utf8'), { window, document });
  return { sound: window.MistakerySound, tones, store, document };
}
test('sound starts only after unlock, mute stops it and preference persists', () => {
  const { sound, tones, store } = setup();
  sound.play('message'); assert.equal(tones.length, 0);
  sound.unlock(); sound.play('click'); assert.equal(tones.length, 1);
  sound.play('message'); assert.equal(tones.length, 3);
  sound.play('alert'); assert.equal(tones.length, 5);
  sound.setEnabled(false); sound.play('message'); assert.equal(tones.length, 5);
  assert.equal(store.get('mistakery.sound'), 'off');
  sound.setEnabled(true); sound.unlock(); sound.play('message'); assert.equal(tones.length, 7);
});
test('muted preference, hidden tabs, blocked storage and missing audio fail quietly', () => {
  const muted = setup({ muted: true }); muted.sound.unlock(); muted.sound.play('alert'); assert.equal(muted.tones.length, 0);
  const hidden = setup(); hidden.sound.unlock(); hidden.document.hidden = true; hidden.sound.play('message'); assert.equal(hidden.tones.length, 0);
  for (const options of [{ unsupported: true }, { storageBlocked: true }]) {
    const { sound } = setup(options); assert.doesNotThrow(() => { sound.unlock(); sound.play('click'); sound.setEnabled(false); });
  }
});
