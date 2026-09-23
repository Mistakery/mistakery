const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const cases = [
  ['OPEN_01', 'left', 49.5],
  ['OPEN_INVESTOR', 'left', 47.5],
  ['OPEN_INVESTOR', 'right', 47.5],
  ['INFLUENCER_02', 'right', 49.5],
  ['INFLUENCER_05', 'left', 49.5],
  ['INFLUENCER_08', 'right', 79.5],
  ['INFLUENCER_OUTCOME_6', 'left', 49.5],
  ['PADEL_INVITE', 'left', 48.5],
  ['DREAM_TEAM', 'left', 48.5],
  ['IRL_PADEL_04', 'left', 48.5],
  ['IRL_PADEL_06', 'left', 48.5],
  ['PADEL_OUTCOME_2', 'right', 49.5],
  ['LIVE_AGENT_04', 'left', 49.5],
  ['LIVE_AGENT_08', 'right', 84.5],
  ['LIVE_AGENT_OUTCOME_3', 'right', 49.5],
];
async function snapshot(page) {
  return page.evaluate(() => ({ state: window.MistakeryApp.state, view: window.MistakeryApp.view }));
}
test('every gameplay resolver charges half a Cash exactly once, including neutral and outcome replies', async () => {
  assert.equal(require('../cards.json').meta.baseCashBurn, -.5);
  const browser = await chromium.launch({ headless:true });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${url}?story=live-agent`);
    await page.waitForFunction(()=>window.MistakeryApp?.deck);
    for(const [id,side,cash] of cases) {
      await page.evaluate(id=>{
        const a=window.MistakeryApp;
        a.state=window.MistakeryEngine.startRun(a.deck);
        a.state.currentCardId=id;
        a.state.resources={cash:50,team:50,customers:50,founder:50};
        a.state.schedulerResources={...a.state.resources};
        a.influencerPreviousCardId='INFLUENCER_06';
        a.padelCeoScore=0;
        a.liveAgentScore=-5;
        a.view='playing';a.locked=false;Math.random=()=>0;
        a.render();
      },id);
      const before=await snapshot(page);
      await page.locator(`[data-choice="${side}"]`).hover();
      await page.locator(`[data-choice="${side}"]`).focus();
      assert.deepEqual(await snapshot(page),before);
      await page.locator(`[data-choice="${side}"]`).click();
      const after=await snapshot(page);
      assert.equal(after.state.resources.cash,cash,id);
      assert.equal(after.state.history.length,1,id);
      assert.equal(after.state.history[0].deltas.cash,cash-50,id);
      assert.equal(await page.locator('[data-resource="cash"]').getAttribute('data-fill'),String(cash));
      await page.evaluate(()=>window.MistakeryApp.render());
      assert.deepEqual(await snapshot(page),after,'render must not charge a turn');
      await page.locator('[data-test-back]').click();
      assert.deepEqual(await snapshot(page),before,'Back refunds the complete turn');
    }
    for(const id of ['OPEN_01','OPEN_INVESTOR','INFLUENCER_02','LIVE_AGENT_04','PADEL_INVITE']) {
      await page.evaluate(id=>{
        const a=window.MistakeryApp;a.state=window.MistakeryEngine.startRun(a.deck);
        a.state.currentCardId=id;a.state.resources.cash=.25;a.state.schedulerResources.cash=.25;
        a.state.turn=10000;a.view='playing';a.locked=false;a.render();
      },id);
      await page.locator('[data-choice="left"]').click();
      const after=await snapshot(page);
      assert.equal(after.state.resources.cash,0,id);
      assert.equal(after.state.activeCrisisId,null,id);
      assert.equal(after.state.gameOver,false,id);
    }
    // A second neutral turn accumulates to exactly one Cash, with no rounding loss.
    await page.evaluate(()=>{
      const a=window.MistakeryApp;a.state=window.MistakeryEngine.startRun(a.deck);
      a.state.currentCardId='INFLUENCER_02';a.state.resources.cash=50;a.view='playing';a.locked=false;a.render();
    });
    await page.locator('[data-choice="right"]').click();
    await page.waitForFunction(()=>!window.MistakeryApp.locked);
    await page.locator('[data-choice="left"]').click();
    assert.equal((await snapshot(page)).state.resources.cash,49);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
