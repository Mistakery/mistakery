const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const {firstVictory}=require('./persistent-wins.fixture.cjs');
const root=path.resolve(__dirname,'..'),origin='http://mistakery.test/',key='mistakery.browser-save';
async function setup(engine){
 const browser=await engine.launch(),context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('mistakery.sound','off');const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(window.denySave&&k==='mistakery.browser-save')throw new DOMException('Blocked','QuotaExceededError');return set.call(this,k,v)};});
 await context.route('**/*',async r=>{if(!r.request().url().startsWith(origin))return r.abort();const f=path.join(root,new URL(r.request().url()).pathname.slice(1)||'index.html');await r.fulfill({path:f,contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(f)]||'text/html'});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const time=new Date('2026-10-19T12:00:00Z');await page.clock.install({time});await page.clock.pauseAt(time);await page.goto(origin+'?seed=14');await page.locator('[data-title-play]').waitFor();await page.clock.runFor(400);await page.locator('[data-title-play]').click();for(let i=0;i<5;i++){await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();}await page.clock.runFor(30000);return {browser,page,errors};
}
async function victory(page,plot,type='flex'){
 const w=firstVictory(plot,type);
 await page.evaluate(w=>{const a=MistakeryApp;a.state=MistakeryRoute.startRun(a.deck,{seed:w.seed});for(const step of w.steps.slice(0,-1))a.state=MistakeryRoute.resolveChoice(a.deck,a.state,step.side).state;a.view='playing';a.locked=false;a.cardDelivery=null;a.render();},w);
 await page.clock.runFor(30000);await page.locator(`[data-choice="${w.steps.at(-1).side}"]`).click();await page.clock.runFor(2000);
}
async function resume(page){await page.reload();await page.locator('[data-title-continue]').waitFor();await page.clock.runFor(400);await page.locator('[data-title-continue]').click();}
for(const [name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
 test(`${name}: Deals tracks distinct persistent victories, repeat wins and new attempts`,{timeout:45000},async()=>{const {browser,page,errors}=await setup(engine);try{
  assert.equal(await page.locator('[data-deals-count]').count(),1,'persistent Deals indicator exists');
  assert.equal(await page.locator('[data-deals-count]').innerText(),'Deals 0/3');
  for(const [i,plot]of ['padel','padel','influencer','live_agent'].entries()){
   const n=[1,1,2,3][i];await victory(page,plot,i===1?'hard':'flex');
   assert.equal(await page.locator('[data-deals-count]').innerText(),`Deals ${n}/3`);
   assert.equal(await page.locator('.win-progress').innerText(),`${n} of 3 deals closed`);
   await resume(page);assert.equal(await page.locator('[data-deals-count]').innerText(),`Deals ${n}/3`);
   await page.locator('[data-win-finale-choice]').first().click();
   if(n===3){assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),'flex');await page.locator('[data-profile-replay]').click();}
   else{await page.clock.runFor(30000);await page.locator('[data-restart-run]').click();await page.locator('[data-quit-confirm]').click();await page.clock.runFor(400);await page.locator('[data-title-new]').click();await page.locator('[data-new-run-confirm]').click();}
   assert.equal(await page.locator('[data-deals-count]').innerText(),`Deals ${n}/3`);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}});
 test(`${name}: unsaved Deals remain distinct, indicator is passive, retry restores saved marks`,{timeout:45000},async()=>{const {browser,page,errors}=await setup(engine);try{
  assert.equal(await page.locator('[data-deals-count]').count(),1,'persistent Deals indicator exists');
  await victory(page,'padel');await page.locator('[data-win-finale-choice]').first().click();
  await page.evaluate(()=>window.denySave=true);await victory(page,'influencer');await page.locator('[data-win-finale-choice]').first().click();await page.clock.runFor(30000);
  assert.equal(await page.locator('[data-deals] .deals-mark.is-pending').count(),1);
  const before=await page.evaluate(()=>JSON.stringify(MistakeryApp.state));
  for(const [width,height]of [[320,480],[320,568],[390,844],[1440,900]]){
   await page.setViewportSize({width,height});await page.locator('[data-deals]').click();
   assert.match(await page.locator('[data-deals]').getAttribute('aria-label'),/1 not saved/);
   assert.equal(await page.locator('[data-deals]').evaluate(n=>n.tabIndex),-1);
   assert.equal(await page.locator('dialog[open]').count(),0);
   assert.equal(await page.evaluate(()=>JSON.stringify(MistakeryApp.state)),before);
   assert.equal(await page.locator('[data-deals]').evaluate(b=>{const a=b.getBoundingClientRect(),q=document.querySelector('[data-restart-run]').getBoundingClientRect();return a.right<=q.left&&q.right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth}),true);
  }
  await page.evaluate(()=>window.denySave=false);await page.locator('[data-restart-run]').click();await page.locator('[data-quit-confirm]').click();await page.clock.runFor(400);await page.locator('[data-title-continue]').click();
  assert.equal(await page.locator('[data-deals] .deals-mark.is-pending').count(),0);
  assert.equal(await page.locator('[data-deals-count]').innerText(),'Deals 2/3');await resume(page);assert.equal(await page.locator('[data-deals-count]').innerText(),'Deals 2/3');assert.deepEqual(errors,[]);
 }finally{await browser.close();}});
}
