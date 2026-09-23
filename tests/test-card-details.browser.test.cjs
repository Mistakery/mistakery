const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const deck = require('../cards.json');
const url = process.env.MISTAKERY_TEST_URL || pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const appSource = require('node:fs').readFileSync(path.resolve(__dirname, '..', 'app.js'), 'utf8');
const ids = [...appSource.match(/const ACTIVE_CARD_IDS[^[]*\[([\s\S]*?)\]\);/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
test('Russian reference covers every active card, both replies and contextual variants', () => {
  for(const id of [...ids,'SAVED_01_PLAN','SAVED_02_UPDATE']) {
    const ru=deck.testTranslations?.[id];
    assert.ok(ru?.text && /[А-Яа-яЁё]/.test(ru.text), id);
    assert.ok(ru.left && ru.right, `${id} replies`);
    const card=deck.cards.find(c=>c.id===id);
    for(const previous of Object.keys(card?.contextualChoices||{})) assert.ok(ru.contextual?.[previous]?.left && ru.contextual?.[previous]?.right, `${id}.${previous}`);
  }
  assert.doesNotMatch(deck.testTranslations.LIVE_AGENT_04B.text,/Бессильны перед правдой/);
  assert.match(deck.testTranslations.PADEL_OUTCOME_7.text,/черном списке/);
});
async function state(page) {return page.evaluate(()=>({state:window.MistakeryApp.state,score:window.MistakeryApp.liveAgentScore,previous:window.MistakeryApp.influencerPreviousCardId,draws:window.testDraws}));}
async function seed(page,id,previous='INFLUENCER_04',score=0) {
  await page.evaluate(({id,previous,score})=>{
    const a=window.MistakeryApp;clearTimeout(a.introTypingTimer);
    a.state=window.MistakeryEngine.startRun(a.deck);a.state.currentCardId=id;
    a.state.resources={cash:50,team:50,customers:50,founder:50};a.state.schedulerResources={...a.state.resources};
    a.influencerPreviousCardId=previous;a.liveAgentScore=5;a.padelCeoScore=score;
    a.locked=false;a.view='playing';window.testDraws=0;Math.random=()=>{window.testDraws++;return .99;};a.render();
  },{id,previous,score});
}
test('test-only translation dialog is readable, contextual and read-only across all active cards', async () => {
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.waitForFunction(()=>window.MistakeryApp?.deck);
    assert.equal(await page.locator('[data-test-inspect]').isVisible(),false);
    await page.goto(`${url}?story=live-agent`);await page.waitForFunction(()=>window.MistakeryApp?.deck);
    for(const width of [390,320]) {
      await page.setViewportSize({width,height:width===390?844:650});
      for(const id of ids) {
        await seed(page,id);
        const before=await state(page);
        await page.locator('[data-test-inspect]').click();
        const dialog=page.locator('[data-test-details]');
        assert.equal(await dialog.isVisible(),true,id);
        assert.equal(await dialog.locator('[data-details-translation]').innerText(),deck.testTranslations[id].text,id);
        assert.match(await dialog.innerText(),/Cash −0,5/);
        const geometry=await dialog.evaluate(n=>({width:n.scrollWidth-n.clientWidth,bottom:n.getBoundingClientRect().bottom,right:n.getBoundingClientRect().right}));
        assert.ok(geometry.width<=1 && geometry.bottom<= (width===390?844:650) && geometry.right<=width,JSON.stringify({id,geometry}));
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await state(page),before,'viewing and arrows must not choose/roll/charge');
        await page.keyboard.press('Escape');
        assert.equal(await dialog.isVisible(),false);
        assert.equal(await page.locator('[data-test-inspect]').evaluate(n=>n===document.activeElement),true);
      }
    }
    for(const [id,previous,left] of [['INFLUENCER_05','INFLUENCER_06','Извини, давай так'],['INFLUENCER_06','INFLUENCER_05','Вообще-то 60% было норм']]) {
      await seed(page,id,previous);await page.locator('[data-test-inspect]').click();
      assert.match(await page.locator('[data-details-choice="left"]').innerText(),new RegExp(left));
      assert.match(await page.locator('[data-details-choice="left"]').innerText(),/Founder −15/);
      await page.locator('[data-details-close]').click();
    }
    for(const [id,side,expected] of [
      ['INFLUENCER_01','right',['INFLUENCER_OUTCOME_1']],
      ['INFLUENCER_08','left',['INFLUENCER_OUTCOME_4','INFLUENCER_OUTCOME_5']],
      ['IRL_PADEL_06','right',['PADEL_OUTCOME_1','PADEL_OUTCOME_2','PADEL_OUTCOME_5','PADEL_OUTCOME_6']],
      ['IRL_PADEL_05','right',['PADEL_OUTCOME_7']],
      ['LIVE_AGENT_08','left',['LIVE_AGENT_OUTCOME_1','LIVE_AGENT_OUTCOME_2']],
    ]) {
      await seed(page,id,'INFLUENCER_04',3);await page.locator('[data-test-inspect]').click();
      const choice=page.locator(`[data-details-choice="${side}"]`);
      assert.deepEqual(await choice.locator('[data-details-outcome]').evaluateAll(ns=>ns.map(n=>n.dataset.detailsOutcome)),expected);
      if(id==='LIVE_AGENT_08')assert.match(await choice.innerText(),/Все ресурсы → 0/);
      await page.keyboard.press('Escape');
    }
    await seed(page,'INFLUENCER_08');await page.locator('[data-test-inspect]').click();
    assert.match(await page.locator('[data-details-outcome="INFLUENCER_OUTCOME_4"]').innerText(),/Изменение за весь ход: Cash \+14,5 · Team −8 · Customers \+30 · Founder \+10/);
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{const a=window.MistakeryApp;a.state.resources={cash:99,team:1,customers:99,founder:99};a.render();});
    await page.locator('[data-test-inspect]').click();
    assert.match(await page.locator('[data-details-outcome="INFLUENCER_OUTCOME_4"]').innerText(),/Изменение за весь ход: Cash \+1 · Team −1 · Customers \+1 · Founder \+1/);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.querySelector('[data-test-details]').contains(document.activeElement)),true,'native dialog traps keyboard focus');
    await page.keyboard.press('Escape');
    await seed(page,'INFLUENCER_OUTCOME_6');await page.locator('[data-test-inspect]').click();
    assert.match(await page.locator('[data-details-entry]').innerText(),/Cash \+30/);
    assert.doesNotMatch(await page.locator('[data-details-choice="left"]').innerText(),/Cash \+30/);
    await page.locator('[data-test-details]').screenshot({path:'/tmp/mistakery-test-card-details.png'});
    await page.keyboard.press('Escape');
    await page.locator('[data-choice="left"]').click();
    await page.locator('[data-test-inspect]').click();
    assert.match(await page.locator('[data-test-details]').innerText(),/Навигация не меняет ресурсы/);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
