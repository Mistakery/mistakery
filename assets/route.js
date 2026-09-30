(function initRoute(root, factory) {
  const engine = typeof module === 'object' && module.exports ? require('../game.js') : root.MistakeryEngine;
  const api = factory(engine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MistakeryRoute = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createRoute(engine) {
  const cardById = engine.cardById;
  function hashSeed(seed) {
    let hash = 2166136261;
    for (const char of String(seed)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return hash >>> 0;
  }
  function random(state) {
    // Save the generator position in the snapshot: Back replays the same draw.
    let value = state.route.randomState = (state.route.randomState + 0x6D2B79F5) >>> 0;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  }
  function startRun(deck, options = {}) {
    const seed = options.seed ?? Date.now();
    const state = engine.startRun(deck, { seed });
    state.seed = seed;
    state.flags = ['assistant_available'];
    state.route = {
      phase: 'plot', cycle: 1, cycleStart: 0, lastCycle: null, order: Object.keys(deck.meta.route.plots), completed: [],
      randomState: hashSeed(seed), usedUnits: [], gap: null, gaps: [],
      recentAuthors: [], recentThemes: [], liveAgentScore: 0, padelCeoScore: 0,
      influencerPreviousCardId: null,
    };
    for (let i = state.route.order.length - 1; i > 0; i--) {
      const j = Math.floor(random(state) * (i + 1));
      [state.route.order[i], state.route.order[j]] = [state.route.order[j], state.route.order[i]];
    }
    if (options.order) {
      if (options.order.length !== 3 || new Set(options.order).size !== 3
        || options.order.some(plot => !deck.meta.route.plots[plot])) throw new Error('Invalid plot order');
      state.route.order = [...options.order];
    }
    if (options.firstPlot) {
      if (!deck.meta.route.plots[options.firstPlot]) throw new Error('Unknown first plot');
      state.route.order = [options.firstPlot, ...state.route.order.filter(plot => plot !== options.firstPlot)];
    }
    openPlot(deck, state);
    return state;
  }
  function openPlot(deck, state) {
    const plot = state.route.order.find(id => !state.route.completed.includes(id));
    state.route.phase = 'plot';
    state.route.gap = null;
    state.route.liveAgentScore = 0;
    state.route.padelCeoScore = 0;
    state.route.influencerPreviousCardId = null;
    state.activeArc = plot;
    state.currentCardId = deck.meta.route.plots[plot];
  }
  function eligible(card, state) {
    return (card.requires || []).every(flag => state.flags.includes(flag))
      && (card.excludes || []).every(flag => !state.flags.includes(flag))
      && !state.shown.includes(card.id);
  }
  function authors(card) {
    return [...new Set(card.mode === 'team' ? card.messages.filter(m => m.source).map(m => m.source) : [card.source])];
  }
  function worstCost(deck, card, seen = []) {
    if (seen.includes(card.id)) throw new Error(`Cyclic filler: ${card.id}`);
    const costs = Object.values(card.choices).map(choice => {
      const next = choice.next && cardById(deck, choice.next);
      const rest = next?.filler ? worstCost(deck, next, [...seen, card.id]) : {};
      return Object.fromEntries(engine.RESOURCE_KEYS.map(key => [key,
        Math.max(0, -(Number(choice.effects?.[key] || 0) + (key === 'cash' ? deck.meta.baseCashBurn : 0))) + (rest[key] || 0),
      ]));
    });
    return Object.fromEntries(engine.RESOURCE_KEYS.map(key => [key, Math.max(...costs.map(cost => cost[key]))]));
  }
  function fillerPool(deck, state, role) {
    const route = state.route;
    const nextPlot = route.order.find(plot => !route.completed.includes(plot));
    return deck.cards.filter(card => card.filler && card.filler.role !== 'followup'
      && (!role || card.filler.role === role)
      && !route.usedUnits.includes(card.filler.unit) && eligible(card, state))
      .map(card => {
        const costs = worstCost(deck, card);
        const pressure = engine.RESOURCE_KEYS.reduce((sum, key) => sum + costs[key] / Math.max(3, state.resources[key]), 0);
        const authorVariety = authors(card).some(author => route.recentAuthors.includes(author)) ? .25 : 1;
        const themeVariety = route.recentThemes.includes(card.filler.theme) ? .45 : 1;
        const finalSingle = role === 'single' && route.gap?.played.length === route.gap.target - 1;
        const affinity = finalSingle && card.filler.affinity?.includes(nextPlot) ? 1.8 : 1;
        return { card, weight: (card.weight || 1) * authorVariety * themeVariety * affinity / (1 + pressure * pressure * 3) };
      });
  }
  function pickFiller(deck, state, role) {
    const pool = fillerPool(deck, state, role);
    if (!pool.length) throw new Error(`No eligible ${role} filler for seed ${state.seed}`);
    let draw = random(state) * pool.reduce((sum, entry) => sum + entry.weight, 0);
    const selected = pool.find(entry => (draw -= entry.weight) <= 0)?.card || pool.at(-1).card;
    state.route.usedUnits.push(selected.filler.unit);
    if (role === 'entry') state.route.gap.usedUnit = selected.filler.unit;
    state.currentCardId = selected.id;
  }
  function beginGap(deck, state) {
    state.route.phase = 'fillers';
    state.activeArc = null;
    const targets = deck.meta.route.fillerTargets;
    state.route.gap = { target: targets[Math.floor(random(state) * targets.length)], played: [], usedUnit: null };
    // A link comes first, so the remaining slots are guaranteed to be singles.
    // If future content gates all links, preserve pacing using only legal singles.
    pickFiller(deck, state, fillerPool(deck, state, 'entry').length ? 'entry' : 'single');
  }
  function beginCycle(deck, state) {
    const route = state.route;
    const previousPlot = route.completed.at(-1);
    route.lastCycle = { order: [...route.order], completed: [...route.completed],
      gaps: structuredClone(route.gaps), fillers: [...state.fillerCards] };
    route.cycle += 1;
    route.cycleStart = state.history.length;
    route.order = Object.keys(deck.meta.route.plots);
    for (let i = route.order.length - 1; i > 0; i--) {
      const j = Math.floor(random(state) * (i + 1));
      [route.order[i], route.order[j]] = [route.order[j], route.order[i]];
    }
    // Don't reopen the plot the player has just finished at the cycle seam.
    if (route.order[0] === previousPlot) {
      const j = 1 + Math.floor(random(state) * (route.order.length - 1));
      [route.order[0], route.order[j]] = [route.order[j], route.order[0]];
    }
    route.completed = [];
    route.usedUnits = [];
    route.gaps = [];
    state.shown = [];
    state.fillerCards = [];
    openPlot(deck, state);
  }
  function choicesFor(card, state) {
    if (!card.contextualChoices) return card.choices;
    const previous = state.route.influencerPreviousCardId;
    if (previous === 'INFLUENCER_04') return card.choices;
    const choices = card.contextualChoices[previous];
    if (!choices) throw new Error(`Invalid Influencer context: ${card.id} after ${previous}`);
    return choices;
  }
  function choiceTargets(deck, state, card, side) {
    const choice = choicesFor(card, state)[side];
    if (choice.outcomeRoll) return [choice.outcomeRoll.win, choice.outcomeRoll.lose];
    if (card.id === 'INFLUENCER_07') return ['INFLUENCER_OUTCOME_2', 'INFLUENCER_OUTCOME_3'];
    if (card.id === 'INFLUENCER_08') return (side === 'left' ? [4, 5] : [6, 7]).map(n => `INFLUENCER_OUTCOME_${n}`);
    if (card.id === 'IRL_PADEL_06') return (side === 'left' ? [3, 4] : [1, 2, 5, 6]).map(n => `PADEL_OUTCOME_${n}`);
    if (card.id === 'IRL_PADEL_05' && state.route.padelCeoScore + choice.ceoScore === 4) return ['PADEL_OUTCOME_7'];
    return choice.next ? [choice.next] : [];
  }
  function selectTarget(deck, state, card, side, rng) {
    const choice = choicesFor(card, state)[side];
    if (choice.outcomeRoll) {
      const score = state.route.liveAgentScore;
      if (!Number.isInteger(score) || Math.abs(score) > 5 || (score + 5) % 2 !== 0) throw new Error(`Invalid bot score: ${score}`);
      const roll = choice.outcomeRoll;
      const count = roll.count === 'support' ? (5 + score) / 2 : (5 - score) / 2;
      return rng() < roll.chances[count] ? roll.win : roll.lose;
    }
    const targets = choiceTargets(deck, state, card, side);
    if (card.id === 'INFLUENCER_07' || card.id === 'INFLUENCER_08') return targets[rng() < .4 ? 0 : 1];
    if (card.id === 'IRL_PADEL_06') {
      const score = state.route.padelCeoScore;
      if (![-2, 0, 2].includes(score)) throw new Error(`Invalid Padel score: ${score}`);
      const threshold = score === 0 ? .5 : .6;
      if (side === 'left') return rng() < threshold ? 'PADEL_OUTCOME_3' : 'PADEL_OUTCOME_4';
      const won = rng() < .5;
      const roll = rng();
      if (won) return roll < threshold ? 'PADEL_OUTCOME_1' : 'PADEL_OUTCOME_2';
      return roll < (score === 0 ? .5 : .4) ? 'PADEL_OUTCOME_5' : 'PADEL_OUTCOME_6';
    }
    return targets[0] || null;
  }
  function enterFacts(state, card) {
    state.flags = [...new Set([...state.flags.filter(flag => !(card.clearEnterFlags || []).includes(flag)), ...(card.enterFlags || [])])];
  }
  function resolveChoice(deck, current, side, options = {}) {
    if (current.gameOver) return { state: structuredClone(current), deltas: Object.fromEntries(engine.RESOURCE_KEYS.map(key => [key, 0])) };
    // Engine.cloneState predates route state. Clone the complete snapshot here.
    let state = structuredClone(current);
    const card = cardById(deck, state.currentCardId);
    if (!card || (!card.plot && !card.filler)) throw new Error(`Inactive route card ${state.currentCardId}`);
    const choice = choicesFor(card, state)[side];
    if (!choice) throw new Error(`Missing choice ${side} on ${card.id}`);
    const next = selectTarget(deck, state, card, side, options.outcomeRng || (() => random(state)));
    const target = next && cardById(deck, next);
    const effects = { ...choice.effects };
    if (target?.outcomeTone) for (const key of engine.RESOURCE_KEYS) {
      effects[key] = target.resetResources === 0 ? -state.resources[key]
        : (effects[key] || 0) + (target.outcomeEffects?.[key] || 0);
    }
    // A self transition lets the existing engine account for one decision only.
    // The route owns every subsequent transition; legacy fallback/pools cannot fire.
    const resolved = { ...card, continuation: 'forced', choices: { ...card.choices,
      [side]: { ...choice, effects, next: card.id, ending: undefined, paid: undefined, crisis: undefined },
    } };
    const scoped = { ...deck, crises: {}, meta: { ...deck.meta, maxTurns: Number.MAX_SAFE_INTEGER },
      cards: deck.cards.map(c => c.id === card.id ? resolved : c) };
    const result = engine.resolveChoice(scoped, state, side, { rng: () => 0 });
    state = result.state;
    state.route.liveAgentScore += Number(choice.botScore || 0);
    state.route.padelCeoScore += Number(choice.ceoScore || 0);
    state.route.influencerPreviousCardId = card.plot === 'influencer' ? card.id : null;
    if (card.filler) {
      const gap = state.route.gap;
      if (!gap) throw new Error('Filler outside a gap');
      gap.played.push(card.id);
      state.fillerCards.push(card.id);
      state.route.recentAuthors = [...state.route.recentAuthors, ...authors(card)].slice(-2);
      state.route.recentThemes = [...state.route.recentThemes, card.filler.theme].slice(-2);
      if (next) {
        if (target?.filler?.role !== 'followup' || target.filler.unit !== card.filler.unit || !eligible(target, state)) {
          throw new Error(`Illegal filler continuation ${card.id} → ${next}`);
        }
        state.currentCardId = next;
      } else if (gap.played.length >= gap.target) {
        state.route.gaps.push(structuredClone(gap));
        openPlot(deck, state);
      } else pickFiller(deck, state, 'single');
    } else if (card.outcomeTone) {
      if (!state.route.completed.includes(card.plot)) state.route.completed.push(card.plot);
      state.route.liveAgentScore = 0;
      state.route.padelCeoScore = 0;
      state.route.influencerPreviousCardId = null;
      if (state.route.completed.length === state.route.order.length) beginCycle(deck, state);
      else beginGap(deck, state);
    } else {
      if (!target || target.plot !== card.plot) throw new Error(`Plot escaped its route: ${card.id} → ${next}`);
      state.currentCardId = next;
      enterFacts(state, target);
    }
    return { state, deltas: result.deltas };
  }
  return { startRun, resolveChoice, choicesFor, choiceTargets, fillerPool };
});
