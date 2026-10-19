(function (root, factory) {
  const profile = typeof module === 'object' && module.exports ? require('./founder-profile.js') : root.MistakeryFounderProfile;
  const api = factory(profile);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MistakerySave = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (profile) {
  const KEY = 'mistakery.browser-save';
  const SCHEMA = 2;
  // Bump only for incompatible route/accounting/card-ID/classifier changes.
  const RULES = 'finite-route-1';
  const LIMIT = 512 * 1024;
  const keys = ['cash', 'team', 'customers', 'founder'];
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
  const strings = value => Array.isArray(value) && value.length <= 512 && value.every(item => typeof item === 'string' && item.length <= 200);
  const resources = value => object(value) && keys.every(key => Number.isFinite(value[key]));

  function valid(data, deck) {
    if (!object(data) || typeof data.runId !== 'string' || data.runId.length > 200
      || !integer(data.revision, 1) || !integer(data.savedAt) || data.introCompleted !== true) return false;
    const s = data.state, p = data.presentation;
    if (!object(s) || !object(s.route) || !object(p)) return false;
    const r = s.route, cards = new Map(deck.cards.map(card => [card.id, card]));
    const card = cards.get(s.currentCardId), plots = Object.keys(deck.meta.route.plots);
    const activeId = id => Boolean(cards.get(id)?.plot || cards.get(id)?.filler);
    const gap = value => object(value) && [4, 5].includes(value.target) && strings(value.played)
      && value.played.every(id => cards.get(id)?.filler) && (value.usedUnit === null || typeof value.usedUnit === 'string');
    if (!card || !activeId(card.id) || !integer(s.turn, 1, 513)
      || !(typeof s.seed === 'string' && s.seed.length <= 200 || Number.isFinite(s.seed))
      || !resources(s.resources) || keys.some(key => s.resources[key] < 0 || s.resources[key] > 100)
      || !resources(s.schedulerResources) || !strings(s.flags) || !strings(s.shown)
      || !s.shown.every(activeId) || !strings(s.fillerCards) || !s.fillerCards.every(id => cards.get(id)?.filler)
      || !Array.isArray(s.history) || s.history.length > 512 || s.turn !== s.history.length + 1
      || typeof s.gameOver !== 'boolean' || typeof s.win !== 'boolean'
      || (s.gameOver ? s.endingId !== 'run_complete' && !Object.hasOwn(deck.endings, s.endingId) : s.endingId !== null)) return false;
    if (!s.history.every((step, index) => object(step) && activeId(step.cardId)
      && ['left', 'right'].includes(step.side) && step.turn === index + 1
      && ['deltas', 'resourcesBefore', 'resourcesAfter', 'rawBefore', 'rawAfter'].every(key => resources(step[key])))) return false;
    for (const key of ['delayed', 'reservations', 'schedulerLocks', 'queuedCardIds']) {
      // The finite route never schedules legacy-engine continuations.
      if (!Array.isArray(s[key]) || s[key].length) return false;
    }
    if (!['queuedCardId', 'queuedPoolMode', 'queuedBoundary', 'pendingContinuation', 'activeCrisisId', 'postCrisisOutcome']
      .every(key => s[key] === null) || s.queuedPool !== false || s.pressureCount !== 0 || s.rescueAttempts !== 0) return false;
    if (card.contextualChoices && r.influencerPreviousCardId !== 'INFLUENCER_04'
      && !Object.hasOwn(card.contextualChoices, r.influencerPreviousCardId)) return false;
    if (!strings(r.order) || r.order.length !== 3 || new Set(r.order).size !== 3 || !r.order.every(id => plots.includes(id))
      || !strings(r.completed) || new Set(r.completed).size !== r.completed.length || !r.completed.every(id => plots.includes(id))
      || !plots.includes(r.initialPlot) || r.cycle !== 1 || r.cycleStart !== 0
      || !integer(r.randomState, 0, 4294967295) || !['plot', 'fillers', 'ended'].includes(r.phase)
      || (s.gameOver !== (r.phase === 'ended')) || (r.resourceLedger !== null && !resources(r.resourceLedger))
      || !integer(r.liveAgentScore, -5, 5) || !integer(r.padelCeoScore, -10, 10)
      || (r.influencerPreviousCardId !== null && cards.get(r.influencerPreviousCardId)?.plot !== 'influencer')
      || !['usedUnits', 'recentAuthors', 'recentThemes', 'recentFillerUnits'].every(key => strings(r[key]))
      || !Array.isArray(r.gaps) || r.gaps.length > 2 || !r.gaps.every(gap)
      || (r.gap !== null && !gap(r.gap)) || (r.phase === 'fillers' && !r.gap)) return false;
    if (s.gameOver && (!object(r.ending) || !strings(r.ending.causes)
      || !r.ending.causes.every(id => deck.meta.route.resourceEndings.includes(id)) || !resources(r.ending.rawResources))) return false;
    if (typeof p.profileRevealed !== 'boolean' || typeof p.summaryShown !== 'boolean'
      || ![null, 'left', 'right'].includes(p.lossSide)) return false;
    if (!profile.validProgress(deck, data.progress)) return false;
    const reward = profile.earnedReward(deck, data.progress);
    if (p.profileRevealed && !reward || p.summaryShown && (!s.gameOver || s.endingId === 'run_complete')
      || p.lossSide !== null && (!s.gameOver || !deck.meta.route.resourceEndings.includes(s.endingId) || p.summaryShown)) return false;
    if (p.winCardId !== null) {
      const win = cards.get(p.winCardId);
      if (!win?.winFeedback || win.outcomeTone !== 'success' || s.history.at(-1)?.cardId !== win.id
        || !r.completed.includes(win.plot) || s.gameOver && s.endingId !== 'run_complete'
        || p.profileRevealed || p.summaryShown || p.lossSide !== null) return false;
    }
    return true;
  }

  function create({ storage, deck, disabled = false }) {
    let expected, loaded = false, protectedSave = false, record = null;
    function load() {
      if (disabled) return { status: 'disabled' };
      try {
        expected = storage().getItem(KEY);
        loaded = true; record = null; protectedSave = false;
        if (expected === null) return { status: 'empty' };
        protectedSave = true;
        if (expected.length > LIMIT) return { status: 'invalid' };
        const data = JSON.parse(expected);
        if (object(data) && (![1, SCHEMA].includes(data.schemaVersion) || data.rulesVersion !== RULES)) return { status: 'incompatible' };
        if (data.schemaVersion === 1) {
          data.progress = profile.collectWins(deck, profile.emptyProgress(), data.state);
          const earned = profile.earnedReward(deck, data.progress);
          data.progress.revealed = Boolean(earned && data.presentation.profileRevealed);
          data.presentation.profileRevealed = data.progress.revealed;
          if (data.state.endingId === 'run_complete') data.presentation.summaryShown = false;
          const pending = deck.cards.find(card => card.id === data.presentation.winCardId);
          if (pending && pending.outcomeTone !== 'success') data.presentation.winCardId = null;
          data.schemaVersion = SCHEMA;
        }
        if (!valid(data, deck)) return { status: 'invalid' };
        record = data; protectedSave = false;
        return { status: 'saved', data };
      } catch { return { status: loaded ? 'invalid' : 'unavailable' }; }
    }
    function write(checkpoint, { replace = false } = {}) {
      if (disabled) return { status: 'disabled' };
      if (!loaded && load().status === 'unavailable') return { status: 'unavailable' };
      if (protectedSave && !replace) return { status: 'protected' };
      try {
        const target = storage();
        if (target.getItem(KEY) !== expected) return { status: 'conflict' };
        const supplied = checkpoint.progress || profile.emptyProgress();
        if (!profile.validProgress(deck, supplied)) return { status: 'invalid' };
        // Existing first victories take precedence, even when replacing the current run.
        const prior = record?.progress || profile.emptyProgress();
        const progress = profile.collectWins(deck, {
          wins: { ...supplied.wins, ...prior.wins }, revealed: supplied.revealed || prior.revealed,
        }, checkpoint.state);
        if (checkpoint.presentation.profileRevealed && profile.earnedReward(deck, progress)) progress.revealed = true;
        const data = { schemaVersion: SCHEMA, rulesVersion: RULES,
          runId: !replace && record ? record.runId : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          revision: (record?.revision || 0) + 1, savedAt: Date.now(), introCompleted: true,
          state: checkpoint.state, presentation: checkpoint.presentation, progress };
        if (!valid(data, deck)) return { status: 'invalid' };
        const json = JSON.stringify(data);
        if (json.length > LIMIT) return { status: 'invalid' };
        // One replacement: never remove the previous checkpoint before writing.
        target.setItem(KEY, json);
        expected = json; record = data; protectedSave = false;
        return { status: 'saved', runId: data.runId, progress: structuredClone(progress) };
      } catch { return { status: 'unavailable' }; }
    }
    return { load, write };
  }
  return { KEY, create };
});
