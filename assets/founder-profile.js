(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MistakeryFounderProfile = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  const plots = ['live_agent', 'influencer', 'padel'];

  function classify(deck, history) {
    const cards = new Map(deck.cards.map(card => [card.id, card]));
    const core = history.filter(step => plots.includes(cards.get(step.cardId)?.plot) && !cards.get(step.cardId).outcomeTone);
    if (core.some(step => !['left', 'right'].includes(step.side))) return null;
    const decisions = new Map(core.map(step => [step.cardId, step]));
    const ai = decisions.get('LIVE_AGENT_08') || decisions.get('LIVE_AGENT_07B');
    let influencer = null;
    core.forEach((step, index) => {
      if (!['INFLUENCER_05', 'INFLUENCER_06'].includes(step.cardId)) return;
      const card = cards.get(step.cardId), previous = core[index - 1]?.cardId;
      const choices = card.contextualChoices && previous !== 'INFLUENCER_04' ? card.contextualChoices[previous] : card.choices;
      const next = choices?.[step.side]?.next;
      if (['INFLUENCER_07', 'INFLUENCER_08'].includes(next)) influencer = next === 'INFLUENCER_07';
    });
    const court = ['IRL_PADEL_04', 'IRL_PADEL_05', 'IRL_PADEL_06'].map(id => decisions.get(id));
    if (!ai || influencer === null || court.some(step => !step)) return null;
    // Final AI retreat supersedes the promise; 07B right is a boundary with the client.
    const votes = [ai.cardId === 'LIVE_AGENT_08' && ai.side === 'left', influencer,
      court.filter(step => step.side === 'left').length >= 2];
    return ['hard', 'own', 'flex', 'yes'][votes.filter(Boolean).length];
  }

  function reward(deck, state) {
    // The route settles resources before run_complete. A third success followed by
    // resource defeat must never become a profile reward, even with three win IDs.
    if (!state?.gameOver || state.endingId !== 'run_complete') return null;
    if (!plots.every(plot => state.route?.completed.includes(plot))) return null;
    const cards = new Map(deck.cards.map(card => [card.id, card]));
    const results = new Map(state.history.map(step => cards.get(step.cardId))
      .filter(card => plots.includes(card?.plot) && card.outcomeTone).map(card => [card.plot, card.outcomeTone]));
    if (!plots.every(plot => results.get(plot) === 'success')) return null;
    const type = classify(deck, state.history);
    return type ? { type, ...deck.meta.founderProfile.types[type] } : null;
  }
  return { classify, reward };
});
