import {readFileSync,writeFileSync,mkdirSync,copyFileSync,rmSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {extname,basename} from 'node:path';

rmSync('public',{recursive:true,force:true});
mkdirSync('public/assets/fonts',{recursive:true});
const digest=data=>createHash('sha256').update(data).digest('hex').slice(0,12);
function asset(file){
 const data=readFileSync(file),extension=extname(file);
 const path='/assets/'+basename(file,extension)+'.'+digest(data)+extension;
 writeFileSync('public'+path,data);
 return path;
}
const logo=asset('worker/assets/optimized/no9-logo.webp');
const favicon=asset('worker/assets/optimized/favicon.png');
const icon192=asset('worker/assets/optimized/icon-192.png');
const icon512=asset('worker/assets/optimized/icon-512.png');
let html=readFileSync('worker/app.html','utf8');
let auth=readFileSync('worker/auth.js','utf8');
// These two values are public client configuration, never privileged credentials.
const url=process.env.SUPABASE_URL?.replace(/\/$/,'');
const key=process.env.SUPABASE_PUBLISHABLE_KEY;
let config=null;
if(url&&key){
 let publicKey=key.startsWith('sb_publishable_');
 try{publicKey ||= JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='anon'}catch{}
 if(!publicKey)throw Error('SUPABASE_PUBLISHABLE_KEY must be a publishable or anon key.');
 if(new URL(url).protocol!=='https:')throw Error('SUPABASE_URL must use HTTPS.');
 config={url,key};
}
auth=auth.replace('/* PUBLIC_CONFIG */null',JSON.stringify(config).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029'));
html=html.replace('<script>','<script>'+readFileSync('worker/schedule.js','utf8').replaceAll('export ','')+'\n'+auth+'\n');
html=html.replace("let r=await fetch('/api/'+path","const token=await accessToken();let r=await fetch('/api/'+path");
html=html.replace("headers:{'Content-Type':'application/json'}","headers:{'Content-Type':'application/json',Authorization:'Bearer '+token}");
html=html.replace("window.addEventListener('online',load);setInterval(()=>{if(!$('#modal').open)load()},60000);load();","window.addEventListener('online',()=>{if(session?.access_token)load()});setInterval(()=>{if(session?.access_token&&!$('#modal').open)load()},60000);startAuth();");
html=html.replace("b.onclick=()=>{page=b.dataset.page;render()}","b.onclick=()=>{if(!session?.access_token){showLogin();return}page=b.dataset.page;render()}");
html=html.replace('ChatGPT kullanıcısı','Atölye üyesi').replace('hesabıyla giriş yaptın. Bu siteye erişim verilen kullanıcılar aynı üretim ve stok defterini görür. Yeni kişilere erişim, sitenin paylaşım ayarlarından verilir.','hesabıyla giriş yaptın. Atölyeye eklenen kullanıcılar aynı üretim ve stok defterini görür. Yeni kişilere erişim atölye yöneticisi tarafından verilir.');
html=html.replace('<h3 style="margin-top:26px">Varsayılan süreler</h3>','<button class="secondary" style="margin-top:18px" onclick="logout()">Çıkış yap</button><h3 style="margin-top:26px">Varsayılan süreler</h3>');
html=html.replaceAll('/assets/no9-logo.png',logo).replaceAll('width="1402" height="1122"','width="640" height="512"');
html=html.replace('type="image/svg+xml" href="/icon.svg"','type="image/png" href="'+favicon+'"');
html=html.replace('<body>','<link rel="apple-touch-icon" href="'+icon192+'"><body>');
const css=asset('worker/app.css');
html=html.replace('/app.css',css);
writeFileSync('public/index.html',html);
const fonts=[];
for(const file of readdirSync('worker/assets/fonts')){
 copyFileSync('worker/assets/fonts/'+file,'public/assets/fonts/'+file);
 if(file.endsWith('.woff2'))fonts.push('/assets/fonts/'+file);
}
writeFileSync('public/manifest.webmanifest',JSON.stringify({id:'/',name:'no:9 — Bira Defteri',short_name:'no:9',lang:'tr',start_url:'/',display:'standalone',background_color:'#f5f2ea',theme_color:'#173b4b',icons:[{src:icon192,sizes:'192x192',type:'image/png',purpose:'any'},{src:icon512,sizes:'512x512',type:'image/png',purpose:'any'}]}));
const shellVersion=digest(html);
const shell=['/',css,logo,favicon,'/manifest.webmanifest'];
const staticFiles=[...shell,...fonts,icon192,icon512];
writeFileSync('public/sw.js',`const CACHE='no9-shell-${shellVersion}';
const SHELL=${JSON.stringify(shell)},STATIC=${JSON.stringify(staticFiles)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('no9-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url),navigate=e.request.mode==='navigate';
 if(e.request.method!=='GET'||u.origin!==location.origin||(!navigate&&!STATIC.includes(u.pathname)))return;
 const update=async()=>{const r=await fetch(e.request);if(r.ok){const c=await caches.open(CACHE);await c.put(navigate?'/':e.request,r.clone())}return r};
 if(!navigate&&u.pathname!=='/manifest.webmanifest')e.respondWith(caches.match(e.request).then(r=>r||update()));
 else e.respondWith(update().catch(()=>caches.match(navigate?'/':e.request).then(r=>r||new Response('İlk açılış için internete bağlan.'))));
});`);
console.log('Vercel PWA build complete.');
