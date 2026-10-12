export function installTranslation(win, translator) {
  if (win.TalosEnglish) return win.TalosEnglish;
  const doc=win.document, storeKey='talos-english-userscript-language-v1';
  const ignored='script,style,code,pre,textarea,input,[contenteditable]:not([contenteditable="false"]),[data-talos-english-control]';
  const attributes=['title','aria-label','alt','placeholder','label'];
  const records=new WeakMap(), ruleRecords=new WeakMap(), missing=new Map();
  let language='en', destroyed=false, scheduled=false, control;
  let originalLang=doc.documentElement?.lang||'zh-CN';
  try {if(win.localStorage.getItem(storeKey)==='zh-CN') language='zh-CN';} catch {}
  function eligible(element) {return element && !element.closest(ignored);}
  function ruleBlock(node){
    // Upstream ruleText() splits words such as 稀有度 across decorative spans.
    // Translate the complete sentence, then preserve its keyword highlighting.
    // Only these known, non-interactive text containers are eligible.
    if(!node.matches('#event-rule,.reward-description,.tool p,.room-effect-description'))return;
    const children=[...node.childNodes];
    if(children.some(c=>c.nodeType!==3&&!(c.nodeType===1&&(c.matches('span.rule-term')||c.tagName==='EM'))))return;
    const prefix=children.filter(c=>!(c.nodeType===1&&c.tagName==='EM'));
    const current=prefix.map(c=>c.textContent).join('');
    let saved=ruleRecords.get(node);
    if(!saved||current!==saved.output){
      if(!prefix.some(c=>c.nodeType===1&&c.matches('span.rule-term')))return;
      saved={source:current,original:prefix.map(c=>c.cloneNode(true)),terms:prefix.filter(c=>c.nodeType===1).map(c=>({source:c.textContent,text:translator.translate(c.textContent),className:c.className}))};
    }
    const output=language==='en'?translator.translate(saved.source):saved.source;
    saved.output=output;ruleRecords.set(node,saved);
    if(current===output)return;
    const fragment=doc.createDocumentFragment();
    if(language!=='en')saved.original.forEach(c=>fragment.append(c.cloneNode(true)));
    else {
      const aliases={'同阶':['same rarity','same tier','same-tier'],'稀有':['rarity'],'吃':['consume','consuming'],'吃后':['after consuming'],'换':['replace','replacing'],'换后':['after replacing'],'两侧牢房':['adjacent cells'],'低于':['lower than','below'],'不超过':['at most','up to'],'下位囚犯':['lower-tier Inmates'],'不触发其他效果':['without triggering other effects']};
      const terms=saved.terms.flatMap(t=>[t,...(aliases[t.source]??[]).map(text=>({...t,text})),...(/^\d/.test(t.source)?[{...t,text:t.source.match(/^\d+(?:\.\d+)?/)?.[0]}]:[])]).filter(t=>t.text&&!translator.hasChinese(t.text)).sort((a,b)=>b.text.length-a.text.length);
      const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const regex=terms.length?new RegExp(`\\b(?:${terms.map(t=>escape(t.text)).join('|')})(?![\\w])`,'giu'):null;
      let offset=0;
      if(regex)for(const match of output.matchAll(regex)){
        fragment.append(doc.createTextNode(output.slice(offset,match.index)));
        const span=doc.createElement('span');span.className=terms.find(t=>t.text.toLowerCase()===match[0].toLowerCase()).className;span.textContent=match[0];fragment.append(span);offset=match.index+match[0].length;
      }
      fragment.append(doc.createTextNode(output.slice(offset)));
    }
    prefix.forEach(c=>c.remove());node.insertBefore(fragment,node.firstChild);
  }
  function convert(node,key,current,set) {
    let values=records.get(node); if(!values){values=new Map();records.set(node,values);}
    const prior=values.get(key);
    const source=prior && current===prior.output ? prior.source : current;
    if(!source || !translator.hasChinese(source)) {values.delete(key);return;}
    const element=node.nodeType===1?node:node.parentElement;
    const context=element?.closest('button,[role="button"]')?'close-control':undefined;
    const output=language==='en'?(context?translator.translateContext(source,context):translator.translate(source)):source;
    values.set(key,{source,output});
    if(language==='en'&&translator.hasUntranslated(output)&&missing.size<300)missing.set(source,output);
    if(output!==current)set(output);
  }
  function visit(node) {
    if(node.nodeType===3){
      if(!eligible(node.parentElement))return;
      const option=node.parentElement.closest('option');
      // An option's implicit value follows its text. Freeze the original value
      // before translating the label so select handlers keep the same identifier.
      if(option&&!option.hasAttribute('value'))option.setAttribute('value',option.value);
      convert(node,'text',node.data,value=>{node.data=value;});
      return;
    }
    if(node.nodeType!==1&&node.nodeType!==9)return;
    if(node.nodeType===1){
      if(node.matches('script,style,code,pre,[contenteditable]:not([contenteditable="false"]),[data-talos-english-control]'))return;
      ruleBlock(node);
      for(const key of attributes)if(node.hasAttribute(key))convert(node,key,node.getAttribute(key),value=>node.setAttribute(key,value));
      // Input values are never translated: seeds, save JSON, numbers and IDs stay intact.
      if(node.tagName==='INPUT'||node.tagName==='TEXTAREA')return;
    }
    for(const child of [...node.childNodes])visit(child);
  }
  const roots=new Set();
  function enqueue(node){
    if(!node||destroyed)return;
    const element=node.nodeType===1?node:node.parentElement;
    roots.add(element?.closest('#event-rule,.reward-description,.tool p,.room-effect-description')??node);
    if(scheduled)return;scheduled=true;
    win.queueMicrotask(()=>{
      scheduled=false;
      if(destroyed)return;
      const pending=[...roots];roots.clear();
      for(const root of pending)if(root.isConnected && !pending.some(other=>other!==root&&other.contains?.(root)))visit(root);
    });
  }
  const observer=new win.MutationObserver(changes=>{
    for(const change of changes){
      if(change.type==='childList')for(const node of change.addedNodes)enqueue(node);
      else enqueue(change.target);
    }
  });
  const nativeDialogs={};
  for(const name of ['alert','confirm','prompt']){
    const original=win[name];if(typeof original!=='function')continue;
    const wrapped=function(message,...args){return original.call(win,language==='en'?translator.translate(String(message)):message,...args);};
    nativeDialogs[name]={original,wrapped};win[name]=wrapped;
  }
  function sync(){
    doc.documentElement.lang=language==='en'?'en':originalLang;
    doc.documentElement.dataset.talosEnglish=language==='en'?'on':'off';
    if(control){control.textContent=language==='en'?'EN → 中文':'中文 → EN';control.setAttribute('aria-label',language==='en'?'Switch to original Chinese':'Switch to English');}
    visit(doc.documentElement);
  }
  const api={
    version:'0.2.2',
    get language(){return language;},
    setLanguage(value){language=value==='zh-CN'?'zh-CN':'en';missing.clear();try{win.localStorage.setItem(storeKey,language);}catch{}sync();},
    translate:translator.translate,
    getUntranslated(){return [...missing].map(([source,displayed])=>({source,displayed}));},
    rescan(){missing.clear();sync();return api.getUntranslated();},
    destroy(){observer.disconnect();language='zh-CN';sync();destroyed=true;control?.remove();doc.getElementById('talos-english-style')?.remove();delete doc.documentElement.dataset.talosEnglish;for(const [name,{original,wrapped}]of Object.entries(nativeDialogs))if(win[name]===wrapped)win[name]=original;delete win.TalosEnglish;}
  };
  win.TalosEnglish=api;
  function start(){
    if(destroyed||control)return;
    originalLang=doc.documentElement.lang||originalLang;
    const style=doc.createElement('style');style.id='talos-english-style';
    style.textContent=`
      #talos-english-toggle{position:fixed;right:12px;bottom:10px;z-index:2147483646;border:1px solid #b99a55;border-radius:6px;background:#181510;color:#f1dca5;padding:6px 10px;font:12px/1.3 system-ui;cursor:pointer;opacity:.92}
      #talos-english-toggle:focus-visible{outline:2px solid #fff;outline-offset:3px}
      html[data-talos-english="on"] .button,html[data-talos-english="on"] .game-confirm,html[data-talos-english="on"] .game-cancel{white-space:normal;overflow-wrap:break-word}
      html[data-talos-english="on"] .startup-choice strong{font-size:clamp(19px,2.2vw,30px)}
      html[data-talos-english="on"] .decision-description{overflow-wrap:break-word}
      html[data-talos-english="on"] .mechanics-tooltip,html[data-talos-english="on"] .journal-detail-tooltip{overflow-wrap:break-word}
      html[data-talos-english="on"] .room-name{font-size:11px}
      html[data-talos-english="on"] .game-stage .game-confirm,html[data-talos-english="on"] .game-stage .game-cancel{font-size:1.3cqw;white-space:nowrap;padding:0;letter-spacing:0}
      html[data-talos-english="on"] .game-side-title{font-size:1.05cqw;white-space:normal;line-height:1.35;letter-spacing:0}
      html[data-talos-english="on"] main.game-screen:is(.mobile-portrait,.mobile-landscape) .game-confirm,html[data-talos-english="on"] main.game-screen:is(.mobile-portrait,.mobile-landscape) .game-cancel{font-size:11px}
      html[data-talos-english="on"] main.game-screen.mobile-portrait .game-name h1{max-width:75px;white-space:normal;font-size:11px;line-height:1.25}
      html[data-talos-english="on"] main.game-screen.mobile-portrait .game-speed{font-size:10px;padding:5px 4px}
      html[data-talos-english="on"] .decision-card[data-destination][aria-pressed=true]::after{content:"Selected"}
      @media(max-width:600px){#talos-english-toggle{bottom:5px;right:50%;transform:translateX(50%);padding:4px 7px;font-size:11px}}
    `;
    doc.head.append(style);
    control=doc.createElement('button');control.id='talos-english-toggle';control.type='button';control.dataset.talosEnglishControl='true';
    control.title='English translation by oOpsiq';
    control.addEventListener('click',()=>api.setLanguage(language==='en'?'zh-CN':'en'));
    doc.body.append(control);sync();
    observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});
  }
  if(doc.body)start();else doc.addEventListener('DOMContentLoaded',start,{once:true});
  return api;
}
