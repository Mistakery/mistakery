const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
test(`${name}: document preview keeps replies, navigation and restart outside the gameplay engine`, async () => {
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?preview=losses');
    await page.waitForFunction(() => window.MistakeryApp?.state);
    assert.equal(await page.locator('[data-loss-select]').isVisible(), true);
    await page.clock.install(); await page.clock.pauseAt(new Date());
    const ids = await page.locator('[data-loss-select] option').evaluateAll(nodes => nodes.map(n => n.value));
    assert.ok(ids.length >= 6);
    for (const id of ids) {
      await page.locator('[data-loss-select]').selectOption(id);
      assert.equal(await page.locator('[data-loss-flash].is-defeated').count(), 0);
      await page.clock.runFor(10000);
      assert.equal(await page.locator('[data-loss-flash].is-defeated').getAttribute('data-card'), id);
      assert.equal(await page.locator('[data-game]').getAttribute('data-outcome'), 'failure');
      const before = await page.evaluate(() => structuredClone(MistakeryApp.state));
      assert.equal(before.currentCardId, id);
      assert.equal(before.history.length, 0);
      if (id === 'DOC_LOSS_1') {
        assert.equal(await page.locator('.team-row[data-source="@unicorn_hunter"]').count(), 2);
        assert.deepEqual(await page.locator('.team-row[data-source="@bigdeals"] p').allTextContents()
          .then(lines => lines.map(line => line.replaceAll('\u00a0', ' '))),
          ["Guys, don't panic!", 'We got this! 🔥💪']);
        const devBubbles = page.locator('.team-row[data-source="@error404"]');
        assert.equal(await devBubbles.count(), 2, 'developer replies arrive in two separate bubbles');
        assert.deepEqual(await devBubbles.locator('p').allTextContents()
          .then(lines => lines.map(line => line.replaceAll('\u00a0', ' '))),
          ['lol you have a final interview at an AI unicorn in an hour', 'send them my github pls']);
      }
      if (id === 'DOC_LOSS_2') {
        assert.equal(await page.locator('[data-system-event]').count(), 5);
        assert.equal(await page.locator('.team-row[data-source="@hype_queen"]').count(), 3);
        assert.equal(await page.locator('[data-status]').innerText(), '3 members');
      }
      if (id === 'DOC_LOSS_3') assert.equal(await page.locator('[data-system-event]').count(), 1);
      if (id === 'DOC_LOSS_5') {
        assert.equal(await page.locator('.self-message').count(), 1);
        assert.equal(await page.locator('.self-message .preview-file').count(), 1);
        assert.equal(await page.locator('.self-message p').count(), 1);
        assert.equal(await page.locator('.message-row[data-source="@business1"]').count(), 3);
      }
      if (id === 'DOC_LOSS_6') {
        assert.equal(await page.locator('.self-message').count(), 4);
        assert.equal(await page.locator('.self-message').last().locator('p').count(), 2);
        const mention = await page.locator('.self-message .mention').evaluate(n => ({ color: getComputedStyle(n).color, weight: getComputedStyle(n).fontWeight, line: n.parentElement.textContent }));
        assert.equal(mention.color, 'rgb(255, 255, 255)');
        assert.ok(Number(mention.weight) >= 700);
        assert.equal(mention.line, '@all');
      }
      for (const viewport of [{ width: 320, height: 650 }, { width: 1280, height: 900 }]) {
        await page.setViewportSize(viewport);
        const geometry = await page.evaluate(() => {
          const chat = document.querySelector('[data-chat]');
          return { pageOverflow: document.documentElement.scrollWidth - innerWidth,
            chatOverflow: chat.scrollWidth - chat.clientWidth,
            buttonsFit: document.querySelector('[data-choices]').getBoundingClientRect().bottom <= innerHeight + 1,
            headerClear: document.querySelector('.contact').getBoundingClientRect().bottom <= chat.getBoundingClientRect().top,
            chatHeight: chat.clientHeight,
            defeat: (() => {
              const flash = document.querySelector('[data-loss-flash]');
              const rect = flash.getBoundingClientRect();
              return { left: rect.left, top: rect.top, width: rect.width, height: rect.height,
                expectedWidth: innerWidth, expectedHeight: innerHeight,
                pointerEvents: getComputedStyle(flash).pointerEvents,
                animation: getComputedStyle(flash, '::before').animationName };
            })() };
        });
        assert.ok(geometry.pageOverflow <= 1 && geometry.chatOverflow <= 1 && geometry.buttonsFit
          && geometry.headerClear && geometry.chatHeight > 100, JSON.stringify(geometry));
        assert.ok(Math.abs(geometry.defeat.left) <= 1 && Math.abs(geometry.defeat.top) <= 1
          && Math.abs(geometry.defeat.width - geometry.defeat.expectedWidth) <= 1
          && Math.abs(geometry.defeat.height - geometry.defeat.expectedHeight) <= 1);
        assert.equal(geometry.defeat.pointerEvents, 'none');
        assert.equal(geometry.defeat.animation, 'lossPreviewDefeat');
      }
      if (await page.locator('[data-choice]').count() === 2) {
        await page.locator('[data-choice="left"]').click();
        await page.clock.runFor(1000);
        assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        assert.equal(await page.locator('[data-player-reply]').count(), 1);
        assert.equal(await page.locator('[data-loss-finale]').isVisible(), true);
        assert.equal(await page.locator('[data-loss-finale]').getAttribute('data-card'), id);
        assert.equal(await page.locator('[data-loss-finale] .message p').count(), 4);
        assert.equal(await page.locator('[data-loss-finale] .message strong, [data-loss-finale] .message b').count(), 0);
        assert.equal(await page.locator('[data-loss-finale] .contact__text').innerText(), '@b2buddy\nAI Agent');
        await page.locator('[data-loss-finale] button').nth(0).click();
        assert.equal(await page.locator('[data-loss-finale]').isVisible(), false);
        assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        await page.locator('[data-restart-run]').click();
        await page.clock.runFor(10000);
        await page.locator('[data-choice="right"]').click();
        assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        assert.equal(await page.locator('[data-player-reply]').count(), 1);
        assert.equal(await page.locator('[data-loss-finale]').isVisible(), true);
        await page.locator('[data-loss-finale] button').nth(1).click();
        assert.equal(await page.locator('[data-loss-finale]').isVisible(), false);
        assert.deepEqual(await page.evaluate(() => structuredClone(MistakeryApp.state)), before);
        assert.equal(await page.locator('[data-restart-run]').evaluate(n => n === document.activeElement), true);
      }
      await page.locator('[data-restart-run]').click();
      assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), id);
      assert.equal(await page.locator('[data-player-reply]').count(), 0);
      assert.equal(await page.locator('[data-loss-flash].is-defeated').count(), 0);
    }
    await page.locator('[data-loss-prev]').click();
    assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), ids.at(-2));
    await page.locator('[data-loss-next]').click();
    assert.equal(await page.evaluate(() => MistakeryApp.state.currentCardId), ids.at(-1));
    await page.locator('[data-loss-select]').selectOption('DOC_LOSS_2');
    assert.equal(await page.locator('[data-status]').innerText(), '8 members');
    const observed = new Set([8]);
    for (let elapsed = 0; elapsed < 10000; elapsed += 100) {
      await page.clock.runFor(100);
      const departures = await page.locator('[data-left-member]').count();
      const count = Number((await page.locator('[data-status]').innerText()).split(' ')[0]);
      assert.equal(count, 8 - departures);
      observed.add(count);
    }
    assert.deepEqual([...observed], [8, 7, 6, 5, 4, 3]);
    await page.locator('[data-restart-run]').click();
    assert.equal(await page.locator('[data-status]').innerText(), '8 members');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test(`${name}: founder dots precede each message and cancel cleanly`, async () => {
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?preview=losses');
    await page.waitForFunction(() => window.MistakeryApp?.state);
    await page.clock.install(); await page.clock.pauseAt(new Date());
    await page.locator('[data-loss-select]').selectOption('DOC_LOSS_6');
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Founder is typing', exact: true }).count(), 1);
    assert.equal(await page.locator('.preview-composer').innerText(), '');
    assert.equal(await page.locator('.preview-composer svg').count(), 0);
    const alignment = await page.locator('.preview-composer').evaluate(n => ({
      right: n.getBoundingClientRect().right,
      chatRight: n.parentElement.getBoundingClientRect().right,
      animation: getComputedStyle(n.querySelector('i')).animationName
    }));
    assert.ok(alignment.chatRight - alignment.right < 20);
    assert.equal(alignment.animation, 'typingBlink');
    await page.clock.runFor(700);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 1);
    assert.equal(await page.locator('.preview-composer').count(), 1);
    await page.clock.runFor(1500);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 1);
    await page.clock.runFor(1000);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 2);
    await page.clock.runFor(1200);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 3);
    await page.clock.runFor(1800);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 3);
    await page.clock.runFor(1200);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 4);
    await page.clock.runFor(3000);
    assert.equal(await page.locator('[data-preview-outgoing] [role="img"]').count(), 0);
    assert.equal(await page.locator('.preview-composer').count(), 0);
    assert.equal(await page.locator('[data-choice="left"]').isEnabled(), true);
    await page.locator('[data-restart-run]').click();
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 0);
    await page.locator('[data-chat]').click();
    await page.clock.runFor(100);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 4);
    assert.equal(await page.locator('.preview-composer').count(), 0);
    await page.locator('[data-restart-run]').click();
    await page.clock.runFor(700);
    await page.locator('[data-loss-select]').selectOption('DOC_LOSS_4');
    await page.clock.runFor(10000);
    assert.equal(await page.locator('[data-preview-outgoing], .preview-composer').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-loss-select]').selectOption('DOC_LOSS_5');
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 0);
    assert.equal(await page.locator('.preview-composer i').first().evaluate(n => getComputedStyle(n).animationName), 'none');
    await page.clock.runFor(900);
    assert.equal(await page.locator('[data-preview-outgoing]').count(), 1);
    assert.equal(await page.locator('[data-preview-outgoing] .preview-file').count(), 1);
    assert.equal(await page.locator('[data-preview-outgoing]').evaluate(n => new DOMMatrix(getComputedStyle(n).transform).isIdentity), true, 'reduced motion never shifts or scales the outgoing, during or after fade');
    await page.clock.runFor(10000);
    assert.equal(await page.locator('[data-loss-flash].is-defeated').count(), 1);
    assert.equal(await page.locator('[data-loss-flash]').evaluate(n => getComputedStyle(n, '::before').animationName), 'none');
    assert.equal(await page.locator('[data-scene]').evaluate(n => getComputedStyle(n).animationName), 'none');
    assert.equal(await page.locator('[data-scene]').evaluate(n => getComputedStyle(n, '::after').animationName), 'none');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
}

