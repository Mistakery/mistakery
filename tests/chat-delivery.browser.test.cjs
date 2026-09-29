const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = `${pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href}?story=live-agent`;
const count = page => page.locator('[data-chat-current]').count();
async function seed(page, id, previous = 'INFLUENCER_04') {
  await page.evaluate(({id, previous}) => {
    const a = window.MistakeryApp;
    a.state = window.MistakeryEngine.startRun(a.deck);
    a.state.currentCardId = id; a.cardDelivery = null; a.locked = false;
    a.influencerPreviousCardId = previous; a.liveAgentScore = 5; a.view = 'playing'; a.render();
  }, {id, previous});
}
async function open(browser) {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 }, hasTouch: true });
  await page.goto(url);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return page;
}
for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: delivered bubbles move smoothly when a new bubble arrives`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_01');
      await page.waitForTimeout(350);
      await page.clock.runFor(599);
      const first = page.locator('[data-chat-current]').first();
      const before = await first.evaluate(n => n.getBoundingClientRect().top);
      await page.clock.runFor(1);
      const start = await first.evaluate(n => n.getBoundingClientRect().top);
      assert.ok(Math.abs(start - before) < 16, `existing message jumped ${Math.abs(start - before)}px`);
      await page.waitForTimeout(250);
      const settled = await first.evaluate(n => n.getBoundingClientRect().top);
      assert.ok(before - settled > 16, 'message must settle into its new position');
    } finally { await browser.close(); }
  });
  test(`${name}: a single incoming text has a visible typing pause`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'INFLUENCER_02A');
      assert.equal(await count(page), 0);
      assert.equal(await page.locator('button.typing-bubble').count(), 1);
      await page.clock.runFor(499); assert.equal(await count(page), 0);
      await page.clock.runFor(1); assert.equal(await count(page), 1);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: typing author stays inside the bubble and same-author dots keep their rhythm`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_01');
      assert.equal(await page.locator('button.typing-bubble .team-meta').count(), 1);
      const geometry = await page.locator('button.typing-bubble').evaluate(n => {
        const b = n.getBoundingClientRect(), m = n.querySelector('.team-meta').getBoundingClientRect();
        return { contained: m.top >= b.top && m.bottom <= b.bottom && m.left >= b.left && m.right <= b.right,
          animation: getComputedStyle(n).animationName };
      });
      assert.ok(geometry.contained, 'nickname belongs to the same white surface');
      assert.equal(geometry.animation, 'none', 'dots must not bounce in on every bubble');
      await page.evaluate(() => { window.typingBefore = document.querySelector('button.typing-bubble'); });
      await page.clock.runFor(600);
      assert.equal(await page.evaluate(() => window.typingBefore === document.querySelector('button.typing-bubble')), true);
      if (name === 'Chromium') await page.screenshot({path:'/tmp/mistakery-typing-fixed.png', animations:'disabled'});
    } finally { await browser.close(); }
  });
  test(`${name}: ASAP keeps typing before its photo and delivers the following text separately`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_07');
      assert.equal(await count(page), 1);
      assert.equal(await page.locator('button.typing-bubble').count(), 1);
      await page.clock.runFor(1999); assert.equal(await count(page), 1);
      await page.clock.runFor(1); assert.equal(await count(page), 2);
      assert.equal(await page.locator('[data-chat-current] img').count(), 1);
      assert.equal(await page.locator('button.typing-bubble').count(), 1);
      await page.clock.runFor(899); assert.equal(await count(page), 2);
      await page.clock.runFor(1); assert.equal(await count(page), 3);
    } finally { await browser.close(); }
  });
  test(`${name}: short messages wait with dots rather than appearing in a silent rush`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_OUTCOME_0');
      assert.equal(await count(page), 1);
      assert.equal(await page.locator('button.typing-bubble').count(), 1);
      await page.clock.runFor(300); assert.equal(await count(page), 1);
      await page.clock.runFor(200); assert.equal(await count(page), 2);
    } finally { await browser.close(); }
  });
  test(`${name}: group delivers whole bubbles with the next author's identity`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'DREAM_TEAM');
      assert.equal(await count(page), 1, 'outgoing message appears immediately');
      assert.match(await page.locator('.typing-bubble').getAttribute('aria-label'), /@bigdeals is typing/);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 2);
      if (name === 'Chromium') await page.screenshot({ path: '/tmp/mistakery-chat-typing-group.png', animations: 'disabled' });
      await page.clock.runFor(799); assert.equal(await count(page), 1);
      await page.clock.runFor(1); assert.equal(await count(page), 2);
      assert.match(await page.locator('.typing-bubble').getAttribute('aria-label'), /@hype_queen is typing/);
      await page.clock.runFor(800); assert.equal(await count(page), 3);
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: tapping chat reveals remaining messages without making a choice or duplicating them`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_03');
      const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
      const indicator = await page.locator('button.typing-bubble').boundingBox();
      await page.mouse.move(indicator.x + 10, indicator.y + 20); await page.mouse.down();
      await page.mouse.move(indicator.x + 35, indicator.y + 20); await page.mouse.up();
      assert.equal(await count(page), 1, 'dragging across the dots must not reveal');
      await page.locator('[data-chat-current]').first().tap();
      assert.equal(await count(page), 4);
      assert.equal(await page.locator('.typing-bubble').count(), 0);
      assert.equal(await page.locator('[data-choice]:disabled').count(), 0);
      assert.deepEqual(await page.evaluate(() => MistakeryApp.state), before);
      await page.clock.runFor(10000); assert.equal(await count(page), 4);
      await page.evaluate(() => MistakeryApp.render()); assert.equal(await count(page), 4);
      await page.locator('[data-choice="left"]').click();
      assert.equal(await page.evaluate(() => MistakeryApp.state.history.length), before.history.length + 1);
      await page.locator('[data-test-back]').click();
      assert.equal(await count(page), 4); assert.equal(await page.locator('.typing-bubble').count(), 0);
      await page.locator('[data-test-restart]').click();
      assert.equal(await count(page), 1); assert.equal(await page.locator('.typing-bubble').count(), 1);
    } finally { await browser.close(); }
  });
  test(`${name}: ordinary DM rerender retains deadline, keyboard reveal, and revisited Influencer cards are instant`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'INFLUENCER_02');
      assert.equal(await count(page), 1);
      await page.clock.runFor(200); await page.evaluate(() => MistakeryApp.render());
      await page.clock.runFor(499); assert.equal(await count(page), 1);
      await page.clock.runFor(1); assert.equal(await count(page), 2);
      await page.locator('button.typing-bubble').press('Enter');
      assert.equal(await count(page), 3);
      await seed(page, 'INFLUENCER_05');
      await page.locator('button.typing-bubble').press('Space');
      await page.locator('[data-choice="right"]').click();
      assert.equal(await count(page), 1, 'scheduled review photo is immediate');
      await page.clock.runFor(900);
      await page.locator('[data-choice="left"]').click();
      assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), 'INFLUENCER_07', 'contextual concession continues forward');
      await page.evaluate(() => { MistakeryApp.state.currentCardId = 'INFLUENCER_05'; MistakeryApp.influencerPreviousCardId = 'INFLUENCER_06'; MistakeryApp.render(); });
      assert.equal(await count(page), 3); assert.equal(await page.locator('.typing-bubble').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: photo caption stays together, dragging does not reveal, history scroll is preserved`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_03'); await page.clock.runFor(3500);
      await page.locator('[data-choice="left"]').click();
      assert.equal(await count(page), 1);
      assert.equal(await page.locator('[data-chat-current] img').count(), 1);
      assert.match(await page.locator('[data-chat-current]').innerText(), /bank account every 7/);
      const chat = page.locator('[data-chat]'); const box = await chat.boundingBox();
      await page.mouse.move(box.x + 20, box.y + 120); await page.mouse.down();
      await page.mouse.move(box.x + 20, box.y + 190); await page.mouse.up();
      assert.equal(await count(page), 1, 'dragging must not skip pending messages');
      await chat.hover(); await page.mouse.wheel(0, -500);
      await page.evaluate(() => { document.querySelector('[data-chat]').scrollTop = 0; });
      await page.evaluate(() => MistakeryApp.render());
      assert.equal(await chat.evaluate(n => n.scrollTop), 0);
      await page.clock.runFor(1000);
      assert.equal(await count(page), 2); assert.equal(await chat.evaluate(n => n.scrollTop), 0);
      await seed(page, 'IRL_PADEL_01'); assert.equal(await page.locator('.typing-bubble').count(), 0);
      await page.locator('[data-restart-run]').click(); assert.equal(await page.locator('.typing-bubble').count(), 0);
    } finally { await browser.close(); }
  });
  test(`${name}: keyboard history scrolling stays in place during delivery`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      await seed(page, 'LIVE_AGENT_07');
      await page.locator('[data-chat-current]').first().tap();
      await page.locator('[data-choice="left"]').click();
      await page.locator('button.typing-bubble').press('Home');
      await page.evaluate(() => { document.querySelector('[data-chat]').scrollTop = 0; });
      await page.clock.runFor(200);
      const chat = page.locator('[data-chat]');
      assert.equal(await chat.evaluate(n => n.scrollTop), 0);
      await page.clock.runFor(1800);
      assert.equal(await chat.evaluate(n => n.scrollTop), 0);
      assert.equal(await count(page), 3);
    } finally { await browser.close(); }
  });
  test(`${name}: every active card completes within its pacing budget with all canonical bubbles`, async () => {
    const browser = await engine.launch();
    try {
      const page = await open(browser);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const cards = await page.evaluate(() => MistakeryApp.deck.cards.filter(c => MistakeryApp.activeCardIds.includes(c.id)));
      assert.equal(cards.length, 52);
      for (const card of cards) {
        await seed(page, card.id);
        const budget = { LIVE_AGENT_03: 3500, LIVE_AGENT_05: 3000, LIVE_AGENT_07: 2900 }[card.id] || 2500;
        await page.clock.runFor(budget);
        assert.equal(await page.locator('[data-choice]:disabled').count(), 0, `${card.id}: delivery budget`);
        assert.equal(await page.locator('.typing-bubble').count(), 0, `${card.id}: no stale typing`);
        const expected = card.mode === 'irl' ? 0 : card.messages
          ? card.messages.reduce((total, m) => total + (card.mode === 'team' || m.imageRef || m.forwardedFrom ? 1 : m.text.split('\n\n').length), 0)
          : (card.image ? 1 : 0) + card.text.split('\n\n').length;
        assert.equal(await count(page), expected, `${card.id}: complete canonical messages`);
      }
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
