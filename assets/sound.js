(function () {
  let enabled = true;
  try { enabled = window.localStorage.getItem('mistakery.sound') !== 'off'; } catch { /* Private browsing may deny storage. */ }
  let context, master, resuming, pending, active;
  let flushScheduled = false, releaseUntil = 0;
  const buffers = new Map(), sources = new Set();
  const priorities = { send: 1, incoming: 2, padel: 2, 'story-loss': 3, 'story-win': 3, 'resource-loss': 3, 'ai-finale': 3 };
  const FADE_SECONDS = .01;

  function stopAll() {
    pending = active = null;
    releaseUntil = 0;
    for (const clip of sources) {
      try { clip.source.stop(); } catch { /* An already finished source is harmless. */ }
      clip.source.disconnect(); clip.gain.disconnect();
    }
    sources.clear();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  function unlock() {
    if (!enabled) return Promise.resolve();
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return Promise.resolve();
        context = new Audio();
        master = context.createGain(); master.connect(context.destination);
      }
      if (context.state === 'suspended' && !resuming) {
        resuming = context.resume().catch(() => {}).then(() => {
          resuming = null;
          flush();
        });
      }
      return resuming || Promise.resolve();
    } catch { /* Sound is optional; the game must remain playable. */ }
    return Promise.resolve();
  }
  function bufferFor(kind) {
    if (!buffers.has(kind)) {
      const sample = window.MISTAKERY_SOUND_SAMPLES?.[kind];
      if (!sample) return;
      const pcm = atob(sample.pcm);
      const buffer = context.createBuffer(1, pcm.length / 2, sample.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < channel.length; i++) {
        const value = pcm.charCodeAt(i * 2) | pcm.charCodeAt(i * 2 + 1) << 8;
        channel[i] = (value >= 32768 ? value - 65536 : value) / 32768;
      }
      buffers.set(kind, buffer);
    }
    return buffers.get(kind);
  }
  function flush() {
    flushScheduled = false;
    if (!enabled || document.hidden || context?.state !== 'running') {
      if (!resuming || !enabled || document.hidden) pending = null;
      return;
    }
    if (!pending) return;
    const event = pending; pending = null;
    if (Date.now() > event.expires) return;
    try {
      const now = context.currentTime;
      if (active?.end <= now) active = null;
      // UI feedback is disposable: never queue it behind a more important cue.
      if (active && (event.priority < active.priority
        || event.kind === active.kind && event.priority === 2)) return;
      const buffer = bufferFor(event.kind);
      if (!buffer) return;
      let start = Math.max(now, releaseUntil);
      if (active) {
        if (active.start > now) {
          active.source.stop(); active.source.disconnect(); active.gain.disconnect(); sources.delete(active);
        } else {
          releaseUntil = now + FADE_SECONDS;
          active.gain.gain.setValueAtTime(1, now);
          active.gain.gain.linearRampToValueAtTime(0, releaseUntil);
          active.source.stop(releaseUntil);
          start = Math.max(start, releaseUntil);
        }
      }
      const source = context.createBufferSource(), gain = context.createGain();
      source.buffer = buffer; source.connect(gain); gain.connect(master);
      const clip = { source, gain, kind: event.kind, priority: event.priority, start, end: start + buffer.duration };
      source.onended = () => {
        sources.delete(clip); source.disconnect(); gain.disconnect();
        if (active === clip) active = null;
      };
      active = clip; sources.add(clip); source.start(start);
    } catch { /* Unsupported or interrupted audio never blocks a choice. */ }
  }
  function play(kind) {
    const priority = priorities[kind];
    if (!enabled || document.hidden || !context || typeof priority !== 'number'
      || context.state !== 'running' && !resuming) return;
    // Coalesce synchronous hooks into one semantic transition, before starting audio.
    if (!pending || priority >= pending.priority) pending = { kind, priority, expires: Date.now() + 150 };
    if (!flushScheduled) { flushScheduled = true; Promise.resolve().then(flush); }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stopAll();
    if (master) master.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
    try { window.localStorage.setItem('mistakery.sound', enabled ? 'on' : 'off'); } catch { /* Keep the session preference. */ }
  }
  window.MistakerySound = { unlock, play, stop: stopAll, setEnabled, get enabled() { return enabled; } };
})();
