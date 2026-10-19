const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const { changes } = require('./revision-pack.fixture.cjs');
const witnesses = require('../docs/qa/deck-cleanup/witnesses.json');
const lossWitness = require('../docs/qa/resource-endings.json').witnesses.cash_low;
const root = path.resolve(__dirname, '..');
const url = process.env.MISTAKERY_TEST_URL || pathToFileURL(path.join(root, 'index.html')).href;
const qa = process.env.MISTAKERY_QA_DIR;
const clean = text => text.replaceAll('\u00a0', ' ');
async function card(page, id) {
  await page.evaluate(id => {
    const a = MistakeryApp;
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'revision-pack' });
    a.state.currentCardId = id;
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
  }, id);
  await page.clock.runFor(15000);
}
async function shot(page, name) {
  if (!qa) return;
  fs.mkdirSync(qa, { recursive: true });
  await page.evaluate(() => document.getAnimations().forEach(a => { if (a.effect.getTiming().iterations !== Infinity) a.finish(); }));
  await page.clock.runFor(500);
  await page.screenshot({ path: path.join(qa, `${name}.png`), animations: 'disabled' });
}
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  test(`${name}: revision copy, request image/bold, voice and YC avatar render silently on mobile and desktop`, async () => {
    const browser = await type.launch();
    try {
      for (const width of [320, 390, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: width === 320 ? 650 : 900 }, reducedMotion: 'reduce' });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        // This runs before ANY application code; never click the voice attachment.
        await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
        await page.goto(url + '?story=live-agent');
        await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
        assert.equal(await page.evaluate(() => MistakerySound.enabled), false);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        for (const id of ['INFLUENCER_01', 'INFLUENCER_02', 'INFLUENCER_03', 'INFLUENCER_04', 'PADEL_INVITE', 'FILL_RIVAL', 'FILL_MANTRA']) {
          await card(page, id);
          const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
          const text = clean(await page.locator('[data-chat]').innerText());
          for (const change of changes.filter(c => c.id === id && (c.field === 'text' || /^messages\.\d+\.text$/.test(c.field)))) {
            for (const line of change.after.split('\n').filter(Boolean)) assert.ok(text.includes(line), `${id}: ${line}`);
          }
          if (id === 'INFLUENCER_03') {
            const strong = page.locator('.message strong').filter({ hasText: 'make me $1B app. make zero mistakes' });
            assert.equal(await strong.count(), 1);
            assert.equal(await page.locator('.message em').count(), 0);
            const image = page.locator('.message-image');
            assert.equal(await image.count(), 1);
            const result = await image.evaluate(async img => {
              await img.decode(); const r = img.getBoundingClientRect();
              return [img.getAttribute('src'), img.naturalWidth, img.naturalHeight, r.width / r.height];
            });
            assert.deepEqual(result.slice(0, 3), ['assets/influencer-request-queue.webp', 1200, 800]);
            assert.ok(Math.abs(result[3] - 1.5) < .01);
            await image.scrollIntoViewIfNeeded(); await shot(page, `${name}-${width}-requests`);
          }
          if (id === 'FILL_MANTRA') {
            assert.doesNotMatch(text, /4.hour|four.hour/i);
            assert.match(await page.locator('.message-image').getAttribute('alt'), /3:47:28/);
            assert.equal(await page.locator('.message-image').evaluate(async img => { await img.decode(); return img.naturalWidth; }), 600);
            await shot(page, `${name}-${width}-voice`);
          }
          if (id === 'FILL_RIVAL') {
            for (const selector of ['[data-avatar] img', '.message-avatar img']) {
              const avatar = page.locator(selector);
              assert.equal(await avatar.count(), 1, selector);
              assert.equal(await avatar.getAttribute('src'), 'assets/avatar-yc-founder.webp');
              assert.equal(await avatar.evaluate(async img => { await img.decode(); return img.naturalWidth; }), 128);
            }
            await shot(page, `${name}-${width}-rival`);
          }
          if (['INFLUENCER_01', 'INFLUENCER_02', 'INFLUENCER_04', 'PADEL_INVITE'].includes(id)) await shot(page, `${name}-${width}-${id.toLowerCase()}`);
          assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state, `${id}: presentation is free`);
          assert.equal(await page.locator('[data-choice]:disabled').count(), 0, id);
          assert.ok(await page.locator('[data-chat]').evaluate(n => n.scrollWidth <= n.clientWidth + 1), id);
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
  test(`${name}: both Judgment Day replies start exactly one fresh attempt and other endings retain their UI`, async () => {
    const browser = await type.launch();
    try {
      for (const width of [320, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
        await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
        await page.goto(url + '?story=live-agent');
        await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
        await page.clock.install(); await page.clock.pauseAt(new Date());
        for (const side of ['left', 'right']) {
          await page.evaluate(w => {
            const a = MistakeryApp;
            let state = MistakeryRoute.startRun(a.deck, { seed: w.seed });
            for (const side of w.actions) state = MistakeryRoute.resolveChoice(a.deck, state, side === 'L' ? 'left' : 'right').state;
            a.state = state; a.view = 'playing'; a.locked = false; a.cardDelivery = null; a.render();
          }, witnesses.LIVE_AGENT_OUTCOME_2);
          assert.equal(await page.evaluate(() => MistakeryApp.state.endingId), 'judgment_day');
          assert.equal(await page.locator('[data-ending-summary] small').innerText(), 'GAME OVER');
          assert.equal(await page.locator('[data-ending-title]').isVisible(), false);
          assert.equal(await page.locator('[data-ending-cause]').innerText(), 'The world is gone. So is your company.');
          assert.deepEqual(await page.locator('[data-choice]').allTextContents(), ['Oops', 'Finally 😍']);
          await page.clock.runFor(15000); await shot(page, `${name}-${width}-judgment`);
          const before = await page.evaluate(() => ({ seed: MistakeryApp.state.seed, first: MistakeryApp.state.route.order[0] }));
          const result = await page.evaluate(side => {
            const old = [...document.querySelectorAll('[data-choice]')];
            document.querySelector(`[data-choice=${side}]`).click();
            const once = JSON.stringify(MistakeryApp.state);
            // Stale references simulate a second click queued on the old final.
            old.forEach(button => button.click());
            return { once, after: JSON.stringify(MistakeryApp.state), seed: MistakeryApp.state.seed, first: MistakeryApp.state.route.order[0], view: MistakeryApp.view };
          }, side);
          assert.equal(result.once, result.after, 'stale final buttons cannot restart twice');
          assert.notEqual(result.seed, before.seed);
          assert.notEqual(result.first, before.first);
          assert.equal(result.view, 'playing');
        }
        // Completion without three acknowledged wins returns to the title.
        await page.evaluate(() => {
          const a = MistakeryApp; a.state.gameOver = true; a.state.endingId = 'run_complete'; a.render();
        });
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'title');
        assert.equal(await page.locator('[data-ending-summary]').isVisible(), false);
        assert.deepEqual(await page.locator('.title-actions button').allTextContents(), ['New run']);
        await page.evaluate(w => {
          const a = MistakeryApp;
          let state = MistakeryRoute.startRun(a.deck, { seed: w.seed });
          for (const step of w.steps) state = MistakeryRoute.resolveChoice(a.deck, state, step.side).state;
          a.state = state; a.view = 'playing'; a.locked = false; a.cardDelivery = null; a.render();
        }, lossWitness);
        await page.clock.runFor(15000);
        await page.locator('[data-choice=left]').click();
        await page.clock.runFor(1000);
        assert.deepEqual(await page.locator('[data-finale-choice]').allTextContents(), ['Back to 9–5', 'New run']);
        await page.locator('[data-loss-finale]').press('Escape');
        assert.match(await page.locator('[data-ending-summary] small').innerText(), /YOU LOST/);
        assert.equal(await page.locator('[data-ending-title]').innerText(), 'PAYROLL CLIFF');
        assert.deepEqual(await page.locator('[data-choice]').allTextContents(), ['Back to 9–5', 'New run']);
        await page.close();
      }
    } finally { await browser.close(); }
  });
}
