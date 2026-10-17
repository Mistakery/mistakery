const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const { revealMessages } = require('./chat-delivery.fixture.cjs');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;

async function open(browser, motion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width: 320, height: 650 }, reducedMotion: motion });
  await page.addInitScript(() => {
    window.irlMoves = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = animate.apply(this, args);
      if (this.matches('.irl-dialog, .irl-scene')) irlMoves.push({ node: this, animation });
      return animation;
    };
  });
  await page.goto(url + '?story=live-agent');
  await page.waitForFunction(() => MistakeryApp?.view === 'playing');
  return page;
}

async function seed(page, id, score = 0, draws = [.99]) {
  await page.evaluate(({ id, score, draws }) => {
    const a = MistakeryApp;
    MistakerySound.stop();
    a.state = MistakeryRoute.startRun(a.deck, { seed: 'irl-motion' });
    a.state.route.gap = { target: 4, played: [], usedUnit: null };
    a.state.currentCardId = id;
    a.state.resources = { cash: 50, team: 50, customers: 50, founder: 50 };
    a.state.schedulerResources = { ...a.state.resources };
    a.state.flags = ['live_agent_completed']; a.state.turn = 40;
    a.padelCeoScore = score; a.cardDelivery = null; a.locked = false; a.view = 'playing';
    let draw = 0; Math.random = () => draws[draw++] ?? .99;
    a.render(); irlMoves.length = 0;
  }, { id, score, draws });
  await revealMessages(page);
}

async function chooseAndSample(page, side = 'right', double = false) {
  return page.evaluate(({ side, double }) => {
    const before = structuredClone(MistakeryApp.state);
    document.querySelector(`[data-choice=${side}]`).click();
    if (double) document.querySelector('[data-choice=left]').click();
    const node = document.querySelector('.irl-dialog');
    const animation = node.getAnimations().find(a => a.effect.target === node);
    const scene = document.querySelector('[data-scene]');
    const sceneAnimation = scene.getAnimations().find(a => a.effect.target === scene && !(a instanceof CSSAnimation));
    const points = [];
    if (animation) {
      animation.pause();
      for (const time of [0, animation.effect.getTiming().duration / 2, animation.effect.getTiming().duration]) {
        animation.currentTime = time;
        const css = getComputedStyle(node), matrix = new DOMMatrix(css.transform);
        const box = node.getBoundingClientRect(), host = node.parentElement.getBoundingClientRect();
        points.push({ y: matrix.m42, scale: matrix.a, opacity: Number(css.opacity),
          fits: box.left >= host.left && box.right <= host.right && box.top >= host.top && box.bottom <= host.bottom });
      }
      animation.currentTime = 0;
    }
    return { before, state: structuredClone(MistakeryApp.state), points,
      duration: animation?.effect.getTiming().duration, delay: animation?.effect.getTiming().delay,
      sceneDuration: sceneAnimation?.effect.getTiming().duration,
      sceneDelay: sceneAnimation?.effect.getTiming().delay,
      moves: irlMoves.map(m => m.node.classList.contains('irl-dialog') ? 'card' : 'scene'),
      text: node.textContent, paragraphs: node.querySelectorAll('p').length,
      typing: Boolean(document.querySelector('.typing-bubble, [data-composing-reply]')),
      sceneTransform: getComputedStyle(scene).transform,
      contactTransform: getComputedStyle(document.querySelector('.contact')).transform };
  }, { side, double });
}

