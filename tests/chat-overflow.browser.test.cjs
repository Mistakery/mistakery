const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?test=route';

for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const width of [320, 390]) {
    test(`${name}/${width}: DREAM_TEAM scrolls inside its chat and cannot cover the header`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width, height: 650 } });
        const time = new Date('2026-10-12T06:10:00Z');
        await page.clock.install({ time }); await page.clock.pauseAt(time); await page.goto(url);
        await page.waitForFunction(() => window.MistakeryApp?.state && MistakeryApp.view !== 'loading');
        await page.evaluate(() => {
          const a = MistakeryApp; clearTimeout(a.introTypingTimer);
          a.state = MistakeryRoute.startRun(a.deck, { seed: 'chat-overflow' });
          a.state.currentCardId = 'DREAM_TEAM'; a.cardDelivery = null;
          a.view = 'playing'; a.locked = false; a.render();
        });
        const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
        await page.clock.runFor(12000);
        const metrics = await page.evaluate(() => {
          document.querySelectorAll('[data-chat-current]').forEach(n => n.getAnimations().forEach(a => a.finish()));
          const chat = document.querySelector('[data-chat]'), header = document.querySelector('.contact');
          const rect = n => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; };
          const nodes = [...chat.querySelectorAll('[data-chat-current]')];
          const title = header.querySelector('.contact__text').getBoundingClientRect();
          const headerClear = () => header.contains(document.elementFromPoint(title.left + 10, (title.top + title.bottom) / 2));
          const bottom = { chat: rect(chat), last: rect(nodes.at(-1)), clear: headerClear(), scroll: chat.scrollTop };
          chat.scrollTop = 0;
          const top = { chat: rect(chat), first: rect(nodes[0]), clear: headerClear() };
          return { bottom, top, count: nodes.length, height: chat.clientHeight, content: chat.scrollHeight };
        });
        assert.equal(metrics.count, 5, 'all authored message parts remain in the chat');
        assert.ok(metrics.bottom.clear && metrics.top.clear, 'title and contact remain unobscured at either scroll position');
        assert.ok(metrics.content > metrics.height, 'this scene genuinely overflows on the compact screen');
        assert.ok(metrics.bottom.scroll > 0, 'delivery follows the newest messages inside the scroll area');
        assert.ok(metrics.bottom.last.bottom <= metrics.bottom.chat.bottom + 1, 'last message is visible above the composer');
        assert.ok(metrics.top.first.top >= metrics.top.chat.top - 1, 'first bubble is reachable by scrolling back');
        const floating = await page.evaluate(() => {
          const c = document.querySelector('[data-chat]'), h = document.querySelector('.contact');
          const first = c.querySelector('[data-chat-current]');
          const openingClear = first.getBoundingClientRect().top >= h.getBoundingClientRect().bottom;
          c.scrollTop = 20;
          const b = first.getBoundingClientRect(), header = h.getBoundingClientRect();
          const below = document.elementFromPoint(b.left + 15, header.bottom + 2);
          const title = h.querySelector('.contact__text').getBoundingClientRect();
          return { openingClear, belowIsBubble: Boolean(below?.closest('.self-message')),
            titleClear: h.contains(document.elementFromPoint(title.left + 10, (title.top + title.bottom) / 2)) };
        });
        assert.ok(floating.openingClear, 'opening copy starts below the floating contact');
        assert.ok(floating.belowIsBubble, 'scrolling content reaches the rounded capsule with no rectangular shelf below it');
        assert.ok(floating.titleClear, 'only the capsule covers messages passing underneath');
        assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
        assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
        await page.evaluate(() => MistakeryApp.render());
        const restored = await page.evaluate(() => {
          const c = document.querySelector('[data-chat]'), h = document.querySelector('.contact'), t = h.querySelector('.contact__text').getBoundingClientRect();
          return { clear: h.contains(document.elementFromPoint(t.left + 10, (t.top + t.bottom) / 2)), count: c.querySelectorAll('[data-chat-current]').length };
        });
        assert.deepEqual(restored, { clear: true, count: 5 }, 'rerender preserves the contained transcript');
      } finally { await browser.close(); }
    });
    test(`${name}/${width}: ended Judgment Day keeps its opening content reachable on a short screen`, async () => {
      const browser = await type.launch();
      try {
        const page = await browser.newPage({ viewport: { width, height: 520 }, reducedMotion: 'reduce' });
        await page.goto(url); await page.waitForFunction(() => window.MistakeryApp?.state);
        await page.evaluate(() => {
          const a = MistakeryApp; clearTimeout(a.introTypingTimer);
          a.state = MistakeryRoute.startRun(a.deck, { seed: 'ended-overflow' });
          a.state.currentCardId = 'LIVE_AGENT_OUTCOME_2'; a.state.gameOver = true;
          a.state.endingId = 'judgment_day'; a.state.route.ending = { causes: [] };
          a.view = 'playing'; a.cardDelivery = null; a.render();
        });
        assert.equal(await page.locator('[data-game]').getAttribute('data-view'), 'ended');
        const state = await page.evaluate(() => JSON.stringify(MistakeryApp.state));
        const bounds = await page.evaluate(() => {
          const c = document.querySelector('[data-chat]'); c.scrollTop = 0;
          const image = c.querySelector('.message-image');
          return { first: image.getBoundingClientRect().top, top: c.getBoundingClientRect().top,
            content: c.scrollHeight, height: c.clientHeight };
        });
        assert.ok(bounds.content > bounds.height, 'terminal content actually overflows this screen');
        assert.ok(bounds.first >= bounds.top - 1, 'image beginning stays reachable at scrollTop zero');
        await page.evaluate(() => { const c = document.querySelector('[data-chat]'); c.scrollTop = c.scrollHeight; });
        assert.ok(await page.locator('[data-chat]').evaluate(c => {
          const last = [...c.querySelectorAll('.message')].at(-1);
          return last.getBoundingClientRect().bottom <= c.getBoundingClientRect().bottom + 1;
        }), 'final message remains reachable at the bottom');
        assert.equal(await page.evaluate(() => JSON.stringify(MistakeryApp.state)), state);
        assert.deepEqual(await page.locator('[data-choice]').allTextContents(), ['Oops', 'Finally 😍']);
      } finally { await browser.close(); }
    });
  }
}
