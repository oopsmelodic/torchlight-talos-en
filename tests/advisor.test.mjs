import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {projectAdvisorState,advise} from '../src/advisor.mjs';
import {advisorMessage,advisorActionLabel} from '../src/advisor-text.mjs';
import {installAdvisor,advisorControls} from '../src/advisor-ui.mjs';

function fixture(inmates=[]){
  const current={day:11,revision:0,phase:'manage',position:0,rerolls:0,goalIndex:1,chain:false,rainbow:[],tools:['saw'],destinations:[0,1,2],pending:[],
    config:{days:20,rarityWeights:[52,27,15,6,0,0],codeWeights:[1,1,1,1],rerollsPerDay:1,muzzleTiming:'before',fireEligibility:'before',rainbowCountsForMuzzle:false,circularNeighbors:true,wineChangesCode:false,nestDays:2,nestTier:2,referenceParameters:{scratchBaseGainIncluded:true,tuskIncludeReplaced:true,executionChangesCode:false}},
    reference:{version:'public-preview-v3',prey:[]},
    rooms:Array.from({length:16},(_,id)=>({id,status:'closed',prisoner:null,event:null,nest:null,reference:{hidden:null,revealedTier:null,tusk:false,scratch:false}}))};
  for(const [id,code,tier]of inmates)Object.assign(current.rooms[id],{status:'open',prisoner:{id:`p${id+1}`,code,tier}});
  return {schema:'ss14.prison.export.v1',current};
}
const ranked=p=>advise(projectAdvisorState(p));
const find=(result,type,room)=>result.candidates.find(r=>r.action.type===type&&(room===undefined||r.action.room===room));

test('bottom controls restrict actors and next-Consume chance to the current eater',()=>{
  const p=fixture([[2,'elephant',3],[4,'elephant',1],[6,'elephant',2],[10,'elephant',2],[12,'lion',1]]);p.current.tools=[];
  const v=projectAdvisorState(p);
  const lion=advise(v,{actor:12,types:['reroll','end']});
  assert.ok(lion.candidates.every(c=>c.action.type==='end'||c.action.room===12));
  assert.ok(!lion.candidates.some(c=>c.action.type==='eat'));
  const mammoth=advise(v,{actor:4,types:['eat','reroll','end']});
  assert.equal(find(mammoth,'eat').reasons.find(m=>m.key==='followupLocal').args.pairs,.25);
  assert.deepEqual(advise(v,{actor:4,types:['end']}).candidates.map(c=>c.action),[{type:'end'}]);
});

test('Day 6 regression: grow the Magic pair, then seek a Rare chain; tied replacements use cell order',()=>{
  const p=fixture([[2,'elephant',3],[4,'elephant',1],[6,'elephant',2],[10,'elephant',2],[12,'lion',1]]);
  p.current.tools=[];p.current.day=6;const before=JSON.stringify(p),r=ranked(p);
  assert.deepEqual(r.candidates[0].action,{type:'eat',room:4,prey:12});
  assert.equal(r.candidates[0].score,2.25);
  assert.deepEqual(r.candidates[0].reasons.find(m=>m.key==='followup').args,{pairs:.75,rooms:[7,11]});
  assert.deepEqual(r.candidates.filter(c=>c.action.type==='reroll').slice(0,2).map(c=>c.action.room),[4,12]);
  assert.equal(JSON.stringify(p),before);
});
test('follow-up excludes the consumed target and Chromatic; respects Code weights and Saw outcomes',()=>{
  const p=fixture([[0,'elephant',1],[1,'lion',1],[2,'elephant',2]]);p.current.tools=[];
  const chance=()=>find(ranked(p),'eat',0).reasons.find(m=>m.key==='followup').args.pairs;
  p.current.config.codeWeights=[1,0,0,0];assert.equal(chance(),0);
  p.current.config.codeWeights=[0,0,0,1];assert.equal(chance(),1);
  p.current.tools=['saw'];assert.equal(chance(),.75);
  p.current.rooms[2].prisoner=null;p.current.rooms[2].status='closed';assert.equal(chance(),0);
  p.current.rooms[0].prisoner.tier=4;p.current.rooms[1].prisoner.tier=4;assert.equal(chance(),0);
});

