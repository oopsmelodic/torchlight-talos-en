import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createTranslator} from '../src/translator.mjs';
const entries=[];for(const file of (await readdir('locales')).sort())if(file.endsWith('.json'))entries.push(...JSON.parse(await readFile(`locales/${file}`,'utf8')));
const glossary=JSON.parse(await readFile('glossary.json','utf8'));
const t=createTranslator(entries,glossary);
test('dictionary is complete and dynamic placeholders are preserved',()=>{
  assert.ok(entries.length>=1484);
  for(const {zh,en} of entries){
    assert.ok(zh&&en,zh);
    assert.equal(t.hasUntranslated(en),false,`Unexpected Han text: ${en}`);
    const ids=text=>[...new Set(text.match(/\{\d+\}/g)??[])].sort();
    assert.deepEqual(ids(en),ids(zh),zh);
  }
});
test('duplicates must agree and ambiguous close labels use explicit context',()=>{
  assert.throws(()=>createTranslator([{zh:'关闭',en:'Off'},{zh:'关闭',en:'Close'}]),/Conflicting/);
  assert.equal(t.translate('关闭'),'Off');
  assert.equal(t.translateContext('关闭','close-control'),'Close');
  assert.equal(t.hasUntranslated('Author · 爱玩游戏的吉吉罗'),false);
  assert.equal(t.hasUntranslated('Author · 爱玩游戏的吉吉罗 未翻译'),true);
});
test('composed live UI sentences, room labels and journal messages are English',()=>{
  const messages=[
    '普通狂狮；与 2 号联动 · 剩 3 次日开始升阶',
    '门后囚犯未知；第 12 日自动开房 · 稀有硕鼠（2次日切换）',
    '门后囚犯未知；打开该牢门后出现特殊事件，届时可确认或略过；当前不预告事件种类。',
    '按2次日切换成熟为稀有硕鼠；提前开门清除。',
    '15号：普通巨象。',
    '移除当前囚犯克制且稀有度严格低于它的已开囚犯，每移除一名提升一阶。按发动前代号与稀有度筛选。',
    '启用连锁反应与处刑效率；事件概率采用练习设置。已接入8件刑具与4种珍藏样本；完整候选池、抽样权重和连续领奖次数采用练习口径。',
    '3 号 门后囚犯未知，可巡监',
  ];
  for(const source of messages)assert.equal(t.hasChinese(t.translate(source)),false,source+' => '+t.translate(source));
  assert.match(t.translate('普通狂狮'),/Normal.*Berserk Lion/);
  assert.equal(t.translate('优先参考 · 换 2 号囚犯'),'Recommended · Replace Inmate No. 2');
  assert.equal(t.translate('备选 · 换 10 号囚犯'),'Alternative · Replace Inmate No. 10');
});
test('verified terms have paired sources; editorial terms are explicitly marked',()=>{
  for(const term of glossary){assert.ok(term.source);assert.ok(term.en);assert.ok(term.zh);assert.ok(['tlidb-verified','editorial-unverified'].includes(term.status));if(term.status==='tlidb-verified'){assert.ok(term.chineseSource.startsWith('https://tlidb.com/cn/'));assert.ok(term.source.startsWith('https://tlidb.com/en/'));}}
});
