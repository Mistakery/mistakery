(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MistakeryAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const KEY = 'mistakery.analytics';
  const OPT_OUT = 'mistakery.analytics.opt-out';
  const noop = () => {};
  const off = () => ({ open: noop, tap: noop, start: noop, restore: noop, resume: noop, choice: noop });
  const shortId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
  const count = value => Number.isSafeInteger(value) && value >= 0;

  function create({ config = {}, url = '', storage, send, id, now = () => new Date(), disabled = false, doNotTrack = false } = {}) {
    // No IDs, storage access or requests in previews, QA, or before configuration.
    if (disabled || doNotTrack || config?.enabled !== true || !/^phc_[a-zA-Z0-9_-]{8,200}$/.test(config.projectKey || '')) return off();
    let page, host;
    try { page = new URL(url); host = new URL(config.apiHost).origin; } catch { return off(); }
    if (!['https://eu.i.posthog.com', 'https://us.i.posthog.com'].includes(host)
      || page.protocol !== 'https:' || !(page.hostname.endsWith('.itch.zone')
        || Array.isArray(config.allowedOrigins) && config.allowedOrigins.includes(page.origin))) return off();
    if (typeof send !== 'function' || typeof id !== 'function') return off();
    let target, record;
    try {
      target = storage();
      if (target.getItem(OPT_OUT) === '1') return off();
      const raw = target.getItem(KEY);
      if (raw && raw.length < 20000) {
        const data = JSON.parse(raw);
        if (data?.version === 1 && shortId(data.playerId) && count(data.attempts) && typeof data.ceoRecorded === 'boolean'
          && Array.isArray(data.runs) && data.runs.length <= 16 && data.runs.every(run => shortId(run.id)
            && count(run.number) && count(run.lastTurn) && typeof run.started === 'boolean')) record = data;
      }
    } catch { /* Analytics storage never affects the game save. */ }
    try {
      if (!record) record = { version: 1, playerId: id(), attempts: 0, ceoRecorded: false, runs: [] };
      const sessionId = id();
      const persist = () => { try { target?.setItem(KEY, JSON.stringify(record)); } catch {} };
      const emit = (event, properties = {}, run = null) => {
        const payload = { api_key: config.projectKey, event, distinct_id: record.playerId, uuid: id(), timestamp: now().toISOString(),
          properties: { $process_person_profile: false, $geoip_disable: true, $lib: 'mistakery',
            game_build: String(config.build || 'unversioned').slice(0, 80), session_id: sessionId,
            ...(run ? { run_id: run.id, attempt_number: run.number } : {}), ...properties } };
        // No retries or awaited requests in the gameplay path. Offline events may be lost.
        try { Promise.resolve(send(`${host}/i/v0/e/`, payload)).catch(noop); } catch {}
      };
      const ensureRun = (runId, baseline = 0) => {
        if (!shortId(runId)) return null;
        let run = record.runs.find(item => item.id === runId);
        if (!run) {
          run = { id: runId, number: ++record.attempts, lastTurn: baseline, started: false };
          record.runs.push(run); record.runs = record.runs.slice(-16);
        }
        return run;
      };
      const guard = action => (...args) => { try { action(...args); } catch {} };
      persist();
      return {
        open: guard(hasSave => emit('game_opened', { has_save: Boolean(hasSave) })),
        tap: guard(() => emit('game_started')),
        restore: guard((runId, state) => {
          const run = ensureRun(runId, state.history.length);
          if (run) { run.lastTurn = Math.max(run.lastTurn, state.history.length); persist(); }
        }),
        start: guard((runId, state, source) => {
          const run = ensureRun(runId);
          if (!run || run.started) return;
          run.started = true; persist();
          if (source === 'intro') emit('intro_completed', {}, run);
          emit('run_started', { source, card_id: state.currentCardId }, run);
        }),
        resume: guard((runId, state) => {
          const run = ensureRun(runId, state.history.length); if (!run) return;
          run.lastTurn = Math.max(run.lastTurn, state.history.length); persist();
          emit('run_resumed', { turn: state.history.length, card_id: state.currentCardId }, run);
        }),
        choice: guard((runId, { card, side, state, before, after, ceoType, terminalCard }) => {
          const run = ensureRun(runId, state.history.length - 1);
          if (!run || state.history.length <= run.lastTurn || !['left', 'right'].includes(side)) return;
          run.lastTurn = state.history.length;
          const unlocked = ceoType && !record.ceoRecorded && Object.keys(before.wins).length < 3 && Object.keys(after.wins).length === 3;
          if (unlocked) record.ceoRecorded = true;
          persist();
          emit('choice_made', { card_id: card.id, story: card.plot || null, side, turn: run.lastTurn,
            next_card_id: state.gameOver ? null : state.currentCardId }, run);
          // Judgment Day ends on entry and has no outcome acknowledgement.
          const outcome = card.outcomeTone ? card : terminalCard;
          if (outcome?.plot && outcome.outcomeTone) emit('story_completed', { story: outcome.plot, outcome: outcome.outcomeTone,
            first_win: !before.wins[outcome.plot] && Boolean(after.wins[outcome.plot]), turn: run.lastTurn }, run);
          if (state.gameOver) emit('run_ended', { ending: state.endingId, turn: run.lastTurn, stories_completed: state.route.completed.length }, run);
          if (unlocked) emit('ceo_unlocked', { ceo_type: ceoType, turn: run.lastTurn }, run);
        }),
      };
    } catch { return off(); }
  }
  return { KEY, create };
});
