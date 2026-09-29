const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');

const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const notes = page => page.locator('[data-chat] .note-message');
const replies = page => page.locator('[data-choice]');

async function start(page) {
  await page.goto(url);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'onboarding');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'So long, corporate jail!' }).click();
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'Trust the process' }).click();
  await page.clock.runFor(620);
  await page.getByRole('button', { name: 'Open the Masterplan' }).click();
  assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
  assert.equal(await notes(page).count(), 1);
  assert.equal(await replies(page).filter({ hasText: 'Right on track' }).isEnabled(), true);
  await page.getByRole('button', { name: 'Right on track' }).click();
  assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_02_UPDATE');
}

for (const [name, engine] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name} ${motion}: Saved update waits 1000 ms, gates replies and keeps its deadline on rerender`, async () => {
      const browser = await engine.launch();
      try {
        const page = await browser.newPage({ reducedMotion: motion });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await start(page);
        assert.equal(await notes(page).count(), 1);
        assert.match((await notes(page).first().innerText()).replace(/\u00a0/g, ' '), /5 MONTHS AS A FOUNDER 🚀/);
        assert.equal(await replies(page).count(), 2);
        assert.equal(await replies(page).filter({ hasText: 'WE’RE SO BACK' }).isDisabled(), true);
        await replies(page).first().evaluate(button => button.click());
        assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_02_UPDATE');
        await page.clock.runFor(600);
        await page.evaluate(() => window.MistakeryApp.render());
        await notes(page).first().evaluate(node => { window.firstSavedBubble = node; });
        await page.clock.runFor(399);
        assert.equal(await notes(page).count(), 1);
        assert.equal(await replies(page).first().isDisabled(), true);
        await page.clock.runFor(1);
        assert.equal(await notes(page).count(), 2);
        assert.equal(await notes(page).first().evaluate(node => node === window.firstSavedBubble), true, 'first bubble must not animate again');
        assert.match((await notes(page).last().innerText()).replace(/\u00a0/g, ' '), /IN PROGRESS:\s*9\. Unicorn 🦄🎯 \(30 DAYS UNTIL WE'RE BROKE!!\)/);
        assert.equal(await replies(page).first().isEnabled(), true);
        await page.clock.runFor(2000);
        await page.evaluate(() => window.MistakeryApp.render());
        assert.equal(await notes(page).count(), 2);
        await replies(page).first().focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => window.MistakeryApp.view), 'playing');
        assert.deepEqual(errors, []);
      } finally { await browser.close(); }
    });
  }
  test(`${name}: test Back cancels an old Saved delivery`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      await page.goto(`${url}?story=live-agent`);
      await page.waitForFunction(() => window.MistakeryApp?.view === 'playing');
      await page.clock.install(); await page.clock.pauseAt(new Date());
      await page.locator('[data-restart-run]').click();
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.clock.runFor(500);
      await page.locator('[data-test-back]').click();
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      await page.clock.runFor(700);
      assert.equal(await notes(page).count(), 1);
      await page.getByRole('button', { name: 'Right on track' }).click();
      await page.clock.runFor(999);
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(1);
      assert.equal(await notes(page).count(), 2);
    } finally { await browser.close(); }
  });
  test(`${name}: restart cancels stale Saved delivery and each revisit starts a fresh 1000 ms`, async () => {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await start(page);
      await page.clock.runFor(500);
      await page.locator('[data-restart-run]').click();
      assert.equal(await page.locator('[data-card-id]').textContent(), 'SAVED_01_PLAN');
      await page.clock.runFor(700);
      assert.equal(await notes(page).count(), 1);
      await page.getByRole('button', { name: 'Right on track' }).click();
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(999);
      assert.equal(await notes(page).count(), 1);
      await page.clock.runFor(1);
      assert.equal(await notes(page).count(), 2);
      await page.locator('[data-restart-run]').click();
      await page.getByRole('button', { name: 'Slightly behind' }).click();
      assert.equal(await notes(page).count(), 1);
      assert.equal(await replies(page).first().isDisabled(), true);
      assert.deepEqual(errors, []);
    } finally { await browser.close(); }
  });
}