for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
  for (const motion of ['no-preference', 'reduce']) {
    test(`${name}/${motion}: IRL impact starts at choice, stays readable on 320px, and never replays`, async () => {
      const browser = await type.launch();
      try {
        const page = await open(browser, motion);
        await seed(page, 'IRL_PADEL_01');
        const result = await chooseAndSample(page, 'right', true);
        assert.equal(result.state.currentCardId, 'IRL_PADEL_03B');
        assert.equal(result.state.history.length, result.before.history.length + 1, 'double click accepts one choice');
        assert.equal(result.state.resources.cash, 49.5);
        assert.equal(result.state.resources.founder, 53);
        assert.equal(result.typing, false); assert.ok(result.text.length > 40); assert.equal(result.paragraphs, 2);
        assert.equal(result.sceneTransform, 'none'); assert.equal(result.contactTransform, 'none');
        if (motion === 'reduce') assert.deepEqual(result.moves, []);
        else {
          assert.deepEqual(result.moves, ['card'], 'ordinary turn only moves the fresh card');
          assert.equal(result.delay, 0, 'resource feedback must not delay the scene');
          assert.ok(result.duration >= 150 && result.duration <= 280, 'entrance fits the existing double-tap lock');
          assert.ok(Math.abs(result.points[0].scale - .985) < .001);
          assert.ok(Math.abs(result.points[0].y - 3) < .01);
          assert.ok(result.points[1].scale > result.points[0].scale);
          assert.equal(result.points[2].scale, 1); assert.equal(result.points[2].y, 0);
          assert.ok(result.points.every(p => p.opacity === 1 && p.fits), 'whole text remains visible and unclipped');
        }
        const old = await page.evaluate(() => { const n = document.querySelector('.irl-dialog'); window.oldIrlNode = n; return irlMoves.length; });
        await page.evaluate(() => MistakeryApp.render());
        assert.equal(await page.evaluate(() => irlMoves.length), old, 'rerender cannot replay');
        assert.equal(await page.evaluate(() => oldIrlNode.style.willChange), '', 'rerender cleans cancelled layer');
        await page.locator('[data-test-back]').click();
        assert.deepEqual(await page.evaluate(() => MistakeryApp.state), result.before, 'Back restores the exact snapshot');
        assert.equal(await page.evaluate(() => irlMoves.length), old, 'Back cannot replay');
        const replay = await chooseAndSample(page, 'right');
        assert.deepEqual(replay.moves.slice(old), motion === 'reduce' ? [] : ['card'], 'new accepted choice after Back gets its own entrance');

        await seed(page, 'DREAM_TEAM');
        const entry = await chooseAndSample(page, 'left');
        assert.equal(entry.state.currentCardId, 'IRL_PADEL_01');
        assert.equal(entry.typing, false);
        assert.deepEqual(entry.moves, motion === 'reduce' ? [] : ['card', 'scene']);
        if (motion !== 'reduce') { assert.equal(entry.delay, 0); assert.equal(entry.sceneDelay, 0); assert.equal(entry.sceneDuration, 180); }
      } finally { await browser.close(); }
    });
  }

  test(`${name}: IRL outcome keeps its existing effect and never adds ordinary impact`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser);
      for (const [score, draws, expected] of [[0, [0, .99], 'success'], [0, [.99, .99], 'failure']]) {
        await seed(page, 'IRL_PADEL_06', score, draws);
        const result = await chooseAndSample(page);
        assert.deepEqual(result.moves, []);
        assert.equal(await page.locator('[data-game]').getAttribute('data-outcome'), expected);
        const effect = await page.locator('[data-scene]').evaluate(n => getComputedStyle(n).animationName);
        assert.equal(effect, expected === 'success' ? 'outcomeSuccess' : 'outcomeJolt');
      }
    } finally { await browser.close(); }
  });

  test(`${name}: IRL impact settles, cleans layers, and cancels on resize, motion preference and hidden`, async () => {
    const browser = await type.launch();
    try {
      const page = await open(browser);
      await seed(page, 'IRL_PADEL_01');
      await page.evaluate(() => document.querySelector('[data-choice=right]').click());
      await page.waitForFunction(() => document.querySelector('.irl-dialog').style.willChange === '');
      assert.equal(await page.locator('.irl-dialog').evaluate(n => getComputedStyle(n).transform), 'none');
      for (const action of ['resize', 'reduce', 'hidden']) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await seed(page, 'IRL_PADEL_01');
        await chooseAndSample(page);
        await page.evaluate(() => { window.interruptedNode = document.querySelector('.irl-dialog'); });
        if (action === 'resize') await page.setViewportSize({ width: 321, height: 650 });
        if (action === 'reduce') await page.emulateMedia({ reducedMotion: 'reduce' });
        if (action === 'hidden') await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.waitForFunction(() => interruptedNode.style.willChange === '');
        assert.equal(await page.evaluate(() => interruptedNode.getAnimations().length), 0, action);
        assert.equal(await page.locator('.irl-dialog').evaluate(n => Number(getComputedStyle(n).opacity)), 1, action);
      }
    } finally { await browser.close(); }
  });
}
