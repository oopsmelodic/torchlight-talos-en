// Runs the locally inspected, unmodified upstream engine; upstream files are not shipped.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTranslator} from '../src/translator.mjs';
import {installTranslation} from '../src/runtime.mjs';
import * as engine from '../.local-source/modules/session-engine.js';
import * as ui from '../.local-source/modules/reference-ui.js';
import * as challengeUI from '../.local-source/modules/challenge-ui.js';
import {journalView} from '../.local-source/modules/run-journal.js';
const entries=[];for(const file of await readdir('locales'))if(file.endsWith('.json'))entries.push(...JSON.parse(await readFile(`locales/${file}`,'utf8')));
const translator=createTranslator(entries,JSON.parse(await readFile('glossary.json','utf8')));
const messages=new Set(), missing=new Map(),counts={runs:0,steps:0,completed:0,imports:0,undos:0,actions:{}};
const dom=new JSDOM('<html lang="zh-CN"><body><div id="ui"></div></body></html>',{url:'https://torchlightskill.com/talos/'});
const api=installTranslation(dom.window,translator),host=dom.window.document.getElementById('ui');
const htmlText=new JSDOM('').window.document.createElement('div');
function collect(value){
  if(typeof value==='string'){
    if(!/[\u3400-\u9fff]/u.test(value))return;
    if(/<\/?[a-z]/i.test(value)){
      htmlText.innerHTML=value;
      const walker=dom.window.document.createTreeWalker(htmlText,4);let node;while(node=walker.nextNode())if(/[\u3400-\u9fff]/u.test(node.data))messages.add(node.data.trim());
      for(const el of htmlText.querySelectorAll('[aria-label],[title]'))for(const key of ['aria-label','title'])if(el.hasAttribute(key))messages.add(el.getAttribute(key));
    }else messages.add(value);
  }else if(Array.isArray(value))value.forEach(collect);
  else if(value&&typeof value==='object')Object.values(value).forEach(collect);
}
for(const mode of ['normal','tusk','prey','scratch','nest','supply','muzzle','rat'])for(let seed=0;seed<6;seed++){
  const challenge=['supply','muzzle','rat'].includes(mode);
  let state=challenge?engine.createChallenge(`en-test-${seed}`,{build:mode}):engine.createReferenceGame(`en-test-${seed}`,undefined,mode);
  const initial=structuredClone(state);let baseline=structuredClone(state);
  const exercised=new Set();
  counts.runs++;
  for(let step=0;step<200;step++){
    if(challenge){collect(challengeUI.challengePanel(state));collect(challengeUI.challengeGuide(state));}
    else{
      collect(ui.referenceGoal(state));collect(ui.referenceMarkersMarkup(state));collect(ui.referenceSpecialEffectsMarkup(state));collect(ui.referenceRewardEffectsMarkup(state));collect(ui.referenceRewardStatus(state));
      for(let room=0;room<16;room++)collect(ui.referenceRoomDescription(state,room));
      if(['riot','finished'].includes(state.phase))collect(ui.referenceHandoffMarkup(state));
    }
    collect(state.log);
    const legal=engine.legalActions(state);
    if(!legal.length||!challenge&&['riot','finished'].includes(state.phase)){counts.completed++;break;}
    const order=['choose','event','eat','deliver','visit','end','skipDelivery','fight','resolveCombat','openCache'];
    const candidates=legal.filter(a=>order.includes(a.type));
    candidates.sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type));
    const optional=seed===5?legal.find(a=>['reroll','scout','refreshRestock'].includes(a.type)&&!exercised.has(a.type)):null;
    const action=optional??candidates[0]??legal[0];exercised.add(action.type);
    baseline=engine.applyAction(baseline,action);state=engine.applyAction(state,action);
    // Render actual engine messages through the userscript while preserving state and storage.
    const before=JSON.stringify(state);dom.window.localStorage.setItem('ss14-prison-lab-v1',before);
    host.textContent=state.log.at(-1)?.text??'';await new Promise(r=>setImmediate(r));
    assert.equal(JSON.stringify(state),before);assert.equal(dom.window.localStorage.getItem('ss14-prison-lab-v1'),before);
    assert.deepEqual(state,baseline);counts.steps++;counts.actions[action.type]=(counts.actions[action.type]??0)+1;
  }
  const exported=engine.exportRun(state,initial);const imported=engine.importRun(exported);assert.deepEqual(imported.current,state);counts.imports++;
  if(state.history.length){const undone=engine.undoUserAction(initial,state);assert.equal(undone.history.length,state.history.length-1);counts.undos++;}
  collect(challenge?journalView(initial,state):ui.referenceJournalView(initial,state));
}
for(const source of messages){const translated=translator.translate(source);if(/[\u3400-\u9fff]/u.test(translated))missing.set(source,translated);}
await writeFile('.local-source/dynamic-coverage.json',JSON.stringify({counts,messages:messages.size,missing:[...missing].map(([zh,en])=>({zh,en}))},null,2));
console.log(JSON.stringify({counts,messages:messages.size,missing:missing.size},null,2));api.destroy();dom.window.close();
assert.equal(missing.size,0,'Untranslated dynamic messages; inspect .local-source/dynamic-coverage.json');
