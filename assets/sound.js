(function () {
  let enabled = true;
  try { enabled = window.localStorage.getItem('mistakery.sound') !== 'off'; } catch { /* Private browsing may deny storage. */ }
  let context, master;
  const buffers = new Map();
  const active = new Set();
  function stopAll() {
    for (const source of active) {
      try { source.stop(); } catch { /* An already finished source is harmless. */ }
      source.disconnect();
    }
    active.clear();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAll(); });
  function unlock() {
    if (!enabled) return Promise.resolve();
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return Promise.resolve();
        context = new Audio();
        master = context.createGain();
        master.connect(context.destination);
      }
      if (context.state === 'suspended') return context.resume().catch(() => {});
    } catch { /* Sound is optional; the game must remain playable. */ }
    return Promise.resolve();
  }
  function play(kind, delay = 0) {
    if (!enabled || document.hidden || context?.state !== 'running') return;
    try {
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
      const source = context.createBufferSource();
      source.buffer = buffers.get(kind);
      source.connect(master);
      source.onended = () => { active.delete(source); source.disconnect(); };
      active.add(source);
      source.start(context.currentTime + Math.max(0, delay));
    } catch { /* Unsupported or interrupted audio never blocks a choice. */ }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stopAll();
    if (master) master.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
    try { window.localStorage.setItem('mistakery.sound', enabled ? 'on' : 'off'); } catch { /* Keep the session preference. */ }
  }
  window.MistakerySound = { unlock, play, setEnabled, get enabled() { return enabled; } };
})();
