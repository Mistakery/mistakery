const test=require('node:test');const assert=require('node:assert/strict');const {chromium,webkit}=require('playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
for(const [name,type]of Object.entries({Chromium:chromium,WebKit:webkit}))for(const motion of ['no-preference','reduce'])test(`${name} ${motion}: founder dots precede Saved, authored outgoing and retained replies without extra charges`,async()=>{
 const browser=await type.launch();try{
 const page=await browser.newPage({viewport:{width:320,height:650},reducedMotion:motion});await page.goto(url+'?test=route');await page.waitForFunction(()=>MistakeryApp?.view==='saved');await page.clock.install();await page.clock.pauseAt(new Date());
 const dots=()=>page.locator('[aria-label="Founder is typing"]');
 assert.equal(await dots().count(),0);
 await page.locator('[data-choice]').first().click();assert.equal(await dots().locator('i').count(),3);assert.equal(await dots().innerText(),'');
 if(motion==='reduce')assert.equal(await dots().evaluate(n=>n.getAnimations({subtree:true}).length),0,'reduced motion uses static dots');
 await page.clock.runFor(600);await page.evaluate(()=>MistakeryApp.render());await page.clock.runFor(399);assert.equal(await dots().count(),1);
 await page.clock.runFor(1);assert.equal(await dots().count(),0);assert.equal(await page.locator('.note-message').count(),2);
 await page.evaluate(()=>{const a=MistakeryApp;a.state.currentCardId='LIVE_AGENT_01';a.cardDelivery=null;a.view='playing';a.render();});
 assert.equal(await page.locator('[data-chat-current]').count(),0);assert.equal(await dots().locator('i').count(),3);
 await page.clock.runFor(300);await page.evaluate(()=>MistakeryApp.render());await page.clock.runFor(349);assert.equal(await page.locator('[data-chat-current]').count(),0);
 await page.clock.runFor(1);assert.equal(await page.locator('[data-chat-current].self-message').count(),1);
 await page.locator('button.typing-bubble').press('Enter');
 const before=await page.evaluate(()=>structuredClone(MistakeryApp.state));await page.locator('[data-choice=left]').click();assert.equal(await dots().locator('i').count(),3);assert.equal(await page.locator('[data-sending-reply]').count(),0);
 await page.locator('[data-choice=right]').dispatchEvent('click');await page.clock.runFor(649);assert.deepEqual(await page.evaluate(()=>MistakeryApp.state),before);
 await page.clock.runFor(1);assert.equal(await dots().count(),0);await page.clock.runFor(200);
 assert.equal(await page.evaluate(()=>MistakeryApp.state.history.length),1);assert.equal(await page.evaluate(()=>MistakeryApp.state.resources.cash),24.5);
 await page.evaluate(()=>MistakeryApp.render());assert.equal(await dots().count(),0);
 }finally{await browser.close();}
});
