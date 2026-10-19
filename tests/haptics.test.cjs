const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const tick = () => new Promise(resolve => setImmediate(resolve));

function setup({ off = false, missing = false, throws = false, refused = false, storageFails = false } = {}) {
  const calls = [], store = new Map(off ? [['mistakery.haptics', 'off']] : []), listeners = {};
  let now = 1000;
  const document = { hidden: false, addEventListener: (name, fn) => { listeners[name] = fn; } };
  const navigator = missing ? {} : { vibrate(pattern) { calls.push(pattern); if (throws) throw Error('Denied'); return !refused; } };
  const window = { navigator, localStorage: {
    getItem(key) { if (storageFails) throw Error('Denied'); return store.get(key); },
    setItem(key, value) { if (storageFails) throw Error('Denied'); store.set(key, value); },
  }, addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/haptics.js'), 'utf8'), { window, navigator, document, Date: { now: () => now } });
  return { haptics: window.MistakeryHaptics, calls, store, document, listeners, elapse(ms) { now += ms; } };
}
test('three modest patterns; unrelated UI kinds are ignored', async () => {
  const a = setup();
  for (const kind of ['choice', 'success', 'failure']) { a.haptics.play(kind); await tick(); a.elapse(100); }
  a.haptics.play('incoming'); await tick();
  assert.deepEqual(JSON.parse(JSON.stringify(a.calls)), [8, [12, 55, 12], 35]);
});
test('a simultaneous outcome replaces choice in either order; active outcome rejects choice', async () => {
  for (const order of [['choice', 'success'], ['success', 'choice'], ['choice', 'failure']]) {
    const a = setup(); order.forEach(kind => a.haptics.play(kind)); await tick();
    assert.equal(a.calls.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(a.calls[0])), order.includes('success') ? [12, 55, 12] : 35);
    a.haptics.play('choice'); await tick(); assert.equal(a.calls.length, 1);
    a.elapse(100); a.haptics.play('choice'); await tick(); assert.equal(a.calls.at(-1), 8);
  }
});
test('independent saved preference, no sample on enable and no delayed replay', async () => {
  const a = setup({ off: true }); assert.equal(a.haptics.enabled, false);
  a.haptics.play('success'); await tick(); assert.deepEqual(a.calls, []);
  a.haptics.setEnabled(true); await tick(); assert.deepEqual(a.calls, []);
  assert.equal(a.store.get('mistakery.haptics'), 'on');
  assert.equal(a.store.has('mistakery.sound'), false);
  a.haptics.play('choice'); a.haptics.setEnabled(false); await tick(); assert.deepEqual(a.calls, []);
  assert.equal(a.store.get('mistakery.haptics'), 'off');
});
test('hide, pagehide, disable and stop cancel active or pending cues without replay', async () => {
  for (const cancel of ['stop', 'hidden', 'pagehide', 'disable']) {
    const a = setup(); a.haptics.play('success'); await tick();
    a.haptics.play('failure');
    if (cancel === 'hidden') { a.document.hidden = true; a.listeners.visibilitychange(); }
    else if (cancel === 'pagehide') a.listeners.pagehide();
    else if (cancel === 'disable') a.haptics.setEnabled(false);
    else a.haptics.stop();
    await tick(); assert.equal(a.calls.length, 2); assert.equal(a.calls[1], 0);
    a.document.hidden = false; a.haptics.setEnabled(true); await tick(); assert.equal(a.calls.length, 2);
  }
});
test('hidden calls and calls hidden before flush are discarded', async () => {
  const a = setup(); a.haptics.play('choice'); a.document.hidden = true; await tick();
  a.haptics.play('failure'); await tick(); a.document.hidden = false; await tick(); assert.deepEqual(a.calls, []);
});
test('missing, throwing or refused API and unavailable storage never block gameplay or queue retries', async () => {
  for (const options of [{ missing: true }, { throws: true }, { refused: true }, { storageFails: true }]) {
    const a = setup(options); assert.equal(a.haptics.supported, !options.missing);
    assert.doesNotThrow(() => { a.haptics.play('success'); }); await tick();
    a.haptics.stop(); a.haptics.setEnabled(false); a.haptics.setEnabled(true); await tick();
    assert.equal(a.calls.length, options.missing ? 0 : options.storageFails ? 2 : 1);
  }
});
