import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createReferenceGame,referenceLegalActions,applyReferenceAction} from '../.local-source/modules/reference-rules.js';
import {projectAdvisorState,advise} from '../src/advisor.mjs';
import {advisorMessage,advisorActionLabel} from '../src/advisor-text.mjs';
const scoped=process.argv.includes('--current-cell');
const report={scope:scoped?'current-cell':'whole-board-research',runs:0,actions:0,highTierReplacements:0,actionTypes:{},rewardIds:{},perMode:{}};
for(const mode of ['normal','tusk','prey','scratch','nest']){
  let chromatic=0;
  for(let seed=0;seed<40;seed++){
    let state=createReferenceGame(`advisor-acceptance-${seed}`,undefined,mode),steps=0;
    while(!['riot','finished'].includes(state.phase)){
      assert.ok(++steps<500);
      const before=JSON.stringify(state),view=projectAdvisorState({schema:'ss14.prison.export.v1',current:state});
      const controls=scoped?{actor:state.position,types:referenceLegalActions(state).filter(a=>a.type==='end'||a.room===state.position).map(a=>a.type)}:null;
      const result=advise(view,controls);
      assert.equal(JSON.stringify(state),before);assert.equal(result.status,'ready');
      for(const rec of result.candidates){
        if(scoped&&['eat','reroll'].includes(rec.action.type))assert.equal(rec.action.room,state.position);
        assert.ok(referenceLegalActions(state).some(a=>JSON.stringify(a)===JSON.stringify(rec.action)),JSON.stringify(rec.action));
        assert.ok(Number.isFinite(rec.score));
        for(const lang of ['en','ru']){
          assert.ok(advisorActionLabel(rec.action,lang));
          for(const message of [...rec.reasons,...rec.risks])assert.doesNotMatch(advisorMessage(message.key,message.args,lang),/undefined|NaN|\{\w+\}/);
        }
      }
      const action=result.candidates[0].action;
      if(action.type==='reroll'&&state.rooms[action.room].prisoner.tier>=3)report.highTierReplacements++;
      report.actionTypes[action.type]=(report.actionTypes[action.type]??0)+1;
      if(action.type==='choose')report.rewardIds[action.id]=(report.rewardIds[action.id]??0)+1;
      state=applyReferenceAction(state,action);report.actions++;
    }
    chromatic+=state.rainbow.length;report.runs++;
  }
  report.perMode[mode]={runs:40,meanChromatic:chromatic/40};
}
assert.equal(report.highTierReplacements,0);
await writeFile(`.local-source/advisor-acceptance${scoped?'-current-cell':''}.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
