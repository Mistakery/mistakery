const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const deck = JSON.parse(fs.readFileSync(path.join(root, 'cards.json'), 'utf8'));
const source = `(function(root, factory) {\n  const deck = factory();\n  if (typeof module === 'object' && module.exports) module.exports = deck;\n  root.MISTAKERY_DECK = deck;\n})(typeof globalThis !== 'undefined' ? globalThis : window, function() {\n  return ${JSON.stringify(deck)};\n});\n`;

fs.writeFileSync(path.join(root, 'cards.bundle.js'), source);

// Invalidate cached runtime files together with deck updates, including local previews.
const indexPath = path.join(root, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
for (const file of ['style.css', 'cards.bundle.js', 'game.js', 'app.js']) {
  const version = createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex').slice(0, 12);
  const assetUrl = new RegExp(`((?:src|href)=")${file.replace(/\./g, '\\.')}[^"\\s]*(")`, 'g');
  index = index.replace(assetUrl, `$1${file}?v=${version}$2`);
}
fs.writeFileSync(indexPath, index);
