import {projectAdvisorState,advise} from './advisor.mjs';
import {advisorMessage,advisorActionLabel} from './advisor-text.mjs';

export function advisorMatchesBoard(doc,v){
  const revision=doc.querySelector('#action-count')?.textContent.match(/\d+/)?.[0];
  const days=doc.querySelector('#day-tag')?.textContent.match(/(\d+)\s*\/\s*(\d+)/);
  if(Number(revision)!==v.revision||!days||Number(days[1])!==v.day||Number(days[2])!==v.days)return false;
  return v.rooms.every(r=>{
    const el=doc.querySelector(`#board [data-room="${r.id}"]`);
    if(!el)return false;
    if(r.prisoner)return el.classList.contains('occupied')&&el.classList.contains(`tier-${r.prisoner.tier}`)&&!!el.querySelector(`.portrait.${r.prisoner.code}`);
    return !el.classList.contains('occupied');
  });
}

export function installAdvisor(win){
  const doc=win.document,prefKey='talos-advisor-language-v1';
  let root,panel,content,toggle,languageButton,close,interval,lastRaw=null,view=null,error='missing',lastKey='',destroyed=false,language='en';
  try{if(win.localStorage.getItem(prefKey)==='ru')language='ru';}catch{}
  const t=(key,args)=>advisorMessage(key,args,language);
  const node=(tag,text,className)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
  function renderCandidate(rec,heading){
    const section=node('section',undefined,'ta-choice');section.append(node('small',heading),node('h3',advisorActionLabel(rec.action,language)));
    const list=node('ul');for(const reason of rec.reasons)list.append(node('li',t(reason.key,reason.args)));section.append(list);
    if(rec.risks.length){const p=node('p',rec.risks.map(r=>t(r.key,r.args)).join(' '),'ta-risk');section.append(p);}
    return section;
  }
  function refresh(){
    if(destroyed||!root)return;
    // The saved game is read-only. Same-tab storage events do not fire, so poll;
    // compare revision + rendered board to reject stale or protected saves.
    const startup=doc.getElementById('startup-screen');
    root.hidden=!!startup&&!startup.hidden;
    const host=[...doc.querySelectorAll('dialog[open]')].at(-1)??doc.body;
    if(root.parentNode!==host)host.append(root);
    let raw;try{raw=win.localStorage.getItem('ss14-prison-lab-v1');}catch{raw=null;}
    if(raw!==lastRaw){
      lastRaw=raw;view=null;error='missing';
      if(raw){try{if(raw.length>8_000_000)throw Error('invalid');view=projectAdvisorState(JSON.parse(raw));error='';}catch(e){error=e.message==='unsupported'?'unsupported':'invalid';}}
    }
    let status=error;
    if(root.hidden)status='waiting';
    else if(doc.querySelector('.game-stage[aria-busy="true"]'))status='busy';
    else if(view&&!advisorMatchesBoard(doc,view))status='stale';
    let result=null;if(!status&&view){result=advise(view);if(result.status!=='ready')status=result.status;}
    const key=JSON.stringify([language,status,view,result]);
    if(key===lastKey)return;lastKey=key;
    toggle.textContent=t('open');toggle.setAttribute('aria-label',t('title'));
    close.textContent='×';close.setAttribute('aria-label',t('close'));languageButton.textContent=language==='en'?'Русский':'English';
    panel.querySelector('h2').textContent=t('title');content.replaceChildren();
    content.append(node('p',t('credits'),'ta-muted'));
    content.append(node('p',t('intro'),'ta-muted'));
    if(status)content.append(node('p',t(status),'ta-status'));
    else if(result){
      content.append(node('p',t('context',{day:view.day,days:view.days,count:view.rooms.filter(r=>r.prisoner).length,rainbow:view.rainbowCount}),'ta-muted'));
      content.append(renderCandidate(result.candidates[0],t('best')));
      if(result.candidates.length>1){const more=node('details');more.append(node('summary',t('alternatives')));for(const rec of result.candidates.slice(1,4))more.append(renderCandidate(rec,''));content.append(more);}
      if(result.warnings.length){const more=node('details');more.append(node('summary',t('warnings')));for(const warning of result.warnings)more.append(node('p',t(warning.key,warning.args)));content.append(more);}
      content.append(node('p',t('instructions')));
    }
    content.append(node('p',t('limits'),'ta-muted'));
  }
  function start(){
    if(destroyed||root)return;
    const style=node('style');style.id='talos-advisor-style';
    style.textContent=`
      #talos-advisor-root{font:14px/1.5 system-ui,sans-serif;color:#eee5d2;text-align:left;letter-spacing:normal}
      #talos-advisor-root[hidden],#talos-advisor-panel[hidden]{display:none!important}
      #talos-advisor-root button{font:inherit;letter-spacing:normal;color:#eee5d2;background:#211e18;border:1px solid #aa8f57;border-radius:5px;padding:6px 10px;cursor:pointer}
      #talos-advisor-root button:focus-visible,#talos-advisor-root summary:focus-visible{outline:2px solid #fff;outline-offset:2px}
      #talos-advisor-toggle{position:fixed;left:12px;bottom:10px;z-index:2147483646}
      #talos-advisor-panel{position:fixed;left:12px;bottom:52px;width:min(430px,calc(100vw - 24px));max-height:calc(100dvh - 110px);z-index:2147483646;background:#171611;border:1px solid #aa8f57;border-radius:8px;overflow:auto;box-sizing:border-box;padding:16px}
      #talos-advisor-panel header{display:flex;align-items:center;gap:8px;position:static;background:none;padding:0}
      #talos-advisor-panel h2{font:600 18px/1.3 system-ui;margin:0 auto 0 0;color:#f3dfa8}
      #talos-advisor-panel h3{font:600 16px/1.4 system-ui;margin:5px 0;color:#f3dfa8}
      #talos-advisor-panel p{font:inherit;margin:10px 0}#talos-advisor-panel ul{padding-left:20px;margin:8px 0}#talos-advisor-panel li{margin:6px 0}
      #talos-advisor-panel .ta-muted{font-size:12px;color:#c0bba9}#talos-advisor-panel .ta-risk{color:#e5bb87;font-size:13px}
      #talos-advisor-panel .ta-choice{padding:12px 0;border-top:1px solid #585044}#talos-advisor-panel summary{cursor:pointer;padding:8px 0}
      @media(max-width:600px){#talos-advisor-toggle{bottom:5px;left:5px;font-size:11px;padding:4px 7px}#talos-advisor-panel{left:8px;bottom:42px;width:calc(100vw - 16px);max-height:calc(100dvh - 65px);padding:12px}}
    `;
    doc.head.append(style);
    root=node('div');root.id='talos-advisor-root';root.dataset.talosEnglishControl='true';
    toggle=node('button',t('open'));toggle.id='talos-advisor-toggle';toggle.type='button';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','talos-advisor-panel');
    panel=node('aside');panel.id='talos-advisor-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','talos-advisor-title');
    const header=node('header'),heading=node('h2',t('title'));heading.id='talos-advisor-title';
    languageButton=node('button');languageButton.type='button';close=node('button');close.type='button';header.append(heading,languageButton,close);
    content=node('div');panel.append(header,content);root.append(toggle,panel);doc.body.append(root);
    root.addEventListener('click',e=>e.stopPropagation()); // Do not cancel the game's pending selection.
    const show=value=>{panel.hidden=!value;toggle.setAttribute('aria-expanded',String(value));if(value){refresh();close.focus();}else toggle.focus();};
    toggle.addEventListener('click',()=>show(panel.hidden));close.addEventListener('click',()=>show(false));
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();e.stopPropagation();show(false);}});
    languageButton.addEventListener('click',()=>{language=language==='en'?'ru':'en';try{win.localStorage.setItem(prefKey,language);}catch{}refresh();});
    refresh();interval=win.setInterval(refresh,700);
  }
  const api={refresh,destroy(){destroyed=true;win.clearInterval(interval);doc.removeEventListener('DOMContentLoaded',start);root?.remove();doc.getElementById('talos-advisor-style')?.remove();}};
  if(doc.body)start();else doc.addEventListener('DOMContentLoaded',start,{once:true});
  return api;
}
