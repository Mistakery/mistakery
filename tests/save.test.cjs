const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const deck = require('../cards.json');
const route = require('../assets/route.js');
const modulePath = path.join(__dirname, '../assets/save.js');
const save = () => { assert.ok(fs.existsSync(modulePath), 'Missing local save module'); return require(modulePath); };
function memory() {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}
function checkpoint(state = route.startRun(deck, {seed:14}), presentation = {}) {
  return { state, presentation: { winCardId:null, profileRevealed:false, summaryShown:false, lossSide:null, ...presentation } };
}
test('checkpoint preserves complete state, signed episode ledger and next seeded choice', () => {
  const api=save(), storage=memory(), store=api.create({storage:()=>storage, deck});
  assert.equal(store.load().status,'empty');
  let state=route.startRun(deck,{seed:14});
  state=route.resolveChoice(deck,state,'left').state;
  state.route.resourceLedger.cash=-4.5;
  assert.equal(store.write(checkpoint(state)).status,'saved');
  const restored=api.create({storage:()=>storage,deck}).load();
  assert.equal(restored.status,'saved');assert.deepEqual(restored.data.state,state);
  for(const side of ['left','right'])assert.deepEqual(route.resolveChoice(deck,restored.data.state,side),route.resolveChoice(deck,state,side));
});
test('invalid and incompatible saves remain untouched until explicit replacement', () => {
  const api=save(), storage=memory();
  for(const raw of ['{bad',JSON.stringify({schemaVersion:99}),JSON.stringify({schemaVersion:1,rulesVersion:'future'})]){
    storage.setItem(api.KEY,raw);
    const store=api.create({storage:()=>storage,deck});
    assert.ok(['invalid','incompatible'].includes(store.load().status));
    assert.equal(store.write(checkpoint()).status,'protected');
    assert.equal(storage.getItem(api.KEY),raw);
    assert.equal(store.write(checkpoint(),{replace:true}).status,'saved');
  }
});
test('reject unknown cards, missing route fields, invalid presentation and malformed accounting', () => {
  const api=save(),storage=memory(),store=api.create({storage:()=>storage,deck});store.load();
  store.write(checkpoint());const good=storage.getItem(api.KEY);
  for(const mutate of [s=>s.state.currentCardId='NOT_A_CARD',s=>delete s.state.route.completed,
    s=>s.state.resources.cash='25',s=>s.state.route.randomState=-1,
    s=>s.presentation.profileRevealed=true,s=>s.presentation.winCardId='LIVE_AGENT_01',
    s=>s.presentation.lossSide='left',s=>delete s.state.history]){
    const broken=JSON.parse(good);mutate(broken);storage.setItem(api.KEY,JSON.stringify(broken));
    assert.equal(api.create({storage:()=>storage,deck}).load().status,'invalid');
  }
});
test('read/write denial does not throw or delete an older checkpoint', () => {
  const api=save();
  const denied=api.create({deck,storage:()=>{throw new Error('SecurityError');}});
  assert.equal(denied.load().status,'unavailable');assert.equal(denied.write(checkpoint()).status,'unavailable');
  const storage=memory(),store=api.create({deck,storage:()=>storage});store.load();store.write(checkpoint());
  const before=storage.getItem(api.KEY);storage.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.equal(store.write(checkpoint(route.startRun(deck,{seed:42}))).status,'unavailable');
  assert.equal(storage.getItem(api.KEY),before);
});
test('stale tabs cannot overwrite a newer checkpoint, even on New run', () => {
  const api=save(),storage=memory(),a=api.create({deck,storage:()=>storage}),b=api.create({deck,storage:()=>storage});
  a.load();a.write(checkpoint());b.load();
  a.write(checkpoint(route.startRun(deck,{seed:77})),{replace:true});const latest=storage.getItem(api.KEY);
  assert.equal(b.write(checkpoint(),{replace:true}).status,'conflict');assert.equal(storage.getItem(api.KEY),latest);
});
test('QA storage is disabled without accessing player data', () => {
  const api=save(),store=api.create({deck,disabled:true,storage:()=>{throw new Error('must not access storage');}});
  assert.equal(store.load().status,'disabled');assert.equal(store.write(checkpoint()).status,'disabled');
});
test('completed routes preserve pending congratulations and revealed founder rewards', () => {
  const api=save();
  for(const witness of Object.values(require('./founder-profile.fixture.json'))){
    let state=route.startRun(deck,{seed:witness.seed});
    for(const step of witness.steps)state=route.resolveChoice(deck,state,step.side).state;
    const storage=memory(),store=api.create({deck,storage:()=>storage});store.load();
    assert.equal(store.write(checkpoint(state,{winCardId:state.history.at(-1).cardId})).status,'saved');
    assert.equal(store.write(checkpoint(state,{profileRevealed:true})).status,'saved');
    assert.deepEqual(api.create({deck,storage:()=>storage}).load().data.state,state);
  }
});