test('screenshot regression: protects Ultimate lion and prefers Magic replacement',()=>{
  const p=fixture([[1,'lion',4],[6,'elephant',2],[9,'elephant',1]]),before=JSON.stringify(p),r=ranked(p);
  assert.deepEqual(r.candidates[0].action,{type:'reroll',room:9});
  const odds=find(r,'reroll',9).reasons.find(r=>r.key==='replaceOdds').args;
  assert.ok(Math.abs(odds.down-.52)<1e-10);assert.ok(Math.abs(odds.pairs-.1125)<1e-10);
  assert.match(advisorMessage('replaceOdds',odds,'ru'),/11\.25%/);
  assert.deepEqual(r.candidates[0].reasons.find(r=>r.key==='keepHigher').args.rooms,[2,7]);
  assert.ok(find(r,'reroll',1).score<find(r,'end').score);
  assert.equal(JSON.stringify(p),before);
});
test('hidden prisoner, RNG, seed and unopened incident kind never enter the decision',()=>{
  const a=fixture([[0,'wolf',1]]),b=structuredClone(a);
  a.current.rooms[1].event='chain';b.current.rooms[1].event='execution';
  a.current.rooms[1].reference.hidden={code:'rat',tier:0};b.current.rooms[1].reference.hidden={code:'lion',tier:4};
  a.current.seed='a';b.current.seed='b';a.current.rng=1;b.current.rng=98765;b.current.log=['future reward'];
  assert.deepEqual(projectAdvisorState(a),projectAdvisorState(b));assert.deepEqual(ranked(a),ranked(b));
  assert.doesNotMatch(JSON.stringify(projectAdvisorState(a)),/rng|seed|hidden|future reward/);
});
test('saw forecast and muzzle before/after counts are respected',()=>{
  const p=fixture([[0,'lion',2],[1,'wolf',2],[2,'rat',0],[3,'elephant',0]]);
  p.current.tools=['saw','muzzle'];
  let rec=find(ranked(p),'eat',0),d=rec.reasons.find(r=>r.key==='growth').args.distribution;
  assert.deepEqual(d,[{tier:3,chance:.75},{tier:4,chance:.25}]);
  p.current.config.muzzleTiming='after';rec=find(ranked(p),'eat',0);
  assert.deepEqual(rec.reasons.find(r=>r.key==='growth').args.distribution,[{tier:5,chance:1}]);
});
test('Scratch consumes require revealed matching rarity, Rat Necklace expands rat pairings',()=>{
  const p=fixture([[0,'wolf',1]]);p.current.tools=[];
  p.current.rooms[1].reference={scratch:true,revealedTier:1,hidden:{code:'elephant',tier:1}};
  let r=ranked(p);assert.equal(r.candidates[0].action.type,'eat');
  assert.deepEqual(find(r,'eat').reasons.find(r=>r.key==='growth').args.distribution,[{tier:4,chance:1}]);
  p.current.rooms[1].reference.revealedTier=null;assert.equal(find(ranked(p),'eat'),undefined);
  const rats=fixture([[0,'rat',2],[1,'rat',2]]);assert.equal(find(ranked(rats),'eat'),undefined);
  rats.current.tools=['rathead'];assert.equal(ranked(rats).candidates[0].action.type,'eat');
});
test('Rope and Stake use configured replacement distributions; no weighted pool means no replace',()=>{
  const p=fixture([[0,'elephant',2]]);p.current.tools=['rope'];
  assert.equal(ranked(p).candidates[0].action.type,'reroll');
  assert.equal(find(ranked(p),'reroll').reasons[0].args.down,0);
  p.current.config.rarityWeights=[100,0,0,0,0,0];assert.equal(find(ranked(p),'reroll'),undefined);
  p.current.tools=['fire'];p.current.config.fireEligibility='before';
  assert.ok(Math.abs(find(ranked(p),'reroll').reasons[0].args.down-.6)<1e-10);
});
test('a Prey bond is accounted for and high-tier-only boards can end safely',()=>{
  const p=fixture([[0,'lion',0],[1,'wolf',0]]);p.current.tools=[];
  p.current.reference.prey=[{lionId:'p1',preyId:'p2',remaining:3}];
  const r=ranked(p);assert.equal(r.candidates[0].action.type,'end');assert.ok(find(r,'eat').risks.some(r=>r.key==='breakPrey'));
  const high=fixture([[0,'lion',4]]);assert.equal(ranked(high).candidates[0].action.type,'end');
});
test('Chain prefers more closed cells, final-day Chain is not valued as a future opening',()=>{
  const p=fixture();p.current.phase='patrol';p.current.chain=true;p.current.position=0;p.current.destinations=[2,10];
  assert.equal(ranked(p).candidates[0].action.room,10);
  p.current.phase='event';p.current.day=20;p.current.event={kind:'chain',room:0};
  assert.deepEqual(ranked(p).candidates[0].action,{type:'event',accept:false});
});
test('Execution uses only pre-growth, strictly lower-tier victims and can reject a wasteful execution',()=>{
  const p=fixture([[0,'lion',4],[1,'wolf',3],[2,'wolf',3],[3,'rat',3],[4,'rat',3],[5,'wolf',4]]);
  p.current.phase='event';p.current.event={kind:'execution',room:0,actorId:'p1'};
  const r=ranked(p),accept=r.candidates.find(r=>r.action.accept);
  assert.equal(accept.reasons[0].args.count,4);assert.equal(accept.reasons[0].args.to,5);
  assert.deepEqual(r.candidates[0].action,{type:'event',accept:false});
});
test('gift advice recognizes that Code changes cannot fix different rarities',()=>{
  const p=fixture([[1,'lion',4],[6,'elephant',2],[9,'elephant',1]]);
  p.current.pending=[{kind:'gift',options:['brand','horn','ring','wine']}];
  const r=ranked(p);assert.equal(r.candidates[0].action.id,'ring');
  assert.equal(r.candidates.find(r=>r.action.id==='brand').reasons[0].args.count,0);
  assert.equal(r.candidates.find(r=>r.action.id==='horn').reasons[0].args.count,0);
});
test('malformed/unknown saves fail closed; every emitted explanation renders in EN and RU',()=>{
  const p=fixture();p.current.config.codeWeights=[0,0,0,0];assert.throws(()=>projectAdvisorState(p),/invalid/);
  const old=fixture();old.current.reference.version='public-preview-v2';assert.throws(()=>projectAdvisorState(old),/unsupported/);
  for(const kind of ['tool','gift']){
    const f=fixture([[0,'rat',1],[1,'rat',1]]);f.current.pending=[{kind,options:kind==='tool'?['revenge','muzzle','saw','keys','rope','fire','nest','rathead']:['ring','horn','wine','brand']}];
    for(const r of ranked(f).candidates)for(const lang of ['en','ru']){
      assert.ok(advisorActionLabel(r.action,lang));for(const m of [...r.reasons,...r.risks])assert.doesNotMatch(advisorMessage(m.key,m.args,lang),/undefined|\{\w+\}/);
    }
  }
});
function renderBoard(doc,p){
  doc.querySelector('#action-count').textContent=`${p.current.revision} actions`;
  doc.querySelector('#day-tag').textContent=`Day ${p.current.day} / ${p.current.config.days}`;
  doc.querySelector('#board').innerHTML=p.current.rooms.map(r=>`<button data-room="${r.id}" class="room ${r.prisoner?'occupied tier-'+r.prisoner.tier:''}">${r.prisoner?`<span class="portrait ${r.prisoner.code}"></span>`:''}</button>`).join('');
  if(!doc.querySelector('#selection-hint'))doc.body.insertAdjacentHTML('beforeend','<span id="selection-hint"></span><div id="center-actions"></div>');
  const actor=p.current.rooms.findLast(r=>r.prisoner)?.id??0;
  doc.querySelector('#selection-hint').textContent=`No. ${actor+1} Selected`;
  doc.querySelector('#center-actions').innerHTML='<button data-decision="reroll">Replace</button><button data-decision="end">End</button>';
}

