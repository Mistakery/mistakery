const test=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const deck=require('../cards.json');
const {mapping,ownerOverrides}=require('../scripts/source-audit-lib.cjs');
const {revealMessages}=require('./chat-delivery.fixture.cjs');
const url=process.env.MISTAKERY_TEST_URL||pathToFileURL(path.resolve(__dirname,'..','index.html')).href;
const ids=[...new Set(mapping.entries.map(e=>e.id))];
for(const [name,type]of [['Chromium',chromium],['WebKit',webkit]])test(`${name}: authored text, captions, speakers and replies survive rendering on every source-backed screen`,async()=>{
 const browser=await type.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${url}?test=route`);await page.waitForFunction(()=>window.MistakeryApp?.deck && window.MistakeryApp.view!=='loading');
  for(const id of ids){
   await page.evaluate(id=>{const a=window.MistakeryApp;clearTimeout(a.introTypingTimer);a.state=window.MistakeryRoute.startRun(a.deck,{seed:'source-audit'});a.state.currentCardId=id;a.state.resources={cash:50,team:50,customers:50,founder:50};a.influencerPreviousCardId='INFLUENCER_04';a.view='playing';a.locked=false;a.render();},id);
   await revealMessages(page);
   const card=deck.cards.find(c=>c.id===id);
   const text=[];
   if(card.image?.caption)text.push(card.image.caption);
   if(card.text)text.push(card.text);
   for(const m of card.messages||[]){if(m.image?.caption)text.push(m.image.caption);if(m.text)text.push(m.text);}
   const lines=text.flatMap(t=>t.split('\n').filter(Boolean));
   const actual=await page.locator('[data-chat] p').evaluateAll(ns=>ns.map(n=>n.textContent.replaceAll('\u00a0',' ')));
   assert.deepEqual(actual,lines,id);
   for(const side of ['left','right'])assert.equal((await page.locator(`[data-choice="${side}"]`).textContent()).replaceAll('\u00a0',' '),card.choices[side].label,`${id}.${side}`);
   if(card.mode==='team')assert.deepEqual(await page.locator('[data-chat] .team-row').evaluateAll(ns=>ns.map(n=>n.dataset.source)),card.messages.filter(m=>m.direction!=='outgoing').map(m=>m.source),`${id} speakers`);
   const grouping=ownerOverrides.bubbleCounts?.find(item=>item.id===id);
   if(grouping)assert.equal(await page.locator('[data-chat-current]').count(),grouping.textBubbles+Number(Boolean(card.image))+(card.messages||[]).filter(m=>m.image||m.imageRef).length,`${id}: original bubbles`);
   if(id==='LIVE_AGENT_OUTCOME_3'){
    assert.equal(await page.locator('[data-chat] .team-row').count(),0);
    assert.deepEqual(await page.locator('[data-forwarded-from]').evaluateAll(ns=>ns.map(n=>n.dataset.forwardedFrom)),['@b2buddy_120','@b2buddy_389']);
    assert.equal(await page.locator('[data-chat-current]').count(),3);
   }
   if(ownerOverrides.omitFields?.some(item=>item.id===id))assert.equal(await page.locator('[data-chat] .message-caption').count(),0,`${id}: no added title captions`);
   assert.ok(await page.locator('[data-choices]').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight+1),id);
  }
  for(const [id,previous]of [['INFLUENCER_05','INFLUENCER_06'],['INFLUENCER_06','INFLUENCER_05']]){
   await page.evaluate(({id,previous})=>{const a=window.MistakeryApp;a.state.currentCardId=id;a.influencerPreviousCardId=previous;a.render();},{id,previous});await revealMessages(page);
   for(const side of ['left','right'])assert.equal((await page.locator(`[data-choice="${side}"]`).textContent()).replaceAll('\u00a0',' '),deck.cards.find(c=>c.id===id).contextualChoices[previous][side].label);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