for (const [name, browserType] of [['Chromium', chromium], ['WebKit', webkit]]) {
  test(`${name}: loss finale stays modal, fits the screen and clears on replay`, async () => {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 320, height: 650 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
      await page.goto(url + '?preview=losses&card=DOC_LOSS_6');
      await page.waitForFunction(() => window.MistakeryApp?.state);
      assert.equal(await page.locator('[data-loss-finale]').count(), 0);
      await page.locator('[data-chat]').click();
      await page.locator('[data-choice="right"]').click();
      const dialog = page.locator('[data-loss-finale]');
      assert.equal(await dialog.locator('.message p').first().innerText(), 'It’s not a god complex — it’s visionary leadership ✨');
      assert.equal(await dialog.locator('.loss-finale__invitation').innerText(), 'If you want, we can explore what’s next');
      assert.equal(await dialog.locator('.loss-finale__invitation').evaluate(n => getComputedStyle(n).fontWeight), '400');
      assert.deepEqual(await dialog.locator('button').allTextContents(), ['Never again', 'Let’s cook']);
      assert.equal(await dialog.locator('.avatar img').getAttribute('src'), 'assets/avatar-b2buddy.webp');
      assert.equal(await dialog.locator('.message').innerText().then(t => /GAME OVER|Let’s put this in perspective|\.[\s]*[✨🚀]/u.test(t)), false);
      assert.equal(await dialog.evaluate(n => n.matches(':modal') && n.contains(document.activeElement)), true);
      for (const viewport of [{width:320,height:480},{width:320,height:650},{width:1280,height:900}]) {
        await page.setViewportSize(viewport);
        const geometry = await dialog.evaluate(n => {
          const r=n.getBoundingClientRect(), h=n.querySelector('header').getBoundingClientRect(),
            body=n.querySelector('.loss-finale__body'), b=body.getBoundingClientRect(), f=n.querySelector('footer').getBoundingClientRect();
          return r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight
            && b.top>=h.bottom && b.bottom<=f.top+1 && f.bottom<=r.bottom
            && body.clientHeight>80 && body.scrollWidth<=body.clientWidth;
        });
        assert.ok(geometry, JSON.stringify(viewport));
      }
      for(let i=0;i<5;i++) await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(n => n.contains(document.activeElement)), true);
      await page.keyboard.press('ArrowLeft');
      assert.equal(await dialog.isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.isVisible(), false);
      await page.locator('[data-restart-run]').click();
      assert.equal(await dialog.count(), 0);
      await page.locator('[data-chat]').click();
      await page.locator('[data-choice="left"]').click();
      assert.equal(await dialog.isVisible(), true);
      await page.evaluate(() => MistakeryApp.render());
      assert.equal(await dialog.count(), 0);
      await page.goto(url);
      await page.waitForFunction(() => window.MistakeryApp?.deck);
      assert.equal(await dialog.count(), 0);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
