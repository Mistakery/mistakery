const test=require('node:test'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const deck=require('../cards.json'),witness=require('./founder-profile.fixture.json').flex;
const {completeFounderSend}=require('./chat-delivery.fixture.cjs');
const checkpoints=witness.steps.map((step,index)=>({step,index})).filter(({step})=>deck.cards.find(c=>c.id===step.card)?.outcomeTone==='success');
for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]) test(`${name}: victories show progress and surviving completion shows three stories without state changes`,async()=>{
 const browser=await type.launch();
 try {
  for(const [i,{step,index}] of checkpoints.entries()) {
   const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
   await page.addInitScript(()=>localStorage.setItem('mistakery.sound','off'));
   await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href+'?test=route');
   await page.waitForFunction(()=>window.MistakeryApp?.state);
   await page.clock.install();await page.clock.pauseAt(new Date());
   await page.evaluate(({witness,index})=>{
    const a=MistakeryApp;clearTimeout(a.introTypingTimer);
    a.state=MistakeryRoute.startRun(a.deck,{seed:witness.seed});a.runStartState=structuredClone(a.state);
    for(const step of witness.steps.slice(0,index)) a.state=MistakeryRoute.resolveChoice(a.deck,a.state,step.side).state;
    a.view='playing';a.cardDelivery=null;a.locked=false;a.render();
   },{witness,index});
   await page.clock.runFor(20000);
   await page.locator(`[data-choice="${step.side}"]`).click();await completeFounderSend(page,true);
   const state=await page.evaluate(()=>structuredClone(MistakeryApp.state));
   assert.equal(await page.locator('.win-progress').innerText(),i===2?'3 of 3 wins secured':`${i+1} of 3 wins secured`);
   assert.equal(await page.locator('.win-progress__dot').count(),3);
   assert.equal(await page.locator('.win-progress__dot.is-filled').count(),i+1);
   assert.equal(await page.locator('.win-progress__dot.is-new').evaluate(el=>getComputedStyle(el).animationName),'none');
   assert.equal(await page.evaluate(()=>{
    const progress=document.querySelector('.win-progress').getBoundingClientRect();
    const buttons=document.querySelector('[data-win-finale] .choices').getBoundingClientRect();
    return progress.bottom<=buttons.top && progress.left>=0 && progress.right<=innerWidth && buttons.bottom<=innerHeight;
   }),true);
   await page.evaluate(()=>MistakeryApp.render());
   assert.deepEqual(await page.evaluate(()=>structuredClone(MistakeryApp.state)),state);
   assert.equal(await page.locator('.win-progress').innerText(),i===2?'3 of 3 wins secured':`${i+1} of 3 wins secured`);
   if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'){
    fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`win-progress-${i+1}.png`)});
   }
   await page.locator('[data-win-finale-choice]').first().click();
   assert.equal(await page.locator('.win-progress').count(),0);
   if(i===2) assert.equal(await page.locator('.founder-card').count(),1);
   await page.close();
  }
 }finally{await browser.close();}
});
