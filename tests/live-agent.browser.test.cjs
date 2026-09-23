const { afterTurn } = require('./turn-resources.fixture.cjs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

async function seed(page, id, score = 0, random = 0, resources = { cash: 50, team: 50, customers: 50, founder: 50 }) {
  await page.evaluate(({ id, score, random, resources }) => {
    const a = window.MistakeryApp;
    clearTimeout(a.introTypingTimer);
    a.state = window.MistakeryEngine.startRun(a.deck);
    a.state.currentCardId = id;
    a.state.resources = resources;
    a.state.schedulerResources = { ...resources };
    a.state.flags = ['met_boss', 'met_dev', 'live_agent_pending'];
    a.liveAgentScore = score;
    a.locked = false;
    a.view = 'playing';
    window.draws = 0;
    Math.random = () => { window.draws++; return random; };
    a.render();
  }, { id, score, random, resources });
}

async function click(page, side) {
  await page.waitForFunction(() => !window.MistakeryApp.locked);
  await page.locator(`[data-choice="${side}"]`).click();
}
async function snapshot(page) {
  return page.evaluate(() => ({ ...window.MistakeryApp.state, score: window.MistakeryApp.liveAgentScore, draws: window.draws }));
}

test('live agent probabilities, resources, completion and mobile messenger', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));

    // Every route and exact threshold, including zero-chance mercy.
    for (const [id, side, chances, good, bad] of [
      ['LIVE_AGENT_07B', 'right', [.05, .10, .15, .20, .30, .40], 1, 2],
      ['LIVE_AGENT_08', 'left', [0, 0, .05, .10, .20, .30], 1, 2],
      ['LIVE_AGENT_08', 'right', [.40, .30, .20, .15, .10, .05], 3, 4],
    ]) {
      for (let supports = 0; supports <= 5; supports++) {
        const chance = chances[supports];
        for (const draw of new Set([Math.max(0, chance - .000001), chance])) {
          await seed(page, id, 2 * supports - 5, draw);
          await click(page, side);
          const state = await snapshot(page);
          const outcome = draw < chance ? good : bad;
          assert.equal(state.currentCardId, `LIVE_AGENT_OUTCOME_${outcome}`);
          assert.equal(state.draws, 1);
          assert.deepEqual(state.resources, afterTurn({
            1: { cash: 70, team: 70, customers: 75, founder: 40 },
            2: { cash: 0, team: 0, customers: 0, founder: 0 },
            3: { cash: 85, team: 40, customers: 65, founder: 60 },
            4: { cash: 20, team: 35, customers: 25, founder: 25 },
          }[outcome]));
          await page.evaluate(() => window.MistakeryApp.render());
          assert.deepEqual((await snapshot(page)).resources, state.resources, 'render must not reapply effects');
          await click(page, supports % 2 ? 'left' : 'right');
          const finished = await snapshot(page);
          assert.equal(finished.currentCardId, 'OPEN_INVESTOR');
          assert.deepEqual(finished.resources, afterTurn(state.resources), 'outcome reply only charges the default turn burn');
          assert.ok(finished.flags.includes('live_agent_completed'));
          assert.ok(!finished.flags.includes('live_agent_pending'));
          assert.equal(finished.score, 0);
          assert.equal(finished.activeArc, null);
          assert.equal(finished.gameOver, false);
          assert.equal(finished.activeCrisisId, null);
          await click(page, supports % 2 ? 'left' : 'right');
          assert.equal((await snapshot(page)).currentCardId, supports % 2 ? 'INFLUENCER_01' : 'PADEL_INVITE');
          await click(page, 'left');
          assert.equal((await snapshot(page)).activeCrisisId, null, 'zero-resource prototype remains playable');
        }
      }
    }

    // Full support and rejection paths, local effects and score.
    for (const side of ['left', 'right']) {
      await seed(page, 'LIVE_AGENT_01');
      await click(page, 'left');
      assert.equal((await snapshot(page)).score, 0);
      assert.deepEqual((await snapshot(page)).resources, { cash: 49.5, team: 55, customers: 55, founder: 50 });
      for (let n = 2; n <= 6; n++) {
        assert.equal((await snapshot(page)).currentCardId, `LIVE_AGENT_0${n}`);
        if (n === 4) {
          const beforePhoto = await snapshot(page);
          await click(page, side);
          const afterPhoto = await snapshot(page);
          assert.equal(afterPhoto.currentCardId, 'LIVE_AGENT_04B');
          assert.deepEqual(afterPhoto.resources, afterTurn(beforePhoto.resources));
          assert.equal(afterPhoto.score, beforePhoto.score);
          assert.equal(afterPhoto.draws, beforePhoto.draws);
        }
        const before = (await snapshot(page)).resources;
        const effects = {
          2: { left: { team: -5 }, right: { team: 5 } },
          3: { left: { founder: 5 }, right: { founder: -5 } },
          4: { left: { founder: 5 }, right: { founder: -5 } },
          5: { left: { team: 5 }, right: { customers: 5, team: -10 } },
          6: { left: { founder: 5 }, right: { founder: -7 } },
        }[n][side];
        await click(page, side);
        const after = await snapshot(page);
        for (const key of Object.keys(before)) assert.equal(after.resources[key], afterTurn(before, effects)[key]);
        assert.equal(after.score, (n - 1) * (side === 'left' ? 1 : -1));
      }
      const beforeManifesto = await snapshot(page);
      await click(page, side);
      const afterManifesto = await snapshot(page);
      assert.equal(afterManifesto.currentCardId, 'LIVE_AGENT_07B');
      assert.deepEqual(afterManifesto.resources, afterTurn(beforeManifesto.resources));
      assert.equal(afterManifesto.score, beforeManifesto.score);
      assert.equal(afterManifesto.draws, beforeManifesto.draws);
      const beforeSign = afterManifesto.resources.customers;
      await click(page, 'left');
      assert.equal((await snapshot(page)).currentCardId, 'LIVE_AGENT_08');
      assert.equal((await snapshot(page)).resources.customers, beforeSign + 10);
    }
    for (const side of ['left', 'right']) {
      await seed(page, 'LIVE_AGENT_01');
      await click(page, 'right');
      const early = await snapshot(page);
      assert.equal(early.currentCardId, 'LIVE_AGENT_OUTCOME_0');
      assert.deepEqual(early.resources, { cash: 29.5, team: 35, customers: 50, founder: 50 });
      assert.equal(early.draws, 0);
      await click(page, side);
      assert.equal((await snapshot(page)).currentCardId, 'OPEN_INVESTOR');
      assert.deepEqual((await snapshot(page)).resources, afterTurn(early.resources));
    }

    // Real entry, both Boss/Dev orders; no repeated story after completion.
    for (const random of [0, .999999]) {
      await seed(page, 'OPEN_01', 0, random);
      await page.evaluate(() => { window.MistakeryApp.state.flags = []; });
      await click(page, 'right');
      await click(page, 'left');
      const seen = [];
      for (let i = 0; i < 2; i++) { seen.push((await snapshot(page)).currentCardId); await click(page, 'right'); }
      assert.deepEqual(seen.sort(), ['OPEN_BOSS', 'OPEN_DEV']);
      assert.equal((await snapshot(page)).currentCardId, 'LIVE_AGENT_01');
      await click(page, 'right');
      await click(page, 'left');
      const eligible = await page.evaluate(() => window.MistakeryEngine.buildEligiblePool(window.MistakeryApp.deck, window.MistakeryApp.state).map(e => e.card.id));
      assert.ok(!eligible.includes('LIVE_AGENT_01'));
    }

    const ids = Array.from({ length: 8 }, (_, i) => `LIVE_AGENT_0${i + 1}`).concat('LIVE_AGENT_04B', 'LIVE_AGENT_07B', Array.from({ length: 5 }, (_, i) => `LIVE_AGENT_OUTCOME_${i}`));
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 650 }]) {
      await page.setViewportSize(viewport);
      for (const id of ids) {
        await seed(page, id);
        await page.locator('.typing-bubble').waitFor({ state: 'detached' });
        await page.locator('[data-chat]').evaluate(async node => { await Promise.all(node.getAnimations({ subtree: true }).map(a => a.finished)); });
        assert.doesNotMatch(await page.locator('.phone').innerText(), /bot.score|liveAgentScore|[А-Яа-яЁё]/);
        const geometry = await page.evaluate(() => {
          const choices = document.querySelector('[data-choices]').getBoundingClientRect();
          const chat = document.querySelector('[data-chat]');
          return { pageOverflow: document.documentElement.scrollWidth - innerWidth, chatOverflow: chat.scrollWidth - chat.clientWidth, choicesBottom: choices.bottom };
        });
        assert.ok(geometry.pageOverflow <= 1 && geometry.chatOverflow <= 1, `${id}: ${JSON.stringify(geometry)}`);
        assert.ok(geometry.choicesBottom <= viewport.height + 1, `${id}: replies offscreen`);
      }
    }
    for (const [id, ref] of [['LIVE_AGENT_OUTCOME_2', 'placeholder_judgment_day'], ['LIVE_AGENT_OUTCOME_4', 'placeholder_hasta_la_vista']]) {
      await seed(page, id);
      assert.equal(await page.locator(`[data-asset-reference="${ref}"] img`).count(), 1);
      assert.equal(await page.locator(`[data-asset-reference="${ref}"] .message-caption`).count(), 1);
      assert.equal(await page.locator('[data-chat] .message').count(), 2);
      assert.equal(await page.locator('.media-placeholder').count(), 0);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

test('founder photo is preloaded and shares one bubble with its caption', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.MistakeryApp?.deck));
    const preload = page.locator('link[rel="preload"][as="image"][href="assets/live-agent-founder.webp"]');
    assert.equal(await preload.getAttribute('href'), 'assets/live-agent-founder.webp');
    await seed(page, 'LIVE_AGENT_04');
    const bubble = page.locator('[data-asset-reference="placeholder_founder_photo"]');
    assert.equal(await bubble.locator('.message-image').count(), 1);
    assert.equal((await bubble.locator('p').innerText()).replace(/\u00a0/g, ' '), 'I noticed you check our bank account every 7 minutes');
    assert.equal(await page.locator('[data-chat] .message').count(), 2);
    assert.equal(await page.locator('[data-chat] .media-placeholder').count(), 0);
    await bubble.locator('img').evaluate(image => image.decode());
    const geometry = await bubble.locator('img').evaluate(image => ({
      width: image.naturalWidth, height: image.naturalHeight,
      displayedRatio: image.getBoundingClientRect().width / image.getBoundingClientRect().height,
    }));
    assert.equal(geometry.width, 800);
    assert.equal(geometry.height, 600);
    assert.ok(Math.abs(geometry.displayedRatio - 4 / 3) < 0.01, JSON.stringify(geometry));
    assert.ok(await page.locator('[data-choices]').evaluate(node => node.getBoundingClientRect().bottom <= innerHeight));
  } finally { await browser.close(); }
});
