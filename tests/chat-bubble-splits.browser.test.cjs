const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium, webkit} = require('playwright');
const splits = require('./chat-bubble-splits.fixture.json');
const deck = require('../cards.json');
const {revealMessages,completeFounderSend} = require('./chat-delivery.fixture.cjs');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href + '?test=route';
const normalize = text => text.replace(/\s+/g, ' ').trim();
async function seed(page, id) {
 await page.evaluate(id => { const a=MistakeryApp; clearTimeout(a.introTypingTimer);
  a.state=MistakeryRoute.startRun(a.deck,{seed:'bubble-split'}); a.state.currentCardId=id;
  const filler=a.deck.cards.find(c=>c.id===id).filler;if(filler){a.state.route.phase='fillers';a.state.route.gap={target:5,played:[],usedUnit:filler.unit};a.state.route.usedUnits=[filler.unit];}
  a.state.resources={cash:50,team:50,customers:50,founder:50};a.influencerPreviousCardId='INFLUENCER_04';
  a.cardDelivery=null;a.view='playing';a.locked=false;a.render(); }, id);
}
for (const [name,type] of [['Chromium',chromium],['WebKit',webkit]]) {
 for (const width of [320,390]) test(`${name}/${width}: long messages become short bubbles without losing copy, authors or media`, async () => {
  const browser=await type.launch();try {
   const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   await page.waitForFunction(()=>MistakeryApp?.deck&&MistakeryApp.view!=='loading');
   for (const [id,breaks] of Object.entries(splits)) {
    await seed(page,id);const state=await page.evaluate(()=>JSON.stringify(MistakeryApp.state));await revealMessages(page);
    const card=deck.cards.find(c=>c.id===id);
    const original=card.messages ? card.messages.map(m=>({text:m.text||'',source:m.source,direction:m.direction,media:Boolean(m.image||m.imageRef||m.placeholder)})) : [...(card.image||card.placeholder?[{text:'',media:true}]:[]),...card.text.split('\n\n').map(text=>({text}))];
    const actual=await page.locator('[data-chat-current]').evaluateAll(ns=>ns.map(n=>{
     const ps=[...n.querySelectorAll('p')];return {origin:Number(n.dataset.messageOrigin),text:ps.map(p=>p.textContent).join('\n'),
      source:n.dataset.source,outgoing:n.matches('.self-message'),media:Boolean(n.matches('.image-bubble,.media-placeholder')||n.querySelector('.message-image')),
      lines:ps.reduce((sum,p)=>sum+p.getBoundingClientRect().height/parseFloat(getComputedStyle(p).lineHeight),0)};
    }));
    assert.equal(actual.length,original.length+Object.values(breaks).reduce((n,a)=>n+a.length,0),id+' has authored separate bubbles');
    for (let i=0;i<original.length;i++) {
     const parts=actual.filter(n=>n.origin===i);assert.ok(parts.length,id+' retains every original message');
     assert.equal(normalize(parts.map(p=>p.text).join(' ')),normalize(original[i].text),id+' copy remains exact');
     if (card.mode==='team')for(const part of parts){assert.equal(part.source,original[i].source);assert.equal(part.outgoing,original[i].direction==='outgoing');}
     assert.equal(parts.filter(p=>p.media).length,Number(Boolean(original[i].media)),id+' media stays singular');
     if(breaks[i])assert.ok(parts.every(p=>p.lines<=4.1),id+' avoids message walls on '+width);
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(MistakeryApp.state)),state,id+' presentation cannot mutate state');
    assert.equal(await page.locator('[data-choice]:disabled').count(),0);
    assert.ok(await page.locator('[data-choices]').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight+1));
    await page.evaluate(()=>MistakeryApp.render());await revealMessages(page);
    assert.equal(await page.locator('[data-chat-current]').count(),actual.length,id+' rerender is stable');
   }
   assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 });
 test(`${name}: split messages deliver sequentially and reactions keep their original meaning`, async () => {
  const browser=await type.launch();try{
   const page=await browser.newPage({viewport:{width:320,height:844}});await page.clock.install({time:new Date('2026-10-11T18:00:00Z')});await page.clock.pauseAt(new Date('2026-10-11T18:00:00Z'));await page.goto(url);
   await page.waitForFunction(()=>MistakeryApp?.deck&&MistakeryApp.view!=='loading');await seed(page,'INFLUENCER_02A');
   assert.equal(await page.locator('[data-chat-current]').count(),1);
   assert.ok(await page.locator('[data-choice]:disabled').count()>0);
   await page.clock.runFor(1099);assert.equal(await page.locator('[data-chat-current]').count(),1);
   await page.clock.runFor(1);assert.equal(await page.locator('[data-chat-current]').count(),2);
   await page.clock.runFor(4000);assert.equal(await page.locator('[data-chat-current]').count(),4);
   assert.equal(await page.locator('[data-choice]:disabled').count(),0);
   await page.locator('[data-choice=left]').click();await completeFounderSend(page,true);
   await page.locator('[data-test-back]').click();
   assert.equal(await page.locator('[data-chat-current]').count(),4,'Back restores split transcript without replay');
   assert.equal(await page.locator('.typing-bubble').count(),0);
   await page.evaluate(()=>MistakeryApp.render());assert.equal(await page.locator('[data-chat-current]').count(),4);
   await seed(page,'FILL_DOMAIN_1');await revealMessages(page);
   const imageWidth=await page.locator('[data-chat-current].image-bubble').evaluate(n=>n.getBoundingClientRect().width);
   await page.locator('[data-choice=right]').click();await completeFounderSend(page,true);
   assert.equal(await page.evaluate(()=>MistakeryApp.state.currentCardId),'FILL_DOMAIN_2');await revealMessages(page);
   assert.equal(await page.locator('[data-chat-history]').count(),4,'retain both original messages and all their fragments');
   assert.equal(await page.locator('[data-chat-history] img').count(),1,'context image survives continuation');
   const retained=await page.locator('[data-chat-history] p').allTextContents();
   assert.equal(normalize(retained.join(' ')),normalize(deck.cards.find(c=>c.id==='FILL_DOMAIN_1').text));
   assert.ok(Math.abs(await page.locator('[data-chat-history].image-bubble').evaluate(n=>n.getBoundingClientRect().width)-imageWidth)<1,'retained image keeps its established width');
   await page.evaluate(()=>MistakeryApp.render());assert.equal(await page.locator('[data-chat-history]').count(),4);
   await seed(page,'DREAM_TEAM');await page.clock.runFor(10000);
   const reactions=await page.locator('[data-chat-current]').evaluateAll(ns=>ns.filter(n=>n.querySelector('.message-reactions')).map(n=>({text:[...n.querySelectorAll('p')].map(p=>p.textContent).join(' '),emoji:[...n.querySelectorAll('.message-reaction-emoji')].map(n=>n.textContent)})));
   assert.equal(reactions.length,2);assert.ok(normalize(reactions[0].text).includes('first big client'));assert.deepEqual(reactions[0].emoji,['🎉']);
   assert.ok(normalize(reactions[1].text).includes('in 4K'));assert.deepEqual(reactions[1].emoji,['😂']);
  }finally{await browser.close();}
 });
}
