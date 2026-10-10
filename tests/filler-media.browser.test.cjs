const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const deck = require('../cards.json');
const url = (process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href) + '?test=route';
const ids = ['FILL_DOMAIN_1', 'FILL_VIDEO_2', 'FILL_COMA_2A', 'FILL_FONT', 'FILL_BLACK_SQUARE', 'FILL_MOM_FLYERS'];
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: six filler photos decode, preserve their proportions and remain readable on phones`, async () => {
    const browser = await type.launch();
    try {
      for (const width of [320, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.goto(url); await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.clock.install(); await page.clock.pauseAt(new Date());
        for (const id of ids) {
          await page.evaluate(id => {
            const a = MistakeryApp;
            a.state = MistakeryRoute.startRun(a.deck, { seed: 'photos' });
            a.state.currentCardId = id; a.state.route.phase = 'fillers';
            a.state.route.gap = { target: 5, played: [], usedUnit: a.deck.cards.find(c => c.id === id).filler.unit };
            a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
          }, id);
          await page.clock.runFor(6000);
          const expected = deck.cards.find(c => c.id === id).image;
          const img = page.locator('.message-image');
          assert.equal(await img.count(), 1, id);
          const actual = await img.evaluate(async img => {
            await img.decode();
            const chat = document.querySelector('[data-chat]');
            const rect = img.getBoundingClientRect();
            return { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight,
              ratio: rect.width / rect.height, width: rect.width, overflow: chat.scrollWidth - chat.clientWidth,
              coversHeader: document.elementFromPoint(rect.left + rect.width / 2, chat.getBoundingClientRect().top - 5)?.closest('.image-bubble') === img.parentElement };
          });
          assert.equal(actual.src, expected.src, id);
          assert.equal(actual.coversHeader, false, `${id}: photo must stay inside the scrolling chat`);
          assert.deepEqual([actual.w, actual.h], [expected.width, expected.height], id);
          assert.ok(Math.abs(actual.ratio - actual.w / actual.h) < .01, `${id}: no cropping/stretching`);
          assert.ok(actual.width > 80 && actual.overflow <= 1, `${id}: readable without horizontal overflow`);
          assert.equal(await page.locator('[data-choice=left]').isEnabled(), true, id);
          assert.equal(await page.locator('.typing-bubble').count(), 0, id);
          await page.evaluate(() => MistakeryApp.render());
          assert.equal(await img.count(), 1, `${id}: rerender retains the picture`);
          await page.locator('[data-test-restart]').click();
          await page.clock.runFor(6000);
          assert.equal(await page.locator('.message-image').count(), 0, `${id}: restart clears media`);
        }
        assert.deepEqual(errors, []);
        await page.close();
      }
    } finally { await browser.close(); }
  });
}
