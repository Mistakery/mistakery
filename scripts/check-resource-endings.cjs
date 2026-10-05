const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const deck = require('../cards.json');
const route = require('../assets/route.js');
const engine = require('../game.js');
const root = path.resolve(__dirname, '..');
const ids = [...deck.meta.route.resourceEndings, 'judgment_day'];
const sampleSize = 3000;
const horizon = 250;
const counts = {}, orders = {}, witnesses = {};

function play(seed) {
  let state = route.startRun(deck, { seed });
  const order = [...state.route.order];
  let decisions = seed + 1;
  const steps = [];
  while (!state.gameOver && steps.length < horizon) {
    decisions = (Math.imul(decisions, 1664525) + 1013904223) >>> 0;
    const side = decisions < 2147483648 ? 'left' : 'right';
    const card = engine.cardById(deck, state.currentCardId);
    const choice = route.choicesFor(card, state)[side];
    const next = route.resolveChoice(deck, state, side).state;
    const h = next.history.at(-1);
    steps.push({ card: card.id, side, label: engine.getChoiceLabel(choice, state.resources.founder),
      before: h.resourcesBefore, after: h.resourcesAfter, rawBefore: h.rawBefore, rawAfter: h.rawAfter,
      change: Object.fromEntries(engine.RESOURCE_KEYS.map(key => [key, h.rawAfter[key] - h.rawBefore[key]])),
      checkpoint: next.gameOver || next.route.resourceLedger === null,
      next: next.currentCardId, cycle: state.route.cycle });
    state = next;
  }
  return { seed, order, ending: state.endingId || 'unfinished', cycle: state.route.cycle,
    actions: steps.length, resources: state.resources, raw: state.route.ending?.rawResources, steps };
}
function consider(run) {
  if (!ids.includes(run.ending)) return;
  const old = witnesses[run.ending];
  if (!old || run.cycle < old.cycle || run.cycle === old.cycle && run.actions < old.actions) witnesses[run.ending] = run;
}
for (let seed = 0; seed < sampleSize; seed++) {
  const run = play(seed);
  counts[run.ending] = (counts[run.ending] || 0) + 1;
  const order = run.order.join(' → ');
  orders[order] = (orders[order] || 0) + 1;
  consider(run);
}
// Additional seeds are only a witness search, not part of the frequency sample.
let searchEnd = sampleSize;
while (ids.some(id => !witnesses[id] || witnesses[id].cycle > 1) && searchEnd < 30000) consider(play(searchEnd++));
assert.ok(ids.every(id => witnesses[id]), 'Missing a reachable ending');
for (const id of ids) {
  const w = witnesses[id];
  let state = route.startRun(deck, { seed: w.seed });
  for (const step of w.steps) {
    assert.equal(state.gameOver, false, 'Witness must stop at its first ending');
    assert.equal(state.currentCardId, step.card);
    state = route.resolveChoice(deck, state, step.side).state;
    assert.deepEqual(state.resources, step.after);
  }
  assert.equal(state.endingId, id);
}
const hashes = Object.fromEntries(['cards.json', 'assets/route.js', 'game.js'].map(file =>
  [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
const report = { policy: 'Seeded 50/50 replies, unchanged starting resources, real route RNG, no forced outcomes',
  sampleSize, horizon, searchEnd, counts, orders, hashes, witnesses };
const out = path.join(root, 'docs/qa'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'resource-endings.json'), JSON.stringify(report, null, 2) + '\n');
const values = object => engine.RESOURCE_KEYS.map(key => object[key]).join(' / ');
const lines = ['# Проверка ресурсных концовок', '',
  'Шкалы: Cash / Team / Customers / Founder. Старт: **25 / 60 / 15 / 65**. Каждый ответ стоит 0,5 Cash. Штраф за отказ от Padel/Influencer — 15 Cash (решение владельца от 2026-10-03); отдельные расходы за время в Padel и OPEN_INVESTOR убраны: ответ стоит только общие 0,5 Cash. Штрафы, покупки и сюжетные исходы сохранены.', '',
  'Проверка проигрыша — после ответа на сюжетную развязку; между сюжетами — после одиночной карты или всей связки. Судный день заканчивает игру сразу. Во время эпизода учитывается полный баланс, в том числе ниже 0 и выше 100; шкалы показывают 0–100. При выживании новый эпизод начинается с показанных значений.', '',
  '**Частоты ниже — результат случайного выбора кнопок, а не прогноз поведения игроков.** 3 000 запусков, seed 0–2999, 50/50 левая/правая кнопка, максимум 250 ответов. Все шесть порядков сюжетов представлены. Случайные сюжетные исходы и выбор филлеров определяет настоящий игровой маршрут.', '',
  '| Концовка | Случайных запусков | Доля | Seed примера | Ответов | Цикл |',
  '|---|---:|---:|---:|---:|---:|'];
for (const id of ids) { const w = witnesses[id]; lines.push(`| ${deck.endings[id].title} | ${counts[id] || 0} | ${((counts[id] || 0) / sampleSize * 100).toFixed(2)}% | ${w.seed} | ${w.actions} | ${w.cycle} |`); }
lines.push('', `Не завершились за 250 ответов: ${counts.unfinished || 0}. ${searchEnd > sampleSize
  ? `Дополнительный поиск примеров: seeds ${sampleSize}–${searchEnd - 1}; он не включён в частоты.`
  : 'Все примеры найдены в основной выборке; дополнительный поиск не потребовался.'}`, '',
  '## Что это значит для баланса', '',
  '- Все шесть ресурсных концовок достижимы без изменения начальных значений, подмены карт или случайных исходов. Примеры ниже воспроизведены повторно.',
  '- Отказ от первого приглашения в Padel или Influencer оставляет 9 Cash после подтверждения развязки: 25 − 15 − 0,5 − 0,5 = 9. Штраф за упущенную сделку сохраняется; при текущем Cash ≤ 16 отказ по-прежнему приводит к Payroll Cliff.',
  '- Следующий этап — тест этой версии на людях. Новые истории пока не планируются; неочевидные последствия логичных действий в Live Agent намеренны.',
  '- Одновременные причины: Cash → Team → Customers → Founder. Все причины сохраняются, но персонажная реакция соответствует первой. Судный день важнее ресурсных причин.',
  '- Cash 100 и Customers 100 в этом эксперименте не запускают архивные, не выбранные концовки.',
  '- Обычный финал успешного прохождения ещё не определён. После трёх пережитых сюжетов остаётся прежний тестовый цикл; для финального релиза его нужно заменить согласованным завершением.', '',
  '## Как воспроизвести', '',
  'Открыть локальную игру с `?test=route&seed=SEED`. Пройти Saved и нажимать указанные кнопки. `?story=live-agent` для доказательства не подходит: он меняет первый сюжет и использует случайность браузера. JSON рядом содержит каждый переход и исходный баланс до/после.', '');
for (const id of ids) {
  const w = witnesses[id];
  lines.push(`### ${deck.endings[id].title}`, '', `Seed **${w.seed}**, порядок: ${w.order.join(' → ')}. Финальные шкалы: **${values(w.resources)}**; полный баланс: **${values(w.raw)}**.`, '',
    '| № | Карта | Ответ | Изменение с расходом хода | Полный баланс после | Проверка |', '|---:|---|---|---|---|---|');
  w.steps.forEach((s, i) => lines.push(`| ${i + 1} | ${s.card} | ${s.side === 'left' ? 'Л' : 'П'}: ${s.label.replaceAll('|', '/')} | ${values(s.change)} | ${values(s.rawAfter)} | ${s.checkpoint ? 'Да' : 'Нет'} |`));
  lines.push('');
}
lines.push('## Источники и проверка', '', '`node scripts/check-resource-endings.cjs` пересоздаёт этот отчёт. Хеши входных файлов и распределение порядков сохранены в `resource-endings.json`.', '');
fs.writeFileSync(path.join(out, 'resource-endings.md'), lines.join('\n'));
console.log(JSON.stringify({ sampleSize, counts, searchEnd, witnesses: Object.fromEntries(ids.map(id => [id,
  { seed: witnesses[id].seed, actions: witnesses[id].actions, cycle: witnesses[id].cycle }])) }, null, 2));
