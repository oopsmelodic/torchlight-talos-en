// Independent, visible-information heuristic. No upstream implementation imports.
export const advisorSpecies=['elephant','lion','wolf','rat'];
const food={elephant:['lion','wolf'],lion:['wolf','rat'],wolf:['rat'],rat:['elephant']};
const toolIds=['revenge','muzzle','saw','keys','rope','fire','nest','rathead'];
const giftIds=['ring','horn','wine','brand'];
const worth=[1,2,4,8,16,40]; // Planning utility, NOT currency or official reward value.
const msg=(key,args={})=>({key,args});
const bounded=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const weights=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&x>=0)&&v.some(x=>x>0)&&Number.isFinite(v.reduce((a,b)=>a+b,0));
const bool=v=>typeof v==='boolean';

export function projectAdvisorState(payload){
  const s=payload?.current;
  if(payload?.schema!=='ss14.prison.export.v1'||s?.challenge||s?.reference?.version!=='public-preview-v3')throw Error('unsupported');
  const c=s.config,p=c?.referenceParameters;
  if(!c||!p||!bounded(s.day,1,c.days)||!bounded(c.days,1,100)||!bounded(s.revision,0,100000)||
    !['patrol','manage','event','riot','finished'].includes(s.phase)||!bounded(s.position,0,15)||!bounded(s.goalIndex,0,1)||
    !weights(c.rarityWeights,6)||!weights(c.codeWeights,4)||!bounded(s.rerolls,0,20)||!bounded(c.rerollsPerDay,0,20)||
    !['before','after'].includes(c.muzzleTiming)||!['before','after'].includes(c.fireEligibility)||
    ![c.rainbowCountsForMuzzle,c.circularNeighbors,c.wineChangesCode,p.scratchBaseGainIncluded,p.tuskIncludeReplaced,p.executionChangesCode].every(bool)||
    !bounded(c.nestDays,1,20)||!bounded(c.nestTier,0,4)||!Array.isArray(s.tools)||s.tools.some(id=>!toolIds.includes(id))||
    !Array.isArray(s.rooms)||s.rooms.length!==16||!Array.isArray(s.rainbow)||!Array.isArray(s.reference.prey)||!Array.isArray(s.pending)||!Array.isArray(s.destinations)||!bool(s.chain))throw Error('invalid');
  // Explicit allowlist. Never project RNG, seed, hidden prisoners, future event kinds,
  // history, logs, reward history or the initial save. Closed rooms expose rarity only.
  const rooms=s.rooms.map((r,id)=>{
    if(r.id!==id||!['open','closed'].includes(r.status)||!r.reference)throw Error('invalid');
    const prisoner=r.status==='open'&&r.prisoner?{code:r.prisoner.code,tier:r.prisoner.tier}:null;
    if(prisoner&&(!advisorSpecies.includes(prisoner.code)||!bounded(prisoner.tier,0,4)))throw Error('invalid');
    const knownTier=r.status==='closed'?r.reference.revealedTier:null;
    if(knownTier!==null&&!bounded(knownTier,0,5))throw Error('invalid');
    if(r.nest&&!bounded(r.nest.due,s.day+1,c.days+20))throw Error('invalid');
    return {id,status:r.status,prisoner,knownTier,tusk:!!r.reference.tusk,scratch:!!r.reference.scratch,nestDue:r.nest?.due??null,specialEvent:!!r.event};
  });
  const prey=s.reference.prey.map(m=>{
    const lion=s.rooms.findIndex(r=>r.status==='open'&&r.prisoner?.id===m.lionId),target=s.rooms.findIndex(r=>r.status==='open'&&r.prisoner?.id===m.preyId);
    if(lion<0||target<0||!bounded(m.remaining,1,3))throw Error('invalid');
    return {lion,target,remaining:m.remaining};
  });
  const pending=s.pending.map(r=>{
    const pool=r.kind==='tool'?toolIds:r.kind==='gift'?giftIds:[];
    if(!Array.isArray(r.options)||!r.options.length||r.options.some(id=>!pool.includes(id)))throw Error('invalid');
    return {kind:r.kind,options:[...r.options]};
  });
  if(s.destinations.some(id=>!bounded(id,0,15)))throw Error('invalid');
  let event=null;
  if(s.phase==='event'){
    if(!s.event||!['chain','execution'].includes(s.event.kind)||!bounded(s.event.room,0,15))throw Error('invalid');
    event={kind:s.event.kind,room:s.event.room,validActor:s.rooms[s.event.room].prisoner?.id===s.event.actorId};
  }
  return {day:s.day,days:c.days,revision:s.revision,phase:s.phase,position:s.position,rooms,prey,pending,event,
    tools:[...s.tools],destinations:[...s.destinations],rainbowCount:s.rainbow.length,chain:s.chain,rerolls:s.rerolls,
    goalReached:s.goalIndex===1,config:{rarityWeights:[...c.rarityWeights],codeWeights:[...c.codeWeights],rerollsPerDay:c.rerollsPerDay,
      muzzleTiming:c.muzzleTiming,rainbowCountsForMuzzle:c.rainbowCountsForMuzzle,circularNeighbors:c.circularNeighbors,
      fireEligibility:c.fireEligibility,wineChangesCode:c.wineChangesCode,nestDays:c.nestDays,nestTier:c.nestTier,
      scratchBaseGainIncluded:p.scratchBaseGainIncluded,tuskIncludeReplaced:p.tuskIncludeReplaced,executionChangesCode:p.executionChangesCode}};
}
const population=v=>v.rooms.filter(r=>r.prisoner);
const has=(v,id)=>v.tools.includes(id);
const norm=w=>{const sum=w.reduce((a,b)=>a+b,0);return sum?w.map(x=>x/sum):w.map(()=>0);};
const name=r=>({room:r.id+1,code:r.prisoner?.code,tier:r.prisoner?.tier});
export function advisorCanEat(v,a,b){
  if(!a?.prisoner||a.id===b.id)return false;
  const x=a.prisoner,y=b.prisoner;
  if(b.status==='closed')return x.code==='wolf'&&b.scratch&&b.knownTier===x.tier;
  return !!y&&x.tier===y.tier&&(food[x.code].includes(y.code)||has(v,'rathead')&&x.code==='rat'&&y.code==='rat');
}
function pairCount(v,rooms=v.rooms){return rooms.reduce((n,a)=>n+rooms.filter(b=>advisorCanEat(v,a,b)).length,0);}
function bondCost(v,ids){
  return v.prey.filter(m=>ids.includes(m.lion)||ids.includes(m.target)).reduce((n,m)=>n+
    [m.lion,m.target].reduce((total,id)=>{const t=v.rooms[id].prisoner.tier;return total+worth[Math.min(5,t+m.remaining)]-worth[t];},0)*.7,0);
}
const progressBonus=(v,from,to)=>to>=5?8:!v.goalReached&&from<4&&to>=4?8:0;
function eatCandidate(v,a,b){
  const p=a.prisoner,count=population(v).length+(v.config.rainbowCountsForMuzzle?v.rainbowCount:0);
  let gain=b.status==='closed'?(v.config.scratchBaseGainIncluded?3:2):1;
  const reasons=[msg('eatRule',{...name(a),target:b.id+1})],risks=[];
  if(b.status==='closed')reasons.push(msg('scratch',{gain}));
  const after=count-(b.prisoner?1:0);
  if(has(v,'muzzle')){
    const checked=v.config.muzzleTiming==='before'?count:after;
    reasons.push(msg('muzzle',{count:checked,timing:v.config.muzzleTiming,bonus:checked<=3?2:0}));
    if(checked<=3)gain+=2;
  }
  if(has(v,'rathead')&&p.code==='rat'){gain++;reasons.push(msg('rathead'));}
  const outcomes=has(v,'saw')?[[.75,gain],[.25,gain+1]]:[[1,gain]];
  const distribution=new Map();let score=0,chromatic=0;
  for(const [chance,extra]of outcomes){const t=Math.min(5,p.tier+extra);distribution.set(t,(distribution.get(t)??0)+chance);score+=chance*(worth[t]-worth[p.tier]+progressBonus(v,p.tier,t));if(t===5)chromatic+=chance;}
  score-=worth[b.prisoner?.tier??b.knownTier];
  if(has(v,'revenge')&&v.rooms.some(r=>r.status==='closed')){score+=(1-chromatic)*.3*worth[Math.min(4,p.tier+gain)];reasons.push(msg('revenge'));}
  const lost=bondCost(v,[a.id,b.id]);if(lost){score-=lost;risks.push(msg('breakPrey'));}
  if(has(v,'saw'))reasons.push(msg('saw'));
  reasons.push(msg('growth',{distribution:[...distribution].map(([tier,chance])=>({tier,chance}))}));
  // Match the replacement pairing bonus, integrating the post-Consume rarity
  // and Code distributions. Remove the victim before looking for either
  // direction of a follow-up; never consult hidden inmates or sampled RNG.
  let followup=0;const partners=new Set(),codes=norm(v.config.codeWeights);
  for(const [tier,chance]of distribution){
    if(tier===5)continue; // Confined Chromatic inmates cannot Consume again.
    for(let i=0;i<advisorSpecies.length;i++){
      if(!codes[i])continue;
      const grown={...a,prisoner:{code:advisorSpecies[i],tier}};
      const targets=v.rooms.filter(r=>r.id!==a.id&&r.id!==b.id&&
        (advisorCanEat(v,grown,r)||advisorCanEat(v,r,grown)));
      if(targets.length){followup+=chance*codes[i];for(const r of targets)partners.add(r.id+1);}
    }
  }
  score+=followup*3;
  reasons.push(msg('followup',{pairs:followup,rooms:[...partners].sort((a,b)=>a-b)}));
  if(v.rerolls<v.config.rerollsPerDay)reasons.push(msg('keepReroll'));
  risks.push(msg('randomCode'));
  return {action:{type:'eat',room:a.id,prey:b.id},score,reasons,risks};
}
function rerollCandidate(v,r){
  const p=r.prisoner,w=[...v.config.rarityWeights];if(has(v,'rope'))w[0]=w[1]=0;
  if(!w.some(x=>x>0))return null;
  const tiers=norm(w),codes=norm(v.config.codeWeights),reasons=[],risks=[];
  let score=-worth[p.tier],down=0,pairs=0,tuskGain=0;
  for(let t=0;t<6;t++)for(let c=0;c<4;c++){
    const eligible=has(v,'fire')&&(v.config.fireEligibility==='before'?p.tier:t)<3;
    const variants=eligible?[[t,.6],[3,.4]]:[[t,1]];
    for(const [tier,fireChance]of variants){
      const chance=tiers[t]*codes[c]*fireChance;if(!chance)continue;
      const changed={...r,prisoner:tier<5?{code:advisorSpecies[c],tier}:null};
      const rooms=v.rooms.map(other=>other.id===r.id?changed:other);
      score+=chance*(worth[tier]+progressBonus(v,p.tier,tier));if(tier<p.tier)down+=chance;
      const pair=rooms.some(other=>advisorCanEat(v,changed,other)||advisorCanEat(v,other,changed));
      if(pair){pairs+=chance;score+=chance*3;}
      if(r.tusk){
        const pool=rooms.filter(other=>other.prisoner&&(v.config.tuskIncludeReplaced||other.id!==r.id));
        const probability=Math.min(1,4/Math.max(1,pool.length));
        tuskGain+=chance*probability*pool.reduce((n,other)=>n+worth[other.prisoner.tier+1]-worth[other.prisoner.tier],0);
      }
    }
  }
  score+=tuskGain*.8;score-=bondCost(v,[r.id]);
  // A protective policy, not a proof that every high-tier replacement is suboptimal.
  if(p.tier>=3)score=Math.min(score,-1);
  reasons.push(msg('replaceOdds',{...name(r),down,pairs}));
  const higher=population(v).filter(other=>other.prisoner.tier>p.tier).map(other=>other.id+1);
  if(higher.length)reasons.push(msg('keepHigher',{rooms:higher}));
  if(has(v,'rope'))reasons.push(msg('rope'));
  if(has(v,'fire'))reasons.push(msg('fire',{timing:v.config.fireEligibility}));
  if(r.tusk)reasons.push(msg('tusk',{included:v.config.tuskIncludeReplaced}));
  if(v.prey.some(m=>m.lion===r.id||m.target===r.id))risks.push(msg('breakPrey'));
  risks.push(msg('replacementCost'));if(p.tier>=3)risks.push(msg('protectHigh',name(r)));
  return {action:{type:'reroll',room:r.id},score,reasons,risks};
}
function rewardCandidate(v,id){
  const days=v.days-v.day+1,closed=v.rooms.filter(r=>r.status==='closed').length,n=population(v).length;
  const eats=population(v).flatMap(a=>v.rooms.filter(b=>advisorCanEat(v,a,b)).map(b=>eatCandidate(v,a,b)));
  let score=0,args={days,closed,count:n};const reasons=[],risks=[];
  if(toolIds.includes(id)){
    const muzzleCount=n+(v.config.rainbowCountsForMuzzle?v.rainbowCount:0);
    const rates={muzzle:muzzleCount<=3?10:4,revenge:closed?8:2,keys:closed?7:1,saw:6,rathead:3+population(v).filter(r=>r.prisoner.code==='rat').length*2,rope:population(v).some(r=>r.prisoner.tier<=2)?6:2,fire:3,nest:days>v.config.nestDays?5:0};
    if(id==='muzzle')args.count=muzzleCount;
    score=rates[id]*(.5+days/20);if(id==='nest')args.delay=v.config.nestDays;
    reasons.push(msg('tool_'+id,args));risks.push(msg('toolHeuristic'));
  }else if(id==='ring'){
    const count=Math.min(3,closed);score=count*(pairCount(v)?2.5:4);reasons.push(msg('gift_ring',{count}));
  }else if(id==='wine'){
    const affected=population(v).filter(r=>r.prisoner.tier<3);
    score=affected.reduce((n,r)=>n+worth[r.prisoner.tier+1]-worth[r.prisoner.tier],0);
    reasons.push(msg('gift_wine',{count:affected.length}));if(v.config.wineChangesCode)risks.push(msg('wineRandom'));
  }else if(id==='brand'){
    const eligible=population(v).filter(r=>!v.rooms.some(b=>advisorCanEat(v,r,b)));
    const useful=eligible.filter(r=>advisorSpecies.some(code=>v.rooms.some(b=>b.prisoner&&advisorCanEat(v,{...r,prisoner:{...r.prisoner,code}},b))));
    score=Math.min(4,useful.length)*4;reasons.push(msg('gift_brand',{count:useful.length}));risks.push(msg('brandSample'));
  }else if(id==='horn'){
    const attackers=new Set(eats.map(e=>e.action.room)).size;
    score=eats.length?Math.max(0,...eats.map(e=>e.score))*.7+attackers:0;
    reasons.push(msg('gift_horn',{count:attackers}));risks.push(msg('hornRandom'));
  }
  return {action:{type:'choose',id},score,reasons,risks};
}
export function advise(v){
  const candidates=[],warnings=[];
  if(['riot','finished'].includes(v.phase))return {status:'finished',candidates,warnings};
  if(v.pending.length)candidates.push(...v.pending[0].options.map(id=>rewardCandidate(v,id)));
  else if(v.phase==='patrol'){
    for(const room of v.destinations){
      const r=v.rooms[room],path=[];
      if(v.chain){let cursor=v.position;while(cursor!==room){cursor=(cursor+1)%16;path.push(cursor);}if(!path.length)path.push(room);}else path.push(room);
      const opened=path.filter(id=>v.rooms[id].status==='closed');
      let score=opened.length*4;const reasons=[msg('patrol',{room:room+1,count:opened.length,chain:v.chain})],risks=[];
      if(!v.chain&&has(v,'keys')&&r.status==='closed'){
        const adjacent=[room-1,room+1].map(id=>v.config.circularNeighbors?(id+16)%16:id).filter(id=>id>=0&&id<16&&v.rooms[id].status==='closed');
        score+=adjacent.length*.8*3;reasons.push(msg('keys',{count:adjacent.length}));
      }
      const lost=opened.filter(id=>v.rooms[id].nestDue||v.rooms[id].scratch).length;
      if(lost){score-=lost*2;risks.push(msg('openMarks',{count:lost}));}
      if(!v.chain&&r.specialEvent){score+=.5;reasons.push(msg('unknownEvent'));}
      if(r.knownTier!==null)reasons.push(msg('knownTier',{tier:r.knownTier}));
      candidates.push({action:{type:'visit',room},score,reasons,risks});
    }
  }else if(v.phase==='event'){
    candidates.push({action:{type:'event',accept:false},score:0,reasons:[msg('skipEvent')],risks:[]});
    if(v.event.kind==='chain'){
      const closed=v.rooms.filter(r=>r.status==='closed').length;
      candidates.push({action:{type:'event',accept:true},score:v.day<v.days&&closed?4:0,reasons:[msg('chain',{closed,days:v.days-v.day})],risks:[msg('chainMarks')]});
    }else if(v.event.validActor&&v.rooms[v.event.room].prisoner){
      const main=v.rooms[v.event.room],p=main.prisoner;
      const victims=population(v).filter(r=>r.id!==main.id&&r.prisoner.tier<p.tier&&food[p.code].includes(r.prisoner.code));
      const tier=Math.min(5,p.tier+victims.length);
      const broken=victims.map(r=>r.id);if(tier===5||v.config.executionChangesCode)broken.push(main.id);
      const score=worth[tier]-worth[p.tier]+progressBonus(v,p.tier,tier)-victims.reduce((n,r)=>n+worth[r.prisoner.tier],0)-bondCost(v,broken);
      candidates.push({action:{type:'event',accept:true},score,reasons:[msg('execution',{room:main.id+1,count:victims.length,from:p.tier,to:tier,rooms:victims.map(r=>r.id+1)})],risks:[msg('executionLoss'),...(v.config.executionChangesCode?[msg('randomCode')]:[])]});
    }
  }else if(v.phase==='manage'){
    for(const a of population(v))for(const b of v.rooms)if(advisorCanEat(v,a,b))candidates.push(eatCandidate(v,a,b));
    if(v.rerolls<v.config.rerollsPerDay){
      for(const r of population(v)){const rec=rerollCandidate(v,r);if(rec)candidates.push(rec);}
    }
    const waiting=v.prey.length+v.rooms.filter(r=>r.nestDue).length;
    candidates.push({action:{type:'end'},score:waiting?.5:0,reasons:[msg('end',{days:v.days-v.day,waiting})],risks:[]});
    for(const r of population(v).filter(r=>r.prisoner.tier>=3))warnings.push(msg('protectHigh',name(r)));
    if(v.prey.length)warnings.push(msg('preyWait'));
  }
  // Quantized utility gives a transitive, deterministic ordering. Equal scores
  // retain the legal-action order (Consume before replacement, then cell ID).
  candidates.sort((a,b)=>Math.round(b.score*1e9)-Math.round(a.score*1e9));
  return {status:candidates.length?'ready':'invalid',candidates,warnings};
}
