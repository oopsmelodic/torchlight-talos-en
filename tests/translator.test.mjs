import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createTranslator} from '../src/translator.mjs';
import {installTranslation} from '../src/runtime.mjs';

const t=createTranslator([
  {zh:'确认',en:'Confirm'},{zh:'取消',en:'Cancel'},
  {zh:'第 {0} 日',en:'Day {0}'},
  {zh:'获得刑具：{0}。',en:'Instrument acquired: {0}.'},
  {zh:'参数未保存：{0}',en:'Parameters not saved: {0}'},
  {zh:'事件概率必须在 0 到 1 之间',en:'Event chance must be between 0 and 1'},
],[{zh:'锈锯',en:'Rusty Saw'}]);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('templates translate nested names, errors and arbitrary numbers',()=>{
  assert.equal(t.translate('第 20 日'),'Day 20');
  assert.equal(t.translate('获得刑具：锈锯。'),'Instrument acquired: Rusty Saw.');
  assert.equal(t.translate('参数未保存：事件概率必须在 0 到 1 之间'),'Parameters not saved: Event chance must be between 0 and 1');
  assert.equal(t.translate('  确认\n'),'  Confirm\n');
  assert.equal(t.translate('未知消息'),'未知消息');
});
test('dynamic text and attributes, reversible toggle, values and listeners',async()=>{
  const dom=new JSDOM('<html lang="zh-CN"><head><title>确认</title></head><body><button id="act" aria-label="确认">确认</button><select><option>确认</option><option value="cancel">取消</option></select><input value="确认" placeholder="确认"><textarea>确认</textarea><pre>确认</pre><div contenteditable="true"><b>确认</b></div><p id="day">第 1 日</p></body></html>',{url:'https://torchlightskill.com/talos/'});
  const w=dom.window,d=w.document;w.localStorage.setItem('ss14-prison-lab-v1','{"seed":"确认"}');
  let clicks=0;d.getElementById('act').addEventListener('click',()=>clicks++);
  let dialog;w.alert=value=>{dialog=value;};
  const originalAlert=w.alert,api=installTranslation(w,t);
  assert.equal(d.title,'Confirm');assert.equal(d.getElementById('act').textContent,'Confirm');
  d.getElementById('act').click();assert.equal(clicks,1);
  assert.equal(d.querySelector('option').value,'确认');
  assert.equal(d.querySelector('input').value,'确认');assert.equal(d.querySelector('input').placeholder,'Confirm');
  assert.equal(d.querySelector('textarea').value,'确认');assert.equal(d.querySelector('pre').textContent,'确认');assert.equal(d.querySelector('[contenteditable]').textContent,'确认');
  const day=d.getElementById('day');day.textContent='第 2 日';day.title='取消';await tick();
  assert.equal(day.textContent,'Day 2');assert.equal(day.title,'Cancel');
  const child=d.createElement('span');child.textContent='获得刑具：锈锯。';day.append(child);await tick();
  assert.equal(child.textContent,'Instrument acquired: Rusty Saw.');
  api.setLanguage('zh-CN');assert.equal(child.textContent,'获得刑具：锈锯。');assert.equal(d.getElementById('act').textContent,'确认');
  day.firstChild.data='第 3 日';await tick();api.setLanguage('en');assert.equal(day.firstChild.data,'Day 3');
  w.alert('参数未保存：事件概率必须在 0 到 1 之间');assert.equal(dialog,'Parameters not saved: Event chance must be between 0 and 1');
  assert.equal(w.localStorage.getItem('ss14-prison-lab-v1'),'{"seed":"确认"}');
  assert.equal(api.getUntranslated().length,0);assert.equal(installTranslation(w,t),api);
  api.destroy();assert.equal(w.alert,originalAlert);assert.equal(d.documentElement.lang,'zh-CN');assert.equal(day.firstChild.data,'第 3 日');dom.window.close();
});
test('unknown messages are reported locally, not erased',async()=>{
  const dom=new JSDOM('<p>新版本未知消息</p>',{url:'https://torchlightskill.com/talos/'});
  const api=installTranslation(dom.window,t);
  assert.equal(api.getUntranslated()[0].displayed,'新版本未知消息');
  api.destroy();dom.window.close();
});

test('close controls, Off status, and textarea labels retain their semantics',()=>{
  const tr=createTranslator([{zh:'关闭',en:'Off'},{zh:'关闭',en:'Close',context:'close-control'},{zh:'经营存档内容',en:'Run Save Contents'}]);
  const dom=new JSDOM('<button aria-label="关闭">关闭</button><span>关闭</span><textarea aria-label="经营存档内容">关闭</textarea>',{url:'https://torchlightskill.com/talos/'});
  const api=installTranslation(dom.window,tr),d=dom.window.document;
  assert.equal(d.querySelector('button').textContent,'Close');
  assert.equal(d.querySelector('button').getAttribute('aria-label'),'Close');
  assert.equal(d.querySelector('span').textContent,'Off');
  assert.equal(d.querySelector('textarea').value,'关闭');
  assert.equal(d.querySelector('textarea').getAttribute('aria-label'),'Run Save Contents');
  api.destroy();dom.window.close();
});

test('reordered quantities and hyphenated conditions keep rule highlighting',()=>{
  const tr=createTranslator([{zh:'调整最多 4 名无食物囚犯的代号，使其能找到同阶目标。',en:'Changes the Codes of up to 4 Inmates with no food so they can find same-tier targets.'},{zh:'同阶',en:'Same Rarity'},{zh:'4 名',en:'4 Inmates'}]);
  const dom=new JSDOM('<p class="reward-description">调整最多 <span class="rule-term rule-term--number">4 名</span>无食物囚犯的代号，使其能找到<span class="rule-term rule-term--condition">同阶</span>目标。</p>',{url:'https://torchlightskill.com/talos/'});
  const api=installTranslation(dom.window,tr),d=dom.window.document;
  assert.equal(d.querySelector('.rule-term--number').textContent,'4 Inmates');
  assert.equal(d.querySelector('.rule-term--condition').textContent,'same-tier');
  api.destroy();dom.window.close();
});
test('highlighted rules translate as a sentence and restore the original markup',async()=>{
  const ruleTranslator=createTranslator([{zh:'稀有',en:'Rare'},{zh:'稀有度严格低于它。',en:'Strictly lower in rarity.'}]);
  const dom=new JSDOM('<div id="event-rule"></div>',{url:'https://torchlightskill.com/talos/'});
  const api=installTranslation(dom.window,ruleTranslator),rule=dom.window.document.getElementById('event-rule');
  rule.innerHTML='<span class="rule-term rule-term--rarity">稀有</span>度严格低于它。';
  const original=rule.innerHTML;await tick();
  assert.equal(rule.textContent,'Strictly lower in rarity.');
  assert.equal(rule.querySelector('.rule-term--rarity').textContent,'rarity');
  api.setLanguage('zh-CN');assert.equal(rule.innerHTML,original);
  api.setLanguage('en');assert.equal(rule.textContent,'Strictly lower in rarity.');
  rule.innerHTML='<span class="rule-term rule-term--rarity">稀有</span>度严格低于它。';await tick();
  assert.equal(rule.textContent,'Strictly lower in rarity.');
  api.destroy();dom.window.close();
});
