const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const deck = JSON.parse(fs.readFileSync(path.join(root, 'cards.json'), 'utf8'));

function quote(lines, htmlBreaks = false) {
  if (htmlBreaks) {
    return lines.map((line, index) => `> ${line}${index < lines.length - 1 ? '<br>' : ''}`).join('\n');
  }
  return lines.map((line, index) => `> ${line}${index < lines.length - 1 ? '<br>' : ''}`).join('\n');
}

function effects(choice) {
  const labels = { cash: 'Cash', team: 'Team', customers: 'Customers', founder: 'Founder' };
  const values = Object.entries(choice.effects || {}).filter(([, value]) => Number(value) !== 0);
  const parts = values.map(([key, value]) => `${labels[key]} ${value > 0 ? '+' : ''}${value}`);
  if (choice.botScore) parts.push(`hidden bot score ${choice.botScore > 0 ? '+' : ''}${choice.botScore}`);
  return parts.length ? parts.join(', ') : 'без отдельного эффекта';
}

function route(choice) {
  const parts = [];
  if (choice.outcomeRoll) {
    const roll = choice.outcomeRoll;
    return `0–5 ${roll.count}: ${roll.chances.map(chance => `${Math.round(chance * 100)}%`).join(' / ')} → \`${roll.win}\`; иначе → \`${roll.lose}\``;
  }
  if (choice.startArc) parts.push(`выбирает ветку ${choice.startArc}`);
  if (choice.switchArc) parts.push(`переходит в ветку ${choice.switchArc}`);
  if (choice.next) parts.push(`→ \`${Array.isArray(choice.next) ? choice.next.join(' / ') : choice.next}\``);
  if (choice.crisis) parts.push(`кризис \`${choice.crisis}\``);
  if (choice.ending) parts.push(`финал \`${choice.ending}\``);
  if (!parts.length) parts.push('продолжение через общий маршрут');
  return parts.join('; ');
}

function cardVisibleLines(card) {
  return [
    ...(card.placeholder ? [card.placeholder] : []),
    ...(card.image ? [card.image.alt] : []),
    ...(typeof card.text === 'string' ? card.text.split('\n') : []),
    ...(card.messages || []).flatMap((message) => [
      ...(message.forwardedFrom ? [`Forwarded from ${deck.sources[message.forwardedFrom].name}`] : card.mode === 'team' ? [message.direction === 'outgoing' ? '@founder' : deck.sources[message.source].name] : []),
      ...(message.imageRef ? [deck.images[message.imageRef].placeholder || deck.images[message.imageRef].alt] : []),
      ...(message.placeholder ? [message.placeholder] : []),
      ...(message.image ? [message.image.alt] : []),
      ...(typeof message.text === 'string' ? message.text.split('\n') : []),
    ]),
  ].filter(Boolean);
}

const sections = [
  ['1. Филлеры между сюжетами', (card) => Boolean(card.filler)],
  ['2. Live AI Agent', (card) => card.plot === 'live_agent'],
  ['3. AI Influencer', (card) => card.plot === 'influencer'],
  ['4. ClosedAI Padel', (card) => card.plot === 'padel'],
];

const lines = [
  '# Mistakery — полный каталог карточек EN/RU',
  '',
  'Числовые эффекты ниже предназначены для редакторской проверки. В обычной игре игрок видит текущие проценты и подсветку ресурсов. В тестовой версии кнопка RU / ± показывает перевод и точные эффекты текущей карты.',
  '',
  'Каждый игровой ход дополнительно списывает 0,5 Cash, включая ответы на исходах. Внутри эпизода сохраняется полный баланс, в том числе ниже 0 и выше 100; шкалы показывают 0–100. Шесть ресурсных концовок проверяются после сюжетной развязки или всей филлерной связки. Навигация, финальная реакция и перерисовка ничего не списывают. Последнего шанса нет. Судный день заканчивает игру сразу.',
  '',
];

