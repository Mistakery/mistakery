(function () {
  let enabled = true;
  try { enabled = window.localStorage.getItem('mistakery.sound') !== 'off'; } catch { /* Private browsing may deny storage. */ }
  let context, master;
  const cues = {
    // Familiar messenger vocabulary: a bubble pop, an ascending ding-ding,
    // and a lower descending warning. Fixed pitches; no random bleeps.
    click: [[900, 220, .045, .028, 0]],
    message: [[880, 880, .095, .023, 0], [1174.66, 1174.66, .15, .023, .105]],
    alert: [[659.25, 659.25, .12, .025, 0], [523.25, 523.25, .17, .025, .14]],
  };
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
  function play(kind) {
    if (!enabled || document.hidden || context?.state !== 'running') return;
    try {
      for (const [from, to, duration, volume, delay] of cues[kind] || []) {
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(from, start);
        oscillator.frequency.exponentialRampToValueAtTime(to, start + duration);
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.exponentialRampToValueAtTime(volume, start + .005);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(envelope); envelope.connect(master);
        oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
        oscillator.start(start); oscillator.stop(start + duration + .01);
      }
    } catch { /* Unsupported or interrupted audio never blocks a choice. */ }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (master) master.gain.setValueAtTime(enabled ? 1 : 0, context.currentTime);
    try { window.localStorage.setItem('mistakery.sound', enabled ? 'on' : 'off'); } catch { /* Keep the session preference. */ }
  }
  window.MistakerySound = { unlock, play, setEnabled, get enabled() { return enabled; } };
})();