test('reject broken continuation data and missing contextual choice history', () => {
  const api=save(), storage=memory(), store=api.create({deck,storage:()=>storage});
  const w=require('./founder-profile.fixture.json').flex;
  let state=route.startRun(deck,{seed:w.seed});
  for(const step of w.steps){if(state.currentCardId==='INFLUENCER_05')break;state=route.resolveChoice(deck,state,step.side).state;}
  assert.equal(state.currentCardId,'INFLUENCER_05');
  assert.equal(store.write(checkpoint(state)).status,'saved');
  const good=storage.getItem(api.KEY);
  for(const mutate of [s=>s.state.route.influencerPreviousCardId=null,s=>s.state.pendingContinuation={}]){
    const broken=JSON.parse(good);mutate(broken);const raw=JSON.stringify(broken);storage.setItem(api.KEY,raw);
    assert.equal(api.create({deck,storage:()=>storage}).load().status,'invalid');
    assert.equal(storage.getItem(api.KEY),raw);
  }
});
test('real route checkpoints across seeds remain valid at every decision and ending', () => {
  const api=save();
  for(let seed=0;seed<64;seed++){
    const storage=memory(),store=api.create({deck,storage:()=>storage});
    let state=route.startRun(deck,{seed});
    while(true){
      assert.equal(store.write(checkpoint(state)).status,'saved',`${seed}: ${state.currentCardId}`);
      const restored=api.create({deck,storage:()=>storage}).load();
      assert.equal(restored.status,'saved');assert.deepEqual(restored.data.state,state);
      if(state.gameOver)break;
      const side=(state.turn+seed)%2?'left':'right';
      const next=route.resolveChoice(deck,state,side).state;
      assert.deepEqual(route.resolveChoice(deck,restored.data.state,side).state,next);
      state=next;
    }
  }
});

test('legacy saves migrate only real wins and remove the incorrect survivor-only reward', () => {
  const api=save();
  for(const w of Object.values(require('./run-completion.fixture.json'))){
    let state=route.startRun(deck,{seed:w.seed});for(const step of w.steps)state=route.resolveChoice(deck,state,step.side).state;
    const storage=memory(),store=api.create({deck,storage:()=>storage});
    assert.equal(store.write(checkpoint(state)).status,'saved');
    const old=JSON.parse(storage.getItem(api.KEY));old.schemaVersion=1;delete old.progress;
    old.presentation={winCardId:null,profileRevealed:true,summaryShown:true,lossSide:null};
    const raw=JSON.stringify(old);storage.setItem(api.KEY,raw);
    const restored=api.create({deck,storage:()=>storage}).load();
    assert.equal(restored.status,'saved');assert.equal(restored.data.presentation.summaryShown,false);
    assert.equal(restored.data.presentation.profileRevealed,false);
    assert.equal(restored.data.schemaVersion,2);assert.ok(Object.keys(restored.data.progress.wins).length<3);
    assert.deepEqual(restored.data.state,state);assert.equal(storage.getItem(api.KEY),raw);
  }
});
test('New run, reload and failed writes preserve first victories and validate stored progress',()=>{
 const api=save(),storage=memory(),store=api.create({deck,storage:()=>storage});
 const w=require('./founder-profile.fixture.json').flex;let state=route.startRun(deck,{seed:w.seed});
 for(const step of w.steps)state=route.resolveChoice(deck,state,step.side).state;
 assert.equal(store.write(checkpoint(state)).status,'saved');const progress=JSON.parse(storage.getItem(api.KEY)).progress;
 assert.equal(Object.keys(progress.wins).length,3);
 assert.equal(store.write(checkpoint(route.nextRun(deck,state)),{replace:true}).status,'saved');
 assert.deepEqual(api.create({deck,storage:()=>storage}).load().data.progress,progress);
 const good=storage.getItem(api.KEY);
 for(const mutate of [p=>p.wins.padel[0].cardId='BAD',p=>p.wins.live_agent.at(-1).side='BAD',p=>p.wins.other=[],p=>p.wins.padel.pop()]){
  const broken=JSON.parse(good);mutate(broken.progress);storage.setItem(api.KEY,JSON.stringify(broken));
  assert.equal(api.create({deck,storage:()=>storage}).load().status,'invalid');
 }
 storage.setItem(api.KEY,good);storage.setItem=()=>{throw new Error('quota');};
 assert.equal(store.write(checkpoint(route.startRun(deck,{seed:42})),{replace:true}).status,'unavailable');
 assert.equal(storage.getItem(api.KEY),good);
});