const catalogued = new Set();
for (const [title, predicate] of sections) {
  const cards = deck.cards.filter((card) => predicate(card) && !catalogued.has(card.id));
  if (!cards.length) continue;
  lines.push(`# ${title}`, '');
  for (const card of cards) {
    catalogued.add(card.id);
    const englishLines = cardVisibleLines(card);
    const reference = deck.testTranslations?.[card.id];
    const translation = (reference && { ...reference, text: reference.text.split('\n') }) || {
      text: englishLines,
      left: card.choices.left.label,
      right: card.choices.right.label,
      exactEnglishOnly: true,
    };
    const source = deck.sources[card.source];
    const translationHeading = translation.exactEnglishOnly
      ? '**RU — перевод не утверждён; сохранён точный EN**'
      : '**RU**';
    lines.push(`## ${card.id} — ${source.role} ${source.name}`, '', '**EN**', '', quote(englishLines, translation.exactEnglishOnly), '', translationHeading, '', quote(translation.text, translation.exactEnglishOnly), '');
    if (reference) lines.push(reference.source
      ? `Источник перевода: ${reference.source}${reference.sourceGaps?.length ? ` (в документе отсутствуют RU-поля: ${reference.sourceGaps.join(', ')}; сохранён прежний перевод)` : reference.ownerPresentation ? ' (эмодзи и финальная пунктуация по правилам владельца)' : reference.adapted ? ' (адаптирован к текущей английской карте)' : ''}.`
      : 'Перевод текущего английского текста; полный русский вариант в исходных документах отсутствует.', '');
    if (card.terminalEnding) lines.push('Ниже сохранены старые ответы из исходной карточки; в терминальном экране они заменены одной кнопкой Start again.', '');
    for (const side of ['left', 'right']) {
      const choice = card.choices[side];
      lines.push(`- **${choice.label} — ${translation[side]}**: ${effects(choice)}; ${route(choice)}.`);
    }
    if (card.filler) lines.push('', `Филлер: ${card.filler.role}; связка/единица ${card.filler.unit}. Условия: нужны ${(card.requires || []).join(', ') || 'нет'}; исключены ${(card.excludes || []).join(', ') || 'нет'}. Продолжение связки немедленно; каждый экран считается отдельной картой.`);
    if (card.outcome) {
      lines.push('', `Эффект при входе в исход, ровно один раз: ${card.resetResources === 0 ? 'Cash = Team = Customers = Founder = 0' : effects({ effects: card.outcomeEffects })}. ${card.terminalEnding ? 'Мир уничтожен. Игра окончена сразу; только перезапуск.' : 'Ответ завершает сюжет; затем проверяются ресурсные концовки перед следующим эпизодом.'}`);
    } else if (card.id.startsWith('PADEL_OUTCOME_') || card.id.startsWith('INFLUENCER_OUTCOME_')) {
      lines.push('', `Эффект при входе в исход, ровно один раз: ${effects({ effects: card.outcomeEffects })}. Ответ завершает сюжет; затем проверяются ресурсные концовки перед следующим эпизодом.`);
    }
    if (card.winFeedback) {
      const feedback = card.winFeedback;
      lines.push('', `Победная отбивка @b2buddy · вариант ${feedback.variant} (точный текст владельца):`, '', quote([feedback.message]), '');
      for (const choice of feedback.choices) lines.push(`- **${choice.en} — ${choice.ru}**: бесплатно продолжает текущую игру; без эффектов, нового хода или RNG.`);
    }
    for (const [previousCardId, contextualChoices] of Object.entries(card.contextualChoices || {})) {
      for (const side of ['left', 'right']) {
        const choice = contextualChoices[side];
        const translatedLabel = reference?.contextual?.[previousCardId]?.[side];
        lines.push(`- **${choice.label} — ${translatedLabel || choice.label}** (контекст после \`${previousCardId}\`${translatedLabel ? '' : '; RU-перевод не утверждён'}): ${effects(choice)}; ${route(choice)}.`);
      }
    }
    lines.push('');
  }
}

lines.push('# 5. Используемые ресурсные концовки', '', 'Каждая — финальная реакция персонажа, причина проигрыша и одна кнопка Start again. Другие архивные ending-определения в этом маршруте не используются.', '');
for (const id of deck.meta.route.resourceEndings) {
  const ending = deck.endings[id];
  lines.push(`## ${id} — ${ending.title}`, '', `${ending.source} · ${ending.resource} ${ending.edge === 'low' ? 0 : 100}`, '',
    '**EN**', '', quote(ending.reaction.split('\n')), '', ending.cause, '', '**RU**', '', quote(ending.reactionRu.split('\n')), '', ending.causeRu, '');
  if (ending.fallbackReaction) {
    const fallback = ending.fallbackReaction;
    lines.push(`Если оригинальный бот недоступен, ту же концовку сообщает ${fallback.source}:`, '', quote(fallback.text.split('\n')), '', quote(fallback.textRu.split('\n')), '');
  }
}
const founder = deck.meta.founderProfile;
lines.push('# 6. Founder profile — награда за три победы', '',
  'Только три различные победы одной попытки без ресурсного поражения. Reveal бесплатен; Finish сохраняет карточку, One more run начинает новую попытку.', '',
  '**EN — утверждённый текст; RU-перевод не утверждён**', '', quote(founder.invitation.split('\n')), '',
  founder.heading, '', founder.issuer, '');
for (const [id, profile] of Object.entries(founder.types)) {
  lines.push(`## Founder ${id} — ${profile.title}`, '', quote([profile.line]), '');
}
fs.writeFileSync(path.join(root, 'MISTAKERY_CARDS_EN_RU.md'), `${lines.join('\n')}\n`);
