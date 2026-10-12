import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createTranslator} from '../src/translator.mjs';
const entries=[];
for(const name of (await readdir('locales')).filter(name=>name.endsWith('.json')).sort())entries.push(...JSON.parse(await readFile(`locales/${name}`,'utf8')));
for(const entry of entries){
  if(!entry.zh||!entry.en)throw new Error(`Missing translation: ${entry.zh}`);
  const placeholders=s=>[...new Set(s.match(/\{\d+\}/g)??[])].sort().join(',');
  if(placeholders(entry.zh)!==placeholders(entry.en))throw new Error(`Placeholder mismatch: ${entry.zh}`);
}
const glossary=JSON.parse(await readFile('glossary.json','utf8'));
createTranslator(entries,glossary); // Reject ambiguous duplicate keys before shipping.
const translator=(await readFile('src/translator.mjs','utf8')).replaceAll('export ','');
const runtime=(await readFile('src/runtime.mjs','utf8')).replaceAll('export ','');
const advisor=(await Promise.all(['advisor.mjs','advisor-text.mjs','advisor-ui.mjs'].map(file=>readFile(`src/${file}`,'utf8')))).map(source=>source.replace(/^import .*;\r?\n/gm,'').replaceAll('export ','')).join('\n');
const metadata=`// ==UserScript==
// @name         Torchlight Talos — English
// @namespace    https://github.com/oopsmelodic/torchlight-talos-en
// @version      0.2.2
// @description  English interface, dynamic messages and tooltips for the original Talos simulator. EN/CN toggle and independent EN/RU advisor; no translation service.
// @author       oOpsiq (English translation and advisor); original simulator: 爱玩游戏的吉吉罗
// @match        https://torchlightskill.com/talos/*
// @match        https://torchlightskill.com/talos
// @run-at       document-start
// @grant        none
// @noframes
// @downloadURL  https://raw.githubusercontent.com/oopsmelodic/torchlight-talos-en/main/dist/talos-english.user.js
// @updateURL    https://raw.githubusercontent.com/oopsmelodic/torchlight-talos-en/main/dist/talos-english.user.js
// ==/UserScript==`;
await mkdir('dist',{recursive:true});
await writeFile('dist/talos-english.user.js',`${metadata}\n\n(()=>{\n'use strict';\n${translator}\n${runtime}\n${advisor}\nconst entries=${JSON.stringify(entries.map(({zh,en,context})=>({zh,en,...(context?{context}:{})})))};\nconst terms=${JSON.stringify(glossary.map(({zh,en})=>({zh,en})))};\nconst translation=installTranslation(window,createTranslator(entries,terms));\nconst assistant=installAdvisor(window);\nconst originalDestroy=translation.destroy;\ntranslation.destroy=()=>{assistant.destroy();originalDestroy();};\n})();\n`);
console.log(`Built ${entries.length} messages and ${glossary.length} terms.`);
