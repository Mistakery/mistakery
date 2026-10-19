(function () {
  const supported = typeof navigator.vibrate === 'function';
  const cues = { choice: { pattern: 8, duration: 8, priority: 1 },
    success: { pattern: [12, 55, 12], duration: 79, priority: 2 },
    failure: { pattern: 35, duration: 35, priority: 2 } };
  let enabled = true, pending = null, active = null, scheduled = false;
  try { enabled = window.localStorage.getItem('mistakery.haptics') !== 'off'; } catch { /* Session preference still works. */ }

  function stop() {
    pending = null;
    if (active && active.until > Date.now()) {
      try { navigator.vibrate(0); } catch { /* Vibration is optional. */ }
    }
    active = null;
  }
  function flush() {
    scheduled = false;
    const cue = pending; pending = null;
    if (!cue || !enabled || document.hidden) return;
    if (active?.until > Date.now() && cue.priority < active.priority) return;
    try {
      // A refused call is disposable: never retry on a later gesture or reveal.
      if (navigator.vibrate(cue.pattern)) active = { priority: cue.priority, until: Date.now() + cue.duration };
    } catch { /* Unsupported/blocked vibration must never interrupt gameplay. */ }
  }
  function play(kind) {
    const cue = Object.hasOwn(cues, kind) && cues[kind];
    if (!supported || !enabled || document.hidden || !cue) return;
    // Choose once after synchronous gameplay hooks have revealed their result.
    if (!pending || cue.priority >= pending.priority) pending = cue;
    if (!scheduled) { scheduled = true; Promise.resolve().then(flush); }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stop();
    try { window.localStorage.setItem('mistakery.haptics', enabled ? 'on' : 'off'); } catch { /* Keep the session preference. */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  window.MistakeryHaptics = { play, stop, setEnabled, supported, get enabled() { return enabled; } };
})();
