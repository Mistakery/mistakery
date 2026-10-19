const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');
const fixtures = require('./founder-profile.fixture.json');
const { witnesses } = require('../docs/qa/resource-endings.json');
const root = path.resolve(__dirname, '..'), url = 'http://mistakery.test/', key='mistakery.browser-save';
const state = page => page.evaluate(() => structuredClone(MistakeryApp.state));
async function setup(type, options={}) {
  const browser=await type.launch(), context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(({key,deny})=>{
    localStorage.setItem('mistakery.sound','off');
    if(deny){const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException('Blocked','QuotaExceededError');return original.call(this,k,v);};}
  },{key,deny:options.deny});
  await context.route(url+'**',async r=>{
    const pathname=new URL(r.request().url()).pathname;
    const file=path.join(root,pathname==='/'?'index.html':pathname.slice(1));
    await r.fulfill({path:file,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'text/html'});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();
  await page.goto(url+'?seed=14');await page.locator('[data-title-play]').waitFor();
  await page.clock.pauseAt(new Date());
  return {browser,context,page,errors};
}
async function start(page) {
  await page.clock.runFor(300);await page.locator('[data-title-play]').click();
  for(let i=0;i<12&&await page.evaluate(()=>MistakeryApp.view!=='playing');i++){
    await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();
  }
  assert.equal(await page.evaluate(()=>MistakeryApp.view),'playing');
}
async function reloadContinue(page) {
  await page.reload();await page.locator('[data-title-continue]').waitFor({timeout:3000});
  assert.equal(await page.locator('[data-title-continue]').innerText(),'Continue');
  await page.clock.runFor(300);await page.locator('[data-title-continue]').click();
}
async function witness(page,w,beforeLast=false) {
  await page.evaluate(({w,beforeLast})=>{
    const a=MistakeryApp;clearTimeout(a.introTypingTimer);
    a.state=MistakeryRoute.startRun(a.deck,{seed:w.seed});
    for(const step of (beforeLast?w.steps.slice(0,-1):w.steps))a.state=MistakeryRoute.resolveChoice(a.deck,a.state,step.side).state;
    a.view='playing';a.cardDelivery=null;a.locked=false;a.render();
  },{w,beforeLast});
  await page.clock.runFor(30000);
}
for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
 test(`${name}: intro exit returns straight to welcome without a dialog or premature save`,{timeout:30000},async()=>{
  const {browser,page,errors}=await setup(type);
  try{
    for(const note of [0,1]){
      await page.clock.runFor(300);await page.locator('[data-title-play]').click();
      for(let n=0;n<10&&await page.evaluate(()=>MistakeryApp.view!=='saved');n++){
        await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();
      }
      assert.equal(await page.evaluate(()=>MistakeryApp.view),'saved');
      if(note===1){await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();}
      const prepared=await state(page);
      await page.locator('[data-restart-run]').click();
      assert.equal(await page.locator('[data-quit-dialog]').count(),0,'intro exits without confirmation');
      assert.equal(await page.locator('[data-title-play]').count(),1);
      assert.equal(await page.locator('[data-title-continue]').count(),0);
      assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null,'exit cannot save a run before intro completion');
      assert.deepEqual(await state(page),prepared,'exit cannot draw or resolve a card');
      await page.clock.runFor(30000);
      assert.equal(await page.evaluate(()=>MistakeryApp.view),'title','pending intro delivery cannot reopen the game');
      await page.clock.runFor(300);await page.locator('[data-title-play]').click();
      assert.equal(await page.evaluate(()=>MistakeryApp.onboardingIndex),0);
      await page.reload();await page.locator('[data-title-play]').waitFor();
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: first run autosaves, reload and Continue preserve state; Quit and explicit New run`,{timeout:30000},async()=>{
  const {browser,page,errors}=await setup(type);
  try{
    await start(page);
    assert.ok(await page.evaluate(k=>localStorage.getItem(k),key),'first playable card is saved');
    await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();
    const accepted=await state(page);
    assert.ok(accepted.history.length);
    await reloadContinue(page);assert.deepEqual(await state(page),accepted);
    assert.equal(await page.locator('[data-choice]:disabled').count(),0,'restored typing is complete');
    const expected=await page.evaluate(()=>MistakeryRoute.resolveChoice(MistakeryApp.deck,MistakeryApp.state,'left').state);
    await page.locator('[data-choice="left"]').click();assert.deepEqual(await state(page),expected);
    await page.clock.runFor(20000);
    await page.locator('[data-restart-run]').click();
    assert.equal(await page.locator('#quit-description').innerText(),'Your progress is saved.');
    await page.locator('[data-quit-cancel]').click();
    assert.deepEqual(await state(page),expected);
    await page.locator('[data-restart-run]').click();await page.locator('[data-quit-confirm]').click();
    await page.clock.runFor(300);
    assert.equal(await page.locator('[data-title-continue]').innerText(),'Continue');
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:844});
      assert.equal(await page.locator('[data-title-new]').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true);
      if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'){
        fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`save-title-${width}.png`)});
      }
    }
    await page.locator('[data-title-new]').click();await page.locator('[data-new-run-cancel]').click();
    assert.deepEqual(await state(page),expected);
    await page.locator('[data-title-new]').click();await page.locator('[data-new-run-confirm]').click();
    const next=await state(page);assert.equal(next.history.length,0);assert.notEqual(next.seed,expected.seed);
    assert.notEqual(next.route.initialPlot,expected.route.initialPlot);
    await reloadContinue(page);assert.deepEqual(await state(page),next);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: finished attempts offer New run and the earned CEO card without View result`,{timeout:30000},async()=>{
  const {browser,page,errors}=await setup(type);
  async function openCard(){
    await page.reload();await page.locator('[data-title-profile]').waitFor();await page.clock.runFor(300);
    assert.deepEqual(await page.locator('.title-actions button').allTextContents(),['New run','CEO card']);
    assert.equal(await page.locator('.title-save-note').count(),0);
    await page.locator('[data-title-profile]').click();
  }
  try{
    await start(page);const w=fixtures.flex;await witness(page,w,true);
    await page.locator(`[data-choice="${w.steps.at(-1).side}"]`).click();
    const end=await state(page);assert.equal(end.endingId,'run_complete');
    assert.equal(await page.locator('[data-founder-invitation]').count(),1);
    await openCard();
    assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),'flex');
    assert.deepEqual(await state(page),end);
    await page.locator('[data-profile-finish]').click();await page.locator('[data-quit-confirm]').click();
    await openCard();assert.deepEqual(await state(page),end);
    await page.locator('[data-profile-replay]').click();const next=await state(page);
    await reloadContinue(page);assert.deepEqual(await state(page),next);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: first wins survive replay and reload; third distinct victory unlocks a stable CEO mid-run`,{timeout:45000},async()=>{
  const {browser,page,errors}=await setup(type);
  const {firstVictory}=require('./persistent-wins.fixture.cjs');
  const savedProgress=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress,key);
  async function newRun(){
    await page.clock.runFor(2000);
    await page.locator('[data-restart-run]').click();await page.locator('[data-quit-confirm]').click();
    await page.clock.runFor(300);await page.locator('[data-title-new]').click();
    await page.locator('[data-new-run-confirm]').click();
  }
  try{
    await start(page);
    let first;
    for(const [index,[plot,type]] of [['padel','flex'],['padel','hard'],['influencer','flex'],['live_agent','flex']].entries()){
      const w=firstVictory(plot,type);await witness(page,w,true);
      await page.locator(`[data-choice="${w.steps.at(-1).side}"]`).click();
      const accepted=await state(page),p=await savedProgress();
      assert.equal(Object.keys(p.wins).length,[1,1,2,3][index]);
      if(index===0)first=structuredClone(p.wins.padel);
      assert.deepEqual(p.wins.padel,first,'first winning decisions cannot be replaced');
      await reloadContinue(page);
      assert.deepEqual(await state(page),accepted);
      assert.equal(await page.locator('.win-progress').innerText(),`${[1,1,2,3][index]} of 3 deals closed`);
      assert.equal(await page.locator('[data-founder-invitation]').count(),index===3?1:0);
      if(index===3){
        // Reload before revealing, then use the permanent title entry instead of Continue.
        await page.reload();await page.locator('[data-title-profile]').waitFor();await page.clock.runFor(300);
        await page.locator('[data-title-profile]').click();
        const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
        assert.equal(saved.presentation.winCardId,null);assert.equal(saved.presentation.profileRevealed,true);
        assert.equal(await page.locator('[data-save-status]').count(),0);
      }else await page.locator('[data-win-finale-choice]').first().click();
      if(index<3){await newRun();await reloadContinue(page);assert.deepEqual((await savedProgress()).wins,p.wins);}
      else{
        assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),'flex');
        assert.equal(accepted.gameOver,false,'third saved win can arrive during a new attempt');
        const firstReward=await savedProgress();
        await page.reload();await page.locator('[data-title-profile]').waitFor();await page.clock.runFor(300);
        await page.locator('[data-title-profile]').click();
        assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),'flex');
        await page.locator('[data-profile-finish]').click();await page.locator('[data-quit-confirm]').click();
        await page.clock.runFor(300);await page.locator('[data-title-continue]').click();
        assert.deepEqual(await state(page),accepted);assert.equal(await page.locator('.founder-card').count(),0);
        await newRun();await page.reload();await page.locator('[data-title-profile]').waitFor();await page.clock.runFor(300);
        assert.deepEqual((await savedProgress()).wins,firstReward.wins);
        assert.deepEqual(await page.locator('.title-actions button').allTextContents(),['Continue','New run','CEO card']);
        assert.equal(await page.locator('.title-save-note').count(),0);
        for(const width of [320,390,1280]){
          await page.setViewportSize({width,height:844});
          const layout=await page.locator('[data-title-profile]').evaluate(button=>{
            const b=button.getBoundingClientRect(),primary=document.querySelector('[data-title-new]').getBoundingClientRect();
            return {below:b.top>=primary.bottom,aligned:Math.abs(b.width-primary.width)<1,bottom:b.bottom,height:b.height,background:getComputedStyle(button).backgroundImage};
          });
          assert.ok(layout.below&&layout.aligned&&layout.height>=48&&layout.bottom<=844);assert.equal(layout.background,'none');
          if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'&&width===390){
            fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
            await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,'title-ceo.png')});
          }
        }

        await page.locator('[data-title-profile]').click();assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),'flex');
        if(process.env.MISTAKERY_QA_DIR&&name==='Chromium')await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,'persistent-ceo.png')});
      }
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: losses and Judgment Day remain saved but cannot be reopened from the title`,{timeout:45000},async()=>{
  const {browser,page,errors}=await setup(type);
  try{
    await start(page);
    for(const id of ['cash_low','team_low','team_high','customers_low','founder_low','founder_high','judgment_day']){
      const w=witnesses[id];await witness(page,w,true);
      await page.locator(`[data-choice="${w.steps.at(-1).side}"]`).click();
      const end=await state(page);assert.equal(end.endingId,id);
      if(id!=='judgment_day'){
        await page.clock.runFor(30000);
        await page.locator('[data-choice="right"]').click();
        await page.locator('[data-loss-finale]').waitFor();
        await page.keyboard.press('Escape');
      }
      const checkpoint=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
      await page.reload();await page.locator('[data-title-new]').waitFor();await page.clock.runFor(300);
      assert.deepEqual(await page.locator('.title-actions button').allTextContents(),['New run']);
      assert.equal(await page.locator('.title-save-note').count(),0);
      assert.deepEqual(await state(page),end);
      assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),checkpoint);
      await page.locator('[data-title-new]').click();assert.equal((await state(page)).gameOver,false);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: stale victory tab offers an accessible Reload without overwriting newer progress`,{timeout:20000},async()=>{
  const {browser,page,errors}=await setup(type);
  try{
    await start(page);const w=fixtures.flex;await witness(page,w,true);
    const newer=await page.evaluate(k=>{
      const record=JSON.parse(localStorage.getItem(k));record.revision++;
      const raw=JSON.stringify(record);localStorage.setItem(k,raw);return raw;
    },key);
    await page.locator(`[data-choice="${w.steps.at(-1).side}"]`).click();
    await page.locator('[data-save-conflict]').waitFor();
    assert.equal(await page.locator('[data-save-status]').count(),0,'conflict has one message, without a duplicate banner');
    for(const width of [320,390,1280]){
      await page.setViewportSize({width,height:844});
      const layout=await page.locator('[data-save-conflict]').evaluate(dialog=>{
        const box=dialog.getBoundingClientRect(),button=dialog.querySelector('button').getBoundingClientRect();
        return {left:button.left-box.left,right:box.right-button.right,width:button.width,height:button.height,inside:box.left>=0&&box.right<=innerWidth};
      });
      assert.ok(layout.inside&&layout.width>200&&layout.height>=48&&Math.abs(layout.left-layout.right)<2);
      if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'&&width===390){
        fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
        await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,'reload-dialog.png')});
      }
    }
    await page.locator('[data-save-conflict] button').click();
    await page.locator('[data-title-continue]').waitFor({timeout:3000});
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),newer);
    assert.deepEqual(await state(page),JSON.parse(newer).state);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: corrupted save requires explicit replacement; QA never overwrites it`,{timeout:20000},async()=>{
  const {browser,page,errors}=await setup(type);
  try{
    await page.evaluate(k=>localStorage.setItem(k,'{broken'),key);await page.reload();
    await page.locator('[data-title-new]').waitFor({timeout:3000});
    assert.equal(await page.locator('[data-title-continue]').count(),0);
    assert.match(await page.locator('[data-save-status]').innerText(),/could not be loaded/i);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'{broken');
    await page.goto(url+'?test=route');await page.waitForFunction(()=>MistakeryApp.state);
    await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'{broken');
    await page.goto(url);await page.locator('[data-title-new]').waitFor();await page.clock.runFor(300);
    await page.locator('[data-title-new]').click();await page.locator('[data-new-run-confirm]').click();
    assert.ok(JSON.parse(await page.evaluate(k=>localStorage.getItem(k),key)).state);
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: failed writes keep play available and explain unsaved progress`,{timeout:20000},async()=>{
  const {browser,page,errors}=await setup(type,{deny:true});
  try{
    await start(page);await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();
    assert.ok((await state(page)).history.length);
    assert.match(await page.locator('[data-save-status]').innerText(),/not being saved/i);
    await page.locator('[data-restart-run]').click();
    assert.equal(await page.locator('#quit-description').innerText(),"Progress couldn’t be saved. Don’t close this tab if you want to continue.");
    await page.locator('[data-quit-cancel]').click();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
    assert.equal(await page.evaluate(()=>MistakerySound.enabled),false);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
}
