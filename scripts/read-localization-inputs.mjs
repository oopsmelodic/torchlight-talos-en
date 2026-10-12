// Development-only: read public source text to identify UI messages. No game assets are downloaded.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
const revision = 'bf4397331eae2e683268c508906c9aec38f69d1a';
const tree = JSON.parse(await readFile('.local-source/upstream-tree.json', 'utf8'));
await mkdir('.local-source/modules', {recursive:true});
for (const {path} of tree.files.filter(x => /\.(js|css)$/.test(x.path) && !x.path.startsWith('vendor/'))) {
  try{await access(`.local-source/modules/${path}`);continue;}catch{}
  const response = await fetch(`https://raw.githubusercontent.com/xiaoyihuang0503-cyber/torchlightskill-talos/${revision}/${path}`);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  await mkdir(`.local-source/modules/${path.split('/').slice(0,-1).join('/')}`, {recursive:true});
  await writeFile(`.local-source/modules/${path}`, await response.text());
  console.log(path);
}
for (const lang of ['en', 'cn']) {
  const response = await fetch(`https://tlidb.com/${lang}/Hyperlink`);
  if (!response.ok) throw new Error(`TLIDB ${response.status}`);
  await writeFile(`.local-source/tlidb-${lang}.html`, await response.text());
}
