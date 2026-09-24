(function startBrowserGame() {
  const engine = window.MistakeryEngine;
  const ACTIVE_CARD_IDS = Object.freeze([
    'OPEN_01',
    'OPEN_02a',
    'OPEN_02b',
    'OPEN_BOSS',
    'OPEN_DEV',
    'OPEN_INVESTOR',
    'LIVE_AGENT_01',
    'LIVE_AGENT_02',
    'LIVE_AGENT_03',
    'LIVE_AGENT_04',
    'LIVE_AGENT_04B',
    'LIVE_AGENT_05',
    'LIVE_AGENT_06',
    'LIVE_AGENT_07',
    'LIVE_AGENT_07B',
    'LIVE_AGENT_08',
    'LIVE_AGENT_OUTCOME_0',
    'LIVE_AGENT_OUTCOME_1',
    'LIVE_AGENT_OUTCOME_2',
    'LIVE_AGENT_OUTCOME_3',
    'LIVE_AGENT_OUTCOME_4',
    'INFLUENCER_01',
    'INFLUENCER_02',
    'INFLUENCER_02A',
    'INFLUENCER_03',
    'INFLUENCER_04',
    'INFLUENCER_05',
    'INFLUENCER_06',
    'INFLUENCER_07',
    'INFLUENCER_08',
    'INFLUENCER_OUTCOME_1',
    'INFLUENCER_OUTCOME_2',
    'INFLUENCER_OUTCOME_3',
    'INFLUENCER_OUTCOME_4',
    'INFLUENCER_OUTCOME_5',
    'INFLUENCER_OUTCOME_6',
    'INFLUENCER_OUTCOME_7',
    'PADEL_INVITE',
    'DREAM_TEAM',
    'IRL_PADEL_01',
    'IRL_PADEL_03B',
    'IRL_PADEL_04',
    'IRL_PADEL_05',
    'IRL_PADEL_06',
    'PADEL_OUTCOME_0',
    'PADEL_OUTCOME_1',
    'PADEL_OUTCOME_2',
    'PADEL_OUTCOME_3',
    'PADEL_OUTCOME_4',
    'PADEL_OUTCOME_5',
    'PADEL_OUTCOME_6',
    'PADEL_OUTCOME_7',
  ]);

  const app = {
    deck: null,
    state: null,
    view: 'loading',
    onboardingIndex: 0,
    noteIndex: 0,
    locked: false,
    introTypingTimer: null,
    cardDelivery: null,
    padelCeoScore: null,
    influencerPreviousCardId: null,
    liveAgentScore: 0,
    activeCardIds: ACTIVE_CARD_IDS,
    render,
  };
  window.MistakeryApp = app;

  const $ = (selector) => document.querySelector(selector);
  const storyTestEnabled = new URLSearchParams(window.location.search).get('story') === 'live-agent';
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
  let choiceUnlockTimer = null;
  let cardTypingTimer = null;
  let cancelOutcomeImageMotion = () => {};
  let padelImagesPreloaded = false;
  const INITIAL_RESOURCES = Object.freeze({ cash: 25, team: 60, customers: 15, founder: 65 });
  const OPTIMISTIC_RESOURCES = Object.freeze({ cash: 100, team: 100, customers: 100, founder: 100 });
  const INTRO_TYPING_MS = 620;
  const RESOURCE_ICONS = Object.freeze({
    cash: 'M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z',
    team: 'M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z',
    customers: 'M254.3,107.91,228.78,56.85a16,16,0,0,0-21.47-7.15L182.44,62.13,130.05,48.27a8.14,8.14,0,0,0-4.1,0L73.56,62.13,48.69,49.7a16,16,0,0,0-21.47,7.15L1.7,107.9a16,16,0,0,0,7.15,21.47l27,13.51,55.49,39.63a8.06,8.06,0,0,0,2.71,1.25l64,16a8,8,0,0,0,7.6-2.1l55.07-55.08,26.42-13.21a16,16,0,0,0,7.15-21.46Zm-54.89,33.37L165,113.72a8,8,0,0,0-10.68.61C136.51,132.27,116.66,130,104,122L147.24,80h31.81l27.21,54.41ZM41.53,64,62,74.22,36.43,125.27,16,115.06Zm116,119.13L99.42,168.61l-49.2-35.14,28-56L128,64.28l9.8,2.59-45,43.68-.08.09a16,16,0,0,0,2.72,24.81c20.56,13.13,45.37,11,64.91-5L188,152.66Zm62-57.87-25.52-51L214.47,64,240,115.06Zm-87.75,92.67a8,8,0,0,1-7.75,6.06,8.13,8.13,0,0,1-1.95-.24L80.41,213.33a7.89,7.89,0,0,1-2.71-1.25L51.35,193.26a8,8,0,0,1,9.3-13l25.11,17.94L126,208.24A8,8,0,0,1,131.82,217.94Z',
    founder: 'M215.79,118.17a8,8,0,0,0-5-5.66L153.18,90.9l14.66-73.33a8,8,0,0,0-13.69-7l-112,120a8,8,0,0,0,3,13l57.63,21.61L88.16,238.43a8,8,0,0,0,13.69,7l112-120A8,8,0,0,0,215.79,118.17ZM109.37,214l10.47-52.38a8,8,0,0,0-5-9.06L62,132.71l84.62-90.66L136.16,94.43a8,8,0,0,0,5,9.06l52.8,19.8Z',
  });
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
        '<strong>IN PROGRESS:</strong>\n<b>9.</b> Unicorn 🦄🎯 (waiting for the market to wake up)',
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

  function setView(view, shellStage = 'real') {
    cancelOutcomeImageMotion();
    if ($('[data-test-details]').open) $('[data-test-details]').close();
    window.clearTimeout(cardTypingTimer);
    continuationResizeObserver?.disconnect();
    app.view = view;
    const phone = $('[data-game]');
    delete phone.dataset.outcome;
    phone.classList.remove('is-outcome-entering');
    $('[data-outcome-banner]').hidden = true;
    phone.dataset.view = view;
    phone.dataset.shellStage = shellStage;
    $('[data-top]').hidden = shellStage === 'intro';
    $('[data-resources]').hidden = shellStage === 'intro';
    $('[data-restart-run]').disabled = view === 'onboarding';
    $('[data-scene]').classList.toggle('is-onboarding', view === 'onboarding');
    $('[data-app]').classList.toggle('is-story-test', storyTestEnabled);
    $('[data-test-controls]').hidden = !storyTestEnabled;
    $('[data-test-back]').disabled = testHistory.length === 0;
    $('[data-test-inspect]').disabled = !['playing', 'saved'].includes(view);
  }

  function recordTestStep() {
    if (!storyTestEnabled) return;
    testHistory.push({
      state: structuredClone(app.state),
      view: app.view,
      noteIndex: app.noteIndex,
      padelCeoScore: app.padelCeoScore,
      influencerPreviousCardId: app.influencerPreviousCardId,
      liveAgentScore: app.liveAgentScore,
      cardDelivery: app.cardDelivery ? { ...app.cardDelivery } : null,
      scrollTop: $('[data-chat]').scrollTop,
    });
  }

  function unlockAfterChoice() {
    window.clearTimeout(choiceUnlockTimer);
    const tone = engine.cardById(app.deck, app.state.currentCardId)?.outcomeTone;
    // Cover the entrance (900 ms success / 620 ms failure) and swallow a second tap.
    // A bounded timer also works when CSS motion is disabled or interrupted.
    const delay = !tone ? 280 : tone === 'success' ? 950 : 670;
    choiceUnlockTimer = window.setTimeout(() => { app.locked = false; }, delay);
  }

  function backInStoryTest() {
    if (!storyTestEnabled || !testHistory.length) return;
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    const { scrollTop, ...saved } = testHistory.pop();
    Object.assign(app, structuredClone(saved), { locked: false });
    // Restored outcomes retain their styling but never replay their entrance.
    presentedOutcomes.add(app.state);
    $('[data-pin-sheet]').hidden = true;
    clearPreview();
    render();
    $('[data-chat]').scrollTop = scrollTop;
  }

  function startStoryTest() {
    if (!storyTestEnabled) return;
    window.clearTimeout(choiceUnlockTimer);
    window.clearTimeout(app.introTypingTimer);
    testHistory.length = 0;
    app.cardDelivery = null;
    app.state = engine.startRun(app.deck);
    app.state.currentCardId = 'LIVE_AGENT_01';
    app.state.flags = ['met_boss', 'met_dev', 'live_agent_pending'];
    app.liveAgentScore = 0;
    app.padelCeoScore = null;
    app.influencerPreviousCardId = null;
    app.locked = false;
    app.view = 'playing';
    $('[data-pin-sheet]').hidden = true;
    clearPreview();
    renderCard();
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
    scene.querySelector('.contact').classList.toggle('team-contact', team);
    scene.querySelector('.contact').classList.toggle('irl-contact', irl);
    $('[data-chat]').classList.toggle('team-chat', team);
    $('[data-chat]').classList.toggle('irl-chat', irl);
  }

  function renderResources(values) {
    const host = $('[data-resources]');
    host.innerHTML = engine.RESOURCE_KEYS.map((key) => {
      const value = Number(values[key]);
      const low = value <= 25 ? ' low' : '';
      return `<div class="resource${low}" data-resource="${key}" data-fill="${value}">
        <span class="resource-label"><i class="resource-glyph resource-glyph--${key}" aria-hidden="true"><svg viewBox="0 0 256 256"><path d="${RESOURCE_ICONS[key]}"></path></svg></i>${app.deck.resources[key].label}</span>
        <div class="bar" aria-hidden="true"><i style="width:${value}%"></i></div>
        <span class="sr-only" data-value>${value}%</span>
      </div>`;
    }).join('');
  }

  function setContact({ name, role = '', avatar = '' }) {
    $('[data-sender]').textContent = name;
    $('[data-status]').textContent = role;
    const avatarNode = $('[data-avatar]');
    avatarNode.innerHTML = avatar || name.replace('@', '').slice(0, 1).toUpperCase();
    const messageAvatar = $('[data-message-avatar]');
    if (messageAvatar) messageAvatar.innerHTML = avatar || name.replace('@', '').slice(0, 1).toUpperCase();
  }

  function sourceFor(sourceId) {
    return app.deck.sources[sourceId];
  }

  function setThread(sourceId, status) {
    const source = sourceFor(sourceId);
    setContact({
      name: source.name,
      role: status === 'typing...' ? `${source.role} · online` : status,
      avatar: source.name.replace('@', '').slice(0, 1).toUpperCase(),
    });
  }

  function setCardId(id) {
    $('[data-card-id]').textContent = id;
    $('[data-scene]').dataset.activeCard = id;
  }

  function hidePinned() {
    const pinned = $('[data-pinned]');
    pinned.classList.remove('irl-location');
    pinned.querySelector('.pin').textContent = '📌';
    pinned.querySelector('small').textContent = 'PINNED';
    pinned.hidden = true;
    $('[data-pin-sheet]').hidden = true;
  }

  function showPinned() {
    const pinned = $('[data-pinned]');
    pinned.classList.remove('irl-location');
    pinned.querySelector('.pin').textContent = '📌';
    pinned.querySelector('small').textContent = 'PINNED';
    $('[data-pinned-title]').textContent = '5 MONTHS AS A FOUNDER 🚀';
    $('[data-pin-text]').innerHTML = NOTE_SCREENS[1].messages
      .join('\n')
      .split('\n')
      .map((line) => `<span>${line ? typography(line) : '&nbsp;'}</span>`)
      .join('');
    pinned.hidden = false;
  }

  function showIrlLocation(card) {
    const pinned = $('[data-pinned]');
    pinned.classList.add('irl-location');
    pinned.querySelector('.pin').textContent = '📍';
    pinned.querySelector('small').textContent = card.location;
    $('[data-pinned-title]').textContent = card.score;
    $('[data-pin-sheet]').hidden = true;
    pinned.hidden = false;
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
      button.addEventListener('click', () => onChoose(button.dataset.choice));
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

  function messageLines(text, preserveTerminalPeriod = false) {
    const displayedText = preserveTerminalPeriod ? String(text) : withoutTerminalPeriod(text);
    return displayedText.split('\n').map((line, index, lines) => line
      ? `<p${index > 0 && lines[index - 1] === '' ? ' class="message-paragraph-start"' : ''}>${typography(line)}</p>`
      : '').join('');
  }

  function cardMessageMarkup(text, preserveTerminalPeriod = false) {
    return text.split('\n\n').map((message) => (
      `<div class="message is-pop">${messageLines(message, preserveTerminalPeriod)}</div>`
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

  function mediaImageMarkup(image, decoding = 'async') {
    return `<img class="message-image" src="${htmlAttribute(image.src)}" alt="${htmlAttribute(image.alt)}" width="${Number(image.width)}" height="${Number(image.height)}" style="--image-ratio: ${Number(image.width)} / ${Number(image.height)}" decoding="${decoding}" fetchpriority="high" draggable="false">`;
  }

  // References resolve to the same media renderers used by existing cards.
  // Replace the referenced placeholder with { src, alt, width, height } later.
  function referencedMediaMarkup(message, preserveTerminalPeriod = false) {
    const asset = app.deck.images?.[message.imageRef];
    if (!asset) throw new Error(`Missing image reference: ${message.imageRef}`);
    const isImage = Boolean(asset.src);
    const caption = message.text ? `<div class="message-caption">${messageLines(message.text, preserveTerminalPeriod)}</div>` : '';
    return `<div class="message ${isImage ? 'image-bubble' : 'media-placeholder'}${caption ? ' has-caption' : ''} is-pop" data-asset-reference="${htmlAttribute(message.imageRef)}">${isImage ? mediaImageMarkup(asset, caption ? 'sync' : 'async') : mediaPlaceholderMarkup(asset.placeholder)}${caption}</div>`;
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
    hidePinned();
    setReplyHint(false);
    setCardId(`ONBOARDING_${delivered}`);
    setContact({ name: 'Mistakery', role: 'online', avatar: 'M' });

    if (step.shellStage === 'optimistic') renderResources(OPTIMISTIC_RESOURCES);
    if (step.shellStage === 'real') renderResources(INITIAL_RESOURCES);

    const messages = Array.from({ length: delivered }, (_, index) => (
      `<div class="message">${messageParagraphs(INTRO_STEPS[index].text)}</div>`
    )).join('');
    const typingBubble = typing
      ? '<div class="typing-bubble" aria-label="Mistakery is typing"><i></i><i></i><i></i></div>'
      : '';
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>ONBOARDING_${app.onboardingIndex + 1}</span>
      <div class="message-row">
        <div class="mini-avatar message-avatar" data-message-avatar aria-hidden="true">M</div>
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
      app.locked = false;
    }, INTRO_TYPING_MS);
  }

  function advanceOnboarding() {
    if (app.locked) return;
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

  function startSaved(index) {
    app.noteIndex = index;
    renderSaved();
  }

  function renderSaved() {
    const note = NOTE_SCREENS[app.noteIndex];
    const messages = note.messages.map((message) => (
      `<div class="message note-message is-pop"><p>${noteLineMarkup(message)}</p><span class="stamp">15:54</span></div>`
    )).join('');
    setView('saved', 'real');
    setSceneMode('personal');
    renderResources(app.state.resources);
    hidePinned();
    setReplyHint(true);
    setCardId(note.id);
    setContact({ name: 'Saved Messages', role: '', avatar: BOOKMARK_SVG });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${note.id}</span>
      <div class="date-chip">${note.chip}</div>
      <div class="message-row note-row">
        <div class="message-stack" data-message-stack>${messages}</div>
      </div>
      <div class="message-clearance" aria-hidden="true"></div>`;
    setChoices(note.buttons, () => {
      recordTestStep();
      if (app.noteIndex === 0) startSaved(1);
      else beginRun();
    });
  }

  function beginRun() {
    app.state = engine.startRun(app.deck);
    app.padelCeoScore = null;
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
    if (card.id === 'IRL_PADEL_06') {
      return (side === 'left' ? [3, 4] : [1, 2, 5, 6]).map(n => `PADEL_OUTCOME_${n}`);
    }
    if (card.id === 'IRL_PADEL_05' && app.padelCeoScore + card.choices[side].ceoScore === 4) {
      return ['PADEL_OUTCOME_7'];
    }
    return [card.choices[side].next];
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
      : cardMessageMarkup(card.text, preserve);
    return media + messages;
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
    const avatar = sourceFor(card.source).name.replace('@', '').slice(0, 1).toUpperCase();
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      <div class="message-row">
        <div class="mini-avatar message-avatar" data-message-avatar aria-hidden="true">${avatar}</div>
        <div class="message-stack" data-message-stack>${personalCardMessagesMarkup(card)}</div>
      </div>
      <div class="message-clearance" aria-hidden="true"></div>`;
  }

  function teamCardMessagesMarkup(card) {
    return card.messages.map((message) => {
      const body = message.image
        ? mediaImageMarkup(message.image)
        : message.placeholder
          ? mediaPlaceholderMarkup(message.placeholder)
          : messageLines(message.text, card.preservePunctuation || card.id.startsWith('INFLUENCER_'));
      const mediaClass = message.image ? ' image-bubble' : message.placeholder ? ' media-placeholder' : '';
      if (message.direction === 'outgoing') {
        return `<div class="self-message${mediaClass} is-pop">${body}</div>`;
      }
      const member = sourceFor(message.source);
      return `<div class="team-row is-pop" data-source="${message.source}">
        <div class="member-avatar" aria-hidden="true">${message.avatar}</div>
        <div class="team-bubble${mediaClass}">
          <span class="team-meta">${member.name}${member.role ? `<span class="team-role"> · ${member.role}</span>` : ''}</span>
          ${body}
        </div>
      </div>`;
    }).join('');
  }

  function renderTeamCard(card) {
    const thread = sourceFor(card.source);
    setContact({ name: thread.name, role: thread.role, avatar: thread.avatar || 'DT' });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      ${teamCardMessagesMarkup(card)}
      <div class="message-clearance" aria-hidden="true"></div>`;
  }

  function prependPreviousChatMessages(card) {
    if (card.mode === 'irl') return null;
    const chat = $('[data-chat]');
    const host = card.mode === 'team' ? chat : chat.querySelector('[data-message-stack]');
    const current = Array.from(host.children).filter(node => node.matches('.message, .team-row, .self-message'));
    current.forEach(node => { node.dataset.chatCurrent = ''; });

    // Derive context from resolved choices so rerenders and Back stay deterministic.
    const answered = app.state.history.at(-1);
    const previousId = answered?.cardId;
    const approvedPrevious = {
      LIVE_AGENT_02: 'LIVE_AGENT_01',
      LIVE_AGENT_04: 'LIVE_AGENT_03',
      LIVE_AGENT_04B: 'LIVE_AGENT_04',
      LIVE_AGENT_07B: 'LIVE_AGENT_07',
    }[card.id];
    if (!approvedPrevious || previousId !== approvedPrevious) return null;
    const previous = previousId && engine.cardById(app.deck, previousId);
    if (!previous || previous.id === card.id || previous.source !== card.source
      || (previous.mode || 'personal') !== (card.mode || 'personal')) return null;
    const template = document.createElement('template');
    template.innerHTML = card.mode === 'team'
      ? teamCardMessagesMarkup(previous)
      : personalCardMessagesMarkup(previous);
    const retained = Array.from(template.content.children).slice(-2);
    retained.forEach(node => {
      node.classList.remove('is-pop');
      node.dataset.chatHistory = '';
    });
    host.prepend(...retained);
    chat.classList.toggle('has-chat-history', retained.length > 0);
    if (!retained.length || !current.length) return null;
    const reply = document.createElement('div');
    reply.className = 'self-message chat-player-reply';
    reply.dataset.playerReply = '';
    const text = document.createElement('p');
    const previousFounder = app.state.resources.founder - (answered.deltas.founder || 0);
    text.textContent = engine.getChoiceLabel(previous.choices[answered.side], previousFounder);
    reply.append(text);
    host.insertBefore(reply, current[0]);
    return reply;
  }

  function preloadPadelImages() {
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
    const source = sourceFor(card.source);
    const name = source.irlName || source.name;
    const avatar = source.irlAvatar
      ? `<img class="irl-avatar-photo" src="${source.irlAvatar}" alt="">`
      : name.slice(0, 1).toUpperCase();
    setContact({ name, role: '', avatar });
    $('[data-chat]').innerHTML = `<span class="sr-only" data-card-id>${card.id}</span>
      <div class="irl-dialog is-pop">${messageLines(card.text)}</div>`;
  }

  function renderCard() {
    const card = engine.cardById(app.deck, app.state.currentCardId);
    if (!card || !ACTIVE_CARD_IDS.includes(card.id)) {
      throw new Error(`Disabled card cannot enter the Personal Chat runtime: ${app.state.currentCardId}`);
    }
    if (card.id === 'OPEN_INVESTOR' || card.id === 'DREAM_TEAM' || card.id.startsWith('PADEL_') || card.id.startsWith('IRL_PADEL_')) {
      preloadPadelImages();
    }
    const complete = app.view === 'irl-complete';
    setView(complete ? 'irl-complete' : 'playing', 'real');
    renderResources(app.state.resources);
    setSceneMode(card.mode);
    if (card.mode === 'irl') showIrlLocation(card);
    else showPinned();
    setReplyHint(card.mode !== 'irl');
    setCardId(card.id);
    if (card.mode === 'irl') renderIrlCard(card);
    else if (card.mode === 'team') renderTeamCard(card);
    else renderPersonalCard(card);
    const playerReply = prependPreviousChatMessages(card);

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
    stageCardMessages(card);
    if (playerReply) {
      focusContinuation();
      const chat = $('[data-chat]');
      let size = `${chat.clientWidth}:${chat.clientHeight}`;
      continuationResizeObserver = new ResizeObserver(() => {
        const nextSize = `${chat.clientWidth}:${chat.clientHeight}`;
        if (size === nextSize) return;
        size = nextSize;
        focusContinuation();
      });
      continuationResizeObserver.observe(chat);
    }
    if (card.typingPauses) keepDeliveryVisible($('[data-chat] .typing-bubble'));
    presentOutcome(card);
  }

  function presentOutcome(card) {
    if (!card.outcomeTone) return;
    const phone = $('[data-game]');
    phone.dataset.outcome = card.outcomeTone;
    if (card.outcomeBanner !== false) {
      $('[data-pinned]').hidden = true;
      $('[data-pin-sheet]').hidden = true;
      $('[data-outcome-label]').textContent = card.outcomeTone === 'success' ? 'SUCCESS' : 'FAILURE';
      $('[data-outcome-banner]').hidden = false;
    }
    if (presentedOutcomes.has(app.state)) return;
    presentedOutcomes.add(app.state);
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

  function focusContinuation() {
    const chat = $('[data-chat]');
    const current = Array.from(chat.querySelectorAll('[data-chat-current], .typing-bubble'));
    const media = current.filter(node => node.matches('.image-bubble'));
    media.forEach(bubble => { bubble.style.width = ''; });
    // Measure layout boxes, not the translated/scaled entrance animation.
    const gap = parseFloat(getComputedStyle(current[0].parentElement).gap) || 0;
    const contentHeight = () => current.reduce((height, node) => height + node.offsetHeight, 0)
      + gap * (current.length - 1);
    // Shrink the entire media bubble, leaving the image's intrinsic ratio intact.
    // Recheck the caption at each width because its line wrapping changes too.
    media.forEach(bubble => {
      let width = bubble.offsetWidth;
      let bestWidth = width;
      let bestHeight = contentHeight();
      while (contentHeight() > chat.clientHeight - 16 && width > 128) {
        width = Math.max(128, width - 4);
        bubble.style.width = `${width}px`;
        const height = contentHeight();
        if (height < bestHeight) { bestWidth = width; bestHeight = height; }
      }
      bubble.style.width = `${bestWidth}px`;
    });
    // New content takes priority; the reply and earlier messages remain in history.
    chat.scrollTop = chat.scrollHeight;
  }

  function stageCardMessages(card) {
    const pauses = card.typingPauses || (card.typingPause ? [card.typingPause] : []);
    if (!pauses.length) {
      app.cardDelivery = null;
      return;
    }
    const key = `${card.id}:${app.state.history.length}`;
    if (app.cardDelivery?.key !== key) {
      app.cardDelivery = { key, delivered: false, pauseIndex: 0, deadline: Date.now() + pauses[0].durationMs };
    }
    const delivery = app.cardDelivery;
    if (delivery.delivered) return;
    const stack = $('[data-message-stack]');
    const pending = Array.from(stack.querySelectorAll('[data-chat-current]')).slice(pauses[delivery.pauseIndex].after);
    pending.forEach(node => node.remove());
    const typing = document.createElement('div');
    typing.className = 'typing-bubble';
    typing.setAttribute('aria-label', `${sourceFor(card.source).name} is typing`);
    typing.innerHTML = '<i></i><i></i><i></i>';
    stack.append(typing);
    const buttons = Array.from(document.querySelectorAll('[data-choice]'));
    buttons.forEach(button => { button.disabled = true; });
    function deliverNext() {
      const previousPause = pauses[delivery.pauseIndex];
      const nextPause = pauses[++delivery.pauseIndex];
      typing.remove();
      const count = nextPause ? nextPause.after - previousPause.after : pending.length;
      pending.splice(0, count).forEach((node, index) => {
        node.style.animationDelay = `${index * 90}ms`;
        stack.append(node);
      });
      if (nextPause) {
        stack.append(typing);
        delivery.deadline = Date.now() + nextPause.durationMs;
        cardTypingTimer = window.setTimeout(deliverNext, nextPause.durationMs);
      } else {
        delivery.delivered = true;
        buttons.forEach(button => { button.disabled = false; });
      }
      if ($('[data-chat]').classList.contains('has-chat-history')) focusContinuation();
      else if (pauses.length > 1) keepDeliveryVisible(nextPause ? typing : stack.lastElementChild);
    }
    cardTypingTimer = window.setTimeout(deliverNext, Math.max(0, delivery.deadline - Date.now()));
  }

  function influencerChoicesFor(card) {
    if (!['INFLUENCER_05', 'INFLUENCER_06'].includes(card.id)) return card.choices;
    if (app.influencerPreviousCardId === 'INFLUENCER_04') return card.choices;
    const contextual = card.contextualChoices?.[app.influencerPreviousCardId];
    if (contextual) return contextual;
    throw new Error(`Invalid previous Influencer card for ${card.id}: ${app.influencerPreviousCardId}`);
  }

  function continueFromInvestor(side) {
    app.locked = true;
    clearPreview();
    const result = engine.resolveChoice(prototypeDeck(), app.state, side, { rng: () => 0 });
    app.state = result.state;
    if (side === 'left') {
      app.padelCeoScore = null;
      app.influencerPreviousCardId = 'OPEN_INVESTOR';
      app.state.currentCardId = 'INFLUENCER_01';
    } else {
      app.padelCeoScore = 0;
      app.influencerPreviousCardId = null;
      app.state.currentCardId = 'PADEL_INVITE';
    }
    renderCard();
    unlockAfterChoice();
  }

  function continueFromDreamTeam(side) {
    app.locked = true;
    clearPreview();
    const result = resolvePadelChoice(side);
    app.state = result.state;
    app.state.currentCardId = 'IRL_PADEL_01';
    renderCard();
    unlockAfterChoice();
  }

  function resolvePadelChoice(side, nextId) {
    const card = engine.cardById(app.deck, app.state.currentCardId);
    const choice = card.choices[side];
    const next = nextId || choice.next || 'OPEN_INVESTOR';
    const target = engine.cardById(app.deck, next);
    const effects = { ...choice.effects };
    if (next.startsWith('PADEL_OUTCOME_')) {
      for (const [key, amount] of Object.entries(target.outcomeEffects || {})) {
        effects[key] = (effects[key] || 0) + amount;
      }
    }
    // Record choice and outcome together, once. Resource boundaries remain
    // playable: crises are intentionally disabled in this prototype branch.
    const resolvedCard = { ...card, continuation: 'forced', choices: {
      ...card.choices, [side]: { ...choice, next, effects },
    } };
    const scopedDeck = {
      ...app.deck,
      crises: {},
      meta: { ...app.deck.meta, maxTurns: Number.MAX_SAFE_INTEGER },
      cards: app.deck.cards.map(item => item.id === card.id ? resolvedCard : item),
    };
    return engine.resolveChoice(scopedDeck, app.state, side, { rng: () => 0 });
  }

  function resolveInfluencerChoice(side, nextId) {
    const card = engine.cardById(app.deck, app.state.currentCardId);
    const choices = influencerChoicesFor(card);
    const choice = choices[side];
    const next = nextId || choice.next || 'OPEN_INVESTOR';
    const target = engine.cardById(app.deck, next);
    const effects = { ...choice.effects };
    if (next.startsWith('INFLUENCER_OUTCOME_')) {
      for (const [key, amount] of Object.entries(target.outcomeEffects || {})) {
        effects[key] = (effects[key] || 0) + amount;
      }
    }
    // Resolve the displayed contextual choice and selected outcome together.
    // Renders and decorative replies cannot charge these entry effects again.
    const resolvedCard = { ...card, continuation: 'forced', choices: {
      ...choices, [side]: { ...choice, next, effects },
    } };
    const scopedDeck = {
      ...app.deck,
      crises: {},
      meta: { ...app.deck.meta, maxTurns: Number.MAX_SAFE_INTEGER },
      cards: app.deck.cards.map(item => item.id === card.id ? resolvedCard : item),
    };
    return engine.resolveChoice(scopedDeck, app.state, side, { rng: () => 0 });
  }

  function influencerChoiceTargets(card, side) {
    if (card.id === 'INFLUENCER_07') return ['INFLUENCER_OUTCOME_2', 'INFLUENCER_OUTCOME_3'];
    if (card.id === 'INFLUENCER_08') {
      return (side === 'left' ? [4, 5] : [6, 7]).map(n => `INFLUENCER_OUTCOME_${n}`);
    }
    return [influencerChoicesFor(card)[side].next];
  }

  function selectInfluencerOutcome(cardId, side, rng = Math.random) {
    const won = rng() < 0.4;
    if (cardId === 'INFLUENCER_07') return won ? 'INFLUENCER_OUTCOME_2' : 'INFLUENCER_OUTCOME_3';
    if (cardId === 'INFLUENCER_08' && side === 'left') {
      return won ? 'INFLUENCER_OUTCOME_4' : 'INFLUENCER_OUTCOME_5';
    }
    if (cardId === 'INFLUENCER_08' && side === 'right') {
      return won ? 'INFLUENCER_OUTCOME_6' : 'INFLUENCER_OUTCOME_7';
    }
    throw new Error(`Influencer outcome requested from ${cardId} ${side}`);
  }

  function continueFromInfluencer(card, side) {
    app.locked = true;
    clearPreview();
    const choices = influencerChoicesFor(card);
    const next = ['INFLUENCER_07', 'INFLUENCER_08'].includes(card.id)
      ? selectInfluencerOutcome(card.id, side)
      : choices[side].next;
    const result = resolveInfluencerChoice(side, next);
    app.state = result.state;
    app.influencerPreviousCardId = card.id;
    renderCard();
    unlockAfterChoice();
  }

  function finishInfluencerOutcome(side) {
    app.locked = true;
    clearPreview();
    const result = resolveInfluencerChoice(side);
    app.state = result.state;
    app.influencerPreviousCardId = null;
    startSaved(1);
    app.locked = false;
  }

  function continueFromPadelInvite(side) {
    app.locked = true;
    clearPreview();
    const result = resolvePadelChoice(side);
    app.state = result.state;
    if (side === 'right') {
      app.padelCeoScore = null;
    }
    renderCard();
    unlockAfterChoice();
  }

  function continueFromPadelScoreCard(card, side) {
    app.locked = true;
    clearPreview();
    const next = padelChoiceTargets(card, side)[0];
    const result = resolvePadelChoice(side, next);
    app.state = result.state;
    app.padelCeoScore += Number(card.choices[side].ceoScore || 0);
    renderCard();
    unlockAfterChoice();
  }

  function selectPadelOutcome(side, ceoScore, rng = Math.random) {
    if (![-2, 0, 2].includes(ceoScore)) {
      throw new Error(`Invalid Padel CEO score at match point: ${ceoScore}`);
    }
    const edgeThreshold = ceoScore === 0 ? 0.5 : 0.6;
    if (side === 'left') return rng() < edgeThreshold ? 'PADEL_OUTCOME_3' : 'PADEL_OUTCOME_4';

    const wonMatch = rng() < 0.5;
    const outcomeRoll = rng();
    if (wonMatch) return outcomeRoll < edgeThreshold ? 'PADEL_OUTCOME_1' : 'PADEL_OUTCOME_2';
    const loseDealThreshold = ceoScore === 0 ? 0.5 : 0.4;
    return outcomeRoll < loseDealThreshold ? 'PADEL_OUTCOME_5' : 'PADEL_OUTCOME_6';
  }

  function continueFromPadelMatchPoint(side) {
    app.locked = true;
    clearPreview();
    const outcomeId = selectPadelOutcome(side, app.padelCeoScore);
    const result = resolvePadelChoice(side, outcomeId);
    app.state = result.state;
    renderCard();
    unlockAfterChoice();
  }

  function finishPadelOutcome(side) {
    app.locked = true;
    clearPreview();
    const result = resolvePadelChoice(side);
    app.state = result.state;
    app.padelCeoScore = null;
    startSaved(1);
    app.locked = false;
  }

  function prototypeDeck() {
    // All prototype branches stay playable at zero, including the opening.
    // Keep the displayed resources, but don't freeze the prototype at a boundary.
    return { ...app.deck, crises: {}, meta: { ...app.deck.meta, maxTurns: Number.MAX_SAFE_INTEGER } };
  }

  function selectLiveAgentOutcome(roll, rng = Math.random) {
    const score = app.liveAgentScore;
    if (!Number.isInteger(score) || Math.abs(score) > 5 || (score + 5) % 2 !== 0) {
      throw new Error(`Invalid bot score after five decisions: ${score}`);
    }
    const count = roll.count === 'support' ? (5 + score) / 2 : (5 - score) / 2;
    return rng() < roll.chances[count] ? roll.win : roll.lose;
  }

  function continueFromLiveAgent(card, side) {
    app.locked = true;
    clearPreview();
    if (card.id === 'LIVE_AGENT_01') app.liveAgentScore = 0;
    const choice = card.choices[side];
    const next = choice.outcomeRoll ? selectLiveAgentOutcome(choice.outcomeRoll) : choice.next;
    const target = engine.cardById(app.deck, next);
    const effects = { ...choice.effects };
    if (target.outcome) {
      for (const key of engine.RESOURCE_KEYS) {
        effects[key] = target.resetResources === 0
          ? -app.state.resources[key]
          : (effects[key] || 0) + (target.outcomeEffects[key] || 0);
      }
    }
    // One resolution records the local or selected outcome effect exactly once.
    const resolvedCard = { ...card, choices: { ...card.choices, [side]: { ...choice, next, effects } } };
    const deck = prototypeDeck();
    const scopedDeck = {
      ...deck,
      cards: deck.cards.map(item => item.id === card.id ? resolvedCard : item),
    };
    app.state = engine.resolveChoice(scopedDeck, app.state, side, { rng: () => 0 }).state;
    app.liveAgentScore += choice.botScore || 0;
    if (card.outcome) {
      app.liveAgentScore = 0;
      app.state.activeArc = null;
    }
    renderCard();
    unlockAfterChoice();
  }

  function choose(side) {
    if (app.locked || app.view !== 'playing') return;
    const card = engine.cardById(app.deck, app.state.currentCardId);
    recordTestStep();
    if (card.arc === 'live_agent') return continueFromLiveAgent(card, side);
    if (card.id === 'OPEN_INVESTOR') return continueFromInvestor(side);
    if (card.id.startsWith('INFLUENCER_OUTCOME_')) return finishInfluencerOutcome(side);
    if (card.id.startsWith('INFLUENCER_')) return continueFromInfluencer(card, side);
    if (card.id === 'PADEL_INVITE') return continueFromPadelInvite(side);
    if (card.id === 'DREAM_TEAM') return continueFromDreamTeam(side);
    if (card.id === 'IRL_PADEL_06') return continueFromPadelMatchPoint(side);
    if (card.id.startsWith('PADEL_OUTCOME_')) return finishPadelOutcome(side);
    if (Object.hasOwn(card.choices[side], 'ceoScore')) return continueFromPadelScoreCard(card, side);

    app.locked = true;
    clearPreview();
    const result = engine.resolveChoice(prototypeDeck(), app.state, side);
    app.state = result.state;
    renderCard();
    unlockAfterChoice();
  }

  function render() {
    if (!app.deck || !app.state) return;
    if (app.view === 'onboarding') renderOnboarding();
    else if (app.view === 'saved') renderSaved();
    else renderCard();
  }

  function showTestDetails() {
    if (!storyTestEnabled || !['playing', 'saved'].includes(app.view)) return;
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
        const after = target?.resetResources === 0 ? 0 : Math.max(0, Math.min(100,
          before + (choice.effects[key] || 0) + (target?.outcomeEffects?.[key] || 0)
          + (key === 'cash' ? app.deck.meta.baseCashBurn : 0)));
        return [key, after - before];
      }));
    }
    const translated = add(body, 'div', translation.text, 'test-details__translation');
    translated.dataset.detailsTranslation = '';
    const provenance = add(body, 'p', translation.source
      ? (translation.adapted ? 'Перевод из документа, адаптирован к текущей карте. ' : 'Перевод по документу. ')
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
      add(body, 'p', `Каждый ответ: ${effectsText({ cash: app.deck.meta.baseCashBurn })}. Итог учитывает пределы 0–100. Просмотр не делает ход.`, 'test-details__note');
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

  $('[data-pinned]').addEventListener('click', () => {
    if ($('[data-pinned]').classList.contains('irl-location')) return;
    $('[data-pin-sheet]').hidden = false;
  });
  $('[data-test-back]').addEventListener('click', backInStoryTest);
  $('[data-test-inspect]').addEventListener('click', showTestDetails);
  $('[data-details-close]').addEventListener('click', () => $('[data-test-details]').close());
  $('[data-test-restart]').addEventListener('click', startStoryTest);
  $('[data-pin-close]').addEventListener('click', () => { $('[data-pin-sheet]').hidden = true; });
  $('[data-pin-sheet]').addEventListener('click', (event) => {
    if (event.target === $('[data-pin-sheet]')) $('[data-pin-sheet]').hidden = true;
  });
  $('[data-restart-run]').addEventListener('click', () => {
    if (app.view === 'onboarding') return;
    recordTestStep();
    window.clearTimeout(choiceUnlockTimer);
    app.state = engine.startRun(app.deck);
    app.padelCeoScore = null;
    app.influencerPreviousCardId = null;
    app.liveAgentScore = 0;
    app.locked = false;
    startSaved(0);
  });

  document.addEventListener('keydown', (event) => {
    if ($('[data-test-details]').open) return;
    if (event.key === 'Escape') $('[data-pin-sheet]').hidden = true;
    if (app.view !== 'playing') return;
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
    .then((deck) => {
      const errors = engine.validateDeck(deck);
      if (errors.length) throw new Error(errors.join('\n'));
      app.deck = deck;
      if (storyTestEnabled) {
        startStoryTest();
        return;
      }
      app.state = engine.startRun(deck);
      app.onboardingIndex = 0;
      deliverOnboardingMessage();
    })
    .catch((error) => {
      $('[data-message]').textContent = `Could not start Mistakery: ${error.message}`;
      console.error(error);
    });
})();
