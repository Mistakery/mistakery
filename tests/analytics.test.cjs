const test=require('node:test'),assert=require('node:assert/strict');
const analytics=require('../assets/analytics.js');
const config={enabled:true,projectKey:'phc_test_public_key',apiHost:'https://eu.i.posthog.com',build:'test'};
function memory(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}
function setup(extra={}){const events=[],storage=extra.storage||memory();let n=0;const api=analytics.create({config,url:'https://html-classic.itch.zone/html/123/index.html',storage:()=>storage,send:(url,body)=>events.push({url,body}),id:()=>`id-${++n}`,now:()=>new Date('2026-10-19T09:00:00Z'),...extra});return {api,events,storage};}
const state=(turn=0)=>({history:Array.from({length:turn},()=>({})),currentCardId:'NEXT_CARD',gameOver:false,endingId:null,route:{completed:[]}});
test('disabled, unconfigured, QA, local, opt-out and privacy settings never touch storage or send',()=>{
 for(const extra of [{config:{}},{config:{...config,enabled:false}},{config:{...config,projectKey:'phx_private'}},{config:{...config,apiHost:'https://wrong.example'}},{disabled:true},{url:'http://localhost:8000/'},{url:'https://preview.pages.dev/'},{doNotTrack:true}]){
  let reads=0;const {api,events}=setup({...extra,storage:()=>{reads++;throw Error('must not access');}});
  api.open(false);api.start('r1',state(),'new_run');api.resume('r1',state());assert.equal(reads,0);assert.equal(events.length,0);
 }
 const storage=memory();storage.setItem('mistakery.analytics.opt-out','1');const {api,events}=setup({storage:()=>storage});api.open(false);assert.equal(events.length,0);
});
test('explicit events keep browser identity and attempt number across reload and start a separate next run',()=>{
 const storage=memory(),first=setup({storage:()=>storage});
 first.api.open(false);first.api.tap();first.api.start('run-1',state(),'intro');
 assert.deepEqual(first.events.map(x=>x.body.event),['game_opened','game_started','intro_completed','run_started']);
 const player=first.events[0].body.distinct_id;
 const second=setup({storage:()=>storage});second.api.open(true);second.api.restore('run-1',state(4));second.api.resume('run-1',state(4));second.api.start('run-2',state(),'new_run');
 assert.ok(second.events.every(x=>x.body.distinct_id===player));
 const begun=second.events.find(x=>x.body.event==='run_started').body;
 assert.equal(begun.properties.run_id,'run-2');assert.equal(begun.properties.attempt_number,2);
 assert.equal(second.events.filter(x=>x.body.event==='intro_completed').length,0);
 assert.equal(second.events.filter(x=>x.body.event==='run_started').length,1);
 assert.equal(begun.properties.$process_person_profile,false);assert.equal(begun.properties.$geoip_disable,true);
 assert.equal(second.events[0].url,'https://eu.i.posthog.com/i/v0/e/');
 assert.equal(JSON.stringify(second.events).includes('index.html'),false);
});
test('accepted choices, story results, endings and first CEO unlock emit once; rendering and restore cannot duplicate them',()=>{
 const {api,events,storage}=setup();api.start('run-1',state(),'intro');
 const before={wins:{live_agent:[{}],influencer:[{}]}},after={wins:{...before.wins,padel:[{}]}};
 const end={...state(10),gameOver:true,endingId:'run_complete',route:{completed:['live_agent','influencer','padel']}};
 const choice={card:{id:'PADEL_OUTCOME_4',plot:'padel',outcomeTone:'success'},side:'right',state:end,before,after,ceoType:'flex'};
 api.choice('run-1',choice);api.choice('run-1',choice);
 assert.deepEqual(events.slice(-4).map(x=>x.body.event),['choice_made','story_completed','run_ended','ceo_unlocked']);
 assert.equal(events.at(-3).body.properties.first_win,true);assert.equal(events.at(-1).body.properties.ceo_type,'flex');
 const restored=setup({storage:()=>storage});restored.api.restore('run-1',end);restored.api.choice('run-1',choice);assert.equal(restored.events.length,0);
 const rows=events.map(e=>e.body);assert.ok(rows.every(e=>e.uuid&&e.timestamp&&e.api_key===config.projectKey));
});
test('network/storage errors and malformed analytics data cannot throw into gameplay',async()=>{
 const broken={getItem:()=>'{invalid',setItem:()=>{throw Error('quota');}};
 const {api}=setup({storage:()=>broken,send:()=>Promise.reject(Error('offline'))});
 assert.doesNotThrow(()=>{api.open(false);api.start('r',state(),'new_run');api.choice('r',{card:{id:'A',plot:'live_agent'},side:'left',state:state(1),before:{wins:{}},after:{wins:{}}});});
 await new Promise(r=>setImmediate(r));
});