test('UI follows selection without save changes, ignores disabled/hidden buttons and fails closed',()=>{
  const dom=new JSDOM('<body><span id="action-count"></span><span id="day-tag"></span><div id="board"></div></body>',{url:'https://torchlightskill.com/talos/'});
  const w=dom.window,d=w.document,p=fixture([[1,'lion',4],[9,'elephant',1]]);renderBoard(d,p);
  const raw=JSON.stringify(p);w.localStorage.setItem('ss14-prison-lab-v1',raw);const api=installAdvisor(w);
  assert.match(d.querySelector('h3').textContent,/Replace Cell 10/);
  d.querySelector('#selection-hint').textContent='2 号 至臻狂狮';api.refresh();
  assert.match(d.querySelector('h3').textContent,/End/);assert.doesNotMatch(d.querySelector('#talos-advisor-panel').textContent,/Replace Cell 10/);
  const button=d.querySelector('[data-decision="reroll"]');button.disabled=true;
  assert.deepEqual(advisorControls(d,projectAdvisorState(p)).types,['end']);
  button.disabled=false;button.style.display='none';assert.deepEqual(advisorControls(d,projectAdvisorState(p)).types,['end']);
  button.style.display='';d.querySelector('#selection-hint').textContent='unknown';api.refresh();
  assert.equal(d.querySelector('h3'),null);assert.match(d.querySelector('.ta-status').textContent,/action buttons/);
  d.querySelector('#selection-hint').textContent='No. 10 Selected';d.querySelector('#center-actions').hidden=true;api.refresh();assert.equal(d.querySelector('h3'),null);
  assert.equal(w.localStorage.getItem('ss14-prison-lab-v1'),raw);api.destroy();w.close();
});
test('UI follows import/undo, rejects stale saves, preserves storage, and keeps controls out of game click handlers',()=>{
  const dom=new JSDOM('<html><body><section id="startup-screen" hidden></section><div class="game-stage"></div><span id="day-tag"></span><span id="action-count"></span><div id="board"></div><dialog id="reward"></dialog></body></html>',{url:'https://torchlightskill.com/talos/'});
  const w=dom.window,d=w.document,p=fixture([[1,'lion',4],[6,'elephant',2],[9,'elephant',1]]),raw=JSON.stringify(p);
  w.localStorage.setItem('ss14-prison-lab-v1',raw);renderBoard(d,p);
  let gameClicks=0;d.addEventListener('click',()=>gameClicks++);
  const api=installAdvisor(w);d.querySelector('#talos-advisor-toggle').click();
  assert.match(d.querySelector('#talos-advisor-panel h3').textContent,/Replace Cell 10/);assert.equal(gameClicks,0);
  d.querySelector('#action-count').textContent='999 actions';api.refresh();assert.equal(d.querySelector('#talos-advisor-panel h3'),null);assert.match(d.querySelector('.ta-status').textContent,/autosave/);
  renderBoard(d,p);api.refresh();assert.ok(d.querySelector('#talos-advisor-panel h3'));
  d.querySelector('.game-stage').setAttribute('aria-busy','true');api.refresh();assert.match(d.querySelector('.ta-status').textContent,/resolving/);
  d.querySelector('.game-stage').setAttribute('aria-busy','false');
  const imported=fixture([[0,'lion',4]]);w.localStorage.setItem('ss14-prison-lab-v1',JSON.stringify(imported));renderBoard(d,imported);api.refresh();assert.match(d.querySelector('#talos-advisor-panel h3').textContent,/End/);
  w.localStorage.setItem('ss14-prison-lab-v1',raw);renderBoard(d,p);api.refresh();assert.match(d.querySelector('#talos-advisor-panel h3').textContent,/Replace Cell 10/);
  d.querySelector('#reward').setAttribute('open','');api.refresh();assert.equal(d.querySelector('#talos-advisor-root').parentNode.id,'reward');
  assert.equal(w.localStorage.getItem('ss14-prison-lab-v1'),raw);
  api.destroy();assert.equal(d.querySelector('#talos-advisor-root'),null);dom.window.close();
});
