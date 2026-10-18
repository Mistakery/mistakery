const test=require('node:test'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const fixtures=require('./founder-profile.fixture.json');
const {completeFounderSend}=require('./chat-delivery.fixture.cjs');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]) test(`${name}: real third victory reveals the approved profile, exit opens title and replay resets`,async()=>{
 const browser=await type.launch();
 try{
 for(const [key,witness] of Object.entries(fixtures)){
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'?test=route');await page.waitForFunction(()=>window.MistakeryApp?.state);
  await page.clock.install();await page.clock.pauseAt(new Date());
  await page.evaluate(w=>{
   const a=MistakeryApp;clearTimeout(a.introTypingTimer);
   a.state=MistakeryRoute.startRun(a.deck,{seed:w.seed});a.runStartState=structuredClone(a.state);
   for(const s of w.steps.slice(0,-1)){
    if(a.state.currentCardId!==s.card||a.state.gameOver)throw Error('Invalid witness');
    a.state=MistakeryRoute.resolveChoice(a.deck,a.state,s.side).state;
   }
   a.view='playing';a.cardDelivery=null;a.locked=false;a.render();
  },witness);
  await page.clock.runFor(20000);
  assert.equal(await page.locator('.founder-card').count(),0);
  await page.locator(`[data-choice="${witness.steps.at(-1).side}"]`).click();await completeFounderSend(page,true);
  const end=await page.evaluate(()=>structuredClone(MistakeryApp.state));
  assert.equal(end.endingId,'run_complete');
  assert.deepEqual(await page.locator('[data-win-finale-choice]').allTextContents(),['Reveal']);
  assert.match(await page.locator('[data-win-finale]').textContent(),/highly personalized founder profile/);
  assert.equal(await page.locator('[data-founder-invitation] .message p').count(),3);
  if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'&&key==='flex') {
   fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
   await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,'profile-invitation.png')});
  }
  await page.locator('[data-win-finale-choice]').click();await page.clock.runFor(1500);
  assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),key);
  assert.equal(await page.locator('[data-scene]').isVisible(),false);
  assert.equal(await page.locator('.type-line strong').count(),0);
  assert.equal(await page.locator('.card-issuer').textContent(),'approved by @b2buddy • Mistakery Game');
  assert.deepEqual(await page.evaluate(()=>structuredClone(MistakeryApp.state)),end);
  for(const viewport of [{width:320,height:568},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   assert.equal(await page.evaluate(()=>{
    const c=document.querySelector('.founder-card').getBoundingClientRect();
    const line=document.querySelector('.type-line').getBoundingClientRect();
    const footer=document.querySelector('.card-issuer').getBoundingClientRect();
    const actions=document.querySelector('.founder-actions').getBoundingClientRect();
    return document.documentElement.scrollWidth<=innerWidth+1 && line.bottom<=footer.top && footer.bottom<c.bottom && actions.bottom<=innerHeight+1;
   }),true,`${key} ${viewport.width}: layout`);
   if(process.env.MISTAKERY_QA_DIR&&name==='Chromium'){
    fs.mkdirSync(process.env.MISTAKERY_QA_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`profile-${key}-${viewport.width}.png`)});
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('.founder-card').tap();
  assert.equal(await page.locator('.founder-card.is-shimmering').count(),1);
  await page.clock.runFor(2000);
  await page.locator('.founder-card').press('Enter');
  assert.equal(await page.locator('.founder-card.is-shimmering').count(),1);
  if(key==='flex') {
   const card=page.locator('.founder-card');
   const box=await card.boundingBox(), x=box.x+box.width*.3, y=box.y+box.height*.45;
   if(name==='Chromium') {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
    for(let n=1;n<=6;n++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+n*12,y:y+2,id:1}]});
    await page.clock.runFor(250);
    assert.notEqual(await card.evaluate(e=>e.style.getPropertyValue('--tilt-y')),'0.000deg');
    assert.ok(parseFloat(await card.evaluate(e=>e.style.getPropertyValue('--shine-x')))>40);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.equal(await card.evaluate(e=>e.classList.contains('is-shimmering')),false,'drag is not a tap');
   } else {
    await card.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:x,clientY:y});
    await card.dispatchEvent('pointermove',{pointerId:1,pointerType:'touch',isPrimary:true,clientX:x+72,clientY:y+2});
    await page.clock.runFor(250);
    assert.notEqual(await card.evaluate(e=>e.style.getPropertyValue('--tilt-y')),'0.000deg');
    await card.dispatchEvent('pointercancel',{pointerId:1,pointerType:'touch',isPrimary:true});
   }
   await page.clock.runFor(2500);
   assert.equal(await card.evaluate(e=>e.style.willChange),'');
   assert.equal(await card.evaluate(e=>e.style.getPropertyValue('--tilt-y')),'');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.founder-card').tap();
  assert.equal(await page.locator('.founder-card.is-shimmering').count(),0);
  assert.deepEqual(await page.locator('.founder-actions button').allTextContents(),['Back to 9–5','New run']);
  await page.clock.runFor(60000);await page.evaluate(()=>MistakeryApp.render());
  assert.equal(await page.locator('.founder-card').count(),1);
  assert.deepEqual(await page.evaluate(()=>structuredClone(MistakeryApp.state)),end);
  await page.locator('[data-profile-finish]').click();
  assert.equal(await page.locator('[data-quit-dialog][open]').count(),1);
  await page.locator('[data-quit-cancel]').click();
  assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),key);
  assert.deepEqual(await page.evaluate(()=>structuredClone(MistakeryApp.state)),end);
  assert.equal(await page.locator('[data-profile-finish]').evaluate(n=>n===document.activeElement),true);
  await page.locator('[data-profile-finish]').click();
  await page.locator('[data-quit-confirm]').click();
  assert.equal(await page.evaluate(()=>MistakeryApp.view),'title');
  assert.equal(await page.locator('[data-quit-dialog]').count(),0);
  await page.locator('[data-test-back]').click();
  assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),key);
  await page.locator('[data-profile-replay]').click();
  assert.equal(await page.locator('.founder-card').count(),0);
  const next=await page.evaluate(()=>structuredClone(MistakeryApp.state));
  assert.equal(next.gameOver,false);assert.equal(next.history.length,0);assert.notEqual(next.seed,end.seed);
  await page.locator('[data-test-back]').click();
  assert.equal(await page.locator('.founder-card').getAttribute('data-profile'),key);
  assert.equal(await page.locator('[data-profile-finish]').isEnabled(),true);
  assert.deepEqual(errors,[]);await page.close();
  const desktop=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  await desktop.goto(url+'?test=route');await desktop.waitForFunction(()=>window.MistakeryApp?.state);
  await desktop.evaluate(state=>{ const a=MistakeryApp;clearTimeout(a.introTypingTimer);a.state=state;a.view='playing';a.cardDelivery=null;a.render(); },end);
  await desktop.locator('[data-win-finale-choice]').click();
  assert.equal(await desktop.locator('.founder-card').getAttribute('data-profile'),key);
  assert.equal(await desktop.evaluate(()=>document.querySelector('.founder-actions').getBoundingClientRect().bottom<=innerHeight),true);
  if(process.env.MISTAKERY_QA_DIR&&name==='Chromium') await desktop.screenshot({path:path.join(process.env.MISTAKERY_QA_DIR,`profile-${key}-1280.png`)});
  await desktop.close();
 }
 }finally{await browser.close();}
});
