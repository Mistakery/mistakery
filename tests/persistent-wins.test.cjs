const test=require('node:test'),assert=require('node:assert/strict');
const deck=require('../cards.json'),route=require('../assets/route.js'),profile=require('../assets/founder-profile.js');
const fixtures=require('./founder-profile.fixture.json');
function finished(w){let s=route.startRun(deck,{seed:w.seed});for(const x of w.steps)s=route.resolveChoice(deck,s,x.side).state;return s;}
function story(state,plot){return {...state,history:state.history.filter(s=>deck.cards.find(c=>c.id===s.cardId)?.plot===plot)};}
test('three distinct first victories accumulate across attempts and later wins cannot change the CEO',()=>{
 let progress=profile.emptyProgress();const first=finished(fixtures.flex),later=finished(fixtures.hard);
 for(const [i,plot]of ['live_agent','padel','influencer'].entries()){
  progress=profile.collectWins(deck,progress,story(first,plot));
  assert.equal(Object.keys(progress.wins).length,i+1);
  const original=structuredClone(progress);
  progress=profile.collectWins(deck,progress,story(later,plot));assert.deepEqual(progress,original);
  progress=profile.collectWins(deck,progress,route.nextRun(deck,first));assert.deepEqual(progress,original);
  assert.equal(Boolean(profile.earnedReward(deck,progress)),i===2);
 }
 assert.equal(profile.earnedReward(deck,progress).type,'flex');
 const before=structuredClone(progress);profile.earnedReward(deck,progress);assert.deepEqual(progress,before);
});
test('a displayed win is not earned until acknowledged; setbacks never count and loss cannot erase wins',()=>{
 const first=finished(fixtures.flex),plot='live_agent';const s=story(first,plot),last=s.history.pop();
 let p=profile.collectWins(deck,profile.emptyProgress(),s);assert.deepEqual(Object.keys(p.wins),[]);
 s.history.push(last);p=profile.collectWins(deck,p,s);assert.equal(Object.keys(p.wins).length,1);
 for(const w of Object.values(require('./run-completion.fixture.json'))){
  const state=finished(w),next=profile.collectWins(deck,p,state);
  const cards=new Map(deck.cards.map(c=>[c.id,c]));
  for(const name of Object.keys(next.wins))assert.equal(cards.get(next.wins[name].at(-1).cardId).outcomeTone,'success');
  assert.deepEqual(next.wins.live_agent,p.wins.live_agent);
 }
 const dead={...route.nextRun(deck,first),gameOver:true,endingId:'cash_low'};
 assert.deepEqual(profile.collectWins(deck,p,dead),p);
});
module.exports={finished,story};
