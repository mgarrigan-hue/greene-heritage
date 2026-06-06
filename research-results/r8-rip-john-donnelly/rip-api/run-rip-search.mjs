import { mkdir, writeFile } from 'node:fs/promises';

const root = 'research-results/r8-rip-john-donnelly';
const outDir = `${root}/rip-api`;
const candidatesDir = `${outDir}/candidates`;
await mkdir(candidatesDir, { recursive: true });

const endpoint = 'https://rip.ie/api/graphql';
const headers = {
  'content-type': 'application/json',
  'accept': 'application/json',
  'user-agent': 'Mozilla/5.0 genealogical research (Greene heritage)'
};
const listQuery = `query searchDeathNoticesForListTableWithoutPhoto($list: ListInput!, $isTiledView: Boolean!) {\n  searchDeathNoticesForList(query: $list, isTiledView: $isTiledView) {\n    count\n    perPage\n    page\n    nextPage\n    records {\n      id\n      firstname\n      surname\n      nee\n      createdAt\n      funeralArrangementsLater\n      arrangementsChange\n      county { id name }\n      town { id name }\n    }\n  }\n}`;
const detailQuery = `query getDeathNoticeWithoutFD($deathNoticeId: Float!) {\n  previewDeathNotice(deathNoticeId: $deathNoticeId) {\n    id\n    surname\n    firstname\n    nee\n    createdAt\n    description\n    address\n    dateOfDeath\n    dateOfBirth\n    oldId\n    county { id name }\n    town { id name }\n    deathNoticeCounty { county { id name } town { id name slug } }\n    familyNotices { id firstname surname expiresAt type { slug name } county { name } town { name } }\n  }\n}`;
function cleanText(html='') { return html.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#xA0;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'").replace(/\s+/g,' ').trim(); }
function slugify(s='') { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'unknown'; }
function urlFor(record) { return `https://rip.ie/death-notice/${slugify(`${record.firstname} ${record.surname}`)}-${slugify(record.county?.name||'')}-${slugify(record.town?.name||'')}-${record.id}`; }
async function gql(operationName, variables, query) {
  const res = await fetch(endpoint, { method:'POST', headers, body: JSON.stringify({ operationName, variables, query }) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${operationName} ${res.status}: ${text.slice(0,500)}`);
  return JSON.parse(text);
}
async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'user-agent': headers['user-agent'], 'accept': 'text/html' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTML ${res.status} ${url}: ${text.slice(0,200)}`);
  return text;
}
const baseFilters = (start, end, countyName='dublin') => [
  ...(countyName ? [{ field:'county.name', operator:'eq', value: countyName }] : []),
  { field:'a.createdAt', operator:'gte', value: `${start} 00:00:00` },
  { field:'a.createdAt', operator:'lte', value: `${end} 23:59:59` }
];
const searches = [
  { id:'dublin-john-donnelly-1998-2025', note:'Exact firstname/surname, Dublin, full RIP.ie window', list:{ page:1, records:40, searchFields:[{field:'a.escapedSurname',search:'Donnelly'},{field:'a.escapedFirstname',search:'John'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'all-ireland-john-donnelly-1998-2025', note:'Exact firstname/surname, all counties, full RIP.ie window', list:{ page:1, records:80, searchFields:[{field:'a.escapedSurname',search:'Donnelly'},{field:'a.escapedFirstname',search:'John'}], filters:baseFilters('1998-01-01','2025-12-31',''), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'dublin-sean-donnelly-1998-2025', note:'Sean/Seán first-name variant, Dublin', list:{ page:1, records:80, searchFields:[{field:'a.escapedSurname',search:'Donnelly'},{field:'a.escapedFirstname',search:'Sean'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'dublin-donnelly-ita-keyword-1998-2025', note:'Free-text Ita + surname Donnelly, Dublin', list:{ page:1, records:80, search:'Ita', searchFields:[{field:'a.escapedSurname',search:'Donnelly'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'dublin-donnelly-inchicore-keyword-1998-2025', note:'Free-text Inchicore + surname Donnelly, Dublin', list:{ page:1, records:80, search:'Inchicore', searchFields:[{field:'a.escapedSurname',search:'Donnelly'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'dublin-donnelly-goldenbridge-keyword-1998-2025', note:'Free-text Goldenbridge + surname Donnelly, Dublin', list:{ page:1, records:80, search:'Goldenbridge', searchFields:[{field:'a.escapedSurname',search:'Donnelly'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } },
  { id:'dublin-donnelly-drimnagh-keyword-1998-2025', note:'Free-text Drimnagh + surname Donnelly, Dublin', list:{ page:1, records:80, search:'Drimnagh', searchFields:[{field:'a.escapedSurname',search:'Donnelly'}], filters:baseFilters('1998-01-01','2025-12-31'), orders:[{field:'a.createdAtCastToDate',type:'DESC'},{field:'a.escapedSurname',type:'ASC'}] } }
];

const searchResults = [];
const byId = new Map();
for (const search of searches) {
  const payload = { operationName:'searchDeathNoticesForListTableWithoutPhoto', variables:{ list: search.list, isTiledView:false }, query:listQuery };
  await writeFile(`${outDir}/${search.id}.request.json`, JSON.stringify(payload,null,2));
  const data = await gql(payload.operationName, payload.variables, payload.query);
  await writeFile(`${outDir}/${search.id}.response.json`, JSON.stringify(data,null,2));
  const records = data?.data?.searchDeathNoticesForList?.records ?? [];
  searchResults.push({ id: search.id, note: search.note, recordCount: records.length, records: records.map(r => ({...r, url:urlFor(r)})) });
  for (const r of records) {
    if (!byId.has(r.id)) byId.set(r.id, { ...r, urls:new Set(), searchIds:[] });
    byId.get(r.id).urls.add(urlFor(r));
    byId.get(r.id).searchIds.push(search.id);
  }
}

const signals = ['Ita','Eithne','Ann','Sheila','Ger','Gerard','John Jr','Josette','Robbie','Emily','Paul','Goldenbridge','Inchicore','Drimnagh','Dublin 12','St. Michael','Michael’s','Michaels','Deansgrange'];
const candidates = [];
for (const [id, rec] of [...byId.entries()].sort((a,b)=>Number(b[0])-Number(a[0]))) {
  const detail = await gql('getDeathNoticeWithoutFD', { deathNoticeId: Number(id) }, detailQuery);
  const notice = detail?.data?.previewDeathNotice;
  const primaryUrl = [...rec.urls][0];
  const html = await fetchHtml(primaryUrl);
  const dir = `${candidatesDir}/${id}-${slugify(`${notice?.firstname||rec.firstname} ${notice?.surname||rec.surname}`)}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/notice.html`, html);
  await writeFile(`${dir}/notice.json`, JSON.stringify({ sourceUrl: primaryUrl, alternateUrls:[...rec.urls], searchIds: rec.searchIds, graphQL: detail }, null, 2));
  const text = cleanText(notice?.description || '');
  const signalHits = signals.filter(s => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(text));
  candidates.push({
    id: Number(id), url: primaryUrl, alternateUrls:[...rec.urls], searchIds:[...new Set(rec.searchIds)],
    name: `${notice?.firstname || rec.firstname} ${notice?.surname || rec.surname}`.trim(),
    dateOfDeath: notice?.dateOfDeath || null,
    createdAt: notice?.createdAt || rec.createdAt,
    address: notice?.address || '',
    places: (notice?.deathNoticeCounty || []).map(x => `${x.town?.name || ''}, ${x.county?.name || ''}`.replace(/^, /,'')).filter(Boolean),
    signalHits,
    matchAssessment: signalHits.some(s => ['Ita','Eithne','Ann','Sheila','Ger','Goldenbridge','Inchicore','Drimnagh'].includes(s)) ? 'review' : 'unlikely',
    descriptionText: text
  });
}
const summary = { generatedAt: new Date().toISOString(), source:'RIP.ie public GraphQL + notice HTML', searches: searchResults, uniqueCandidateCount: candidates.length, candidates };
await writeFile(`${outDir}/search-summary.json`, JSON.stringify(summary,null,2));
await writeFile(`${outDir}/candidate-table.tsv`, ['id\tdateOfDeath\tname\tplaces\tsignalHits\turl\tassessment\tdescription', ...candidates.map(c => [c.id,c.dateOfDeath,c.name,c.places.join('; '),c.signalHits.join(';'),c.url,c.matchAssessment,c.descriptionText.replace(/\t/g,' ').slice(0,600)].join('\t'))].join('\n'));
console.log(`searches=${searches.length} uniqueCandidates=${candidates.length}`);
for (const c of candidates) console.log(`${c.id} ${c.dateOfDeath?.slice(0,10)||''} ${c.name} | ${c.places.join('; ')} | hits=${c.signalHits.join(',') || '-'} | ${c.matchAssessment}`);
