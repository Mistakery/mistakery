const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium, webkit } = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
async function open(type, reducedMotion = 'no-preference', variant = 'pulse', iconHudEnabled = false) {
  const browser = await type.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
  if (iconHudEnabled) await page.addInitScript(() => { window.MISTAKERY_FEATURES = { iconHud: true }; });
  await page.goto(`${url}?test=route&seed=192&hud=${variant}`);
  await page.waitForFunction(() => window.MistakeryApp?.view === 'saved');
  await page.clock.install(); await page.clock.pauseAt(new Date());
  return { browser, page };
}
async function seed(page, id, resources = { cash: 25, team: 60, customers: 15, founder: 65 }, raw = null) {
  await page.evaluate(({ id, resources, raw }) => {
    const a = MistakeryApp;
    a.state = MistakeryRoute.startRun(a.deck, { seed: 192 });
    a.state.currentCardId = id;
    a.state.route.gap = { target: 4, played: [], usedUnit: null };
    a.state.resources = resources;
    a.state.route.resourceLedger = raw;
    a.cardDelivery = null; a.locked = false; a.view = 'playing'; a.render();
    document.querySelector('button.typing-bubble')?.click();
    window.cashFill = document.querySelector('[data-resource="cash"] .bar i');
  }, { id, resources, raw });
  await page.clock.runFor(6000);
}
const delta = async (page, key) => {
  const text = await page.locator('[data-resource-announcement]').textContent();
  const label = key[0].toUpperCase() + key.slice(1);
  return text.match(new RegExp(`${label} ([+−][0-9.]+)\\. Balance`))?.[1] || '';
};
const click = (page, side = 'left') => page.locator(`[data-choice="${side}"]`).click();
const state = page => page.evaluate(() => structuredClone(MistakeryApp.state));

