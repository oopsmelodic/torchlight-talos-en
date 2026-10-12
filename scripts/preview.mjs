// Private browser acceptance harness. Original HTML is ignored by Git and not shipped.
// Modules/styles/media are served by the original website, not bundled in the userscript.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.TALOS_PREVIEW_PORT||4173);
createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/talos-english.user.js'){
      res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});
      res.end(await readFile('dist/talos-english.user.js'));return;
    }
    if(path==='/preview'||path==='/baseline'){
      let html=await readFile('.local-source/index.html','utf8');
      html=html.replace(/<script[^>]+src="https:\/\/torchlightskill-analytics[^>]*><\/script>/g,'');
      html=html.replace('<head>','<head><base href="https://torchlightskill.com/talos/">'+(path==='/preview'?`<script src="http://127.0.0.1:${port}/talos-english.user.js"></script>`:''));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
    }
    res.writeHead(404);res.end('Not found');
  }catch(error){res.writeHead(500);res.end(error.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Local acceptance harness: http://127.0.0.1:${port}/preview (Chinese baseline: /baseline)`));
