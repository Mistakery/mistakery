const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup({ muted = false, unsupported = false, storageBlocked = false, delayedResume = false } = {}) {
  const played = [], store = new Map(muted ? [['mistakery.sound', 'off']] : []);
  let context, resume, now = 0;
  class AudioContext {
    state = 'suspended'; currentTime = 0; destination = {};
    constructor() { context = this; }
    resume() {
      if (delayedResume) return new Promise(resolve => { resume = () => { this.state = 'running'; resolve(); }; });
      this.state = 'running'; return Promise.resolve();
    }
    createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }; }
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      return { length, sampleRate, duration: length / sampleRate, getChannelData: () => data };
    }
    createBufferSource() { return { connect() {}, disconnect() {}, start(time) { played.push({ buffer: this.buffer, time, source: this }); }, stop(time = context.currentTime) { this.stopTime = time; this.stopped = true; } }; }
  }
  const window = { AudioContext: unsupported ? undefined : AudioContext,
    // Half-second clips make interrupted playback observable without wall-clock sleeps.
    MISTAKERY_SOUND_SAMPLES: Object.fromEntries(['incoming', 'send', 'story-loss', 'resource-loss', 'ai-finale', 'story-win', 'padel'].map((kind, index) => [kind, { sampleRate: 6, pcm: Buffer.from([index, 0, 0, 64, 0, 192]).toString('base64') }])),
    localStorage: { getItem(key) { if (storageBlocked) throw Error(); return store.get(key); }, setItem(key, value) { if (storageBlocked) throw Error(); store.set(key, value); } } };
  const listeners = {};
  const document = { hidden: false, addEventListener(name, callback) { listeners[name] = callback; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/sound.js'), 'utf8'), { window, document, Date: { now: () => now }, atob: value => Buffer.from(value, 'base64').toString('binary') });
  return { sound: window.MistakerySound, played, store, document, listeners, get context() { return context; }, finishResume() { resume(); }, elapse(milliseconds) { now += milliseconds; } };
}
test('approved PCM clips preserve their rate and samples, with no autoplay', async () => {
  const audio = setup(), { sound, played } = audio;
  sound.play('incoming'); await tick(); assert.equal(played.length, 0);
  await sound.unlock();
  for (const kind of ['incoming', 'send', 'story-loss', 'resource-loss', 'ai-finale', 'story-win', 'padel']) {
    sound.play(kind); await tick(); audio.context.currentTime += 1;
  }
  assert.equal(played.length, 7);
  assert.equal(played[0].buffer.sampleRate, 6);
  assert.deepEqual([...played[0].buffer.getChannelData(0)], [0, .5, -.5]);
  sound.play('unknown'); await tick(); assert.equal(played.length, 7);
});
test('one immediate transition selects only its highest-priority cue, regardless of call order', async () => {
  for (const kinds of [['send', 'padel', 'story-win'], ['story-loss', 'send', 'incoming'], ['incoming', 'resource-loss'], ['send', 'ai-finale']]) {
    const { sound, played } = setup(); await sound.unlock();
    kinds.forEach(kind => sound.play(kind)); await tick();
    assert.equal(played.length, 1, kinds.join(' + '));
    assert.equal(played[0].time, 0);
    const expected = kinds.find(kind => ['story-win', 'story-loss', 'resource-loss', 'ai-finale'].includes(kind));
    assert.equal(played[0].buffer.getChannelData(0)[0], ['incoming', 'send', 'story-loss', 'resource-loss', 'ai-finale', 'story-win', 'padel'].indexOf(expected) / 32768);
  }
});
test('a result interrupts a lower-priority cue with a brief fade and no overlap or backlog', async () => {
  const audio = setup(), { sound, played } = audio; await sound.unlock();
  sound.play('send'); await tick(); audio.context.currentTime = .1;
  sound.play('story-loss'); await tick();
  assert.equal(played.length, 2);
  assert.ok(played[0].source.stopTime > .1 && played[0].source.stopTime <= .12);
  assert.ok(played[1].time >= played[0].source.stopTime);
  sound.play('incoming'); sound.play('send'); await tick();
  assert.equal(played.length, 2, 'lower-priority events are discarded, not queued');
  audio.context.currentTime = 2; await tick(); assert.equal(played.length, 2);
  sound.play('incoming'); await tick(); assert.equal(played.length, 3, 'new independent events still play');
});
test('rapid repeated arrivals do not stack; a new result replaces the old result', async () => {
  const audio = setup(), { sound, played } = audio; await sound.unlock();
  sound.play('incoming'); await tick(); sound.play('incoming'); await tick(); assert.equal(played.length, 1);
  sound.play('story-win'); await tick(); sound.play('resource-loss'); await tick();
  assert.equal(played.length, 3);
  assert.ok(played[2].time >= played[1].source.stopTime);
});
test('mute and navigation discard pending playback and stop active clips without replay', async () => {
  const { sound, played, store } = setup(); await sound.unlock();
  sound.play('incoming'); await tick(); sound.play('story-win'); sound.setEnabled(false); await tick();
  assert.equal(played.length, 1); assert.ok(played.every(item => item.source.stopped));
  assert.equal(store.get('mistakery.sound'), 'off');
  sound.setEnabled(true); await sound.unlock(); await tick(); assert.equal(played.length, 1);
  sound.play('send'); sound.stop(); await tick(); assert.equal(played.length, 1);
  sound.play('send'); await tick(); sound.stop(); assert.equal(played[1].source.stopped, true);
});
test('hidden tabs discard both pending and active cues', async () => {
  const { sound, played, document, listeners } = setup(); await sound.unlock();
  sound.play('incoming'); await tick(); sound.play('story-loss');
  document.hidden = true; listeners.visibilitychange(); sound.play('send'); await tick();
  assert.equal(played.length, 1); assert.equal(played[0].source.stopped, true);
  document.hidden = false; listeners.visibilitychange(); await tick(); assert.equal(played.length, 1);
});
test('first activation keeps only the main event, and cancellation during resume stays silent', async () => {
  const audio = setup({ delayedResume: true }); audio.sound.unlock();
  audio.sound.play('send'); audio.sound.play('story-win'); await tick();
  assert.equal(audio.played.length, 0); audio.finishResume(); await tick(); assert.equal(audio.played.length, 1);
  const cancelled = setup({ delayedResume: true }); cancelled.sound.unlock(); cancelled.sound.play('send'); cancelled.sound.stop();
  cancelled.finishResume(); await tick(); assert.equal(cancelled.played.length, 0);
});
test('slow activation discards stale feedback instead of playing it late', async () => {
  const audio = setup({ delayedResume: true }); audio.sound.unlock(); audio.sound.play('story-loss');
  audio.elapse(200); audio.finishResume(); await tick(); assert.equal(audio.played.length, 0);
  audio.sound.play('send'); await tick(); assert.equal(audio.played.length, 1);
});
test('muted preference, blocked storage and missing audio fail quietly', async () => {
  const muted = setup({ muted: true }); await muted.sound.unlock(); muted.sound.play('incoming'); await tick(); assert.equal(muted.played.length, 0);
  for (const options of [{ unsupported: true }, { storageBlocked: true }]) {
    const { sound } = setup(options); assert.doesNotThrow(() => { sound.unlock(); sound.play('send'); sound.setEnabled(false); });
  }
});
