const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium, webkit} = require('playwright');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?story=live-agent';
for (const [name, engine] of [['Chromium',chromium],['WebKit',webkit]]) {
 test(`${name}: dramatic reading beats survive rerender and reactions without advancing the next author`, async () => {
  const browser=await engine.launch();try {
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const time=new Date('2026-10-12T08:00:00Z');await page.clock.install({time});await page.clock.pauseAt(time);await page.goto(url);
   await page.waitForFunction(()=>window.MistakeryApp?.view === 'playing');
   await page.evaluate(()=>{const a=MistakeryApp;clearTimeout(a.introTypingTimer);a.state=MistakeryRoute.startRun(a.deck,{seed:'dramatic'});a.state.currentCardId='DREAM_TEAM';a.cardDelivery=null;a.locked=false;a.view='playing';a.render();});
   const state=await page.evaluate(()=>JSON.stringify(MistakeryApp.state));
   await page.clock.runFor(650);
   assert.equal(await page.locator('[data-chat-current]').count(),1);
   await page.clock.runFor(1000);
   assert.equal(await page.locator('.message-reaction:not([data-pending])').count(),1,'reaction has its own delay');
   assert.equal(await page.locator('[data-chat-current]').count(),1,'leave the announcement on screen for a dramatic beat');
   const deadline=await page.evaluate(()=>MistakeryApp.cardDelivery.deadline);
   await page.evaluate(()=>MistakeryApp.render());
   assert.equal(await page.evaluate(()=>MistakeryApp.cardDelivery.deadline),deadline,'rerender does not restart the pause');
   await page.clock.runFor(1199);assert.equal(await page.locator('[data-chat-current]').count(),1);
   await page.clock.runFor(1);assert.equal(await page.locator('[data-chat-current]').count(),2);
   await page.clock.runFor(1099);assert.equal(await page.locator('[data-chat-current]').count(),2,'same-author fragment gets real reading room');
   await page.clock.runFor(1);assert.equal(await page.locator('[data-chat-current]').count(),3);
   await page.clock.runFor(1100);assert.equal(await page.locator('[data-chat-current]').count(),4);
   await page.clock.runFor(1799);assert.equal(await page.locator('[data-chat-current]').count(),4,'new author gets a longer beat');
   await page.clock.runFor(1);assert.equal(await page.locator('[data-chat-current]').count(),5);
   assert.equal(await page.locator('[data-choice]:disabled').count(),0);
   assert.equal(await page.evaluate(()=>JSON.stringify(MistakeryApp.state)),state);
  }finally{await browser.close();}
 });
}
