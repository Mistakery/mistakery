const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
for (const [name, engine] of Object.entries({ Chromium: chromium, WebKit: webkit })) {
 test(`${name}: intro uses the existing b2buddy identity and Relaunch preserves both Saved screens`, async () => {
  const browser = await engine.launch();
  try {
   const page = await browser.newPage({viewport:{width:320,height:650}});
   await page.goto(url);
   await page.waitForFunction(()=>MistakeryApp?.view==='onboarding');
   await page.clock.install(); await page.clock.pauseAt(new Date());
   assert.equal(await page.locator('[data-sender]').innerText(),'@b2buddy');
   assert.equal(await page.locator('[data-status]').innerText(),'AI Agent');
   assert.match(await page.locator('[data-avatar] img').getAttribute('src'),/avatar-b2buddy.webp$/);
   assert.match(await page.locator('[data-message-avatar] img').getAttribute('src'),/avatar-b2buddy.webp$/);
   for(const label of ['So long, corporate jail!','Trust the process','Open the Masterplan']) {
    await page.clock.runFor(620); await page.getByRole('button',{name:label,exact:true}).click();
   }
   assert.equal(await page.locator('[data-restart-run]').innerText(),'Relaunch');
   await page.locator('[data-restart-run]').click();
   assert.equal(await page.locator('[data-card-id]').innerText(),'SAVED_01_PLAN');
   await page.getByRole('button',{name:'Right on track',exact:true}).click();
   assert.equal(await page.locator('[data-card-id]').innerText(),'SAVED_02_UPDATE');
   await page.clock.runFor(1000);
   await page.locator('[data-choice]').first().click();
   assert.equal(await page.evaluate(()=>MistakeryApp.view),'playing');
   assert.deepEqual(await page.evaluate(()=>MistakeryApp.state.resources),{cash:25,team:60,customers:15,founder:65});
  } finally {await browser.close();}
 });
}
for (const [name, engine] of Object.entries({ Chromium: chromium, WebKit: webkit })) {
 test(`${name}: authored outgoing types once and overdue Saved delivers once while delivery deadlines survive rerender`, async () => {
  const browser = await engine.launch();
  try {
   const page = await browser.newPage({viewport:{width:390,height:844}});
   await page.goto(`${url}?test=route`);
   await page.waitForFunction(()=>MistakeryApp?.view==='saved');
   await page.clock.install(); await page.clock.pauseAt(new Date());
   await page.locator('[data-choice]').first().click();
   await page.clock.setSystemTime(new Date(Date.now()+3000));
   await page.evaluate(()=>MistakeryApp.render());
   assert.equal(await page.locator('.note-message').count(),2);
   assert.equal(await page.locator('.note-message').last().evaluate(n=>n.getAnimations().length),0);
   assert.equal(await page.locator('.founder-composer').count(),0);
   await page.evaluate(()=>MistakeryApp.render());
   assert.equal(await page.locator('.note-message').last().evaluate(n=>n.getAnimations().length),0);
   await page.evaluate(()=>{
    const a=MistakeryApp; a.state.currentCardId='LIVE_AGENT_01'; a.view='playing'; a.cardDelivery=null; a.render();
   });
   assert.equal(await page.locator('.self-message').count(),0);
   assert.equal(await page.locator('.founder-composer i').count(),3);
   const deadline=await page.evaluate(()=>MistakeryApp.cardDelivery.deadline);
   await page.clock.runFor(100);
   await page.evaluate(()=>MistakeryApp.render());
   assert.equal(await page.locator('.self-message').count(),0);
   assert.equal(await page.evaluate(()=>MistakeryApp.cardDelivery.deadline),deadline);
  } finally {await browser.close();}
 });
}
for (const [name, engine] of Object.entries({ Chromium: chromium, WebKit: webkit })) {
 test(`${name}: small-screen Saved scrolls inside the chat without covering its contact`, async () => {
  const browser=await engine.launch();
  try {
   const page=await browser.newPage({viewport:{width:320,height:650}});
   await page.goto(`${url}?test=route`);await page.waitForFunction(()=>MistakeryApp?.view==='saved');
   await page.clock.install();await page.clock.pauseAt(new Date());
   await page.locator('[data-choice]').first().click();await page.clock.runFor(1000);
   const layout=await page.locator('[data-chat]').evaluate(chat=>({overflow:getComputedStyle(chat).overflowY,scroll:chat.scrollTop,height:chat.clientHeight,total:chat.scrollHeight,bottom:chat.querySelector('.note-message:last-child').offsetTop+chat.querySelector('.note-message:last-child').offsetHeight-chat.scrollTop}));
   assert.equal(layout.overflow,'auto','Saved must clip and scroll its long note');
   assert.ok(layout.total>layout.height && layout.scroll>0,'delivery follows the second note');
   assert.ok(layout.bottom<=layout.height+1,'new note is fully inside chat');
   await page.locator('[data-chat]').evaluate(n=>n.scrollTop=0);
   assert.equal(await page.locator('[data-chat]').evaluate(n=>n.scrollTop),0,'first note remains reachable');
  }finally{await browser.close();}
 });
}