for (const [name, type] of Object.entries({ Chromium: chromium, WebKit: webkit })) {
  test(`${name}: feedback retains bars, announces fractional and mixed changes without numeric HUD, and defers new text`, async () => {
    const { browser, page } = await open(type, 'no-preference', 'icons');
    try {
      assert.equal(await page.locator('.hud-switcher').isVisible(), false);
      assert.equal(await page.locator('[data-resources]').getAttribute('data-variant'), 'pulse', 'parked icons URLs fall back to bars');
      assert.equal(new URL(page.url()).searchParams.get('hud'), 'pulse');
      await seed(page, 'LIVE_AGENT_04B');
      await click(page);
      assert.equal(await page.locator('[data-resource-delta], [data-resource-risk], [data-resource-balance]').count(), 0);
      assert.equal(await page.evaluate(() => cashFill === document.querySelector('[data-resource="cash"] .bar i')), true);
      assert.equal(await delta(page, 'cash'), '−0.5');
      assert.equal(await delta(page, 'founder'), '+5');
      assert.equal(await delta(page, 'team'), '');
      const colors = await page.locator('[data-resource]').evaluateAll(ns => Object.fromEntries(ns.map(n => [n.dataset.resource, getComputedStyle(n.querySelector('.bar i')).backgroundColor])));
      assert.equal(colors.cash, 'rgb(194, 56, 72)', 'fractional reply cost is red');
      assert.equal(colors.founder, 'rgb(23, 132, 84)', 'Founder gain is green even though high Founder is risky');
      assert.equal(colors.team, 'rgb(22, 119, 210)', 'zero change stays neutral');
      assert.equal(await page.locator('[data-resource="cash"]').evaluate(n => n.getAnimations().length), 0, 'no whole-resource animation');
      assert.equal(await page.locator('[data-resource="cash"] .resource-label').evaluate(n => getComputedStyle(n).color), 'rgb(66, 92, 114)');
      assert.equal(await page.locator('[data-resource="cash"]').evaluate(n => getComputedStyle(n).backgroundColor), 'rgba(0, 0, 0, 0)');
      assert.equal(await page.locator('[data-resource="cash"]').evaluate(n => getComputedStyle(n).boxShadow), 'none');

      assert.equal(await page.locator('[data-resource="cash"]').getAttribute('data-impact'), 'small');
      assert.equal(await page.locator('[data-resource="founder"]').getAttribute('data-impact'), 'large');
      assert.equal((await state(page)).history.length, 1);
      assert.equal(await page.locator('[data-chat-current]').count(), 0, 'resources get attention before the first new message');
      await page.locator('[data-choice="right"]').dispatchEvent('click');
      await page.clock.runFor(200);
      assert.equal((await state(page)).history.length, 1, 'one reply cannot charge twice');
      const mid = await page.locator('[data-resource="cash"] .bar i').evaluate(n => {
        const animation = n.getAnimations()[0];
        if (!animation) return null;
        animation.pause(); animation.currentTime = 200;
        return 100 * n.getBoundingClientRect().width / n.parentElement.getBoundingClientRect().width;
      });
      assert.ok(mid > 24.5 && mid < 25, `actual old-to-new fill, got ${mid}`);
      await page.clock.runFor(400);
      assert.ok(await page.locator('[data-chat-current]').count() > 0);
      await page.clock.runFor(6000);
      assert.equal(await delta(page, 'cash'), '');
      assert.equal(await page.evaluate(() => MistakeryApp.locked), false);
    } finally { await browser.close(); }
  });

  test(`${name}: Founder losses are red, Cash gains green, and rerender never replays feedback`, async () => {
    const { browser, page } = await open(type);
    try {
      for (const motion of ['no-preference', 'reduce']) {
        await page.emulateMedia({ reducedMotion: motion });
        await seed(page, 'FILL_MOM_CALL_2');
        await click(page);
        assert.equal(await delta(page, 'cash'), '+9.5');
        assert.equal(await delta(page, 'founder'), '−5');
        assert.equal(await page.locator('[data-resource="founder"] .bar i').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(194, 56, 72)');
        assert.equal(await page.locator('[data-resource="cash"] .bar i').evaluate(n => getComputedStyle(n).backgroundColor), 'rgb(23, 132, 84)');
        if (motion === 'reduce') assert.equal(await page.locator('[data-resources]').evaluate(n => n.getAnimations({subtree:true}).length), 0);
        const after = await state(page);
        await page.evaluate(() => MistakeryApp.render());
        assert.equal(await page.locator('[data-resource][data-direction]').count(), 0);
        assert.equal(await delta(page, 'cash'), '');
        assert.deepEqual(await state(page), after);
      }
    } finally { await browser.close(); }
  });

  test(`${name}: clipped losses and recovery report the ledger, warnings follow only fatal edges`, async () => {
    const { browser, page } = await open(type, 'reduce');
    try {
      await seed(page, 'INFLUENCER_01', { cash: 4, team: 60, customers: 15, founder: 65 });
      await click(page, 'right');
      assert.equal(await delta(page, 'cash'), '−15.5', 'do not call a 15.5 cost a 4 point loss');
      assert.match(await page.locator('[data-resource="cash"] [data-value]').textContent(), /−11.5/);
      assert.equal((await state(page)).gameOver, false, 'zero inside a plot is risk, not settled death');
      assert.equal(await page.locator('[data-resource="cash"]').getAttribute('data-risk'), 'low');
      assert.equal(await page.locator('[data-resource].is-fatal').count(), 0);
      assert.equal(await page.locator('[data-resource="cash"] .bar i').evaluate(n => n.getAnimations().length), 0);
      await seed(page, 'LIVE_AGENT_01', { cash: 100, team: 0, customers: 100, founder: 92 },
        { cash: 112, team: -8, customers: 110, founder: 92 });
      await click(page);
      await page.clock.runFor(650);
      assert.equal(await delta(page, 'team'), '+5');
      assert.match(await page.locator('[data-resource="team"] [data-value]').textContent(), /−3/);
      assert.equal(await page.locator('[data-resource="team"]').getAttribute('data-fill'), '0');
      assert.equal(await page.locator('[data-resource="team"]').getAttribute('data-risk'), 'low');
      assert.equal(await page.locator('[data-resource="founder"]').getAttribute('data-risk'), 'high');
      for (const key of ['cash', 'customers']) assert.equal(await page.locator(`[data-resource="${key}"]`).getAttribute('data-risk'), null);
      await seed(page, 'LIVE_AGENT_01', { cash: 25, team: 98, customers: 15, founder: 65 });
      await click(page);
      await page.clock.runFor(650);
      assert.equal(await delta(page, 'team'), '+5');
      assert.equal(await page.locator('[data-resource="team"]').getAttribute('data-risk'), 'high');
      assert.match(await page.locator('[data-resource="team"] [data-value]').textContent(), /high — at risk/);
      assert.match(await page.locator('[data-resource="team"] [data-value]').textContent(), /103/);
    } finally { await browser.close(); }
  });

  test(`${name}: Back and restart cancel feedback and preserve RNG`, async () => {
    const { browser, page } = await open(type);
    try {
      await seed(page, 'INFLUENCER_01');
      const before = await state(page);
      await click(page, 'right');
      assert.equal(await delta(page, 'cash'), '−15.5');
      const after = await state(page);
      await page.clock.runFor(100);
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await state(page), before);
      assert.equal(await delta(page, 'cash'), '');
      await page.clock.runFor(6000);
      await click(page, 'right');
      assert.deepEqual(await state(page), after);
      for (const selector of ['[data-test-restart]', '[data-restart-run]']) {
        await seed(page, 'INFLUENCER_01'); await click(page, 'right');
        await page.locator(selector).click();
        const restarted = await state(page);
        await page.clock.runFor(6000);
        assert.deepEqual(await state(page), restarted);
        assert.equal(await page.evaluate(() => MistakeryApp.view), 'saved');
        assert.equal(await delta(page, 'cash'), '');
        assert.equal(await page.locator('[data-resource].is-fatal').count(), 0);
        assert.equal(await page.evaluate(() => MistakeryApp.locked), false);
      }
    } finally { await browser.close(); }
  });

  test(`${name}: an old feedback timeout cannot clear the next reply, and reduced motion cancels only movement`, async () => {
    const { browser, page } = await open(type);
    try {
      await seed(page, 'LIVE_AGENT_04');
      await click(page); await page.clock.runFor(850);
      assert.equal(await delta(page, 'cash'), '−0.5');
      await page.clock.runFor(300);
      await page.locator('button.typing-bubble').press('Enter');
      await click(page);
      assert.equal(await delta(page, 'founder'), '+5');
      assert.equal((await state(page)).history.length, 2);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => [...document.querySelectorAll('.bar i')].every(n => n.getAnimations().length === 0));
      assert.equal(await delta(page, 'founder'), '+5', 'static feedback remains readable');
      await page.clock.runFor(1501);
      assert.equal(await delta(page, 'founder'), '+5', 'previous reply expiry cannot erase the new one');
      await page.clock.runFor(299);
      assert.equal(await delta(page, 'founder'), '');
      assert.equal((await state(page)).history.length, 2);
    } finally { await browser.close(); }
  });

  test(`${name}: HUD variants switch in place during delivery and keep choices, RNG, Back and restart intact`, async () => {
    const { browser, page } = await open(type, 'no-preference', 'pulse', true);
    try {
      await seed(page, 'LIVE_AGENT_04B');
      const before = await state(page);
      await click(page);
      const after = await state(page);
      const delivery = await page.evaluate(() => {
        window.originalDelivery = MistakeryApp.cardDelivery;
        window.originalChat = document.querySelector('[data-chat]').firstElementChild;
        return { data: structuredClone(MistakeryApp.cardDelivery), locked: MistakeryApp.locked };
      });
      for (const variant of ['icons','pulse','icons']) {
        await page.locator(`[data-hud-variant="${variant}"]`).click();
        assert.deepEqual(await state(page), after);
        assert.equal(await page.locator('[data-resources]').getAttribute('data-variant'), variant);
        assert.equal(new URL(page.url()).searchParams.get('hud'), variant);
        assert.equal(await page.locator(`[data-hud-variant="${variant}"]`).getAttribute('aria-pressed'), 'true');
        assert.deepEqual(await page.evaluate(() => ({data:MistakeryApp.cardDelivery,locked:MistakeryApp.locked})), delivery);
        assert.equal(await page.evaluate(() => originalDelivery === MistakeryApp.cardDelivery
          && originalChat === document.querySelector('[data-chat]').firstElementChild), true);
      }
      await page.locator('[data-hud-variant="icons"]').press('ArrowRight');
      assert.deepEqual(await state(page), after, 'testing controls must not send a gameplay reply');
      await page.clock.runFor(6000);
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await state(page), before);
      assert.equal(await page.locator('[data-resources]').getAttribute('data-variant'),'icons');
      await page.clock.runFor(6000);
      await click(page);
      assert.deepEqual(await state(page),after);
      await page.locator('[data-test-restart]').click();
      assert.equal(await page.locator('[data-resources]').getAttribute('data-variant'),'icons');
    } finally { await browser.close(); }
  });

  test(`${name}: icons animate real fill; both variants pulse only at danger and stop after recovery or reduced motion`, async () => {
    const { browser, page } = await open(type, 'no-preference', 'icons', true);
    try {
      assert.equal(await page.locator('[data-hud-variant="icons"]').getAttribute('aria-pressed'),'true');
      await seed(page, 'LIVE_AGENT_04B');
      await click(page);
      const transition = await page.locator('[data-resource="founder"] .resource-icon-fill').evaluate(node => {
        const animation=node.getAnimations()[0];
        animation.pause(); animation.currentTime=200;
        return { frames:animation.effect.getKeyframes().map(frame=>frame.clipPath), mid:getComputedStyle(node).clipPath };
      });
      assert.deepEqual(transition.frames,['inset(35% 0px 0px)','inset(30% 0px 0px)']);
      const mid = Number(transition.mid.match(/[\d.]+/)[0]);
      assert.ok(mid>30 && mid<35,transition.mid);
      assert.ok(await page.locator('[data-resource="cash"] .resource-icon-empty').evaluate(node=>node.getAnimations().length)>0,
        'a fractional cost gets a visible cue even when its fill change is subpixel');
      for(const variant of ['pulse','icons']) {
        await page.locator(`[data-hud-variant="${variant}"]`).click();
        await seed(page,'LIVE_AGENT_01',{cash:100,team:98,customers:100,founder:0});
        const selector = variant==='pulse'?'.bar':'.resource-icon-meter';
        for(const [key,risk] of Object.entries({cash:null,team:'high',customers:null,founder:'low'})) {
          const resource=page.locator(`[data-resource="${key}"]`);
          assert.equal(await resource.getAttribute('data-risk'),risk);
          const animations=await resource.locator(selector).evaluate(node=>node.getAnimations().map(a=>a.effect.getTiming().duration));
          assert.deepEqual(animations,risk?[variant==='pulse'?3000:1600]:[]);
        }
        await seed(page,'LIVE_AGENT_01',{cash:50,team:50,customers:50,founder:50});
        assert.equal(await page.locator('[data-resources]').evaluate(node=>node.getAnimations({subtree:true}).length),0);
        await seed(page,'LIVE_AGENT_01',{cash:0,team:98,customers:100,founder:0});
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>document.querySelector('[data-resources]').getAnimations({subtree:true}).length===0);
        assert.equal(await page.locator('[data-resource="cash"]').getAttribute('data-risk'),'low');
        await page.emulateMedia({reducedMotion:'no-preference'});
      }
    } finally { await browser.close(); }
  });
}
