const deck=require('../cards.json'),route=require('../assets/route.js');
const fixtures=require('./founder-profile.fixture.json');
const cards=new Map(deck.cards.map(c=>[c.id,c]));
// Find a real seeded first-story victory with the chosen decisions, without changing resources or rolls.
function firstVictory(plot,type='flex'){
 const steps=fixtures[type].steps.filter(s=>cards.get(s.card).plot===plot);
 for(let seed=0;seed<10000;seed++){
  let state=route.startRun(deck,{seed});if(state.route.initialPlot!==plot)continue;
  let ok=true;
  for(const step of steps){
   if(state.gameOver||state.currentCardId!==step.card){ok=false;break;}
   state=route.resolveChoice(deck,state,step.side).state;
  }
  if(ok&&!state.gameOver&&cards.get(state.history.at(-1).cardId).outcomeTone==='success')return {seed,steps};
 }
 throw Error('No seeded witness for '+plot);
}
module.exports={firstVictory};
