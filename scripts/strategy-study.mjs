// Analysis only. Requires ignored pinned upstream modules; never changes the game.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createReferenceGame,referenceLegalActions,applyReferenceAction,recommendReference,referenceVisibleState,editReferenceRoom} from '../.local-source/modules/reference-rules.js';
const policies=['author','no-reroll','normal-only','normal-magic','any-reroll'];
const seeds=Number(process.argv[2]??200);
const cohort=process.argv[3]??'initial';
const output=process.argv[4]??'docs/strategy-results.json';
function select(state,policy){
  if(policy==='author')return recommendReference(state)[0]?.action;
  const legal=referenceLegalActions(state),v=referenceVisibleState(state);
  // Shared rules use visible information only: no RNG, concealed Code, or incident kind.
  if(v.pending.length)return legal[0]; // First offered reward, no item optimization.
  if(v.phase==='event')return legal.find(a=>a.accept)??legal[0];
  if(v.phase==='patrol'){
    const scored=legal.filter(a=>a.type==='visit').map(a=>{
      let score=v.rooms[a.room].status==='closed'?1:0;
      if(state.chain){ // Public active incident, not concealed future event.
        score=0;let cursor=v.position;
        do{cursor=(cursor+1)%16;if(v.rooms[cursor].status==='closed')score++;}while(cursor!==a.room);
        if(a.room===v.position)score=v.rooms[a.room].status==='closed'?1:0;
      }
      return {a,score};
    }).sort((a,b)=>b.score-a.score||a.a.room-b.a.room);
    return scored[0].a;
  }
  const eats=legal.filter(a=>a.type==='eat').sort((a,b)=>v.rooms[b.room].prisoner.tier-v.rooms[a.room].prisoner.tier||a.room-b.room||a.prey-b.prey);
  if(eats.length)return eats[0];
  const cap={'no-reroll':-1,'normal-only':0,'normal-magic':1,'any-reroll':4}[policy];
  const swaps=legal.filter(a=>a.type==='reroll'&&v.rooms[a.room].prisoner.tier<=cap)
    .sort((a,b)=>v.rooms[a.room].prisoner.tier-v.rooms[b.room].prisoner.tier||a.room-b.room);
  return swaps[0]??legal.find(a=>a.type==='end');
}
function play(seed,policy){
  let s=createReferenceGame(seed),steps=0,swaps=0,ultimateLost=0;
  while(!['riot','finished'].includes(s.phase)){
    assert.ok(++steps<1000,'Unexpected action loop');
    const a=select(s,policy);assert.ok(a);
    if(a.type==='reroll'){swaps++;if(s.rooms[a.room].prisoner.tier===4)ultimateLost++;}
    s=applyReferenceAction(s,a);
  }
  return {seed,policy,chromatic:s.rainbow.length,ultimate:s.rooms.filter(r=>r.prisoner?.tier===4).length,goal:s.goalIndex,steps,swaps,ultimateLost,tool:s.tools[0]??null};
}
const rows=[];
for(let i=0;i<seeds;i++){
  for(const p of policies)rows.push(play(`talos-strategy-20261012-${cohort==='initial'?'':cohort+'-'}${i}`,p));
  if((i+1)%25===0)console.log(`Completed ${i+1}/${seeds} seed sets`);
}
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const summaries=policies.map(policy=>{
  const a=rows.filter(r=>r.policy===policy),c=a.map(r=>r.chromatic).sort((x,y)=>x-y);
  return {policy,runs:a.length,meanChromatic:mean(c),medianChromatic:(c[Math.floor((c.length-1)/2)]+c[Math.ceil((c.length-1)/2)])/2,zeroChromatic:a.filter(r=>!r.chromatic).length,meanUltimate:mean(a.map(r=>r.ultimate)),goalRate:mean(a.map(r=>r.goal)),meanSwaps:mean(a.map(r=>r.swaps)),ultimateRerolls:a.reduce((n,r)=>n+r.ultimateLost,0),maxChromatic:c.at(-1)};
});
const paired=policies.filter(p=>p!=='normal-magic').map(policy=>{
  const d=Array.from({length:seeds},(_,i)=>rows[i*policies.length+3].chromatic-rows[i*policies.length+policies.indexOf(policy)].chromatic);
  const average=mean(d),se=Math.sqrt(d.reduce((n,v)=>n+(v-average)**2,0)/(d.length-1)/d.length);
  return {comparison:`normal-magic minus ${policy}`,mean:average,approx95CI:[average-1.96*se,average+1.96*se],wins:d.filter(v=>v>0).length,ties:d.filter(v=>v===0).length,losses:d.filter(v=>v<0).length};
});
// Minimal visible-board reproduction of the screenshot, not its full save.
let demo=createReferenceGame('screenshot-visible-reproduction');
demo=editReferenceRoom(demo,1,'lion',4);
demo=applyReferenceAction(demo,referenceLegalActions(demo)[0]);
demo=editReferenceRoom(demo,6,'elephant',2);demo=editReferenceRoom(demo,9,'elephant',1);
demo.phase='manage';
const recommendation=recommendReference(demo);
assert.deepEqual(recommendation[0].action,{type:'reroll',room:1});
const result={date:'2026-10-12',upstreamRevision:'bf4397331eae2e683268c508906c9aec38f69d1a',version:'0.6.14',mode:'Normal / Management Practice',config:'Unmodified DEFAULT_CONFIG',cohort,seeds,policies,summaries,paired,reproduction:{scope:'Only three visible inmates reconstructed; not the screenshot save, tool/history/day/hidden rooms not reproduced',recommendation},rows};
await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({summaries,paired,reproduction:recommendation.map(r=>({action:r.action,score:r.score}))},null,2));
