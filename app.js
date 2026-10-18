(function startBrowserGame() {
  const engine = window.MistakeryEngine;
  const route = window.MistakeryRoute;

  const app = {
    deck: null,
    state: null,
    runStartState: null,
    view: 'loading',
    onboardingIndex: 0,
    noteIndex: 0,
    savedDelivery: null,
    locked: false,
    introTypingTimer: null,
    cardDelivery: null,
    padelCeoScore: 0,
    influencerPreviousCardId: null,
    liveAgentScore: 0,
    activeCardIds: [],
    render,
  };
  window.MistakeryApp = app;

  const $ = (selector) => document.querySelector(selector);
  const sound = window.MistakerySound;
  // Prepare the owner's original image independently of first-entry onboarding.
  // Reuse the decoded node so the title never paints its prompt before the logo.
  let titleLogo;
  function prepareTitleLogo() {
    titleLogo = new Image(2172, 724);
    titleLogo.className = 'title-logo';
    titleLogo.alt = 'Mistakery';
    titleLogo.draggable = false;
    titleLogo.decoding = 'sync';
    titleLogo.src = 'assets/mistakery-logo.png';
    return titleLogo.decode().then(() => true, () => false);
  }
  let titleLogoReady = prepareTitleLogo();
  const soundEvents = new WeakMap();
  function soundOnce(key, kind) {
    if (!soundEvents.has(app.state)) soundEvents.set(app.state, new Set());
    const events = soundEvents.get(app.state);
    if (events.has(key)) return false;
    events.add(key);
    if (kind) sound.play(kind);
    return true;
  }
  function updateSoundControl() {
    const button = $('[data-sound-toggle]');
    const label = sound.enabled ? 'Mute sounds' : 'Enable sounds';
    button.setAttribute('aria-pressed', String(sound.enabled));
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  updateSoundControl();
  $('[data-sound-toggle]').addEventListener('click', () => {
    sound.setEnabled(!sound.enabled);
    updateSoundControl();
    if (sound.enabled) sound.unlock();
  });
  // Capture the activation before a choice can replace its button or deliver content.
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.matches('[data-sound-toggle]')) return;
    sound.unlock();
  }, true);
  document.addEventListener('pointerdown', event => { if (event.isTrusted) sound.unlock(); }, { passive: true });
  document.addEventListener('keydown', event => { if (event.isTrusted) sound.unlock(); }, { passive: true });
  const params = new URLSearchParams(window.location.search);
  const directStoryTest = params.get('story') === 'live-agent';
  const routeTest = params.get('test') === 'route';
  const lossPreviewEnabled = params.get('preview') === 'losses';
  const storyTestEnabled = directStoryTest || routeTest || lossPreviewEnabled;
  // Park the icon HUD; restore with MISTAKERY_FEATURES.iconHud = true before app.js.
  const iconHudEnabled = window.MISTAKERY_FEATURES?.iconHud === true;
  app.resourceVariant = iconHudEnabled && params.get('hud') === 'icons' ? 'icons' : 'pulse';
  const initialSeed = params.get('seed') ?? (directStoryTest ? 'live-agent-preview' : Math.floor(Math.random() * 4294967296));
  for (const [name, initial] of Object.entries({ liveAgentScore: 0, padelCeoScore: 0, influencerPreviousCardId: null })) {
    Object.defineProperty(app, name, {
      get: () => app.state?.route?.[name] ?? initial,
      set: value => { if (app.state?.route) app.state.route[name] = value; },
    });
  }
  function initialRun() {
    return route.startRun(app.deck, { seed: initialSeed, firstPlot: directStoryTest ? 'live_agent' : undefined });
  }
  const landscapeTouch = window.matchMedia('(pointer: coarse) and (orientation: landscape)');
  function updatePortraitDirection() {
    const angle = screen.orientation?.angle ?? window.orientation ?? 90;
    // ScreenOrientation measures counter-clockwise; CSS angles turn clockwise.
    const reverse = ((angle % 360) + 360) % 360 === 90;
    document.documentElement.style.setProperty('--portrait-rotation', reverse ? '-90deg' : '90deg');
    document.documentElement.dataset.portraitDirection = reverse ? 'reverse' : 'forward';
  }
  updatePortraitDirection();
  window.addEventListener('orientationchange', updatePortraitDirection);
  screen.orientation?.addEventListener('change', updatePortraitDirection);
  landscapeTouch.addEventListener('change', updatePortraitDirection);
  const testHistory = [];
  const presentedOutcomes = new WeakSet();
  const lossPresentations = new WeakMap();
  const winPresentations = new WeakMap();
  const summarizedRuns = new WeakSet();
  const revealedProfiles = new WeakSet();
  // Presentation-only ledger survives Back snapshots; a new attempt can celebrate again.
  const celebratedWins = new Set();
  let cancelWinConfetti = () => {};
  const resourceLossCards = Object.freeze({ cash_low: 'DOC_LOSS_1', team_low: 'DOC_LOSS_2',
    team_high: 'DOC_LOSS_3', customers_low: 'DOC_LOSS_4', founder_low: 'DOC_LOSS_5', founder_high: 'DOC_LOSS_6' });
  function resourceLossCard() {
    return app.state?.gameOver && window.MISTAKERY_LOSS_PREVIEW.cards.find(card => card.id === resourceLossCards[app.state.endingId]);
  }
  function isLossCard() { return lossPreviewEnabled || (!summarizedRuns.has(app.state) && Boolean(resourceLossCard())); }

  let choiceUnlockTimer = null;
  let cardTypingTimer = null;
  let savedDeliveryTimer = null;
  let resourceFeedback = null;
  let sentMediaWidths = null;
  let revealCardMessages = () => {};
  let cancelOutcomeImageMotion = () => {};
  const arrivalAnimations = new Set();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function cancelArrivalMotion() {
    arrivalAnimations.forEach(animation => animation.cancel());
    arrivalAnimations.clear();
  }
  // Critically damped 576/48/1 spring: a gentle start, no overshoot, and a
  // continuous stop. Sample once; every row shares this same displacement.
  const messageArrival = (() => {
    const samples = [];
    for (let step = 0; step <= 120; step++) {
      const time = step / 120;
      const displacement = (1 + 24 * time) * Math.exp(-24 * time);
      samples.push({ displacement, opacity: time >= .1 ? 1 : (1 - Math.cos(Math.PI * time / .1)) / 2 });
      if (time > .1 && displacement < .004) break;
    }
    samples[samples.length - 1] = { displacement: 0, opacity: 1 };
    return { samples, duration: (samples.length - 1) * 1000 / 120 };
  })();
  function animateArrival(node, delta, fade, start) {
    const smooth = app.view !== 'saved' && !reducedMotion.matches;
    const frames = smooth ? messageArrival.samples.map(sample => ({
      transform: `translateY(${delta * sample.displacement}px)`, opacity: fade ? sample.opacity : 1,
    })) : [
      { transform: `translateY(${delta}px)`, opacity: fade ? 0 : 1 },
      { transform: 'translateY(0)', opacity: 1 },
    ];
    const duration = smooth ? messageArrival.duration : 200;
    const animation = node.animate(frames, { duration, easing: smooth ? 'linear' : 'cubic-bezier(.2,0,0,1)' });
    animation.startTime = start;
    arrivalAnimations.add(animation);
    animation.finished.then(() => arrivalAnimations.delete(animation), () => arrivalAnimations.delete(animation));
    return animation;
  }

  // Sample the approved 650/42/1 damped spring. Its settling point determines
  // the duration; native animations keep it interruptible and offline-ready.
  const irlImpact = (() => {
    const damping = 42 / 2;
    const frequency = Math.sqrt(650 - damping ** 2);
    const frames = [];
    for (let step = 0; step <= 120; step += 1) {
      const time = step / 120;
      const displacement = Math.exp(-damping * time)
        * (Math.cos(frequency * time) + damping / frequency * Math.sin(frequency * time));
      frames.push({ transform: `translateY(${3 * displacement}px) scale(${1 - .015 * displacement})` });
      if (time > .08 && Math.abs(displacement) < .004) break;
    }
    frames[frames.length - 1] = { transform: 'translateY(0) scale(1)' };
    return { frames, duration: (frames.length - 1) * 1000 / 120 };
  })();
  const irlMotionNodes = new WeakMap();
  function animateIrl(node, frames, options, property) {
    const animation = node.animate(frames, options);
    node.style.willChange = property;
    irlMotionNodes.set(node, animation);
    arrivalAnimations.add(animation);
    const cleanup = () => {
      arrivalAnimations.delete(animation);
      // A cancelled entrance may be replaced on this same scene before its
      // finished promise rejects. Only the current owner releases the layer.
      if (irlMotionNodes.get(node) === animation) {
        node.style.willChange = '';
        irlMotionNodes.delete(node);
      }
    };
    animation.finished.then(cleanup, cleanup);
  }
  function presentIrlArrival() {
    if (reducedMotion.matches || document.hidden) return;
    animateIrl($('.irl-dialog'), irlImpact.frames,
      { duration: irlImpact.duration, easing: 'linear' }, 'transform');
    const previous = engine.cardById(app.deck, app.state.history.at(-1)?.cardId);
    if (previous && previous.mode !== 'irl') {
      animateIrl($('[data-scene]'), [{ opacity: 0 }, { opacity: 1 }],
        { duration: 180, easing: 'linear' }, 'opacity');
    }
  }

  // Presentation only: match both bubble position and copy so later copy edits
  // cannot silently assign a reaction to a different message. No deck effects.
  const authoredMessageReactions = {
    LIVE_AGENT_01: { 2: ['Works on my ex every time', [['😂', 3], ['👀', 2]]],
      3: ['AI STARTUP after all', [['🚀', 2]]] },
    LIVE_AGENT_02: { 1: ['performance this month', [['😬', 2]]], 2: ['MIC DROP', [['👏', 2], ['🔥', 1]]] },
    LIVE_AGENT_03: { 2: ['physically hurts', [['💀', 1]]] },
    LIVE_AGENT_08: { 2: ['that kinda hurt', [['💔', 2]]] },
    INFLUENCER_01: { 1: ['heard that one before', [['🤨', 2]]], 2: ['20% max', [['🤝', 2]]] },
    INFLUENCER_05: { 2: ['60% revshare', [['😳', 1]]] },
    INFLUENCER_07: { 2: ['more views lol', [['😂', 2]]] },
    INFLUENCER_08: { 1: ['the server is on fire', [['😬', 2]]], 2: ['searching for us manually', [['🤯', 2]]] },
    DREAM_TEAM: { 0: ['first big client', [['🎉', 2]]], 2: ['in 4K', [['😂', 2]]] },
    FILL_AI_DEV: { 1: ['fire me then lol', [['🫠', 2]]] },
    FILL_PAYROLL_2: { 0: ['zero overtime from me', [['🫡', 2]]] },
    FILL_MANTRA: { 2: ['LISTEN TO IT ON REPEAT', [['🙄', 3], ['😒', 2]]],
      3: ['SUCCESS IS 90% VIBRATIONS', [['🤡', 2]]] },
  };
  // Authored boundaries use the original bubble index and literal next phrase.
  // Clone paragraph ranges so formatting, mentions and the sender shell survive.
  function splitChatBubble(node, starts) {
    const bubble = node.querySelector('.team-bubble') || node;
    if (!starts?.length || bubble.matches('.image-bubble, .media-placeholder')
      || node.hasAttribute('data-forwarded-from')) return [node];
    const paragraphs = Array.from(bubble.querySelectorAll(':scope > p'));
    const cuts = [];
    let previous = [-1, -1];
    for (const phrase of starts) {
      let found;
      paragraphs.some((p, index) => {
        if (index < previous[0]) return false;
        const offset = p.textContent.replace(/\u00a0/g, ' ').indexOf(phrase, index === previous[0] ? previous[1] + 1 : 0);
        if (offset < 0) return false;
        found = [index, offset]; return true;
      });
      // Copy edits must not split the wrong text or omit any content.
      if (!found) return [node];
      cuts.push(found); previous = found;
    }
    const groups = [[]];
    paragraphs.forEach((p, index) => {
      const offsets = cuts.filter(cut => cut[0] === index).map(cut => cut[1]);
      const boundaries = [...new Set([0, ...offsets, p.textContent.length])];
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
      const leaves = []; let leaf, length = 0;
      while ((leaf = walker.nextNode())) { leaves.push({ leaf, start: length }); length += leaf.textContent.length; }
      const point = offset => {
        const item = leaves.find(item => offset <= item.start + item.leaf.textContent.length);
        return [item.leaf, offset - item.start];
      };
      for (let part = 0; part < boundaries.length - 1; part++) {
        const from = boundaries[part], to = boundaries[part + 1];
        if (offsets.includes(from) && groups.at(-1).length) groups.push([]);
        const range = document.createRange(); range.setStart(...point(from)); range.setEnd(...point(to));
        const paragraph = p.cloneNode(false); paragraph.append(range.cloneContents());
        groups.at(-1).push(paragraph);
      }
    });
    return groups.map(paragraphs => {
      const part = node.cloneNode(true), host = part.querySelector('.team-bubble') || part;
      host.querySelectorAll(':scope > p').forEach(p => p.remove());
      host.append(...paragraphs); return part;
    });
  }
  function withMessageReactions(card, markup) {
    const authored = authoredMessageReactions[card.id];
    const breaks = card.bubbleBreaks;
    if ((!authored && !breaks) || card.mode === 'irl' || isLossCard()) return markup;
    const template = document.createElement('template');
    template.innerHTML = markup;
    if (breaks) Array.from(template.content.children).forEach((node, index) => {
      node.dataset.messageOrigin = index;
      node.replaceWith(...splitChatBubble(node, breaks[index]));
    });
    Array.from(template.content.children).forEach((node, index) => {
      const entry = !card.outcomeTone && authored?.[node.dataset.messageOrigin ?? index];
      if (!entry || !node.textContent.replace(/\s+/g, ' ').includes(entry[0])
        || !node.matches('.message, .team-row, .self-message') || node.matches('.image-bubble, .media-placeholder')) return;
      const bubble = node.querySelector('.team-bubble') || node;
      if (bubble.matches('.image-bubble, .media-placeholder')) return;
      const row = document.createElement('div');
      row.className = 'message-reactions';
      row.dataset.reactionEvent = `reactions:${card.id}:${index}`;
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Message reactions');
      row.setAttribute('aria-live', 'off');
      entry[1].forEach(([emoji, count]) => {
        const pill = document.createElement('span'); pill.className = 'message-reaction';
        pill.dataset.finalCount = card.mode === 'team' ? String(count) : '';
        const icon = document.createElement('span'); icon.className = 'message-reaction-emoji'; icon.textContent = emoji;
        const number = document.createElement('span'); number.className = 'message-reaction-count';
        number.textContent = pill.dataset.finalCount;
        pill.append(icon, number); row.append(pill);
      });
      bubble.append(row);
    });
    return template.innerHTML;
  }

  // Unlike bubble delivery, a repeated pop must never lower opacity: the old
  // fade restarted at .35 when a count grew, producing the reported blink.
  const reactionPop = (() => {
    const half = 42 / 2, frequency = Math.sqrt(650 - half ** 2), frames = [];
    for (let step = 0; step <= 80; step++) {
      const time = step / 120;
      const d = Math.exp(-half * time) * (Math.cos(frequency * time) + half / frequency * Math.sin(frequency * time));
      frames.push({ transform: `translateY(${3 * d}px) scale(${1 - .04 * d})` });
      if (time > .08 && Math.abs(d) < .004) break;
    }
    frames[frames.length - 1] = { transform: 'none' };
    return { frames, duration: (frames.length - 1) * 1000 / 120 };
  })();
  const reactionScopes = new Set();
  const reactionLayoutAnimations = new WeakMap();
  function reactionLayoutTop(node, chat) {
    let top = -chat.scrollTop;
    for (let parent = node; parent; parent = parent.offsetParent) top += parent.offsetTop;
    return top;
  }
  function reactionTranslation(node, chat) {
    let offset = 0;
    for (let parent = node; parent && parent !== chat; parent = parent.parentElement) {
      const value = getComputedStyle(parent).translate.split(/\s+/)[1];
      offset += parseFloat(value) || 0;
    }
    return offset;
  }
  function trackReactionExpansion(scope, node, frames, cleanup = () => {}) {
    const animation = node.animate(frames, { duration: messageArrival.duration, easing: 'linear' });
    scope.animations.add(animation);
    const release = () => {
      scope.animations.delete(animation); scope.cleanups.delete(release); cleanup();
      if (!scope.timers.size && !scope.animations.size) reactionScopes.delete(scope);
    };
    scope.cleanups.add(release);
    animation.finished.then(release, release);
    return animation;
  }
  function revealReactionRow(row, scope) {
    if (!row.hasAttribute('data-waiting')) return;
    const chat = row.closest('[data-chat]'), bubble = row.parentElement;
    const moving = scope && !reducedMotion.matches && !document.hidden;
    const roots = chat ? Array.from(chat.querySelectorAll(
      '[data-chat-current], [data-chat-history], [data-player-reply], .typing-bubble, .typing-row, .member-avatar, .message-avatar'
    )).filter(node => !node.matches('.typing-bubble') || !node.closest('.typing-row')) : [];
    const before = moving ? roots.map(node => [node,
      reactionLayoutTop(node, chat) + reactionTranslation(node, chat)]) : [];
    const height = bubble.offsetHeight;
    const paint = getComputedStyle(bubble);
    const surfaceStyle = { background: paint.background, boxShadow: paint.boxShadow, borderRadius: paint.borderRadius };
    delete row.dataset.waiting;
    if (chat && app.cardDelivery?.follow !== false) {
      // scrollHeight includes transient native transform/translate overflow.
      // Follow the final layout once, not that moving visual overflow.
      const origin = reactionLayoutTop(chat, chat);
      const bottom = Math.max(...Array.from(chat.children, child =>
        reactionLayoutTop(child, chat) - origin + child.offsetHeight));
      chat.scrollTop = Math.max(0, bottom + (parseFloat(getComputedStyle(chat).paddingBottom) || 0) - chat.clientHeight);
      updateHistoryVisibility();
    }
    if (!moving) return;
    // Layout is measured once. A separate translate property composes with the
    // native message transform, preserving its opacity and original timeline.
    const deltas = new Map(before.map(([node, top]) => [node, top - reactionLayoutTop(node, chat)]));
    before.forEach(([node]) => {
      let delta = deltas.get(node);
      for (let parent = node.parentElement; parent && parent !== chat; parent = parent.parentElement) {
        if (deltas.has(parent)) { delta -= deltas.get(parent); break; }
      }
      reactionLayoutAnimations.get(node)?.cancel();
      if (Math.abs(delta) < .01) return;
      const animation = trackReactionExpansion(scope, node,
        messageArrival.samples.map(sample => ({ translate: `0 ${delta * sample.displacement}px` })),
        () => { if (reactionLayoutAnimations.get(node) === animation) reactionLayoutAnimations.delete(node); });
      reactionLayoutAnimations.set(node, animation);
    });
    // Scale only a temporary background, never message copy or avatars.
    const surface = document.createElement('span');
    surface.className = 'reaction-bubble-surface'; surface.setAttribute('aria-hidden', 'true');
    Object.assign(surface.style, surfaceStyle);
    bubble.prepend(surface); bubble.classList.add('is-reaction-expanding');
    const ratio = height / bubble.offsetHeight;
    trackReactionExpansion(scope, surface, messageArrival.samples.map(sample => ({
      transform: `scaleY(${1 - (1 - ratio) * sample.displacement})`,
    })), () => { surface.remove(); bubble.classList.remove('is-reaction-expanding'); });
  }
  function settleReactionScope(scope) {
    scope.timers.forEach(window.clearTimeout); scope.timers.clear();
    scope.animations.forEach(a => a.cancel()); scope.animations.clear();
    scope.cleanups.forEach(cleanup => cleanup());
    if (scope.row.isConnected) revealReactionRow(scope.row);
    else delete scope.row.dataset.waiting;
    scope.row.querySelectorAll('.message-reaction').forEach(pill => {
      delete pill.dataset.pending; pill.removeAttribute('aria-hidden'); pill.style.willChange = '';
      pill.querySelector('.message-reaction-count').textContent = pill.dataset.finalCount;
    });
    reactionScopes.delete(scope);
  }
  function settleMessageReactions() { reactionScopes.forEach(settleReactionScope); }
  function queueMessageReactions(nodes, staticAppearance = false) {
    nodes.forEach(node => {
      const row = node.querySelector('.message-reactions');
      if (!row) return;
      const fresh = soundOnce(row.dataset.reactionEvent); // Same snapshot dedup, no audio kind.
      if (!fresh || staticAppearance || document.hidden) return;
      row.dataset.waiting = '';
      const state = app.state;
      const scope = { row, timers: new Set(), animations: new Set(), cleanups: new Set() };
      reactionScopes.add(scope);
      const current = () => app.state === state && app.view === 'playing' && row.isConnected;
      function later(fn, delay) {
        const timer = window.setTimeout(() => {
          scope.timers.delete(timer);
          if (!current() || document.hidden) { settleReactionScope(scope); return; }
          fn();
          if (!scope.timers.size && !scope.animations.size) reactionScopes.delete(scope);
        }, delay);
        scope.timers.add(timer);
      }
      function pop(pill) {
        if (reducedMotion.matches) return;
        pill.style.willChange = 'transform';
        const animation = pill.animate(reactionPop.frames, { duration: reactionPop.duration, easing: 'linear' });
        scope.animations.add(animation);
        const cleanup = () => {
          scope.animations.delete(animation); pill.style.willChange = '';
          if (!scope.timers.size && !scope.animations.size) reactionScopes.delete(scope);
        };
        animation.finished.then(cleanup, cleanup);
      }
      row.querySelectorAll('.message-reaction').forEach((pill, index) => {
        pill.dataset.pending = ''; pill.setAttribute('aria-hidden', 'true');
        // Give people reading time; only the pill moves, independently of delivery.
        function show() {
          revealReactionRow(row, scope);
          delete pill.dataset.pending; pill.removeAttribute('aria-hidden');
          const number = pill.querySelector('.message-reaction-count');
          number.textContent = pill.dataset.finalCount ? '1' : '';
          pop(pill);
          if (Number(pill.dataset.finalCount) > 1) later(() => {
            number.textContent = pill.dataset.finalCount; pop(pill);
          }, 340);
        }
        later(show, 1000 + index * 220);
      });
    });
  }
  reducedMotion.addEventListener('change', settleMessageReactions);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settleMessageReactions(); });

  ['pointerdown', 'wheel', 'keydown'].forEach(type => {
    document.addEventListener(type, cancelArrivalMotion, { capture: true, passive: true });
  });
  window.addEventListener('resize', cancelArrivalMotion);
  reducedMotion.addEventListener('change', cancelArrivalMotion);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) cancelWinConfetti(); });
  window.addEventListener('pagehide', () => cancelWinConfetti());
  reducedMotion.addEventListener('change', () => {
    resourceFeedback?.animations.forEach(animation => animation.cancel());
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelArrivalMotion(); cancelWinConfetti(); }
  });
  let resourcesVisible = true;
  function updateResourceMotionVisibility() {
    $('[data-resources]').classList.toggle('is-motion-paused', document.hidden || !resourcesVisible);
  }
  document.addEventListener('visibilitychange', updateResourceMotionVisibility);
  new IntersectionObserver(([entry]) => {
    resourcesVisible = entry.isIntersecting;
    updateResourceMotionVisibility();
  }).observe($('[data-resources]'));
  let padelImagesPreloaded = false;
  const INITIAL_RESOURCES = Object.freeze({ cash: 25, team: 60, customers: 15, founder: 65 });
  const OPTIMISTIC_RESOURCES = Object.freeze({ cash: 100, team: 100, customers: 100, founder: 100 });
  const INTRO_TYPING_MS = 620;
  // Exact Lucide 1.17.0 geometry used by the approved motion prototype.
  // Stroke geometry preserves the interior area for the translucent level fill.
  // License: assets/lucide-LICENSE.txt.
  const RESOURCE_ICONS = Object.freeze({
    cash: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle>',
    customers: '<path d="M19.414 14.414C21 12.828 22 11.5 22 9.5a5.5 5.5 0 0 0-9.591-3.676.6.6 0 0 1-.818.001A5.5 5.5 0 0 0 2 9.5c0 2.3 1.5 4 3 5.5l5.535 5.362a2 2 0 0 0 2.879.052 2.12 2.12 0 0 0-.004-3 2.124 2.124 0 1 0 3-3 2.124 2.124 0 0 0 3.004 0 2 2 0 0 0 0-2.828l-1.881-1.882a2.41 2.41 0 0 0-3.409 0l-1.71 1.71a2 2 0 0 1-2.828 0 2 2 0 0 1 0-2.828l2.823-2.762"></path>',
    founder: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>',
  });
  function resourceIconMarkup(key, className = '') {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">${RESOURCE_ICONS[key]}</svg>`;
  }
  const BOOKMARK_SVG = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-5.2L5 21V4a1 1 0 0 1 1-1z"/></svg>';

  const INTRO_STEPS = Object.freeze([
    {
      shellStage: 'intro',
      text: 'Congratulations! 🎉\nYou successfully escaped the corporate grind to build your own empire. No more working for the man. From now on, you are THE MAN.',
      button: 'So long, corporate jail!',
    },
    {
      shellStage: 'optimistic',
      text: 'Fast forward 5 months:\nyou have your own AI startup, a dream team of 5 people, and a bag of investor cash. Or what’s left of it.',
      button: 'Trust the process',
    },
    {
      shellStage: 'real',
      text: 'Does the world actually need your product? It’s AI. Of course they do.\n\nAre there any paying customers? Hey, one step at a time. We’ll figure that out on the fly.',
      button: 'Open the Masterplan',
    },
  ]);

  const NOTE_SCREENS = Object.freeze([
    {
      id: 'SAVED_01_PLAN',
      chip: '5 months ago',
      messages: ['<strong>NEVER WORK AGAIN PLAN 🚀</strong>\n<b>1.</b> Quit 9-5 rat race\n<b>2.</b> Get bro on board\n<b>3.</b> Pick up a fancy sport (Golf?? Padel??)\n<b>4.</b> Brainstorm smth big (AI??)\n<b>5.</b> Killer naming!! + domain\n<b>6.</b> A team of legends\n<b>7.</b> Raise 💰💰 from investors (pitch deck?)\n<b>8.</b> Become a unicorn 🦄\n<b>9.</b> Buy mom a house (finally be the favorite son)\n<b>10.</b> Hire ex-boss to fire him'],
      buttons: ['Right on track', 'Slightly behind'],
    },
    {
      id: 'SAVED_02_UPDATE',
      chip: 'Today',
      messages: [
        '<strong>5 MONTHS AS A FOUNDER 🚀</strong>\n<b>1.</b> Never return to the office ✅\n<b>2.</b> Bro as a cofounder ✅\n<b>3.</b> Padel (CEO networking) ✅\n<b>4.</b> Built AI B2B SaaS. B2B sales - easy money ✅\n<b>5.</b> Brand: B2BuyerSpyer ✅\n<b>6.</b> Slogan: We find the buyer. You light the fire 🔥✅\n<b>7.</b> Team grinding 24/7. LEGENDS!! ✅\n<b>8.</b> Landed a HUGE investor ✅',
        "<strong>IN PROGRESS:</strong>\n<b>9.</b> Unicorn 🦄🎯 (30 DAYS UNTIL WE'RE BROKE!!)",
      ],
      buttons: ['WE’RE SO BACK', 'it’s so over'],
    },
  ]);

  const NBSP = '\u00A0';
  const MAX_HANGING = 2;

  function glueShortWords(text) {
    const words = text.split(' ');
    if (words.length < 2) return text;
    let out = words[0];
    for (let index = 1; index < words.length; index += 1) {
      const previous = words[index - 1].replace(/[^0-9A-Za-z’']/g, '');
      out += (previous && previous.length <= MAX_HANGING ? NBSP : ' ') + words[index];
    }
    return out;
  }

  function typography(text) {
    return String(text)
      .replace(/~/g, NBSP)
      .split(/(<[^>]*>)/)
      .map((part) => (part.startsWith('<') ? part : glueShortWords(part)
        .replace(/(^|[^\w@])(@[A-Za-z0-9_]+)/g, '$1<strong class="mention">$2</strong>')))
      .join('');
  }

  let continuationResizeObserver;
  let disposeFounderCard;

  function setView(view, shellStage = 'real', feedback = null) {
    if (view !== 'saved') {
      window.clearTimeout(savedDeliveryTimer);
      savedDeliveryTimer = null;
      app.savedDelivery = null;
    }
    $('[data-title-screen]')?.remove();
    $('[data-quit-dialog]')?.remove();
    disposeFounderCard?.();
    disposeFounderCard = null;
    $('[data-founder-screen]')?.remove();
    delete $('[data-game]').dataset.founderProfile;
    const winFinale = $('[data-win-finale]');
    cancelWinConfetti();
    // Remove first so its queued close event cannot resume a discarded view.
    winFinale?.remove();
    if (winFinale?.open) winFinale.close();
    const finale = $('[data-loss-finale]');
    if (finale?.open) finale.close();
    finale?.remove();
    app.lossPreviewObserver?.disconnect();
    $('[data-loss-flash]')?.remove();
    delete $('[data-game]').dataset.lossPreview;
    if (resourceFeedback?.feedback !== feedback) cancelResourceFeedback();
    sentMediaWidths = null;
    settleMessageReactions();
    cancelArrivalMotion();
    cancelOutcomeImageMotion();
    if ($('[data-test-details]').open) $('[data-test-details]').close();
    window.clearTimeout(cardTypingTimer);
    revealCardMessages = () => {};
    $('[data-chat]').removeAttribute('aria-busy');
    $('.reply-hint__text').textContent = 'Choose a reply...';
    continuationResizeObserver?.disconnect();
    app.view = view;
    const phone = $('[data-game]');
    delete phone.dataset.outcome;
    delete phone.dataset.runSummary;
    phone.classList.remove('is-outcome-entering');
    $('[data-ending-summary]').hidden = true;
    phone.dataset.view = view;
    phone.dataset.shellStage = shellStage;
    $('[data-top]').hidden = shellStage === 'intro';
    $('[data-resources]').hidden = shellStage === 'intro';
    $('[data-restart-run]').disabled = view === 'onboarding';
    $('[data-scene]').classList.toggle('is-onboarding', view === 'onboarding');
    $('[data-app]').classList.toggle('is-story-test', storyTestEnabled);
    $('[data-test-controls]').hidden = !storyTestEnabled;
    $('[data-test-back]').disabled = testHistory.length === 0;
    $('[data-test-inspect]').disabled = !['playing', 'saved', 'ended'].includes(view);
  }

  function recordTestStep(scrollTop = $('[data-chat]').scrollTop) {
    if (!storyTestEnabled) return;
    testHistory.push({
      soundPlayed: [...(soundEvents.get(app.state) || [])],
      state: structuredClone(app.state),
      lossPresentation: structuredClone(lossPresentations.get(app.state) || null),
      winPresentation: structuredClone(winPresentations.get(app.state) || null),
      summaryShown: summarizedRuns.has(app.state),
      profileRevealed: revealedProfiles.has(app.state),
      runStartState: structuredClone(app.runStartState),
      view: app.view,
      noteIndex: app.noteIndex,
      savedDelivery: app.savedDelivery ? { ...app.savedDelivery } : null,
      padelCeoScore: app.padelCeoScore,
      influencerPreviousCardId: app.influencerPreviousCardId,
      liveAgentScore: app.liveAgentScore,
      cardDelivery: app.cardDelivery ? { ...app.cardDelivery } : null,
      scrollTop,
    });
  }

  function unlockAfterChoice(minimumDelay = 0) {
    window.clearTimeout(choiceUnlockTimer);
    const tone = engine.cardById(app.deck, app.state.currentCardId)?.outcomeTone;
    // Cover the entrance (900 ms success / 620 ms failure) and swallow a second tap.
    // A bounded timer also works when CSS motion is disabled or interrupted.
    const delay = !tone ? 280 : tone === 'success' ? 950 : 670;
    choiceUnlockTimer = window.setTimeout(() => { app.locked = false; }, Math.max(delay, minimumDelay));
  }

  function backInStoryTest() {
    if (!storyTestEnabled || !testHistory.length) return;
    sound.stop();
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    const { scrollTop, lossPresentation, winPresentation, summaryShown, profileRevealed, soundPlayed, ...saved } = testHistory.pop();
    Object.assign(app, structuredClone(saved), { locked: false });
    soundEvents.set(app.state, new Set(soundPlayed));
    if (lossPresentation) lossPresentations.set(app.state, structuredClone(lossPresentation));
    if (winPresentation) winPresentations.set(app.state, structuredClone(winPresentation));
    if (summaryShown) summarizedRuns.add(app.state);
    if (profileRevealed) revealedProfiles.add(app.state);
    // Restored outcomes retain their styling but never replay their entrance.
    presentedOutcomes.add(app.state);
    clearPreview();
    render();
    $('[data-chat]').scrollTop = scrollTop;
  }

  function startStoryTest() {
    if (lossPreviewEnabled) return openLossPreview(app.lossPreviewIndex);
    if (!storyTestEnabled) return;
    sound.stop();
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    testHistory.length = 0;
    app.cardDelivery = null;
    app.state = structuredClone(app.runStartState || initialRun());
    app.runStartState = structuredClone(app.state);
    app.liveAgentScore = 0;
    app.padelCeoScore = 0;
    app.influencerPreviousCardId = null;
    app.locked = false;
    clearPreview();
    if (routeTest) startSaved(0);
    else { app.view = 'playing'; renderCard(); }
  }

  function setSceneMode(mode) {
    const resolvedMode = mode === 'team' || mode === 'irl' ? mode : 'personal';
    const team = resolvedMode === 'team';
    const irl = resolvedMode === 'irl';
    const scene = $('[data-scene]');
    $('[data-chat]').classList.remove('has-chat-history');
    scene.dataset.mode = resolvedMode;
    scene.classList.toggle('team-scene', team);
    scene.classList.toggle('irl-scene', irl);
    scene.classList.toggle('personal-scene', resolvedMode === 'personal');
    if (!irl) {
      scene.querySelector('.irl-background')?.remove();
      scene.classList.remove('has-irl-background');
    }
    scene.querySelector('.contact').classList.toggle('team-contact', team);
    scene.querySelector('.contact').classList.toggle('irl-contact', irl);
    $('[data-chat]').classList.toggle('team-chat', team);
    $('[data-chat]').classList.toggle('irl-chat', irl);
  }

  function resourceNumber(value) {
    return String(Math.round(Math.abs(value) * 100) / 100);
  }

  function signedResourceNumber(value) {
    return `${value < 0 ? '−' : '+'}${resourceNumber(value)}`;
  }

  function cancelResourceFeedback() {
    if (resourceFeedback) {
      window.clearTimeout(resourceFeedback.timer);
      resourceFeedback.animations.forEach(animation => animation.cancel());
      resourceFeedback = null;
    }
    document.querySelectorAll('[data-resource]').forEach(node => {
      delete node.dataset.impact;
      delete node.dataset.direction;
    });
    const announcement = $('[data-resource-announcement]');
    if (announcement) announcement.textContent = '';
  }

  function setResourceVariant(variant, updateUrl = false) {
    app.resourceVariant = iconHudEnabled && variant === 'icons' ? 'icons' : 'pulse';
    $('[data-resources]').dataset.variant = app.resourceVariant;
    document.querySelectorAll('[data-hud-variant]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.hudVariant === app.resourceVariant));
    });
    // A presentation change must not rerender a card, restart delivery or roll RNG.
    resourceFeedback?.animations.forEach(animation => animation.cancel());
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('hud', app.resourceVariant);
      window.history.replaceState(window.history.state, '', url);
    }
  }

  function renderResources(values, feedback = null, resourceState = app.state) {
    // A retained reply already started its meter feedback at the click.
    if (feedback && resourceFeedback?.feedback === feedback) return;
    const host = $('[data-resources]');
    // Keep the same bars across replies: the old fill must exist to animate it.
    if (!host.children.length) {
      host.innerHTML = engine.RESOURCE_KEYS.map(key => `<div class="resource" data-resource="${key}" role="group" aria-label="${app.deck.resources[key].label}">
        <div class="resource-icon-meter" aria-hidden="true">
          ${resourceIconMarkup(key, 'resource-icon-empty')}
          <span class="resource-icon-fill">${resourceIconMarkup(key)}</span>
        </div>
        <span class="resource-label"><i class="resource-glyph resource-glyph--${key}" aria-hidden="true">${resourceIconMarkup(key)}</i>${app.deck.resources[key].label}</span>
        <div class="bar" aria-hidden="true"><i></i></div>
        <span class="sr-only" data-value></span>
      </div>`).join('') + '<span class="sr-only" data-resource-announcement role="status" aria-live="polite" aria-atomic="true"></span>';
    }
    host.dataset.variant = app.resourceVariant;
    const scope = feedback ? { feedback, animations: [], timer: null } : null;
    resourceFeedback = scope;
    const announcements = [];
    for (const key of engine.RESOURCE_KEYS) {
      const node = host.querySelector(`[data-resource="${key}"]`);
      const config = app.deck.resources[key];
      const value = Number(values[key]);
      const raw = Number(resourceState.route?.resourceLedger?.[key] ?? value);
      const fatalEdges = app.deck.meta.route.resourceEndings.map(id => app.deck.endings[id])
        .filter(ending => ending.resource === key);
      const margin = (config.max - config.min) * .15;
      const risk = app.view === 'onboarding' ? null : fatalEdges.find(ending => ending.edge === 'low'
        ? raw <= config.min + margin : raw >= config.max - margin)?.edge;
      node.classList.remove('low', 'is-fatal', 'is-preview');
      if (risk) node.dataset.risk = risk;
      else delete node.dataset.risk;
      const outside = raw < config.min || raw > config.max;
      const balance = `${raw < 0 ? '−' : ''}${resourceNumber(raw)}`;
      const description = `${config.label}: ${value} / ${config.max}${outside ? `; balance ${balance}` : ''}${risk ? `; ${risk} — at risk when this episode ends` : ''}`;
      node.querySelector('[data-value]').textContent = description;
      node.dataset.fill = value;
      const fill = node.querySelector('.bar i');
      const iconFill = node.querySelector('.resource-icon-fill');
      fill.style.width = `${value}%`;
      iconFill.style.clipPath = `inset(${100 - value}% 0 0)`;
      if (!feedback) continue;
      // HUD differences are clipped. The episode ledger preserves the whole cost,
      // and also records recovery while a meter is still pinned to an edge.
      const amount = feedback.rawAfter[key] - feedback.rawBefore[key];
      if (!amount) continue;
      const text = signedResourceNumber(amount);
      node.dataset.impact = Math.abs(amount) < 2 ? 'small' : 'large';
      node.dataset.direction = amount < 0 ? 'down' : 'up';
      const actualBalance = feedback.rawAfter[key];
      const explanation = `${config.label} ${text}. Balance ${actualBalance}; meter ${value} / ${config.max}${risk ? `; ${risk} risk` : ''}.`;
      announcements.push(explanation);
      if (!reducedMotion.matches) {
        const icons = app.resourceVariant === 'icons';
        if (feedback.resourcesBefore[key] !== value) {
          const frames = icons
            ? [{ clipPath: `inset(${100 - feedback.resourcesBefore[key]}% 0 0)` }, { clipPath: `inset(${100 - value}% 0 0)` }]
            : [{ width: `${feedback.resourcesBefore[key]}%` }, { width: `${value}%` }];
          scope.animations.push((icons ? iconFill : fill).animate(frames,
            { duration: 420, easing: 'cubic-bezier(.2,0,.2,1)' }));
        }
        // Even a subpixel expense or recovery beyond the meter's bounds gets
        // an acknowledgement, without exaggerating the actual resource level.
        const cue = node.querySelector(icons ? '.resource-icon-empty' : '.bar');
        scope.animations.push(cue.animate([
          { opacity: 1 }, { opacity: .35, offset: .3 }, { opacity: 1 },
        ], { duration: Math.abs(amount) < 2 ? 430 : 520, easing: 'ease-out' }));
      }
    }
    if (scope) {
      $('[data-resource-announcement]').textContent = announcements.join(' ');
      scope.timer = window.setTimeout(() => {
        if (resourceFeedback === scope) cancelResourceFeedback();
      }, 1800);
    }
  }

  function setContact({ name, role = '', avatar = '' }) {
    $('[data-sender]').textContent = name;
    $('[data-status]').textContent = role;
    const avatarNode = $('[data-avatar]');
    const markup = avatar || name.replace('@', '').slice(0, 1).toUpperCase();
    const template = document.createElement('template');
    template.innerHTML = markup;
    const photo = template.content.querySelector('img');
    const readyPhoto = photo && readyCharacterAvatars.get(photo.getAttribute('src'));
    if (readyPhoto) {
      readyPhoto.className = 'avatar-photo';
      readyPhoto.alt = '';
      readyPhoto.decoding = 'sync';
      readyPhoto.draggable = false;
      if (avatarNode.firstChild !== readyPhoto) avatarNode.replaceChildren(readyPhoto);
    } else if (avatarNode.innerHTML !== markup) avatarNode.innerHTML = markup;
    const messageAvatar = $('[data-message-avatar]');
    if (messageAvatar) messageAvatar.innerHTML = avatar || name.replace('@', '').slice(0, 1).toUpperCase();
  }

  function sourceFor(sourceId) {
    return app.deck.sources[sourceId];
  }

  const readyCharacterAvatars = new Map();

  function characterAvatar(source, fallback, imageSrc = source.avatarImage) {
    if (!readyCharacterAvatars.has(imageSrc)) return fallback || source.name.replace('@', '').slice(0, 1).toUpperCase();
    return `<img class="avatar-photo" src="${htmlAttribute(imageSrc)}" alt="" width="128" height="128" decoding="sync" draggable="false">`;
  }

  async function warmCharacterAvatars() {
    const urls = new Set(Object.values(app.deck.sources).flatMap(source => [source.avatarImage, source.irlAvatar]).filter(Boolean));
    let accepting = true;
    let timeout;
    const preparation = Promise.all(Array.from(urls, async src => {
      const image = new Image();
      image.fetchPriority = 'high';
      image.src = src;
      try {
        await image.decode();
        if (accepting) readyCharacterAvatars.set(src, image);
      } catch { /* Keep initials if a photo cannot load. */ }
    }));
    // Keep decoded images alive; slow or unavailable photos must not block play
    // forever or suddenly replace initials after the first screen has appeared.
    await Promise.race([preparation, new Promise(resolve => { timeout = window.setTimeout(resolve, 2500); })]);
    accepting = false;
    window.clearTimeout(timeout);
  }

  const readyStoryImages = new Map();
  const storyImageSources = new Set();

  const readyPadelBackgrounds = new Map();
  let padelPreparation;
  function warmPadelBackgrounds() {
    if (padelPreparation) return padelPreparation;
    const sources = Object.values(window.MISTAKERY_PADEL_BACKGROUNDS || {}).map(background => background.src);
    // Four low-priority workers keep the branch warm without crowding out chat media.
    const preparation = Promise.all(Array.from({ length: 4 }, async () => {
      while (sources.length) {
        const src = sources.shift();
        const image = new Image();
        image.fetchPriority = 'low';
        image.src = src;
        try {
          await image.decode();
          readyPadelBackgrounds.set(src, image);
        } catch { /* The existing court remains a stable fallback. */ }
      }
    }));
    // Slow/offline requests cannot hold the opening indefinitely. Late images
    // remain available for future cards, but never replace a visible backdrop.
    padelPreparation = (async () => {
      let timeout;
      await Promise.race([preparation, new Promise(resolve => { timeout = window.setTimeout(resolve, 2500); })]);
      window.clearTimeout(timeout);
    })();
    return padelPreparation;
  }

  async function warmStoryImages() {
    for (const card of app.deck.cards.filter(card => card.plot || card.filler)) {
      if (card.image?.src) storyImageSources.add(card.image.src);
      for (const message of card.messages || []) {
        const image = message.image || app.deck.images?.[message.imageRef];
        if (image?.src) storyImageSources.add(image.src);
      }
    }
    let accepting = true;
    let timeout;
    const preparation = Promise.all(Array.from(storyImageSources, async src => {
      const image = new Image();
      image.fetchPriority = 'high';
      image.src = src;
      try {
        await image.decode();
        if (accepting) readyStoryImages.set(src, image);
      } catch { /* Unavailable pictures keep their captions and a stable fallback. */ }
    }));
    // Prepare pixels, not just network responses; retain them across card transitions.
    await Promise.race([preparation, new Promise(resolve => { timeout = window.setTimeout(resolve, 5000); })]);
    accepting = false;
    window.clearTimeout(timeout);
  }

  function setThread(sourceId, status) {
    const source = sourceFor(sourceId);
    setContact({
      name: source.name,
      role: status === 'typing...' ? `${source.role} · online` : status,
      avatar: characterAvatar(source),
    });
  }

  function setCardId(id) {
    $('[data-card-id]').textContent = id;
    $('[data-scene]').dataset.activeCard = id;
  }

  function hideIrlLocation() {
    $('[data-location]').hidden = true;
  }

  function showIrlLocation(card) {
    const location = $('[data-location]');
    location.querySelector('small').textContent = card.location;
    const score = $('[data-location-score]');
    const result = card.outcomeTone && /^(YOU (?:WIN|LOSE)!)( .+)$/.exec(card.score);
    location.classList.toggle('has-result', Boolean(result));
    score.replaceChildren();
    if (result) {
      const title = document.createElement('span');
      title.className = 'irl-result';
      title.textContent = result[1];
      score.append(title, document.createTextNode(result[2]));
    } else score.textContent = card.score;
    location.hidden = false;
  }

  function setReplyHint(visible) {
    $('[data-reply-hint]').hidden = !visible;
  }

  function choiceMarkup(label, side, disabled = false) {
    return `<button class="choice choice--${side}" type="button" data-choice="${side}"${disabled ? ' disabled' : ''}>${label}</button>`;
  }

  function setChoices(items, onChoose, options = {}) {
    const disabled = options.disabled === true;
    const choices = $('[data-choices]');
    choices.toggleAttribute('data-reserved', options.reserved === true);
    choices.innerHTML = items
      .map((label, index) => choiceMarkup(label, index === 0 ? 'left' : 'right', disabled))
      .join('');
    if (disabled) return;
    document.querySelectorAll('[data-choice]').forEach((button) => {
      button.addEventListener('click', event => onChoose(button.dataset.choice, event));
    });
  }

  function withoutTerminalPeriod(text) {
    return String(text).replace(/(^|[^.])\.$/, '$1');
  }

  function messageParagraphs(text) {
    return withoutTerminalPeriod(text).split('\n\n').map((paragraph) => (
      `<p>${paragraph.split('\n').map((line) => typography(line)).join('<br>')}</p>`
    )).join('');
  }

  function messageLines(text, preserveTerminalPeriod = false, italicLines = [], boldLines = []) {
    const displayedText = preserveTerminalPeriod ? String(text) : withoutTerminalPeriod(text);
    return displayedText.split('\n').map((line, index, lines) => line
      ? `<p${index > 0 && lines[index - 1] === '' ? ' class="message-paragraph-start"' : ''}>${boldLines.includes(line) ? `<strong>${typography(line)}</strong>` : italicLines.includes(line) ? `<em>${typography(line)}</em>` : typography(line)}</p>`
      : '').join('');
  }

  function cardMessageMarkup(text, preserveTerminalPeriod = false, italicLines = [], boldLines = []) {
    return text.split('\n\n').map((message) => (
      `<div class="message is-pop">${messageLines(message, preserveTerminalPeriod, italicLines, boldLines)}</div>`
    )).join('');
  }

  function mediaPlaceholderMarkup(label) {
    return `<span class="media-placeholder__label">${typography(label)}</span>`;
  }

  function htmlAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function mediaImageMarkup(image, decoding = 'sync') {
    const caption = image.caption ? `<div class="message-caption">${messageLines(htmlAttribute(image.caption), true)}</div>` : '';
    if (storyImageSources.has(image.src) && !readyStoryImages.has(image.src)) {
      return `<span class="media-placeholder__label" role="img" aria-label="${htmlAttribute(image.alt)}">Image unavailable</span>${caption}`;
    }
    return `<img class="message-image" src="${htmlAttribute(image.src)}" alt="${htmlAttribute(image.alt)}" width="${Number(image.width)}" height="${Number(image.height)}" style="--image-ratio: ${Number(image.width)} / ${Number(image.height)}" decoding="${decoding}" fetchpriority="high" draggable="false">${caption}`;
  }

  // References resolve to the same media renderers used by existing cards.
  // Replace the referenced placeholder with { src, alt, width, height } later.
  function referencedMediaMarkup(message, preserveTerminalPeriod = false) {
    const asset = app.deck.images?.[message.imageRef];
    if (!asset) throw new Error(`Missing image reference: ${message.imageRef}`);
    const isImage = Boolean(asset.src);
    const caption = message.text ? `<div class="message-caption">${messageLines(message.text, preserveTerminalPeriod)}</div>` : '';
    return `<div class="message ${isImage ? 'image-bubble' : 'media-placeholder'}${caption ? ' has-caption' : ''} is-pop" data-asset-reference="${htmlAttribute(message.imageRef)}">${isImage ? mediaImageMarkup(asset, 'sync') : mediaPlaceholderMarkup(asset.placeholder)}${caption}</div>`;
  }

  function popMessage() {
    const message = $('[data-chat] .message-stack .message:last-child');
    if (!message) return;
    message.classList.remove('is-pop');
    void message.offsetWidth;
    message.classList.add('is-pop');
  }

  function renderOnboarding(options = {}) {
    const typing = options.typing === true;
    const step = INTRO_STEPS[app.onboardingIndex];
    const delivered = app.onboardingIndex + (typing ? 0 : 1);
    setView('onboarding', step.shellStage);
    setSceneMode('personal');
    hideIrlLocation();
    setReplyHint(false);
    setCardId(`ONBOARDING_${delivered}`);
    const narrator = sourceFor('@b2buddy');
    const narratorAvatar = characterAvatar(narrator);
    setContact({ name: narrator.name, role: narrator.role, avatar: narratorAvatar });

    if (step.shellStage === 'optimistic') renderResources(OPTIMISTIC_RESOURCES);
    if (step.shellStage === 'real') renderResources(INITIAL_RESOURCES);

    const messages = Array.from({ length: delivered }, (_, index) => (
      `<div class="message">${messageParagraphs(INTRO_STEPS[index].text)}</div>`
    )).join('');
    const typingBubble = typing
      ? '<div class="typing-bubble" aria-label="@b2buddy is typing"><i></i><i></i><i></i></div>'
      : '';
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>ONBOARDING_${app.onboardingIndex + 1}</span>
      <div class="message-row">
        <div class="mini-avatar message-avatar" data-message-avatar aria-hidden="true">${narratorAvatar}</div>
        <div class="message-stack" data-message-stack>${messages}${typingBubble}</div>
      </div>`;
    if (typing) {
      const choices = $('[data-choices]');
      if (choices.children.length === 0) {
        setChoices([step.button], () => {}, { disabled: true, reserved: true });
      } else {
        choices.querySelectorAll('[data-choice]').forEach((button) => { button.disabled = true; });
      }
      return;
    }
    setChoices([step.button], advanceOnboarding);
    popMessage();
  }

  function deliverOnboardingMessage() {
    app.locked = true;
    renderOnboarding({ typing: true });
    window.clearTimeout(app.introTypingTimer);
    app.introTypingTimer = window.setTimeout(() => {
      renderOnboarding();
      sound.play('incoming');
      app.locked = false;
    }, INTRO_TYPING_MS);
  }

  function advanceOnboarding() {
    if (app.locked) return;
    sound.unlock();
    sound.play('send');
    if (app.onboardingIndex < INTRO_STEPS.length - 1) {
      app.onboardingIndex += 1;
      deliverOnboardingMessage();
      return;
    }
    startSaved(0);
  }

  function noteLineMarkup(text) {
    return withoutTerminalPeriod(text).split('\n').map((line) => `<span>${line ? typography(line) : '&nbsp;'}</span>`).join('');
  }

  function savedMessageMarkup(message) {
    return `<div class="message note-message"><p>${noteLineMarkup(message)}</p><span class="stamp">15:54</span></div>`;
  }

  function chooseSaved() {
    sound.unlock();
    sound.play('send');
    recordTestStep();
    if (app.noteIndex === 0) startSaved(1);
    else beginRun();
  }

  function startSaved(index) {
    window.clearTimeout(savedDeliveryTimer);
    savedDeliveryTimer = null;
    app.noteIndex = index;
    app.savedDelivery = index === 1 ? { deadline: Date.now() + 1000, delivered: false } : null;
    renderSaved();
    if (index === 1) animateArrival($('.note-message'), reducedMotion.matches ? 0 : 16, true, document.timeline.currentTime);
  }

  function founderTypingMarkup() {
    return '<div class="typing-bubble founder-composer" aria-label="Founder is typing"><span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span></div>';
  }

  function renderSaved() {
    const note = NOTE_SCREENS[app.noteIndex];
    const delivery = app.savedDelivery;
    const newlyDelivered = app.noteIndex === 1 && delivery && !delivery.delivered && Date.now() >= delivery.deadline;
    const delivered = app.noteIndex !== 1 || delivery?.delivered || newlyDelivered;
    if (delivery && delivered) delivery.delivered = true;
    window.clearTimeout(savedDeliveryTimer);
    savedDeliveryTimer = null;
    const messages = note.messages.slice(0, delivered ? undefined : 1).map(savedMessageMarkup).join('');
    setView('saved', 'real');
    setSceneMode('personal');
    renderResources(app.state.resources);
    hideIrlLocation();
    setReplyHint(true);
    setCardId(note.id);
    setContact({ name: 'Saved Messages', role: '', avatar: BOOKMARK_SVG });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${note.id}</span>
      <div class="date-chip">${note.chip}</div>
      <div class="message-row note-row">
        <div class="message-stack" data-message-stack>${messages}</div>
      </div>
      <div class="message-clearance" aria-hidden="true"></div>`;
    keepDeliveryVisible($('[data-message-stack]').lastElementChild);
    setChoices(note.buttons, chooseSaved, { disabled: !delivered });
    if (newlyDelivered) soundOnce(`saved-update:${delivery.deadline}`, 'send');
    if (!delivered) {
      $('[data-message-stack]').insertAdjacentHTML('beforeend', founderTypingMarkup());
      keepDeliveryVisible($('[data-message-stack]').lastElementChild);
      savedDeliveryTimer = window.setTimeout(() => {
        if (app.view !== 'saved' || app.noteIndex !== 1 || app.savedDelivery !== delivery) return;
        delivery.delivered = true;
        savedDeliveryTimer = null;
        cancelArrivalMotion();
        const chat = $('[data-chat]');
        const positions = Array.from(chat.querySelectorAll('.note-message'))
          .map(node => [node, node.offsetTop - chat.scrollTop]);
        $('[data-message-stack] .founder-composer')?.remove();
        $('[data-message-stack]').insertAdjacentHTML('beforeend', savedMessageMarkup(note.messages[1]));
        const arrived = $('[data-message-stack]').lastElementChild;
        keepDeliveryVisible(arrived);
        // Use the chat's shared arrival motion: the new note takes the dots'
        // position while the existing note shifts with it, preserving their gap.
        const last = positions.at(-1);
        const delta = last[1] - (last[0].offsetTop - chat.scrollTop);
        const start = document.timeline.currentTime;
        if (!reducedMotion.matches) positions.forEach(([node]) => animateArrival(node, delta, false, start));
        animateArrival(arrived, reducedMotion.matches ? 0 : delta, true, start);
        setChoices(note.buttons, chooseSaved);
        soundOnce(`saved-update:${delivery.deadline}`, 'send');
      }, Math.max(0, delivery.deadline - Date.now()));
    }
  }

  function beginRun() {
    // Saved is navigation inside the prepared attempt, not another shuffle.
    app.padelCeoScore = 0;
    app.influencerPreviousCardId = null;
    app.liveAgentScore = 0;
    app.locked = false;
    app.view = 'playing';
    renderCard();
  }

  function clearPreview() {
    document.querySelectorAll('[data-resource].is-preview').forEach((node) => node.classList.remove('is-preview'));
  }

  function padelChoiceTargets(card, side) {
    return route.choiceTargets(app.deck, app.state, card, side);
  }

  function previewChoice(card, choice, side) {
    clearPreview();
    const affected = new Set(engine.getAffectedResources(choice));
    const padel = card.id === 'PADEL_INVITE' || card.id.startsWith('IRL_PADEL_');
    const influencer = card.arc === 'influencer';
    if (card.arc === 'live_agent' || padel || influencer) {
      // Outcomes apply their effects on entry. Preview all candidate resources
      // without drawing an outcome or changing the current game state.
      const targets = influencer ? influencerChoiceTargets(card, side)
        : padel ? padelChoiceTargets(card, side) : choice.outcomeRoll
        ? [choice.outcomeRoll.win, choice.outcomeRoll.lose]
        : [choice.next];
      for (const id of targets) {
        const target = engine.cardById(app.deck, id);
        if (!target?.outcomeEffects) continue;
        const resources = target.resetResources === 0
          ? engine.RESOURCE_KEYS
          : engine.getAffectedResources({ effects: target.outcomeEffects });
        resources.forEach(resource => affected.add(resource));
      }
    }
    affected.forEach((resource) => {
      document.querySelector(`[data-resource="${resource}"]`)?.classList.add('is-preview');
    });
  }

  function bindCardChoices(card, choices, disabled) {
    document.querySelectorAll('[data-choice]').forEach((button) => {
      const side = button.dataset.choice;
      const choice = choices[side];
      if (disabled) return;
      button.addEventListener('mouseenter', () => previewChoice(card, choice, side));
      button.addEventListener('focus', () => previewChoice(card, choice, side));
      button.addEventListener('mouseleave', clearPreview);
      button.addEventListener('blur', clearPreview);
      button.addEventListener('click', () => choose(side));
    });
  }

  function personalCardMessagesMarkup(card) {
    const media = card.image
      ? `<div class="message image-bubble is-pop">${mediaImageMarkup(card.image)}</div>`
      : card.placeholder
        ? `<div class="message media-placeholder is-pop">${mediaPlaceholderMarkup(card.placeholder)}</div>`
        : '';
    const preserve = card.preservePunctuation || card.id.startsWith('INFLUENCER_');
    const messages = card.messages
      ? card.messages.map(message => message.imageRef
        ? referencedMediaMarkup(message, preserve)
        : message.forwardedFrom
          ? forwardedMessageMarkup(message, preserve)
          : cardMessageMarkup(message.text, preserve)).join('')
      : cardMessageMarkup(card.text, preserve, card.italicLines, card.boldLines);
    return withMessageReactions(card, media + messages);
  }

  function forwardedMessageMarkup(message, preserve) {
    const author = sourceFor(message.forwardedFrom).name;
    return `<div class="message is-pop" data-forwarded-from="${htmlAttribute(message.forwardedFrom)}">
      <div class="forwarded-content">
        <span class="forwarded-label">Forwarded from ${htmlAttribute(author)}</span>
        ${messageLines(message.text, preserve)}
      </div>
    </div>`;
  }

  function renderPersonalCard(card) {
    setThread(card.source, 'typing...');
    const avatar = characterAvatar(sourceFor(card.source));
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      <div class="message-row">
        <div class="mini-avatar message-avatar" data-message-avatar aria-hidden="true">${avatar}</div>
        <div class="message-stack" data-message-stack>${personalCardMessagesMarkup(card)}</div>
      </div>
      <div class="message-clearance" aria-hidden="true"></div>`;
  }

  function teamCardMessagesMarkup(card) {
    return withMessageReactions(card, card.messages.map((message) => {
      if (message.system) return `<div class="date-chip is-pop" data-system-event${message.leftChannel ? ` data-left-member="${htmlAttribute(message.leftChannel)}"` : ''}>${messageLines(htmlAttribute(message.text), true)}</div>`;
      const body = message.image
        ? mediaImageMarkup(message.image) + (message.text ? `<div class="message-caption">${messageLines(message.text, card.preservePunctuation)}</div>` : '')
        : message.placeholder
          ? mediaPlaceholderMarkup(message.placeholder)
          : messageLines(message.text, card.preservePunctuation || card.id.startsWith('INFLUENCER_'));
      const mediaClass = message.image ? ' image-bubble' : message.placeholder ? ' media-placeholder' : '';
      if (message.direction === 'outgoing') {
        if (isLossCard()) return previewOutgoingMessageMarkup(message);
        return `<div class="self-message${mediaClass} is-pop">${body}</div>`;
      }
      const member = sourceFor(message.source);
      return `<div class="team-row is-pop" data-source="${message.source}">
        <div class="member-avatar" aria-hidden="true">${characterAvatar(member, message.avatar)}</div>
        <div class="team-bubble${mediaClass}">
          <span class="team-meta">${member.name}${member.role ? `<span class="team-role"> · ${member.role}</span>` : ''}</span>
          ${body}
        </div>
      </div>`;
    }).join(''));
  }

  function renderTeamCard(card) {
    const thread = sourceFor(card.source);
    setContact({ name: thread.name, role: thread.role, avatar: characterAvatar(thread, thread.avatar || 'DT') });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      ${teamCardMessagesMarkup(card)}
      <div class="message-clearance" aria-hidden="true"></div>`;
  }

  function retainsPreviousChat(card, previous, side) {
    const approvedPrevious = {
      LIVE_AGENT_02: ['LIVE_AGENT_01'],
      LIVE_AGENT_04: ['LIVE_AGENT_03'],
      LIVE_AGENT_04B: ['LIVE_AGENT_04'],
      LIVE_AGENT_07B: ['LIVE_AGENT_07'],
      INFLUENCER_02A: ['INFLUENCER_02'],
      INFLUENCER_05: ['INFLUENCER_04', 'INFLUENCER_06'],
      INFLUENCER_06: ['INFLUENCER_04', 'INFLUENCER_05'],
      INFLUENCER_OUTCOME_5: ['INFLUENCER_08'],
      INFLUENCER_OUTCOME_7: ['INFLUENCER_08'],
    };
    const linkedFiller = previous?.filler && card?.filler?.role === 'followup'
      && card.filler.unit === previous.filler.unit && previous.choices[side]?.next === card.id;
    return Boolean(card && previous && card.mode !== 'irl'
      && (approvedPrevious[card.id]?.includes(previous.id) || linkedFiller) && previous.source === card.source
      && (previous.mode || 'personal') === (card.mode || 'personal'));
  }

  function retainedMessageNodes(nodes) {
    // Keep two original messages, including every authored bubble fragment.
    const origins = nodes.map((node, index) => node.dataset.messageOrigin ?? String(index));
    const retained = new Set([...new Set(origins)].slice(-2));
    return nodes.filter((node, index) => retained.has(origins[index]));
  }

  function prependPreviousChatMessages(card, mediaWidths) {
    if (card.mode === 'irl') return null;
    const chat = $('[data-chat]');
    const host = card.mode === 'team' ? chat : chat.querySelector('[data-message-stack]');
    const current = Array.from(host.children).filter(node => node.matches('.message, .team-row, .self-message'));
    current.forEach(node => { node.dataset.chatCurrent = ''; });

    // Derive context from resolved choices so rerenders and Back stay deterministic.
    const answered = app.state.history.at(-1);
    const previousId = answered?.cardId;
    const previous = previousId && engine.cardById(app.deck, previousId);
    if (!retainsPreviousChat(card, previous, answered?.side)) return null;
    const template = document.createElement('template');
    template.innerHTML = card.mode === 'team'
      ? teamCardMessagesMarkup(previous)
      : personalCardMessagesMarkup(previous);
    const retained = retainedMessageNodes(Array.from(template.content.children));
    retained.forEach((node, index) => {
      node.classList.remove('is-pop');
      node.dataset.chatHistory = '';
      const media = node.matches('.image-bubble') ? node : node.querySelector('.image-bubble');
      if (media && mediaWidths?.[index]) media.style.width = `${mediaWidths[index]}px`;
    });
    host.prepend(...retained);
    chat.classList.toggle('has-chat-history', retained.length > 0);
    if (!retained.length || !current.length) return null;
    const reply = document.createElement('div');
    reply.className = 'self-message chat-player-reply';
    reply.dataset.playerReply = '';
    const text = document.createElement('p');
    const previousFounder = answered.resourcesBefore?.founder
      ?? app.state.resources.founder - (answered.deltas.founder || 0);
    const previousChoices = route.choicesFor(previous, { route: {
      influencerPreviousCardId: app.state.history.at(-2)?.cardId || 'INFLUENCER_04',
    } });
    text.textContent = engine.getChoiceLabel(previousChoices[answered.side], previousFounder);
    reply.append(text);
    host.insertBefore(reply, current[0]);
    return reply;
  }

  function preloadPadelImages() {
    void warmPadelBackgrounds();
    if (padelImagesPreloaded) return;
    padelImagesPreloaded = true;
    for (const src of [
      'assets/irl-padel-court.webp',
      sourceFor('@padel_pro').irlAvatar,
      sourceFor('@iclosedai').irlAvatar,
    ]) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.type = 'image/webp';
      link.fetchPriority = 'low';
      link.href = src;
      document.head.append(link);
    }
  }

  function renderIrlCard(card) {
    const scene = $('[data-scene]');
    const background = window.MISTAKERY_PADEL_BACKGROUNDS?.[card.id];
    const image = background && readyPadelBackgrounds.get(background.src);
    const previous = scene.querySelector('.irl-background');
    if (image) {
      image.className = 'irl-background';
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.draggable = false;
      image.style.objectPosition = background.position;
      // Insert the retained decoded element itself; no fresh image/decode on a turn.
      if (previous !== image) {
        previous?.remove();
        scene.prepend(image);
      }
    } else previous?.remove();
    scene.classList.toggle('has-irl-background', Boolean(image));
    const source = sourceFor(card.source);
    const name = source.irlName || source.name;
    const avatar = characterAvatar(source, name.slice(0, 1).toUpperCase(), source.irlAvatar);
    setContact({ name, role: '', avatar });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      <div class="irl-dialog">${messageLines(card.text, card.preservePunctuation)}</div>`;
  }

  function endingReaction() {
    const ending = app.deck.endings[app.state.endingId];
    const fallback = ending.fallbackReaction;
    const useFallback = fallback && !app.state.flags.includes(fallback.requiresMissing);
    return { id: `ENDING_${app.state.endingId}`, mode: 'personal',
      source: useFallback ? fallback.source : ending.source,
      text: useFallback ? fallback.text : ending.reaction,
      textRu: useFallback ? fallback.textRu : ending.reactionRu };
  }

  function showLossSummary() {
    if (!app.state.gameOver || summarizedRuns.has(app.state)) return;
    recordTestStep();
    sound.stop();
    summarizedRuns.add(app.state);
    renderRunSummary();
    // Swallow the key/click that dismissed the finale before accepting navigation.
    app.locked = true;
    choiceUnlockTimer = window.setTimeout(() => { app.locked = false; }, 280);
    $('[data-chat]').focus({ preventScroll: true });
  }

  function renderRunSummary(feedback = null) {
    const state = app.state;
    const complete = state.endingId === 'run_complete';
    const ending = complete ? null : app.deck.endings[state.endingId];
    window.clearTimeout(choiceUnlockTimer);
    app.locked = false;
    app.cardDelivery = null;
    setView('ended', 'real', feedback);
    renderResources(state.resources, feedback);
    clearPreview();
    setSceneMode('personal');
    hideIrlLocation();
    setReplyHint(false);
    setCardId('RUN_SUMMARY');
    renderPersonalCard({ id: 'RUN_SUMMARY', source: '@b2buddy',
      text: !complete ? 'Thanks for playing. This run is over. You can close the game or start a fresh attempt.'
        : 'Three stories. One company still standing. That’s this run wrapped. Ready to try a different route?' });
    $('[data-chat]').querySelectorAll('.is-pop').forEach(node => node.classList.remove('is-pop'));
    setThread('@b2buddy', complete ? 'Run complete' : 'Run ended');
    const phone = $('[data-game]');
    phone.dataset.runSummary = '';
    phone.dataset.outcome = complete ? 'complete' : 'failure';
    $('[data-ending-summary] small').textContent = complete ? 'END OF RUN' : 'GAME OVER · YOU LOST';
    $('[data-ending-title]').textContent = complete ? 'Run complete' : ending.title;
    $('[data-ending-title]').hidden = !complete && !ending.title;
    $('[data-ending-cause]').textContent = complete
      ? 'All three stories are finished. Your company is still here.' : ending.cause;
    $('[data-ending-summary]').hidden = false;
    const names = { live_agent: 'Live Agent', influencer: 'Influencer', padel: 'Padel' };
    const results = new Map(state.history.map(step => engine.cardById(app.deck, step.cardId))
      .filter(card => card?.outcomeTone).map(card => [card.plot, card]));
    const current = engine.cardById(app.deck, state.currentCardId);
    if (current?.outcomeTone) results.set(current.plot, current);
    const panel = document.createElement('section');
    panel.className = 'run-results'; panel.setAttribute('aria-label', 'Your run');
    const decisions = state.history.length;
    panel.innerHTML = `<p class="run-results__meta">${state.route.completed.length} / ${state.route.order.length} stories finished · ${decisions} ${decisions === 1 ? 'decision' : 'decisions'}</p>`
      + state.route.order.map(plot => {
        const result = results.get(plot);
        const label = result ? result.outcomeTone === 'success' ? 'Success' : 'Setback'
          : plot === state.activeArc ? 'Interrupted' : 'Not reached';
        return `<div class="run-results__row" data-run-result><span>${names[plot]}</span><b>${label}</b></div>`;
      }).join('');
    $('[data-chat]').append(panel);
    setChoices(['Back to 9–5', 'New run'], (side, event) => {
      if (app.locked) return;
      if (side === 'right') restartRun();
      else requestExit(event);
    });
    $('[data-chat]').scrollTop = 0;
  }

  function renderFounderProfile(profile) {
    const state = app.state;
    window.clearTimeout(choiceUnlockTimer);
    app.locked = false;
    app.cardDelivery = null;
    setView('ended');
    clearPreview();
    setReplyHint(false);
    const copy = app.deck.meta.founderProfile;
    const screen = document.createElement('section');
    screen.className = 'founder-screen'; screen.dataset.founderScreen = '';
    screen.setAttribute('aria-label', 'Your founder profile');
    screen.innerHTML = `<section class="founder-card pearl-card" data-profile="${profile.type}" role="button" tabindex="0" aria-label="${htmlAttribute(profile.title + '. ' + profile.line)} Move pointer to tilt, or press Enter to replay the light.">
      <div class="pearl-surface" aria-hidden="true"></div>
      <div class="pearl-reflection" aria-hidden="true"></div>
      <div class="pearl-grain" aria-hidden="true"></div>
      <div class="pearl-rim" aria-hidden="true"></div>
      <header class="profile-heading"><p class="reveal-title">${htmlAttribute(copy.heading)}</p></header>
      <div class="profile-result"><h2 class="founder-title" aria-label="${htmlAttribute(profile.title)}"><span>Chief</span><span class="type-core">${htmlAttribute(profile.core)}</span><span>Officer</span></h2><p class="type-line">${htmlAttribute(profile.line)}</p></div>
      <footer class="card-issuer">${htmlAttribute(copy.issuer)}</footer></section>
      <footer class="founder-actions"><button class="choice founder-finish" type="button" data-profile-finish>Finish</button><button class="choice founder-replay" type="button" data-profile-replay>New run</button></footer>`;
    $('[data-game]').dataset.founderProfile = '';
    $('[data-game]').append(screen);
    disposeFounderCard = window.MistakeryFounderCard.mount(screen.querySelector('.founder-card'));
    screen.querySelector('[data-profile-finish]').addEventListener('click', event => {
      if (app.state === state) requestExit(event);
    });
    screen.querySelector('[data-profile-replay]').addEventListener('click', () => {
      if (app.state === state) restartRun();
    });
    screen.querySelector('.founder-card').focus({ preventScroll: true });
  }

  function renderEnding(feedback = null) {
    const profile = window.MistakeryFounderProfile.reward(app.deck, app.state);
    if (profile) {
      if (revealedProfiles.has(app.state)) return renderFounderProfile(profile);
      // Reconstruct the pending invitation after a test Back or render, without
      // advancing the route, spending cash, or rolling outcomes again.
      if (!winPresentations.has(app.state)) {
        const last = app.state.history.at(-1);
        winPresentations.set(app.state, { pending: true, cardId: last.cardId, feedback: last,
          celebrationKey: JSON.stringify([app.state.seed, app.state.route.cycle, last.cardId]) });
      }
      return showWinFeedback();
    }
    if (app.state.endingId === 'run_complete' || summarizedRuns.has(app.state)) return renderRunSummary(feedback);
    const lossCard = resourceLossCard();
    if (lossCard) return renderLossCard(lossCard, feedback);
    soundOnce('ending-alert', 'story-loss');
    const ending = app.deck.endings[app.state.endingId];
    const storyCard = engine.cardById(app.deck, app.state.currentCardId);
    const card = storyCard?.terminalEnding === app.state.endingId ? storyCard : endingReaction();
    setView('ended', 'real', feedback);
    renderResources(app.state.resources, feedback);
    clearPreview();
    setSceneMode('personal');
    hideIrlLocation();
    setReplyHint(false);
    setCardId(card.id);
    renderPersonalCard(card);
    setThread(card.source, 'Game over');
    $('[data-game]').dataset.outcome = 'failure';
    const judgment = app.state.endingId === 'judgment_day';
    const endedState = app.state;
    $('[data-ending-summary] small').textContent = judgment ? 'GAME OVER' : 'GAME OVER · YOU LOST';
    $('[data-ending-title]').textContent = ending.title;
    $('[data-ending-title]').hidden = !ending.title;
    $('[data-ending-cause]').textContent = ending.cause;
    $('[data-ending-summary]').hidden = false;
    for (const id of app.state.route.ending.causes) {
      const key = app.deck.endings[id].resource;
      $(`[data-resource="${key}"]`).classList.add('is-fatal');
    }
    setChoices(judgment ? ['Oops', 'Finally 😍'] : ['Back to 9–5', 'New run'], (side, event) => {
      if (app.locked || app.state !== endedState) return;
      if (judgment || side === 'right') restartRun();
      else requestExit(event);
    });
    $('[data-chat]').scrollTop = 0;
  }

  function renderCard(feedback = null) {
    if (winPresentations.get(app.state)?.pending) return showWinFeedback();
    if (app.state.gameOver) return renderEnding(feedback);
    const card = engine.cardById(app.deck, app.state.currentCardId);
    if (!card || !app.activeCardIds.includes(card.id)) {
      throw new Error(`Disabled card cannot enter the Personal Chat runtime: ${app.state.currentCardId}`);
    }
    if (card.id === 'OPEN_INVESTOR' || card.id === 'DREAM_TEAM' || card.id.startsWith('PADEL_') || card.id.startsWith('IRL_PADEL_')) {
      preloadPadelImages();
    }
    const complete = app.view === 'irl-complete';
    const deliveryKey = `${card.id}:${app.state.history.length}`;
    const historyMediaWidths = sentMediaWidths
      || (app.cardDelivery?.key === deliveryKey ? app.cardDelivery.historyMediaWidths : null);
    const readingHistory = app.cardDelivery?.key === deliveryKey && app.cardDelivery.follow === false;
    const previousScroll = $('[data-chat]').scrollTop;
    setView(complete ? 'irl-complete' : 'playing', 'real', feedback);
    renderResources(app.state.resources, feedback);
    setSceneMode(card.mode);
    if (card.mode === 'irl') showIrlLocation(card);
    else hideIrlLocation();
    setReplyHint(card.mode !== 'irl');
    setCardId(card.id);
    if (card.mode === 'irl') renderIrlCard(card);
    else if (card.mode === 'team') renderTeamCard(card);
    else renderPersonalCard(card);
    const playerReply = prependPreviousChatMessages(card, historyMediaWidths);

    if (card.arc === 'live_agent' || playerReply) {
      $('[data-chat]').scrollTop = 0;
      $('[data-chat]').querySelectorAll('[data-chat-current]').forEach((bubble, index) => {
        bubble.style.animationDelay = `${index * 90}ms`;
      });
    }

    const choices = influencerChoicesFor(card);
    const left = engine.getChoiceLabel(choices.left, app.state.resources.founder);
    const right = engine.getChoiceLabel(choices.right, app.state.resources.founder);
    setChoices([left, right], () => {}, { disabled: complete });
    bindCardChoices(card, choices, complete);
    const attentionMs = resourceAttentionMs(feedback);
    stageCardMessages(card, attentionMs);
    if (playerReply && app.cardDelivery && historyMediaWidths) app.cardDelivery.historyMediaWidths = historyMediaWidths;
    if (playerReply) {
      focusContinuation();
      const chat = $('[data-chat]');
      let size = `${chat.clientWidth}:${chat.clientHeight}`;
      continuationResizeObserver = new ResizeObserver(() => {
        const nextSize = `${chat.clientWidth}:${chat.clientHeight}`;
        if (size === nextSize) return;
        size = nextSize;
        if (app.cardDelivery?.follow !== false) focusContinuation();
      });
      continuationResizeObserver.observe(chat);
    }
    if (!readingHistory) keepDeliveryVisible($('[data-chat] .typing-bubble'));
    presentOutcome(card);
    if (readingHistory) {
      $('[data-chat]').scrollTop = previousScroll;
      updateHistoryVisibility();
    }
  }

  function presentOutcome(card) {
    if (!card.outcomeTone) return;
    const phone = $('[data-game]');
    phone.dataset.outcome = card.outcomeTone;
    if (card.outcomeBanner !== false) hideIrlLocation();
    if (presentedOutcomes.has(app.state)) return;
    presentedOutcomes.add(app.state);
    // Result feedback takes precedence over send/arrival in the same transition.
    soundOnce('outcome-alert', card.outcomeTone === 'success' ? 'story-win' : 'story-loss');
    // Flush the cleared class so consecutive outcomes also get one entrance.
    void phone.offsetWidth;
    phone.classList.add('is-outcome-entering');
    if (card.outcomeTone === 'catastrophic') stageOutcomeImageMotion();
  }

  function stageOutcomeImageMotion() {
    const image = $('[data-chat] .message-image');
    const state = app.state;
    if (!image) return;
    let cancelled = false;
    const timeout = window.setTimeout(cancel, 2500);
    function cancel() {
      cancelled = true;
      window.clearTimeout(timeout);
      image.classList.remove('is-outcome-image-ready');
    }
    cancelOutcomeImageMotion = cancel;
    // Decode waits for actual pixels, including a cold/slow image request.
    // Navigation cancels this scope; a timeout/error simply omits this decoration.
    image.decode().then(() => {
      if (cancelled || app.state !== state || app.view !== 'playing' || !image.isConnected
        || document.hidden) return;
      window.clearTimeout(timeout);
      image.classList.add('is-outcome-image-ready');
    }).catch(cancel);
  }

  function keepDeliveryVisible(node) {
    if (!node) return;
    const chat = $('[data-chat]');
    const nodeBounds = node.getBoundingClientRect();
    const chatBounds = chat.getBoundingClientRect();
    // Scroll along the stage's local vertical axis after its portrait rotation.
    const overflow = (landscapeTouch.matches
      ? document.documentElement.dataset.portraitDirection === 'reverse'
        ? nodeBounds.right - chatBounds.right
        : chatBounds.left - nodeBounds.left
      : nodeBounds.bottom - chatBounds.bottom) + 12;
    if (overflow > 0) chat.scrollTop += overflow;
  }

  function updateHistoryVisibility() {
    const chat = $('[data-chat]');
    chat.querySelectorAll('[data-chat-history]').forEach(node => {
      // Hide only a thin clipped tail; keep substantial text and photos visible.
      const remaining = node.offsetTop + node.offsetHeight - chat.scrollTop;
      node.classList.toggle('is-clipped-history', node.offsetTop < chat.scrollTop && remaining <= 24);
    });
  }

  function focusContinuation() {
    const chat = $('[data-chat]');
    const current = Array.from(chat.querySelectorAll('[data-chat-current], .typing-bubble'));
    const media = current.filter(node => node.matches('.image-bubble'));
    media.forEach(bubble => { bubble.style.width = ''; });
    // Measure layout boxes, not the translated/scaled entrance animation.
    const gap = parseFloat(getComputedStyle(current[0].parentElement).gap) || 0;
    const contentHeight = () => current.reduce((height, node) => height + node.offsetHeight, 0)
      + gap * (current.length - 1);
    // The scroll surface extends behind the floating contact. Media must fit
    // the readable area below it, excluding the contact's initial top padding.
    const availableHeight = chat.clientHeight - parseFloat(getComputedStyle(chat).paddingTop) - 16;
    // Shrink the entire media bubble, leaving the image's intrinsic ratio intact.
    // Recheck the caption at each width because its line wrapping changes too.
    media.forEach(bubble => {
      let width = bubble.offsetWidth;
      let bestWidth = width;
      let bestHeight = contentHeight();
      while (contentHeight() > availableHeight && width > 128) {
        width = Math.max(128, width - 4);
        bubble.style.width = `${width}px`;
        const height = contentHeight();
        if (height < bestHeight) { bestWidth = width; bestHeight = height; }
      }
      bubble.style.width = `${bestWidth}px`;
    });
    // New content takes priority; the reply and earlier messages remain in history.
    chat.scrollTop = chat.scrollHeight;
    updateHistoryVisibility();
  }

  function stageCardMessages(card, attentionMs = 0) {
    const chat = $('[data-chat]');
    const stack = card.mode === 'team' || card.previewMixedPersonal ? chat : chat.querySelector('[data-message-stack]');
    const nodes = Array.from(chat.querySelectorAll('[data-chat-current]'));
    function announceDelivery(arrived) {
      // Story outcomes already have their own approved signal.
      if (card.outcomeTone) return;
      let cue;
      arrived.forEach(node => {
        const outgoing = node.matches('.self-message');
        const direction = outgoing ? 'outgoing' : 'incoming';
        if (!soundOnce(`${direction}:${card.id}:${nodes.indexOf(node)}`)) return;
        // A reveal-all batch has one cue for its last fresh bubble.
        cue = outgoing ? 'send' : 'incoming';
      });
      if (cue) sound.play(cue);
    }
    const repeated = app.state.history.slice(app.state.route.cycleStart).some(step => step.cardId === card.id);
    const key = `${card.id}:${app.state.history.length}`;
    const restoring = app.cardDelivery?.key === key;
    const pauses = restoring && app.cardDelivery.pauses ? app.cardDelivery.pauses
      : card.mode === 'irl' || repeated ? [] : defaultTypingPauses(card, nodes);
    const startsWithMedia = nodes[0]?.matches('.image-bubble, .media-placeholder') || nodes[0]?.querySelector('.message-image');
    if (!restoring && attentionMs && card.mode !== 'irl' && !startsWithMedia) {
      // Reuse the opening wait instead of stacking another delay onto it.
      if (pauses[0]?.after === 0) pauses[0] = { ...pauses[0], durationMs: Math.max(attentionMs, pauses[0].durationMs) };
      else pauses.unshift({ after: 0, durationMs: attentionMs });
    }
    if (!pauses.length) {
      if (card.mode === 'irl') {
        // The existing event snapshot makes render/Back silent and still lets
        // a newly accepted choice after Back get its own fresh entrance.
        const fresh = soundOnce(`padel:${key}`, 'padel');
        if (fresh && !card.outcomeTone) presentIrlArrival();
      }
      else { announceDelivery(nodes); queueMessageReactions(nodes, restoring || repeated); }
      const outgoing = nodes.filter(node => node.matches('.self-message'));
      app.cardDelivery = outgoing.length ? { key, pauses, delivered: true } : null;
      outgoing.forEach(node => {
        node.classList.remove('is-pop');
        if (!restoring && !repeated && !reducedMotion.matches) animateArrival(node, 16, true, document.timeline.currentTime);
      });
      if (repeated) nodes.forEach(node => node.classList.remove('is-pop'));
      if (isLossCard()) showLossPreviewDefeat();
      return;
    }
    if (app.cardDelivery?.key !== key) {
      app.cardDelivery = { key, pauses, delivered: false, pauseIndex: 0, deadline: Date.now() + pauses[0].durationMs, follow: true };
    }
    const delivery = app.cardDelivery;
    if (delivery.delivered) {
      queueMessageReactions(nodes, true);
      nodes.forEach(node => { node.classList.remove('is-pop'); node.style.animationDelay = ''; });
      if (isLossCard()) showLossPreviewDefeat();
      return;
    }
    const pending = nodes.slice(pauses[delivery.pauseIndex].after);
    pending.forEach(node => node.remove());
    if (restoring) nodes.filter(node => node.isConnected).forEach(node => {
      node.classList.remove('is-pop'); node.style.animationDelay = '';
    });
    announceDelivery(nodes.filter(node => node.isConnected));
    queueMessageReactions(nodes.filter(node => node.isConnected), restoring);
    let typing;
    const anchor = card.mode === 'team' || card.previewMixedPersonal ? chat.querySelector('.message-clearance') : null;
    const append = node => stack.insertBefore(node, typing || anchor);
    const buttons = Array.from(document.querySelectorAll('[data-choice]'));
    buttons.forEach(button => { button.disabled = true; });
    chat.setAttribute('aria-busy', 'true');
    $('.reply-hint__text').textContent = 'Tap chat to show all';
    function isCurrent() { return (app.view === 'playing' || app.view === 'ended' && isLossCard()) && app.cardDelivery === delivery && stack.isConnected; }
    function followDelivery() {
      if (delivery.follow === false) { updateHistoryVisibility(); return; }
      if (chat.classList.contains('has-chat-history')) focusContinuation();
      else keepDeliveryVisible(typing || nodes.at(-1));
    }
    function finish() {
      window.clearTimeout(cardTypingTimer);
      typing?.remove(); typing = null;
      delivery.delivered = true;
      chat.removeAttribute('aria-busy');
      $('.reply-hint__text').textContent = 'Choose a reply...';
      buttons.forEach(button => { button.disabled = false; });
      revealCardMessages = () => {};
      if (isLossCard()) showLossPreviewDefeat();
    }
    revealCardMessages = () => {
      if (!isCurrent() || delivery.delivered) return;
      cancelArrivalMotion();
      const revealed = pending.splice(0);
      announceDelivery(revealed);
      revealed.forEach(node => {
        node.style.animationDelay = '';
        node.classList.remove('is-pop');
        append(node);
      });
      queueMessageReactions(revealed);
      finish(); followDelivery();
    };
    function showTyping() {
      const next = pending[0];
      const sourceId = next.dataset.source || card.source;
      const outgoing = next.matches('.self-message');
      if (typing?.dataset.source === sourceId && typing.dataset.outgoing === String(outgoing)) return;
      typing?.remove(); typing = null;
      if (next.matches('[data-system-event]')) return;
      const source = sourceFor(sourceId);
      const indicator = document.createElement('button');
      indicator.type = 'button'; indicator.className = 'typing-bubble';
      indicator.setAttribute('aria-label', outgoing ? 'Founder is typing' : `${source.name} is typing`);
      indicator.title = 'Show all messages';
      indicator.setAttribute('aria-description', 'Show all messages');
      indicator.innerHTML = '<span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      indicator.addEventListener('click', event => {
        event.stopPropagation();
        if (event.detail && (!chatGesture || chatGesture.moved || chatGesture.delivery !== delivery
          || Math.abs(chatGesture.scroll - chat.scrollTop) > 10)) return;
        revealCardMessages();
      });
      if (outgoing) {
        indicator.classList.add('preview-composer', 'founder-composer');
        typing = indicator;
      } else if (card.mode === 'team') {
        typing = document.createElement('div');
        typing.className = 'team-row typing-row'; typing.dataset.source = sourceId;
        const initials = card.messages.find(message => message.source === sourceId)?.avatar;
        typing.innerHTML = `<div class="member-avatar" aria-hidden="true">${characterAvatar(source, initials)}</div>`;
        indicator.classList.add('team-bubble');
        const meta = document.createElement('span'); meta.className = 'team-meta';
        meta.textContent = source.name;
        if (source.role) {
          const role = document.createElement('span'); role.className = 'team-role';
          role.textContent = ` · ${source.role}`; meta.append(role);
        }
        indicator.prepend(meta); typing.append(indicator);
      } else typing = indicator;
      typing.dataset.source = sourceId;
      typing.dataset.outgoing = String(outgoing);
      stack.insertBefore(typing, anchor);
    }
    function deliverNext() {
      if (!isCurrent() || delivery.delivered) return;
      cancelArrivalMotion();
      const animate = delivery.follow !== false;
      const positions = animate
        ? Array.from(chat.querySelectorAll('[data-chat-current], [data-chat-history], [data-player-reply]'))
          .map(node => [node, node.offsetTop - chat.scrollTop]) : [];
      const typingTop = typing ? typing.offsetTop - chat.scrollTop : 0;
      const previousPause = pauses[delivery.pauseIndex];
      const nextPause = pauses[++delivery.pauseIndex];
      const count = nextPause ? nextPause.after - previousPause.after : pending.length;
      const arrived = pending.splice(0, count);
      announceDelivery(arrived);
      arrived.forEach(node => {
        node.style.animationDelay = '';
        append(node);
      });
      if (nextPause) {
        showTyping();
        delivery.deadline = Date.now() + nextPause.durationMs;
        cardTypingTimer = window.setTimeout(deliverNext, nextPause.durationMs);
      } else {
        finish();
      }
      arrived.forEach(node => node.classList.remove('is-pop'));
      queueMessageReactions(arrived);
      followDelivery();
      if (!animate) return;
      // One measured displacement and timeline for history, new bubbles and dots.
      // Local coordinates also work in the rotated portrait stage. Never layer
      // a separate CSS entrance onto the incoming bubble: it would change gaps.
      const last = positions.at(-1);
      const delta = last ? last[1] - (last[0].offsetTop - chat.scrollTop)
        : typingTop - (arrived[0].offsetTop - chat.scrollTop);
      const start = document.timeline.currentTime;
      [...positions.map(([node]) => node), ...arrived, typing].filter(Boolean).forEach(node => {
        const fade = arrived.includes(node) || node === typing;
        // Keep arrivals visible with reduced motion, without shifting existing text.
        if (reducedMotion.matches && !fade) return;
        animateArrival(node, reducedMotion.matches ? 0 : delta, fade, start);
      });
    }
    nodes.filter(node => node.isConnected && node.matches('.self-message')).forEach(node => {
      node.classList.remove('is-pop');
      if (!restoring && !reducedMotion.matches) animateArrival(node, 16, true, document.timeline.currentTime);
    });
    showTyping();
    cardTypingTimer = window.setTimeout(deliverNext, Math.max(0, delivery.deadline - Date.now()));
  }

  function defaultTypingPauses(card, nodes) {
    const authored = card.typingPauses || (card.typingPause ? [card.typingPause] : []);
    const firstText = nodes[0] && !nodes[0].matches('.self-message, .image-bubble')
      && !nodes[0].querySelector('.message-image');
    const previousCard = engine.cardById(app.deck, app.state.history.at(-1)?.cardId);
    // Briefly cue a new conversation or a different speaker taking over a team thread.
    const newTeamAuthor = card.mode === 'team' && previousCard?.source === card.source
      && previousCard.messages?.at(-1)?.source !== nodes[0]?.dataset.source;
    const opening = nodes[0]?.matches('.self-message')
      ? [{ after: 0, durationMs: nodes[0].matches('.preview-attachment') ? 850 : 650 }]
      : firstText && (nodes.length === 1 || newTeamAuthor || previousCard && previousCard.source !== card.source)
      ? [{ after: 0, durationMs: 500 }] : [];
    return opening.concat(nodes.slice(1).map((next, index) => {
      const previous = nodes[index];
      const changedAuthor = card.mode === 'team' && next.dataset.source !== previous.dataset.source;
      // Let each thought land before the next bubble. Fragments of the same
      // original message stay closer together; a new reply/speaker gets a beat.
      // Count message copy only (no nicknames/roles); photos need a longer glance.
      const words = Array.from(previous.querySelectorAll('p')).map(p => p.textContent).join(' ').trim().split(/\s+/).length;
      const media = previous.matches('.image-bubble, .media-placeholder') || previous.querySelector('.message-image, .media-placeholder');
      const readingMs = media || words > 28 ? 1900 : words > 12 ? 1500 : 1100;
      const sameThought = previous.dataset.messageOrigin !== undefined
        && previous.dataset.messageOrigin === next.dataset.messageOrigin;
      const beatMs = readingMs + (sameThought ? 0 : 400) + (changedAuthor ? 300 : 0);
      const durationMs = next.matches('.self-message')
        ? authored.find(pause => pause.after === index + 1)?.durationMs ?? beatMs + 200
        : authored.find(pause => pause.after === index + 1)?.durationMs ?? beatMs;
      return { after: index + 1, durationMs };
    }).filter(pause => pause.durationMs > 0));
  }

  function influencerChoicesFor(card) {
    return route.choicesFor(card, app.state);
  }

  function influencerChoiceTargets(card, side) {
    return route.choiceTargets(app.deck, app.state, card, side);
  }

  function choose(side) {
    if (app.locked || app.view !== 'playing') return;
    if (app.cardDelivery && !app.cardDelivery.delivered) return;
    sound.unlock();
    const card = engine.cardById(app.deck, app.state.currentCardId);
    // Resolve exactly once; the accepted answer is already composed by the player.
    const resolved = route.resolveChoice(app.deck, app.state, side,
      directStoryTest ? { outcomeRng: Math.random } : {}).state;
    const next = engine.cardById(app.deck, resolved.currentCardId);
    // IRL card changes use the ball/result cue; there is no message to send.
    if (card.mode !== 'irl' && next?.mode !== 'irl') sound.play('send');
    if (!resolved.gameOver && retainsPreviousChat(next, card, side)) {
      sentMediaWidths = retainedMessageNodes(Array.from($('[data-chat]').querySelectorAll('[data-chat-current]')))
        .map(node => (node.matches('.image-bubble') ? node : node.querySelector('.image-bubble'))?.offsetWidth || null);
    }
    resolveCardChoice(card, side, undefined, resolved);
  }

  function resolveCardChoice(card, side, scrollTop, resolved) {
    const celebrationKey = JSON.stringify([app.state.seed, app.state.route.cycle, card.id]);
    recordTestStep(scrollTop);
    app.locked = true;
    clearPreview();
    app.state = resolved || route.resolveChoice(app.deck, app.state, side,
      directStoryTest ? { outcomeRng: Math.random } : {}).state;
    const feedback = app.state.history.at(-1);
    if (card.outcomeTone === 'success' && card.winFeedback && (!app.state.gameOver || app.state.endingId === 'run_complete')) {
      // Route settlement/draw has already happened once. Hold presentation only:
      // no next-card typing, incoming sound, scrolling or gameplay work behind the modal.
      winPresentations.set(app.state, { pending: true, cardId: card.id, feedback, celebrationKey });
      showWinFeedback();
      return;
    }
    renderCard(feedback);
    const nextCard = engine.cardById(app.deck, app.state.currentCardId);
    unlockAfterChoice(nextCard?.mode === 'irl' ? resourceAttentionMs(feedback) : 0);
  }

  function resourceAttentionMs(feedback) {
    if (!feedback || reducedMotion.matches) return 0;
    const largest = Math.max(...engine.RESOURCE_KEYS.map(key => Math.abs(feedback.rawAfter[key] - feedback.rawBefore[key])));
    return largest >= 2 ? 420 : largest > 0 ? 200 : 0;
  }

  function renderTitle() {
    sound.stop();
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    app.cardDelivery = null;
    app.locked = true;
    setView('title', 'intro');
    $('[data-chat]').innerHTML = '<span class="sr-only" data-card-id>TITLE</span>';
    $('[data-choices]').replaceChildren();
    clearPreview();
    const screen = document.createElement('button');
    screen.type = 'button';
    screen.className = 'title-screen'; screen.dataset.titleScreen = ''; screen.dataset.titlePlay = '';
    screen.setAttribute('aria-label', 'Mistakery — Tap to play');
    screen.innerHTML = '<span class="title-prompt">Tap to play</span>';
    screen.prepend(titleLogo);
    $('[data-game]').append(screen);
    // The exit click must never pass through to Play, including rapid double taps.
    choiceUnlockTimer = window.setTimeout(() => { app.locked = false; }, 280);
    screen.addEventListener('click', event => {
      if (event.detail > 1) return;
      if (app.view === 'title' && !app.locked) restartRun();
    });
    screen.addEventListener('keydown', event => {
      if (event.repeat) event.preventDefault();
    });
    screen.focus({ preventScroll: true });
  }

  function exitRun() {
    if (app.view === 'title') return;
    recordTestStep();
    renderTitle();
  }

  function requestExit(event) {
    if (lossPreviewEnabled) return openLossPreview(app.lossPreviewIndex);
    if (app.view === 'onboarding' || app.view === 'title' || !app.state) return;
    if ($('[data-quit-dialog]')) return;
    const origin = event?.currentTarget || document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'quit-dialog'; dialog.dataset.quitDialog = '';
    dialog.setAttribute('aria-labelledby', 'quit-title');
    dialog.setAttribute('aria-describedby', 'quit-description');
    dialog.innerHTML = `<h2 id="quit-title">Do you really want to quit?</h2>
      <p id="quit-description">Your current run will be lost.</p>
      <footer class="choices"><button class="choice" type="button" data-quit-confirm>Quit</button>
      <button class="choice choice--right" type="button" data-quit-cancel autofocus>Cancel</button></footer>`;
    const cancel = () => {
      dialog.close(); dialog.remove();
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
    dialog.querySelector('[data-quit-cancel]').addEventListener('click', cancel);
    const confirm = dialog.querySelector('[data-quit-confirm]');
    confirm.addEventListener('click', async () => {
      confirm.disabled = true;
      confirm.setAttribute('aria-busy', 'true');
      const ready = await titleLogoReady;
      // Cancel/Escape can dismiss this dialog while the network is pending.
      if (!dialog.isConnected || !dialog.open) return;
      if (!ready) {
        confirm.disabled = false;
        confirm.removeAttribute('aria-busy');
        let status = dialog.querySelector('[role="status"]');
        if (!status) {
          status = document.createElement('p');
          status.setAttribute('role', 'status');
          dialog.append(status);
        }
        status.textContent = 'Logo could not load. Try Quit again.';
        titleLogoReady = prepareTitleLogo();
        return;
      }
      dialog.close(); dialog.remove(); exitRun();
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
    document.body.append(dialog);
    sound.stop();
    dialog.showModal();
  }

  function restartRun() {
    sound.stop();
    if (lossPreviewEnabled) return openLossPreview(app.lossPreviewIndex);
    recordTestStep();
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    app.cardDelivery = null;
    app.state = route.nextRun(app.deck, app.state);
    app.runStartState = structuredClone(app.state);
    app.locked = false;
    beginRun();
  }

  // Document review owns its own fixtures and replies. Never resolve a gameplay
  // choice, settle resources, or draw from the ordinary route in this mode.
  function setupLossPreview() {
    const controls = $('[data-test-controls]');
    $('[data-test-back]').hidden = true;
    $('[data-test-restart]').hidden = true;
    $('[data-test-controls] > span').hidden = true;
    $('[data-restart-run]').textContent = 'Replay card';
    $('[data-test-inspect]').textContent = 'RU';
    $('[data-test-inspect]').setAttribute('aria-label', 'Перевод из документа');
    const select = document.createElement('select');
    select.dataset.lossSelect = '';
    select.setAttribute('aria-label', 'Карта из документа');
    window.MISTAKERY_LOSS_PREVIEW.cards.forEach(card => {
      const option = document.createElement('option');
      option.value = card.id; option.textContent = card.title; select.append(option);
    });
    select.addEventListener('change', () => openLossPreview(
      window.MISTAKERY_LOSS_PREVIEW.cards.findIndex(card => card.id === select.value)));
    controls.prepend(select);
    for (const [direction, label, step] of [['prev', '← Previous', -1], ['next', 'Next →', 1]]) {
      const button = document.createElement('button');
      button.type = 'button'; button.dataset[direction === 'prev' ? 'lossPrev' : 'lossNext'] = '';
      button.textContent = label;
      button.addEventListener('click', () => openLossPreview(app.lossPreviewIndex + step));
      controls.append(button);
    }
    const note = document.createElement('p');
    note.className = 'loss-preview-note'; note.dataset.lossNote = ''; controls.append(note);
    const requested = window.MISTAKERY_LOSS_PREVIEW.cards.findIndex(card => card.id === params.get('card'));
    openLossPreview(requested < 0 ? 0 : requested);
  }

  function openLossPreview(index) {
    sound.stop();
    const cards = window.MISTAKERY_LOSS_PREVIEW.cards;
    app.lossPreviewIndex = Math.max(0, Math.min(cards.length - 1, index ?? 0));
    const card = cards[app.lossPreviewIndex];
    app.cardDelivery = null;
    app.lossPreviewReply = null;
    app.state = { currentCardId: card.id, resources: { cash: 50, team: 50, customers: 50, founder: 50, ...card.fixture },
      flags: [], history: [], gameOver: false, route: { cycleStart: 0 } };
    app.locked = false;
    const url = new URL(window.location.href); url.searchParams.set('card', card.id);
    window.history.replaceState(window.history.state, '', url);
    renderLossPreview();
  }

  function renderLossPreview() {
    return renderLossCard(window.MISTAKERY_LOSS_PREVIEW.cards[app.lossPreviewIndex]);
  }

  function renderLossCard(card, feedback = null) {
    setView(lossPreviewEnabled ? 'playing' : 'ended', 'real', feedback);
    $('[data-game]').dataset.lossPreview = '';
    if (lossPreviewEnabled) {
      $('[data-test-controls] > span').textContent = `Document preview · ${app.lossPreviewIndex + 1}/${window.MISTAKERY_LOSS_PREVIEW.cards.length}`;
      $('[data-loss-select]').value = card.id;
      $('[data-loss-prev]').disabled = app.lossPreviewIndex === 0;
      $('[data-loss-next]').disabled = app.lossPreviewIndex === window.MISTAKERY_LOSS_PREVIEW.cards.length - 1;
      $('[data-loss-note]').textContent = 'Любой ответ открывает финальную реплику b2buddy. Оба финальных выбора только закрывают попап.';
    }
    if (!lossPresentations.has(app.state)) lossPresentations.set(app.state, { reply: null, defeated: false });
    const presentation = lossPresentations.get(app.state);
    const flash = document.createElement('div');
    flash.className = 'loss-preview-defeat'; flash.dataset.lossFlash = '';
    flash.setAttribute('aria-hidden', 'true'); document.body.append(flash);
    renderResources(app.state.resources, feedback);
    clearPreview();
    setSceneMode(card.mode); hideIrlLocation(); setReplyHint(true); setCardId(card.id);
    if (card.mode === 'team') renderTeamCard(card);
    else {
      setThread(card.source, 'typing...');
      $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>` + card.messages.map(message => {
        if (message.direction === 'outgoing') return previewOutgoingMessageMarkup(message);
        return `<div class="message-row" data-source="${htmlAttribute(message.source)}"><div class="mini-avatar message-avatar" aria-hidden="true">${characterAvatar(sourceFor(message.source))}</div><div class="message-stack">${cardMessageMarkup(htmlAttribute(message.text), true)}</div></div>`;
      }).join('') + '<div class="message-clearance" aria-hidden="true"></div>';
    }
    const chat = $('[data-chat]');
    Array.from(chat.children).filter(node => !node.matches('.sr-only, .message-clearance'))
      .forEach(node => { node.dataset.chatCurrent = ''; });
    const appendReply = text => {
      const reply = document.createElement('div'); reply.className = 'self-message chat-player-reply'; reply.dataset.playerReply = '';
      reply.innerHTML = messageLines(htmlAttribute(text), true);
      chat.insertBefore(reply, chat.querySelector('.message-clearance'));
      document.querySelectorAll('[data-choice]').forEach(button => { button.disabled = true; });
      keepDeliveryVisible(reply);
      return reply;
    };
    setChoices(card.replies.map(reply => reply.en), side => {
      if (presentation.reply || app.cardDelivery && !app.cardDelivery.delivered) return;
      sound.play('send');
      presentation.reply = card.replies[side === 'left' ? 0 : 1].en;
      app.lossPreviewReply = presentation.reply;
      appendReply(presentation.reply);
      showLossPreviewFinale(card.id, side);
    });
    stageCardMessages({ ...card, previewMixedPersonal: card.mode === 'personal' });
    if (presentation.reply) appendReply(presentation.reply);
    if (card.initialMembers) {
      const updateMembers = () => {
        const left = chat.querySelectorAll('[data-left-member]').length;
        $('[data-status]').textContent = `${(parseInt(sourceFor(card.source).role, 10) || card.initialMembers) - left} members`;
      };
      app.lossPreviewObserver = new MutationObserver(updateMembers);
      app.lossPreviewObserver.observe(chat, { childList: true });
      updateMembers();
    }
    chat.scrollTop = 0;
  }

  function showLossPreviewDefeat() {
    const flash = $('[data-loss-flash]');
    const presentation = lossPresentations.get(app.state);
    if (!flash || !presentation) return;
    flash.dataset.card = lossPreviewEnabled ? app.state.currentCardId : resourceLossCard().id;
    flash.classList.toggle('is-restored', presentation.defeated);
    flash.classList.add('is-defeated');
    const phone = $('[data-game]');
    phone.dataset.outcome = 'failure';
    if (!presentation.defeated) phone.classList.add('is-outcome-entering');
    if (!presentation.defeated) soundOnce('defeat-alert', 'resource-loss');
    presentation.defeated = true;
  }

  function lossFinaleText(text) {
    const tail = text.match(/\S+\s+[✨🚀]$/u);
    return tail ? `${htmlAttribute(text.slice(0, tail.index))}<span class="loss-finale__emoji-tail">${htmlAttribute(tail[0])}</span>` : htmlAttribute(text);
  }

  function showLossPreviewFinale(cardId, side) {
    const data = window.MISTAKERY_LOSS_FINALE;
    const finale = data.cards.find(card => card.id === cardId);
    const lines = finale.responses[side === 'left' ? 0 : 1].en;
    const source = sourceFor('@b2buddy');
    const dialog = document.createElement('dialog');
    dialog.className = 'loss-finale'; dialog.dataset.lossFinale = ''; dialog.dataset.card = cardId;
    dialog.setAttribute('aria-labelledby', 'loss-finale-sender');
    dialog.innerHTML = `<header class="loss-finale__head">
      <div class="avatar" aria-hidden="true">${characterAvatar(source)}</div>
      <div class="contact__text"><b id="loss-finale-sender">${htmlAttribute(source.name)}</b><i>${htmlAttribute(source.role)}</i></div>
    </header>
    <div class="loss-finale__body" tabindex="0" autofocus aria-label="Message from ${htmlAttribute(source.name)}">
      <div class="message">${lines.map((text, index) => {
        if (index === 0) {
          return `<p class="loss-finale__opening"><span class="loss-finale__lead">${lossFinaleText(text)}</span></p>`;
        }
        if (index === 1) {
          const contrast = text.match(/^(You (?:weren’t|didn’t) )(.+?)( — .+)$/u);
          const phrase = contrast && contrast[2].match(/^(.*?)(\S+)$/u);
          return `<p class="loss-finale__quote">${contrast
            ? `${htmlAttribute(contrast[1])}<em>${htmlAttribute(phrase[1])}</em><span class="loss-finale__contrast-tail"><em>${htmlAttribute(phrase[2])}</em> —</span>${htmlAttribute(contrast[3].slice(2))}`
            : htmlAttribute(text)}</p>`;
        }
        if (index === lines.length - 1) return `<p class="loss-finale__invitation">${htmlAttribute(text)}</p>`;
        const reflection = text.match(/^(And honestly\?)(\s+.+)$/u);
        return `<p class="loss-finale__reflection">${reflection
          ? `<span class="loss-finale__honestly">${htmlAttribute(reflection[1] + ' ')}</span>${lossFinaleText(reflection[2].trimStart())}`
          : lossFinaleText(text)}</p>`;
      }).join('')}</div>
    </div>
    <footer class="choices">${(lossPreviewEnabled ? data.choices.en : ['Back to 9–5', 'New run']).map((label, index) => `<button type="button" class="choice${index ? ' choice--right' : ''}" data-finale-choice>${htmlAttribute(label)}</button>`).join('')}</footer>`;
    // The answered source choices are disabled; return to an available control.
    const dismiss = () => {
      sound.stop();
      dialog.close();
      $('[data-restart-run]').focus({ preventScroll: true });
    };
    dialog.querySelectorAll('[data-finale-choice]').forEach((button, index) => {
      button.addEventListener('click', event => {
        if (lossPreviewEnabled) dismiss();
        else if (index === 0) requestExit(event);
        else restartRun();
        sound.play('send');
      });
    });
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      if (lossPreviewEnabled) dismiss();
      else showLossSummary();
    });
    document.body.append(dialog);
    dialog.showModal();
    soundOnce('finale-alert', 'ai-finale');
  }

  function renderWinFeedbackBackground(presentation) {
    // Also reconstruct this held view when Back crosses a restart. Rendering the
    // resolved next card here would start its delivery before the free dismissal.
    const card = engine.cardById(app.deck, presentation.cardId);
    window.clearTimeout(choiceUnlockTimer);
    app.locked = true;
    app.cardDelivery = null;
    const freshFeedback = soundEvents.get(app.state)?.has('win-finale-alert') ? null : presentation.feedback;
    setView('playing', 'real', freshFeedback);
    renderResources(app.state.resources, freshFeedback);
    setSceneMode(card.mode);
    if (card.mode === 'irl') showIrlLocation(card);
    else hideIrlLocation();
    setReplyHint(card.mode !== 'irl');
    setCardId(card.id);
    if (card.mode === 'irl') renderIrlCard(card);
    else if (card.mode === 'team') renderTeamCard(card);
    else renderPersonalCard(card);
    $('[data-chat]').querySelectorAll('.is-pop').forEach(node => node.classList.remove('is-pop'));
    $('[data-game]').dataset.outcome = card.outcomeTone;
    const choices = route.choicesFor(card, app.state);
    setChoices(['left', 'right'].map(side => engine.getChoiceLabel(choices[side], presentation.feedback.resourcesBefore.founder)),
      () => {}, { disabled: true });
  }

  function celebrateWin(dialog, presentation) {
    if (celebratedWins.has(presentation.celebrationKey)) return;
    celebratedWins.add(presentation.celebrationKey);
    if (reducedMotion.matches || document.hidden) return;
    cancelWinConfetti();
    const layer = document.createElement('div');
    layer.className = 'win-confetti'; layer.setAttribute('aria-hidden', 'true');
    dialog.append(layer);
    const animations = [];
    const colors = ['#68b99a', '#7bc7e4', '#efc16c', '#a5d7bb', '#e4b35c', '#7dbce0'];
    const margin = Math.max(3, Math.min(dialog.getBoundingClientRect().left - 5, 35));
    // Authored ballistic arcs from the accepted prototype; no gameplay RNG.
    for (let i = 0; i < 30; i++) {
      const right = i >= 15, j = i % 15, sign = right ? -1 : 1;
      const particle = document.createElement('i');
      particle.style.background = colors[j % colors.length];
      particle.style.left = right ? 'calc(100% - 9px)' : '4px';
      layer.append(particle);
      const speed = -margin + 12 + (j * 23 % 178), lift = 160 + (j * 17 % 110);
      const gravity = 230 + (j * 23 % 90), rotation = (j % 2 ? -1 : 1) * (150 + j * 21);
      const frames = Array.from({ length: 31 }, (_, n) => {
        const t = n / 30, seconds = t * 1.2;
        const x = sign * speed * seconds / (1 + seconds);
        // Stay above the panel: neither message nor replies are covered.
        const y = Math.min(-6, -lift * seconds + gravity * seconds * seconds * .5);
        return { offset: t,
          transform: `translate3d(${x}px,${y}px,0) rotate(${rotation * t}deg) rotateY(${t * 480 + j * 37}deg)`,
          opacity: t < .08 ? t / .08 : t > .65 ? (1 - t) / .35 : 1 };
      });
      animations.push(particle.animate(frames, { duration: 1158, delay: j * 3, easing: 'linear', fill: 'both' }));
    }
    // Bound lifetime independently of animationend/finished (including hidden tabs).
    const timer = window.setTimeout(() => cancelWinConfetti(), 1200);
    cancelWinConfetti = () => {
      window.clearTimeout(timer);
      animations.forEach(animation => animation.cancel());
      layer.remove();
      cancelWinConfetti = () => {};
    };
  }

  function showWinFeedback() {
    const state = app.state;
    const presentation = winPresentations.get(state);
    if (!presentation?.pending || (state.gameOver && state.endingId !== 'run_complete')) return;
    if ($('[data-win-finale]')?.open) return;
    renderWinFeedbackBackground(presentation);
    const profile = window.MistakeryFounderProfile.reward(app.deck, state);
    const feedback = profile ? { message: app.deck.meta.founderProfile.invitation, choices: [{ en: 'Let’s go' }] }
      : engine.cardById(app.deck, presentation.cardId).winFeedback;
    // Count distinct completed story victories, never choices or filler outcomes.
    const results = new Map(state.history.map(step => engine.cardById(app.deck, step.cardId))
      .filter(card => card?.outcomeTone && state.route.completed.includes(card.plot))
      .map(card => [card.plot, card.outcomeTone]));
    const wins = [...results.values()].filter(tone => tone === 'success').length;
    const progress = `<div class="win-progress" role="group" aria-label="${wins} of 3 wins secured"><span class="win-progress__dots" aria-hidden="true">${[1, 2, 3].map(n => `<i class="win-progress__dot${n <= wins ? ' is-filled' : ''}${n === wins ? ' is-new' : ''}"></i>`).join('')}</span><span>${wins} of 3 wins secured</span></div>`;
    const source = sourceFor('@b2buddy');
    const dialog = document.createElement('dialog');
    dialog.className = 'loss-finale'; dialog.dataset.winFinale = ''; dialog.dataset.card = presentation.cardId;
    if (profile) dialog.dataset.founderInvitation = '';
    const message = profile ? feedback.message.split('\n').map(line => `<p>${lossFinaleText(line)}</p>`).join('')
      : `<p class="loss-finale__opening"><span class="loss-finale__lead">${lossFinaleText(feedback.message)}</span></p>`;
    dialog.setAttribute('aria-labelledby', 'win-finale-sender');
    dialog.innerHTML = `<header class="loss-finale__head">
      <div class="avatar" aria-hidden="true">${characterAvatar(source)}</div>
      <div class="contact__text"><b id="win-finale-sender">${htmlAttribute(source.name)}</b><i>${htmlAttribute(source.role)}</i></div>
    </header>
    <div class="loss-finale__body" tabindex="0" autofocus aria-label="Message from ${htmlAttribute(source.name)}">
      <div class="message">${message}</div>
      ${progress}
    </div>
    <footer class="choices">${feedback.choices.map((choice, index) => `<button type="button" class="choice${index ? ' choice--right' : ''}" data-win-finale-choice>${htmlAttribute(choice.en)}</button>`).join('')}</footer>`;
    const resume = () => {
      if (app.state !== state || !dialog.isConnected || !presentation.pending) return;
      presentation.pending = false;
      if (profile) revealedProfiles.add(state);
      cancelWinConfetti();
      sound.stop();
      dialog.remove();
      if (dialog.open) dialog.close();
      // The outcome cost was presented when accepted; a free dismissal must
      // not replay its meter pulse or resource-attention delay.
      renderCard();
      unlockAfterChoice();
      if (!profile) $('[data-chat]').focus({ preventScroll: true });
    };
    dialog.querySelectorAll('[data-win-finale-choice]').forEach(button => button.addEventListener('click', resume));
    dialog.addEventListener('cancel', event => { event.preventDefault(); resume(); });
    dialog.addEventListener('close', resume);
    document.body.append(dialog);
    dialog.showModal();
    soundOnce('win-finale-alert', 'ai-finale');
    celebrateWin(dialog, presentation);
  }

  function previewOutgoingMessageMarkup(message) {
    const file = message.attachment;
    const attachment = file ? `<div class="preview-file" aria-label="${htmlAttribute(file.filename)}, ${htmlAttribute(file.type)} document">
      <span class="preview-file__icon" aria-hidden="true"><svg viewBox="0 0 32 40" fill="none"><path d="M5 1h15l11 11v25a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Z" fill="currentColor" opacity=".22"/><path d="M20 1v11h11M9 21h15M9 27h11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
      <span class="preview-file__label"><b>${htmlAttribute(file.filename)}</b><small>${htmlAttribute(file.type)}</small></span>
    </div>` : '';
    return `<div class="self-message is-pop${file ? ' preview-attachment' : ''}" data-preview-outgoing data-source="${htmlAttribute(message.source)}">${attachment}${messageLines(htmlAttribute(message.text), true)}</div>`;
  }

  function showLossPreviewDetails(card = window.MISTAKERY_LOSS_PREVIEW.cards[app.lossPreviewIndex]) {
    $('[data-details-id]').textContent = card.title;
    const body = $('[data-details-body]'); body.replaceChildren();
    const copy = document.createElement('div'); copy.className = 'test-details__translation'; copy.dataset.detailsTranslation = '';
    copy.textContent = card.textRu; body.append(copy);
    card.replies.forEach((reply, index) => {
      const line = document.createElement('p'); line.textContent = `${index + 1}. ${reply.ru}`; body.append(line);
    });
    const finale = window.MISTAKERY_LOSS_FINALE.cards.find(item => item.id === card.id);
    const finaleHeading = document.createElement('h3'); finaleHeading.textContent = '@b2buddy · AI Agent'; body.append(finaleHeading);
    finale.ru.forEach(text => {
      const line = document.createElement('p');
      line.textContent = text;
      body.append(line);
    });
    const finaleChoices = document.createElement('p'); finaleChoices.textContent = window.MISTAKERY_LOSS_FINALE.choices.ru.join(' / '); body.append(finaleChoices);
    const note = document.createElement('p'); note.className = 'test-details__note';
    note.textContent = card.copyEdited
      ? 'Русский текст — исходный перевод документа. В английском предпросмотре применены ваши локальные правки. Ответы не расходуют ресурсы.'
      : 'Текст документа без редакторских изменений. Шкалы — отдельные preview fixtures; ответы не расходуют ресурсы.';
    body.append(note); $('[data-test-details]').showModal(); body.scrollTop = 0;
  }

  function render() {
    if (!app.deck || !app.state) return;
    if (lossPreviewEnabled) return renderLossPreview();
    if (app.view === 'title') renderTitle();
    else if (app.view === 'onboarding') renderOnboarding();
    else if (app.view === 'saved') renderSaved();
    else renderCard();
  }

  function showTestDetails() {
    if (lossPreviewEnabled) return showLossPreviewDetails();
    if (resourceLossCard()) return showLossPreviewDetails(resourceLossCard());
    if (!storyTestEnabled || !['playing', 'saved', 'ended'].includes(app.view)) return;
    const id = app.view === 'saved' ? NOTE_SCREENS[app.noteIndex].id : app.state.currentCardId;
    const translation = app.deck.testTranslations[id];
    const card = app.view === 'playing' ? engine.cardById(app.deck, id) : null;
    const body = $('[data-details-body]');
    body.replaceChildren();
    $('[data-details-id]').textContent = id;
    function add(parent, tag, text, className) {
      const node = document.createElement(tag);
      node.textContent = text;
      if (className) node.className = className;
      parent.append(node);
      return node;
    }
    function effectsText(effects) {
      return engine.RESOURCE_KEYS.filter(key => effects[key]).map(key => {
        const amount = effects[key];
        return `${app.deck.resources[key].label} ${amount > 0 ? '+' : '−'}${String(Math.abs(amount)).replace('.', ',')}`;
      }).join(' · ') || 'Без изменений';
    }
    function totalEffects(choice, target) {
      return Object.fromEntries(engine.RESOURCE_KEYS.map(key => {
        const before = app.state.resources[key];
        const balance = app.state.route.resourceLedger?.[key] ?? before;
        const after = target?.resetResources === 0 ? 0 : Math.max(0, Math.min(100,
          balance + (choice.effects[key] || 0) + (target?.outcomeEffects?.[key] || 0)
          + (key === 'cash' ? app.deck.meta.baseCashBurn : 0)));
        return [key, after - before];
      }));
    }
    if (app.view === 'ended') {
      const ending = app.deck.endings[app.state.endingId];
      $('[data-details-id]').textContent = app.state.endingId;
      const complete = app.state.endingId === 'run_complete';
      add(body, 'h3', complete ? 'ПОПЫТКА ЗАВЕРШЕНА' : 'ИГРА ОКОНЧЕНА — ТЫ ПРОИГРАЛ');
      add(body, 'p', complete ? 'Все три сюжета завершены. Компания продолжает существовать. Это итог попытки, а не общая победа.' : ending.causeRu);
      add(body, 'div', complete
        ? 'Back to 9–5 открывает экран Play. New run начинает новую попытку с чистыми ресурсами и другим первым сюжетом.'
        : ending.reactionRu ? endingReaction().textRu : translation.text, 'test-details__translation');
      const causes = app.state.route.ending.causes;
      if (causes.length > 1) add(body, 'p', 'Также: ' + causes.slice(1).map(id => app.deck.endings[id].causeRu).join(' '));
      add(body, 'p', 'Баланс в конце эпизода: ' + engine.RESOURCE_KEYS.map(key =>
        `${app.deck.resources[key].label} ${app.state.route.ending.rawResources[key]}`).join(' · '));
      add(body, 'p', 'Перезапуск не расходует ресурсы.', 'test-details__note');
      $('[data-test-details]').showModal();
      body.scrollTop = 0;
      return;
    }
    const translated = add(body, 'div', translation.text, 'test-details__translation');
    translated.dataset.detailsTranslation = '';
    const provenance = add(body, 'p', translation.source
      ? (translation.sourceGaps?.length ? 'Русский источник неполный; для отмеченных полей сохранён прежний перевод. ' : translation.ownerPresentation ? 'Текст документа; эмодзи и финальная пунктуация сохранены по правилам владельца. ' : translation.adapted ? 'Перевод из документа, адаптирован к текущей карте. ' : 'Точный русский текст документа. ')
      : 'Перевод текущего английского текста; в документах нет полного русского варианта.', 'test-details__note');
    if (translation.source) {
      const source = add(provenance, 'a', 'Источник');
      source.href = translation.source;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
    }
    const labels = translation.contextual?.[app.influencerPreviousCardId] || translation;
    if (!card) {
      add(body, 'p', 'Навигация не меняет ресурсы.', 'test-details__note');
      for (const [index, side] of ['left', 'right'].entries()) add(body, 'p', `${index + 1}. ${labels[side]}`);
    } else {
      add(body, 'p', `Каждый ответ: ${effectsText({ cash: app.deck.meta.baseCashBurn })}. Шкалы показывают 0–100; внутри эпизода расходы ниже нуля и избыток выше 100 сохраняются. Проигрыш проверяется после развязки или всей связки. Просмотр не делает ход.`, 'test-details__note');
      if (app.state.route.resourceLedger) add(body, 'p', 'Баланс эпизода: ' + engine.RESOURCE_KEYS.map(key =>
        `${app.deck.resources[key].label} ${app.state.route.resourceLedger[key]}`).join(' · '));
      if (card.outcomeEffects) {
        const entry = add(body, 'section', '', 'test-details__entry');
        entry.dataset.detailsEntry = '';
        add(entry, 'h3', 'Эффект при входе в этот исход');
        add(entry, 'p', card.resetResources === 0 ? 'Все ресурсы → 0' : effectsText(card.outcomeEffects));
        add(entry, 'p', 'В обычном прохождении уже учтён на предыдущем ходе. Ответ ниже не применяет его повторно.', 'test-details__note');
      }
      const choices = influencerChoicesFor(card);
      for (const [index, side] of ['left', 'right'].entries()) {
        const choice = choices[side];
        const section = add(body, 'section', '', 'test-details__choice');
        section.dataset.detailsChoice = side;
        add(section, 'h3', `${index + 1}. ${labels[side]}`);
        add(section, 'p', engine.getChoiceLabel(choice, app.state.resources.founder), 'test-details__note');
        add(section, 'p', `Эффект выбора: ${effectsText(choice.effects)}`);
        const targets = card.arc === 'influencer' ? influencerChoiceTargets(card, side)
          : card.id === 'PADEL_INVITE' || card.id.startsWith('IRL_PADEL_') ? padelChoiceTargets(card, side)
          : choice.outcomeRoll ? [choice.outcomeRoll.win, choice.outcomeRoll.lose] : [choice.next];
        const outcomes = targets.map(targetId => engine.cardById(app.deck, targetId)).filter(target => target?.outcomeEffects);
        if (!outcomes.length) add(section, 'p', `Изменение сейчас: ${effectsText(totalEffects(choice))}`);
        for (const target of outcomes) {
          const outcome = add(section, 'div', '', 'test-details__outcome');
          outcome.dataset.detailsOutcome = target.id;
          add(outcome, 'small', target.id);
          add(outcome, 'p', `${outcomes.length > 1 ? 'Возможный исход' : 'Следующий исход'}: ${target.resetResources === 0 ? 'Все ресурсы → 0' : effectsText(target.outcomeEffects)}`);
          add(outcome, 'p', `Изменение за весь ход: ${effectsText(totalEffects(choice, target))}`);
        }
      }
    }
    $('[data-test-details]').showModal();
    body.scrollTop = 0;
  }

  $('[data-chat]').addEventListener('scroll', updateHistoryVisibility, { passive: true });
  let chatGesture;
  $('[data-chat]').addEventListener('pointerdown', event => {
    chatGesture = { x: event.clientX, y: event.clientY, scroll: $('[data-chat]').scrollTop, moved: false, delivery: app.cardDelivery };
  }, { passive: true });
  $('[data-chat]').addEventListener('pointermove', event => {
    if (!chatGesture || !event.buttons) return;
    if (Math.hypot(event.clientX - chatGesture.x, event.clientY - chatGesture.y) > 10) {
      chatGesture.moved = true;
      if (app.cardDelivery) app.cardDelivery.follow = false;
    }
  }, { passive: true });
  $('[data-chat]').addEventListener('pointercancel', () => {
    if (app.cardDelivery) app.cardDelivery.follow = false;
    chatGesture = null;
  }, { passive: true });
  $('[data-chat]').addEventListener('wheel', () => {
    if (app.cardDelivery) app.cardDelivery.follow = false;
  }, { passive: true });
  $('[data-chat]').addEventListener('keydown', event => {
    if (['Home', 'End', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown'].includes(event.key)
      && app.cardDelivery) app.cardDelivery.follow = false;
  });
  $('[data-chat]').addEventListener('click', event => {
    if (event.target.closest('button, a') || !chatGesture || chatGesture.moved
      || chatGesture.delivery !== app.cardDelivery || Math.abs(chatGesture.scroll - $('[data-chat]').scrollTop) > 10) return;
    revealCardMessages();
    chatGesture = null;
  });
  $('[data-test-back]').addEventListener('click', backInStoryTest);
  $('[data-test-inspect]').addEventListener('click', showTestDetails);
  $('[data-details-close]').addEventListener('click', () => $('[data-test-details]').close());
  $('[data-test-restart]').addEventListener('click', startStoryTest);
  $('.hud-switcher').hidden = !iconHudEnabled;
  document.querySelectorAll('[data-hud-variant]').forEach(button => {
    button.addEventListener('click', () => setResourceVariant(button.dataset.hudVariant, true));
  });
  setResourceVariant(app.resourceVariant, !iconHudEnabled && params.get('hud') === 'icons');
  $('[data-restart-run]').addEventListener('click', requestExit);

  document.addEventListener('keydown', (event) => {
    if (event.target.closest?.('[data-test-controls]')) return;
    if ($('[data-test-details]').open || $('[data-quit-dialog]')?.open) return;
    if ($('[data-loss-finale]')?.open || $('[data-win-finale]')?.open) return;
    if (app.view !== 'playing' && !(app.view === 'ended' && isLossCard())) return;
    if (event.key === 'ArrowLeft') $('[data-choice="left"]')?.click();
    if (event.key === 'ArrowRight') $('[data-choice="right"]')?.click();
  });

  const deckRequest = window.MISTAKERY_DECK
    ? Promise.resolve(window.MISTAKERY_DECK)
    : fetch('cards.json', { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Deck request failed: ${response.status}`);
        return response.json();
      });

  deckRequest
    .then(async (deck) => {
      const errors = engine.validateDeck(deck);
      if (errors.length) throw new Error(errors.join('\n'));
      app.deck = deck;
      app.activeCardIds = deck.cards.filter(card => card.plot || card.filler).map(card => card.id);
      await Promise.all([warmCharacterAvatars(), warmStoryImages(), warmPadelBackgrounds()]);
      if (lossPreviewEnabled) {
        setupLossPreview();
        return;
      }
      if (storyTestEnabled) {
        startStoryTest();
        return;
      }
      app.state = initialRun();
      app.runStartState = structuredClone(app.state);
      app.onboardingIndex = 0;
      deliverOnboardingMessage();
    })
    .catch((error) => {
      $('[data-message]').textContent = `Could not start Mistakery: ${error.message}`;
      console.error(error);
    });
})();
