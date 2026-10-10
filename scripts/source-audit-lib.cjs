const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mapping = require('../docs/qa/source-audit/mapping.json');
const ownerOverrides = require('../docs/qa/source-audit/owner-overrides.json');
const sources = Object.fromEntries([1,2,3,4].map(n => [n, fs.readFileSync(path.join(root, `docs/qa/source-audit/public/doc${n}.txt`), 'utf8').split('\n')]));
function expected(entry) {
  if (ownerOverrides.omitFields?.some(item => item.id === entry.id && item.field === entry.field)) return undefined;
  const ranges = entry.ranges || [[entry.start, entry.end]];
  let value = ranges.map(([a,b]) => sources[entry.doc].slice(a-1,b).join('\n')).join('\n');
  if (entry.kind === 'choice') value = value.replace(/^[AАBВ]:\s*/, '').split(/\s*[→—]\s*/)[0].replace(/\s*\[Cash.*$/, '').split(' / ')[0].trim();
  if (entry.kind === 'ruChoice') {
    if (/^[AАBВ]:/.test(value)) value = value.replace(/^[AАBВ]:\s*/, '').split(/\s*[→—]\s*/)[0].trim();
    if (entry.id === 'FILL_MOM_CALL_2' && entry.field === 'ru.right') value = value.split(' / ')[1];
    else value = value.split(/\s+→/)[0].split(' / ')[0];
  }
  if (entry.kind === 'score') value = value.replace('Счёт: ', 'Score: ').replace('матчбол', 'MATCH POINT');
  if (entry.kind === 'mediaEmotion') value = '😔'; // Source explicitly requests a sad emoji, without selecting a glyph.
  if (entry.id === 'FILL_MANTRA' && entry.field === 'text') value = value.replace(/\n/g, '\n\n'); // Owner's subsequent three-bubble delivery instruction.
  const override = ownerOverrides.emoji.find(item => item.id === entry.id && item.field === entry.field);
  for (const [from, to] of override?.replacements || []) value = value.replace(from, to);
  value = displayText(value);
  const wording = ownerOverrides.wording?.find(item => item.id === entry.id && item.field === entry.field);
  for (const [from, to] of wording?.replacements || []) value = value.replace(from, to);
  const layout = ownerOverrides.layout?.find(item => item.id === entry.id && item.field === entry.field);
  if (layout) value = layout.value;
  return value;
}
function displayText(value) {
  // Owner: no closing full stops on phrases/bubbles; internal sentences and ellipses remain.
  return String(value).replace(/(^|[^.])\.(?=[”"'’\)\]]*(?:[ \t]|\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u200D)*$)/gmu, '$1');
}
function get(card, field, deck) {
  const parts = field.split('.');
  let value = parts[0] === 'ru' ? deck.testTranslations[card.id] : card;
  if(parts[0] === 'ru') parts.shift();
  return parts.reduce((v,k) => v?.[k], value);
}
function set(card, field, value, deck) {
  const parts = field.split('.');
  let obj = parts[0] === 'ru' ? deck.testTranslations[card.id] : card;
  if(parts[0] === 'ru') parts.shift();
  const last = parts.pop();
  for(const key of parts) obj = obj[key] ??= {};
  obj[last] = value;
}
function mechanics(deck) {
  function clean(value) {
    if(Array.isArray(value)) return value.map(clean);
    if(value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !['label','lowLabel','highLabel','text','source','mode','messages','image','imageRef','placeholder','score','location','avatar','participants','preservePunctuation','italicLines','actor_action','player_decision','effect_reason'].includes(k)).map(([k,v]) => [k,clean(v)]));
    return value;
  }
  return {meta:deck.meta,initialResources:deck.initialResources,cards:deck.cards.map(clean),endings:deck.endings};
}
module.exports = { mapping, expected, get, set, mechanics, displayText, ownerOverrides };
