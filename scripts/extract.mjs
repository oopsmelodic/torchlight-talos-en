import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {parse} from 'acorn';
import {JSDOM} from 'jsdom';
const han=/[\u3400-\u9fff]/u;
const out={static:new Map(),core:new Map(),reference:new Map()};
const document=new JSDOM('').window.document;
const normalize=s=>s.replace(/\s+/g,' ').trim();
function add(group,text,file){
  text=normalize(text); if(!han.test(text))return;
  if(!out[group].has(text))out[group].set(text,[]);
  if(!out[group].get(text).includes(file))out[group].get(text).push(file);
}
function markup(group,text,file){
  if(!han.test(text))return;
  if(!/<\/?[a-z][^>]*>/i.test(text)){add(group,text,file);return;}
  const template=document.createElement('template');template.innerHTML=text;
  const walk=node=>{if(node.nodeType===3)add(group,node.textContent,file);if(node.nodeType===1){for(const a of ['title','aria-label','alt','placeholder','label'])if(node.hasAttribute(a))add(group,node.getAttribute(a),file);}for(const c of node.childNodes)walk(c);};
  walk(template.content);
}
const html=await readFile('.local-source/index.html','utf8');
markup('static',html,'index.html');
for(const file of await readdir('.local-source/modules')){
  if(!file.endsWith('.js'))continue;
  const source=await readFile(`.local-source/modules/${file}`,'utf8');
  const group=/reference|reward|rules|goal-guide/.test(file)?'reference':'core';
  const visit=node=>{
    if(!node||typeof node!=='object')return;
    if(node.type==='Literal'&&typeof node.value==='string')markup(group,node.value,file);
    if(node.type==='TemplateLiteral')markup(group,node.quasis.map((q,i)=>(q.value.cooked??q.value.raw)+(i<node.expressions.length?`{${i}}`:'')).join(''),file);
    for(const [key,v] of Object.entries(node))if(key!=='start'&&key!=='end'){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}
  };
  visit(parse(source,{ecmaVersion:'latest',sourceType:'module'}));
}
await mkdir('.local-source/corpus',{recursive:true});
for(const [group,entries] of Object.entries(out)){
  await writeFile(`.local-source/corpus/${group}.json`,JSON.stringify([...entries].map(([zh,sources])=>({zh,en:'',sources})),null,2)+'\n');
  console.log(group,entries.size);
}
for(const lang of ['en','cn']){
  const dom=new JSDOM(await readFile(`.local-source/tlidb-${lang}.html`,'utf8'));
  const rows=[...dom.window.document.querySelectorAll('tr')].filter(x=>/Tusk|象牙|Rat_Nest|鼠巢|Mammoth|巨象|Warden|典狱|绮彩|Chromatic|Scratch|划痕|Prey|猎物|Torture|刑具/.test(x.textContent+x.innerHTML));
  await writeFile(`.local-source/tlidb-${lang}-terms.txt`,rows.map(r=>r.textContent+'\n'+[...r.querySelectorAll('a')].map(a=>a.getAttribute('href')).join(' ')).join('\n\n'));
}
