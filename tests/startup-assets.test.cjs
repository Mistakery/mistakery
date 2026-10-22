const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('first-screen logo stays below 600 KiB without reducing original dimensions', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const logo = html.match(/<link[^>]+href="([^"]*mistakery-logo[^"/]*\.[^"]+)"[^>]*>/)[1];
  assert.ok(fs.statSync(path.join(root, logo)).size <= 600 * 1024, 'logo exceeds the cold-start transfer budget');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.ok(app.includes(`titleLogo.src = '${logo}'`), 'preload and displayed logo use one resource');
  assert.match(app, /new Image\(2172, 724\)/);
});
