// Exhaustive coverage proof on a conservative domain of story paths.
// The original deck/route is read only. Resource-feasibility is NOT relaxed in
// production, and abstract combinations below are NOT claimed reachable runs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const checkout=path.resolve(__dirname,'..');
const deck=require(path.join(checkout,'cards.json')),route=require(path.join(checkout,'assets/route.js'));
const classifier=require('../assets/founder-profile.js');
const profile=history=>({type:classifier.classify(deck,history)});
const cards=new Map(deck.cards.map(c=>[c.id,c])),plots=Object.keys(deck.meta.route.plots);
const profileSource=fs.readFileSync(path.join(checkout,'assets/founder-profile.js'),'utf8').split('function main()')[0];
// Projection retains every literal card ID the profile implementation inspects.
// Keep contextual predecessors even though they are not scored themselves.
const relevant=new Set([...profileSource.matchAll(/'(LIVE_AGENT_\w+|INFLUENCER_\w+|IRL_PADEL_\w+)'/g)].map(x=>x[1]));
assert(relevant.has('INFLUENCER_04')&&relevant.has('INFLUENCER_06'));
for(const c of deck.cards)if(c.plot){assert(!c.filler);assert(!c.stateEffects);}
for(const c of deck.cards.filter(c=>c.filler))assert(!c.plot);
const h=(cardId,side)=>({cardId,side});
const checks={routeTransitions:0,positiveProbabilityBranches:0,zeroProbabilityBranchesExcluded:0,localWinnerCompleteness:0,localProjectionChecks:0,combinationOrders:0,noiseChecks:0,repeatChecks:0,randomCalls:0};
function draws(card,state,side){
 const choice=route.choicesFor(card,state)[side];
 if(choice.outcomeRoll){
  const roll=choice.outcomeRoll,score=state.route.liveAgentScore;
  const count=roll.count==='support'?(5+score)/2:(5-score)/2,p=roll.chances[count];
  assert(p>=0&&p<=1);if(p===0||p===1)checks.zeroProbabilityBranchesExcluded++;
  return [...(p>0?[[p/2]]:[]),...(p<1?[[(1+p)/2]]:[])];
 }
 if(['INFLUENCER_07','INFLUENCER_08'].includes(card.id))return [[.2],[.7]];
 if(card.id==='IRL_PADEL_06'){
  // Exact interval partition for every comparison in selectTarget:
  // .4, .5, .6. Boundary values have the same target as the interval to the right.
  return [.2,.45,.55,.8].flatMap(a=>[.2,.45,.55,.8].map(b=>[a,b]));
 }
 return [[.5]];
}
function independentVote(plot,history,outcome){
 const m=new Map(history.map(x=>[x.cardId,x.side]));
 if(plot==='live_agent'){
  assert(m.has('LIVE_AGENT_07B'));assert(m.get('LIVE_AGENT_07B')==='right'||m.has('LIVE_AGENT_08'));
  if(outcome==='LIVE_AGENT_OUTCOME_3'){assert.equal(m.get('LIVE_AGENT_08'),'right');return false;}
  assert.equal(outcome,'LIVE_AGENT_OUTCOME_1');
  if(m.has('LIVE_AGENT_08')){assert.equal(m.get('LIVE_AGENT_08'),'left');return true;}
  assert.equal(m.get('LIVE_AGENT_07B'),'right');return false;
 }
 if(plot==='influencer'){
  assert(['INFLUENCER_OUTCOME_2','INFLUENCER_OUTCOME_4','INFLUENCER_OUTCOME_6'].includes(outcome));
  return outcome==='INFLUENCER_OUTCOME_2';
 }
 const court=['IRL_PADEL_04','IRL_PADEL_05','IRL_PADEL_06'];
 for(const id of court)assert.equal(history.filter(x=>x.cardId===id).length,1);
 return court.filter(id=>m.get(id)==='left').length>=2;
}
function enumerate(plot){
 const leaves=[],winning=[],contexts=new Set();
 function walk(state,ancestors){
  const card=cards.get(state.currentCardId);assert.equal(card.plot,plot);
  if(card.outcomeTone){const history=state.history.map(x=>h(x.cardId,x.side));const row={outcome:card.id,history,tone:card.outcomeTone};leaves.push(row);
   if(card.outcomeTone==='success'){assert(!state.gameOver);row.vote=independentVote(plot,history,card.id);checks.localWinnerCompleteness++;winning.push(row);}return;}
  assert(!state.gameOver);assert(state.history.length<30);
  const context=JSON.stringify([card.id,state.route.influencerPreviousCardId,state.route.liveAgentScore,state.route.padelCeoScore]);
  assert(!ancestors.has(context),`Cycle: ${plot} ${context}`);contexts.add(context);const nextAncestors=new Set([...ancestors,context]);
  for(const side of ['left','right']){
   const successors=new Map();
   for(const values of draws(card,state,side)){let i=0;
    const next=route.resolveChoice(deck,state,side,{outcomeRng:()=>{assert(i<values.length);return values[i++];}}).state;
    checks.routeTransitions++;successors.set(next.currentCardId,next);
   }
   const allowed=route.choiceTargets(deck,state,card,side);for(const id of successors.keys())assert(allowed.includes(id));
   checks.positiveProbabilityBranches+=successors.size;
   for(const next of successors.values())walk(next,nextAncestors);
  }
 }
 walk(route.startRun(deck,{seed:1,firstPlot:plot}),new Set());
 const groups=new Map();for(const row of winning){
  const projected=row.history.filter(x=>relevant.has(x.cardId));const key=JSON.stringify(projected);
  if(!groups.has(key))groups.set(key,{projected,representative:row.history,vote:row.vote,multiplicity:0});
  const g=groups.get(key);assert.equal(g.vote,row.vote);g.multiplicity++;
 }
 return {leaves,winning,groups:[...groups.values()],contexts:contexts.size};
}
const permutations=xs=>xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];
function main(){
 const byPlot=Object.fromEntries(plots.map(p=>[p,enumerate(p)])),orders=permutations(plots);
 const base=Object.fromEntries(plots.map(p=>[p,byPlot[p].winning[0].history]));
 const noise=deck.cards.filter(c=>c.filler||c.outcomeTone).flatMap(c=>[h(c.id,'left'),h(c.id,'right')]);
 const counts={yes:0,flex:0,own:0,hard:0};
 const realRandom=Math.random,realNow=Date.now;
 Math.random=()=>{checks.randomCalls++;throw new Error('Classifier tried randomness');};
 Date.now=()=>{throw new Error('Classifier tried clock');};
 try{
  // Every enumerated local history must be equivalent to its projection in every order.
  for(const plot of plots)for(const row of byPlot[plot].winning)for(const order of orders){
   const full={...base,[plot]:row.history},short={...base,[plot]:row.history.filter(x=>relevant.has(x.cardId))};
   assert.deepEqual(profile(order.flatMap(p=>full[p])),profile(order.flatMap(p=>short[p])));checks.localProjectionChecks++;
  }
  for(const a of byPlot.live_agent.groups)for(const b of byPlot.influencer.groups)for(const c of byPlot.padel.groups){
   const combo={live_agent:a,influencer:b,padel:c},votes=plots.map(p=>combo[p].vote);
   const expected=['hard','own','flex','yes'][votes.filter(Boolean).length],multiplicity=a.multiplicity*b.multiplicity*c.multiplicity;
   let first=null;
   for(const order of orders){
    const full=order.flatMap(p=>combo[p].representative),projected=order.flatMap(p=>combo[p].projected);
    const actual=profile(full);assert.equal(actual.type,expected);
    assert.deepEqual(profile(projected),actual);
    assert.deepEqual(profile(full),actual);checks.repeatChecks++;
    assert.deepEqual(profile([...noise,...order.flatMap(p=>[...combo[p].representative,...noise])]),actual);checks.noiseChecks++;
    if(first)assert.deepEqual(actual,first);first=actual;
    checks.combinationOrders++;counts[expected]+=multiplicity;
   }
  }
 }finally{Math.random=realRandom;Date.now=realNow;}
 const product=plots.reduce((n,p)=>n*byPlot[p].winning.length,1)*orders.length;
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),product);assert.equal(checks.randomCalls,0);
 console.log('Coverage:',checks.combinationOrders,'story combinations/orders;', checks.localWinnerCompleteness,'local wins; no random calls.');
}
require('node:test')('all successful local story paths and orders have exactly the expected founder type',main);
