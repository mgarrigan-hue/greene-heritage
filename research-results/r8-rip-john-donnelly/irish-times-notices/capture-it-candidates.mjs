import fs from 'node:fs';
import path from 'node:path';
const base='https://notices.irishtimes.com'; const out='research-results/r8-rip-john-donnelly/irish-times-notices/candidates'; fs.mkdirSync(out,{recursive:true});
const searchFiles=fs.readdirSync('research-results/r8-rip-john-donnelly/irish-times-notices').filter(f=>f.startsWith('target-search-')||f==='search-2.html');
const links=new Set();
for(const f of searchFiles){ const html=fs.readFileSync(`research-results/r8-rip-john-donnelly/irish-times-notices/${f}`,'utf8'); for(const m of html.matchAll(/href="([^"#]*\/death\/[^"#]+)"/g)) links.add(m[1].startsWith('http')?m[1]:base+m[1]); }
const selected=[...links].filter(u=>/donnelly/i.test(u)).slice(0,30);
function clean(html){return html.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<style[\s\S]*?<\/style>/g,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#xA0;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&#xE9;|&eacute;/g,'é').replace(/&#x2019;|&rsquo;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();}
const summary=[];
for (const url of selected) {
 const res=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 genealogical research'}}); const html=await res.text();
 const id=url.split('/').pop(); const slug=url.split('/').slice(-2,-1)[0]; const dir=path.join(out,`${id}-${slug}`); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'notice.html'),html);
 const text=clean(html); const title=(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||html.match(/<title>(.*?)<\/title>/i)?.[1]||'').replace(/<[^>]+>/g,'').trim();
 const pub=text.match(/Published on the Irish Times website on ([A-Za-z0-9 ,]+)/)?.[1]||null;
 const signals=['Ita','Eithne','Ann','Sheila','Ger','Goldenbridge','Inchicore','Drimnagh','Dublin 12'].filter(s=>new RegExp(`\\b${s}\\b`,'i').test(text));
 summary.push({url,id,slug,title,published:pub,signals,textSnippet:text.slice(Math.max(0,text.indexOf(title)), Math.max(800,text.indexOf(title)+1200))});
 fs.writeFileSync(path.join(dir,'notice.json'),JSON.stringify(summary.at(-1),null,2));
}
fs.writeFileSync('research-results/r8-rip-john-donnelly/irish-times-notices/search-summary.json', JSON.stringify({generatedAt:new Date().toISOString(), searchFiles, selectedCount:selected.length, candidates:summary},null,2));
for(const c of summary) console.log(`${c.id} ${c.title} | ${c.published||''} | hits=${c.signals.join(',')||'-'} | ${c.url}`);
