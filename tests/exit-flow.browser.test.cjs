const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const { witnesses } = require('../docs/qa/resource-endings.json');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
const snapshot = page => page.evaluate(() => structuredClone(MistakeryApp.state));
for (const [name, type] of [['Chromium', chromium], ['WebKit', webkit]]) {
 test(`${name}: exit confirmation preserves a live run; Quit preserves the run and explicit New run starts only one attempt`, async () => {
  const browser = await type.launch();
  try {
   const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
   await page.goto(url+'?test=route&seed=14');
   await page.waitForFunction(()=>window.MistakeryApp?.state);
   await page.clock.install(); await page.clock.pauseAt(new Date());
   const empty=await snapshot(page);
   await page.locator('[data-restart-run]').click();
   assert.equal(await page.locator('[data-quit-dialog][open]').count(),1,'Saved also confirms exit');
   await page.locator('[data-quit-cancel]').click();
   assert.deepEqual(await snapshot(page),empty);
   for(let i=0;i<2;i++){await page.clock.runFor(20000);await page.locator('[data-choice="left"]').click();}
   await page.locator('[data-restart-run]').click();
   assert.equal(await page.locator('[data-quit-dialog][open]').count(),1,'first plot confirms before any decisions');
   await page.keyboard.press('Escape');
   assert.deepEqual(await snapshot(page),empty);
   await page.clock.runFor(20000);
   await page.locator('[data-choice="left"]').click();
   await page.clock.runFor(20000);
   const before=await snapshot(page);
   assert.equal(before.gameOver,false); assert.ok(before.history.length>0);
   assert.equal(await page.locator('[data-restart-run]').innerText(),'Back to 9–5');
   await page.locator('[data-restart-run]').click();
   assert.equal(await page.locator('[data-quit-dialog][open]').count(),1);
   assert.match(await page.locator('[data-quit-dialog]').innerText(),/Do you really want to quit\?/);
   await page.keyboard.press('ArrowLeft'); await page.clock.runFor(20000);
   assert.deepEqual(await snapshot(page),before);
   if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'){
    fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,'quit-confirmation.png')});
   }
   await page.locator('[data-quit-cancel]').click();
   assert.deepEqual(await snapshot(page),before);
   assert.equal(await page.locator('[data-restart-run]').evaluate(n=>n===document.activeElement),true);
   await page.locator('[data-restart-run]').click();await page.keyboard.press('Escape');
   assert.equal(await page.locator('[data-quit-dialog][open]').count(),0);
   assert.deepEqual(await snapshot(page),before);
   await page.locator('[data-restart-run]').click();await page.locator('[data-quit-confirm]').click();
   assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
   await page.clock.runFor(60000);await page.evaluate(()=>MistakeryApp.render());
   assert.equal(await page.locator('[data-title-screen]').isVisible(),true);
   assert.deepEqual(await snapshot(page),before,'exit cannot draw, spend or start another attempt');
   assert.equal(await page.locator('[data-title-screen] img').evaluate(n=>n.complete&&n.naturalWidth>0),true);
   assert.deepEqual(await page.locator('[data-title-screen] button').allTextContents(),['Continue','New run']);
   assert.equal(await page.locator('[data-title-screen] .choice').count(),2);
   for(const viewport of [{width:320,height:480},{width:390,height:844},{width:1280,height:900}]){
    await page.setViewportSize(viewport);
    assert.equal(await page.locator('[data-title-new]').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&document.documentElement.scrollWidth<=innerWidth;}),true);
    assert.equal(await page.locator('[data-title-screen]').evaluate(n=>{
     const r=n.getBoundingClientRect(), p=n.parentElement.getBoundingClientRect();
     return Math.abs(r.width-p.width)<2 && Math.abs(r.height-p.height)<2;
    }),true,'the title still covers the game screen');
    if(process.env.MISTAKERY_QA_DIR&&name==='Chromium')await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`title-${viewport.width}.png`)});
   }
   await page.clock.runFor(300);
   await page.locator('[data-title-new]').click();
   await page.locator('[data-new-run-confirm]').click();
   const next=await snapshot(page);
   assert.equal(await page.evaluate(()=>MistakeryApp.view),'playing');
   assert.equal(next.history.length,0);assert.equal(next.gameOver,false);
   assert.notEqual(next.seed,before.seed);assert.notEqual(next.route.initialPlot,before.route.initialPlot);
   assert.deepEqual(next.resources,{cash:25,team:60,customers:15,founder:65});
   await page.clock.runFor(20000);assert.deepEqual(await snapshot(page),next);
   await page.locator('[data-test-back]').click();
   assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
   await page.locator('[data-test-back]').click();assert.deepEqual(await snapshot(page),before);
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: ended exit always confirms, including the loss finale and its summary`,async()=>{
  const browser=await type.launch();
  try{
   const page=await browser.newPage({reducedMotion:'reduce'});
   await page.addInitScript(() => localStorage.setItem('mistakery.sound', 'off'));
   await page.goto(url+'?test=route');await page.waitForFunction(()=>window.MistakeryApp?.state);
   await page.clock.install();await page.clock.pauseAt(new Date());
   for(const id of ['cash_low','judgment_day']){
    await page.evaluate(w=>{const a=MistakeryApp;a.state=MistakeryRoute.startRun(a.deck,{seed:w.seed});for(const s of w.steps)a.state=MistakeryRoute.resolveChoice(a.deck,a.state,s.side).state;a.view='ended';a.cardDelivery=null;a.render();},witnesses[id]);
    await page.clock.runFor(20000);
    const ended=await snapshot(page);
    if(id==='cash_low'){
     await page.locator('[data-choice="left"]').click();
     assert.deepEqual(await page.locator('[data-finale-choice]').allTextContents(),['Back to 9–5','New run']);
     await page.locator('[data-finale-choice]').first().click();
     assert.equal(await page.locator('[data-quit-dialog][open]').count(),1);
     await page.keyboard.press('Escape');
     assert.equal(await page.locator('[data-loss-finale][open]').count(),1,'Cancel keeps the original finale open');
     assert.equal(await page.locator('[data-finale-choice]').first().evaluate(n=>n===document.activeElement),true);
     assert.deepEqual(await snapshot(page),ended);
     await page.keyboard.press('Escape');
    }
    if(id==='judgment_day'){
     assert.deepEqual(await page.locator('[data-choice]').allTextContents(),['Oops','Finally 😍']);
     await page.locator('[data-choice="left"]').click();
     assert.equal((await snapshot(page)).gameOver,false);continue;
    }
    assert.deepEqual(await page.locator('[data-choice]').allTextContents(),['Back to 9–5','New run']);
    const exitControl='[data-choice="left"]';
    await page.clock.runFor(300);
    await page.locator(exitControl).click();
    assert.equal(await page.locator('[data-quit-dialog][open]').count(),1);
    await page.locator('[data-quit-cancel]').click();
    assert.equal(await page.evaluate(()=>MistakeryApp.view),'ended');
    assert.deepEqual(await snapshot(page),ended);
    assert.equal(await page.locator(exitControl).evaluate(n=>n===document.activeElement),true);
    await page.locator(exitControl).click();
    await page.locator('[data-quit-confirm]').click();
    assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
    assert.equal(await page.locator('[data-quit-dialog][open]').count(),0);
    assert.deepEqual(await snapshot(page),ended);
   }
  }finally{await browser.close();}
 });
}
