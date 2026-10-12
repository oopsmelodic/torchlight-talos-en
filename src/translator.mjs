export const normalize = text => text.replace(/\s+/g, ' ').trim();
const han = /[\u3400-\u9fff]/u;
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createTranslator(entries, terms = []) {
  const exact = new Map(), contexts = new Map();
  for (const {zh, en, context} of entries) {
    const target=context?(contexts.get(context)??new Map()):exact;
    if(context)contexts.set(context,target);
    const key=normalize(zh);
    if(target.has(key)&&target.get(key)!==en)throw new Error(`Conflicting translation: ${context??'default'} / ${key}`);
    target.set(key,en);
  }
  const patterns = [];
  for (const [zh, en] of exact) {
    if (!/\{\d+\}/.test(zh)) continue;
    const ids = [], parts = zh.split(/(\{\d+\})/g);
    const source = parts.map(part => {
      if (/^\{\d+\}$/.test(part)) {ids.push(part); return '(.*?)';}
      return escape(part);
    }).join('');
    patterns.push({regex: new RegExp(`^${source}$`, 'u'), ids, en,
      literals: parts.filter(part => !/^\{\d+\}$/.test(part) && part.length > 0),
      weight: zh.replace(/\{\d+\}/g, '').length});
  }
  patterns.sort((a,b) => b.weight - a.weight);
  // Single-character action labels (e.g. 开) are not safe substring replacements.
  const wordMap = new Map(terms.filter(x=>x.zh?.length>1&&x.en).map(x=>[x.zh,x.en]));
  for(const [zh,en] of exact)if(zh.length>1&&!/\{\d+\}/.test(zh))wordMap.set(zh,en);
  const words=[...wordMap.keys()].sort((a,b)=>b.length-a.length);
  const wordPattern = words.length ? new RegExp(words.map(escape).join('|'), 'gu') : null;
  const cache = new Map();
  function translate(raw, depth = 0) {
    const text = normalize(String(raw));
    if (!han.test(text) || depth > 12 || text.length > 16000) return String(raw);
    if (cache.has(text)) return preserve(raw, cache.get(text));
    let result = exact.get(text);
    if (result === undefined) {
      for (const pattern of patterns) {
        if (!pattern.literals.every(literal=>text.includes(literal))) continue;
        const match = pattern.regex.exec(text);
        if (!match) continue;
        const values = new Map(pattern.ids.map((id,i)=>[id, match[i+1]]));
        result = pattern.en.replace(/\{\d+\}/g, id => translate(values.get(id) ?? id, depth+1));
        break;
      }
    }
    if (result === undefined) {
      // Translate independent clauses and nested names. Unknown text remains visible;
      // diagnostics reports it instead of pretending a partial translation is complete.
      const composed=translatePart(text,depth);
      if(!han.test(composed))result=composed;
      else {
        const clauses=text.split(/；|(?<=。)(?=.)/u);
        result=clauses.length>1?clauses.map(clause=>translate(clause,depth+1)).join('; '):composed;
      }
    }
    if (cache.size >= 4000) cache.clear();
    cache.set(text, result);
    return preserve(raw,result);
  }
  function translatePart(text,depth) {
    const value = exact.get(normalize(text));
    if (value !== undefined) return preserve(text,value);
    return wordPattern ? text.replace(wordPattern, key=>` ${wordMap.get(key)} `).replace(/ +/g,' ').trim() : text;
  }
  return {translate, translateContext:(raw,context)=>contexts.get(context)?.get(normalize(raw))??translate(raw),
    hasChinese:text=>han.test(text),
    // Preserve searchable original creator handles; these are deliberate attribution.
    hasUntranslated:text=>han.test(text.replace(/爱玩游戏的吉吉罗|二零后游戏荒/g,''))};
}
function preserve(original, translated) {
  const value=String(original), leading=value.match(/^\s*/)[0], trailing=value.match(/\s*$/)[0];
  return leading+translated+trailing;
}
