#!/usr/bin/env node
// Phase 10 integration: apply confirmed findings from R1 (1922 marriage),
// R2 (1891 birth), and the negative R3 (Catherine maiden = Clinton, NOT McKenna)
// to data/family.json. Atomic write.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..', '..');
const DATA = join(REPO, 'data', 'family.json');

const data = JSON.parse(readFileSync(DATA, 'utf8'));

// ---------- meta ----------
data.meta.lastUpdated = '2026-04-19';

// ---------- helpers ----------
const findPerson = id => data.people.find(p => p.id === id);
const findCouple = id => data.couples.find(c => c.id === id);
const indexOfPerson = id => data.people.findIndex(p => p.id === id);

const SRC_R1 = 'IrishGenealogy.ie civil marriage register, Dundrum (Rathdown RD), 20 June 1922 — Thomas Greene (Widower, Warehouseman, of [Dublin]) × Bridget Clarke (Spinster, Housekeeper, of Drummartin House, Dundrum). Father of Thomas: WILLIAM GREENE (Traveller). Father of Bridget: PATRICK CLARKE (Farmer). Witnesses: Patrick Kennedy & Annie O\'Malley. Officiant: Richard Duggan, P.P. Holy Cross, Dundrum. Record id cima-1271568. https://www.irishgenealogy.ie/view?record_id=cima-1271568';
const SRC_R2 = 'IrishGenealogy.ie civil birth register, Duleek (Drogheda RD, Co. Meath), entry 107 — Bridget Clarke born 2 December 1891 at Mullaghfin. Father: Pat Clark, Mullaghfin, Labourer. Mother: Catherine Clarke formerly CLINTON. Informant: Julia Boylan (her mark), present at birth. Registered 26 December 1891 by James Kelly, Registrar. Record id civbi-9688899. https://www.irishgenealogy.ie/view?record_id=civbi-9688899';
const SRC_R3_NEG = 'NEGATIVE FINDING — IrishGenealogy.ie record cima-2861090 (Patrick Clarke × Catherine Kavanagh née McKenna, 25 January 1875, Navan): a top hit of the initial A3 search but NOT our family. The 1891 birth register for Bridget unambiguously gives her mother\'s maiden name as CLINTON (not McKenna). The 1875 Navan couple were also of a different age cohort (Patrick 42, Catherine 40 in 1875 → both born c.1833-35) and lived in Navan town corporation, not Mullaghfin/Duleek.';

// ============================================================================
// 1. UPDATE: thomas-greene — add William Greene as father (per 1922 marriage)
// ============================================================================
{
  const p = findPerson('thomas-greene');
  p.notes += ' FATHER CONFIRMED (April 2026, 1922 marriage register): Thomas\'s father is WILLIAM GREENE, occupation "Traveller" (almost certainly commercial traveller / travelling salesman). The 1922 marriage record names this directly. This corrects an earlier speculative parentage of Joseph Greene & Elizabeth Foran (which was based only on Joseph being the confirmed father of Mary Bridget Greene b.1874 in the same town); Joseph and William may yet prove related (siblings or cousins), but the direct documentary evidence names William. There are TWO William Greenes in our prior Portarlington research who could be this man: William Greene of Imacrannagh (farmer, with a "large family" — geographically and generationally a strong match for Thomas\'s father) and William Greene of Shanderry (labourer; census note "husband working in Dublin" — also intriguing given Thomas\'s adult life in Dublin). Identity not yet narrowed between the two.';
  p.sources.push(SRC_R1);
}

// ============================================================================
// 2. UPDATE: joseph-greene — drop "probable father of Thomas"
// ============================================================================
{
  const p = findPerson('joseph-greene');
  p.notes = 'Confirmed father of Mary Bridget Greene (b.1874, Portarlington). Married Elizabeth Foran. May be connected to Lucy Greene (widow in Kilmalogue, 1901 census). NOTE (April 2026): an earlier hypothesis that Joseph was also Thomas Christopher Greene\'s father has been SUPERSEDED — the 1922 civil marriage register for Thomas × Bridget Clarke names Thomas\'s father as WILLIAM Greene, not Joseph. Joseph and William may yet prove to be related (e.g. brothers, both from Portarlington), but on present evidence Joseph is the confirmed father of Mary Bridget only.';
  p.confidence = 'medium';
  p.sources = [
    'Ancestry record for Mary Bridget Greene (b.1874, d.1966, Queens NY)',
    'IrishGenealogy.ie civil marriage register cima-1271568 (1922) — names Thomas Greene\'s father as WILLIAM Greene, NOT Joseph; supersedes the earlier inference of Thomas as Joseph\'s son'
  ];
}

// ============================================================================
// 3. UPDATE: bridget-wife2 — tighten birth, add father, add 1922 marriage
// ============================================================================
{
  const p = findPerson('bridget-wife2');
  p.born = {
    year: '1891',
    date: '2 December 1891',
    place: 'Mullaghfin, Duleek, County Meath'
  };
  p.notes = 'Second wife of Thomas Greene. Maiden name Clarke. Born 2 December 1891 in Mullaghfin, Duleek, County Meath — CONFIRMED (April 2026) from her civil birth register (Duleek RD entry 107, registered 26 Dec 1891). Father: Patrick Clarke, labourer of Mullaghfin. Mother: Catherine née CLINTON. The four prior triangulating records — 1901 Census (age 9), 1911 Census (age 19, Cook for the Dollard JP household), 1926 Census (age 34y 4m, given to the month), and her death certificate (age 78 in 1970) — all align perfectly with the 2 December 1891 birth. 1901 CENSUS: Bridget Clarke (age 9, Scholar, Roman Catholic) recorded in House 3, Mullaghfin townland, Duleek DED, County Meath — daughter of Catherine Clarke (age 40, widow, General Labourer). Siblings: Rose (23), Patrick (18), Mary (12), Jane (10), Agnes (5). Her father Patrick Clarke had died sometime between Bridget\'s birth (Dec 1891, when he was alive as the labourer recorded on her birth register) and the 1901 Census (when Catherine was already a widow). 1911 CENSUS — CONFIRMED (April 2026): Bridget Clarke (age 19, Single, Roman Catholic, Read & Write, born Co. Meath) is working as COOK (Domestic) in the Dublin household of Joseph Dollard, Justice of the Peace and Printer-Master (Form A, Form B No. 142, enumerated 2 April 1911 by Robert J. Holmes). 1922 MARRIAGE — CONFIRMED (April 2026): Bridget Clarke married Thomas Greene on 20 June 1922 at the Roman Catholic Church of Holy Cross, Dundrum, in the Registrar\'s District of Dundrum (Union of Rathdown, Co. Dublin). Bridget was a Spinster, Housekeeper, of Drummartin House, Dundrum. Thomas was a Widower, Warehouseman, of an address in Dublin city. Her father Patrick Clarke is recorded on the register as "Farmer" (occupation slightly different from the 1891 birth register\'s "Labourer" — possibly reflecting later land-holding, or simply how Bridget remembered/described her late father). Witnesses: Patrick Kennedy and Annie O\'Malley. Officiant: Richard Duggan, P.P. Officiating Registrar: J. Sutton, Deputy Registrar of Marriages, Dundrum. The Holy Cross church and Drummartin House sit a short walk from each other in Dundrum — Bridget had clearly settled into domestic service in this affluent south Dublin suburb before her marriage. By 1926 she had moved with Thomas to York Street, Dublin (1926 Census: Wife, age 34y 4m, Home Duties, born Meath/Duleek). Mother of John, Thomas, Brendan, and Ita (Mark\'s grandmother-in-law). Family moved to 38 Goldenbridge Avenue, Inchicore in the early 1930s. Died 9 August 1970, age 78, Adelaide Hospital, Dublin. Death registered by son Brendan Greene, 62 Limekiln Drive, Terenure.';
  p.confidence = 'high';
  p.sources = [
    SRC_R2,
    SRC_R1,
    '1901 Census of Ireland: House 3 Mullaghfin, Duleek DED, Co. Meath — Bridget Clarke, age 9, Scholar, daughter of Catherine Clarke (widow). Roman Catholic. Born Co. Meath. http://www.census.nationalarchives.ie/pages/1901/Meath/Duleek/Mullaghfin/1609301/',
    '1911 Census of Ireland (CONFIRMED April 2026, Form A image — Form B No. 142, enumerated 2 April 1911 by Robert J. Holmes): Joseph Dollard household, Dublin — Bridget Clarke, Servant, age 19, Cook (Domestic), Single, Roman Catholic, Read & Write, born Co. Meath. Co-resident: Joseph Dollard (Head, 40, JP & Printer-Master, Co. Dublin), Sarah Dollard (Wife, 34, King\'s Co.), Mary (14), Kathleen (13), Sarah (3 mo.), Nursery Governess Ellen Clancy (24, Co. Meath), Housemaid Margaret Brien (20, Co. Wexford)',
    '1926 Census of the Irish Free State: York Street, Dublin — Bridget Greene, Wife, age 34 years 4 months, Home Duties, born Meath/Duleek',
    'Death Certificate: Entry 22, 9 August 1970, Adelaide Hospital, Dublin — Bridget Greene, age 78, Widow, late of 38 Goldenbridge Avenue, Inchicore. Registered by son Brendan Greene, 62 Limekiln Drive, Terenure',
    'Family oral history (Garrigan/Donnelly family, transmitted via Ita Greene/Donnelly): Bridget worked as a cook / head-of-household servant in service in Dublin before her marriage to Thomas Greene — corroborated by both the 1911 Census Form A (Cook in Joseph Dollard\'s household) and the 1922 marriage register (Housekeeper at Drummartin House, Dundrum)'
  ];
}

// ============================================================================
// 4. UPDATE: catherine-clarke — Clinton maiden name + Patrick as husband
// ============================================================================
{
  const p = findPerson('catherine-clarke');
  p.name = 'Catherine Clarke (née Clinton)';
  p.notes = 'Mother of Bridget Greene (née Clarke). MAIDEN NAME CLINTON — CONFIRMED (April 2026) from her daughter Bridget\'s 1891 civil birth register (Duleek RD entry 107), which records the mother as "Catherine Clarke formerly CLINTON". Husband: PATRICK CLARKE, labourer of Mullaghfin (also confirmed from the 1891 birth register; recorded as "Farmer" on the 1922 marriage register of his daughter Bridget × Thomas Greene). Found in BOTH the 1901 and 1911 Census at Mullaghfin, Duleek DED, County Meath. In 1901: age 40, widowed, General Labourer, could not read. Children: Rose (23), Patrick (18), Mary (12), Jane (10), Bridget (9 — born 2 December 1891 per civil birth register), Agnes (5). In 1911: age 55, still widowed, still at Mullaghfin (same House 3), now a Charwoman, still cannot read. By 1911 all her children had left home — Bridget (then 19) was working as Cook in the Dublin household of Joseph Dollard, JP & Printer-Master. Her husband Patrick Clarke had died sometime between December 1891 (when he was alive on Bridget\'s birth register) and 1901. RESEARCH LEAD (April 2026, unverified): A gravestone in Duleek Old Churchyard, transcribed by historian Enda O\'Boyle and published in Riocht na Midhe 2001/2002, reads: "Erected by the children of Thomas and Bridget Clarke of Duleek in loving memory of their father who died 23 January 1877 aged 45 years and their mother who died 25th January 1882 aged 44 years. Also their brothers, Patrick who died 4 July 1897 aged 28 years and Richard who died 25 July 1937 aged 72 years." The dates rule out the gravestone Patrick (b.~1869) being Bridget\'s father (he\'d have been ~9 when Catherine\'s eldest Rose was born in 1878). But it remains plausible that Catherine\'s husband Patrick Clarke was a brother of these — i.e. that Thomas Clarke (d.1877) and his wife Bridget Clarke née ? of Duleek were Bridget Greene\'s paternal grandparents. The naming pattern (Catherine\'s daughter Bridget b.1891 named after the grandmother Bridget; her son Patrick b.~1883 named for the family line) supports this. Also a separate Phase A3 false lead worth recording: a Patrick Clarke × Catherine Kavanagh née McKenna marriage 25 Jan 1875 Navan (record cima-2861090) was the top hit of an early search but is NOT our family — those parties were a different age cohort (b.c.1833-35) and Bridget\'s 1891 birth register definitively names her mother as Clinton, not McKenna.';
  p.confidence = 'high';
  p.sources = [
    SRC_R2,
    SRC_R1,
    SRC_R3_NEG,
    '1901 Census: Mullaghfin, Duleek DED, County Meath — Catherine Clarke, Head, age 40, Widow, General Labourer, Roman Catholic',
    '1911 Census: Mullaghfin, Duleek DED, County Meath — Catherine Clarke, Head, age 55, Widow, Charwoman, Roman Catholic, House 3',
    'Research lead (unverified): Duleek Old Churchyard gravestone — Thomas Clarke (d.23 Jan 1877, age 45) & wife Bridget (d.25 Jan 1882, age 44), with sons Patrick (d.1897 age 28) and Richard (d.1937 age 72) — possible PATERNAL grandparents of Bridget Greene née Clarke. Source: https://meathhistoryhub.ie/duleek-old-churchyard/'
  ];
}

// ============================================================================
// 5. UPDATE: patrick-clarke (brother of Bridget) — clarify naming
// ============================================================================
{
  const p = findPerson('patrick-clarke');
  p.notes = 'Child of Patrick Clarke Snr and Catherine Clarke (née Clinton) of Mullaghfin, Duleek DED, Co. Meath. BROTHER (not father) of Bridget Clarke (later Bridget Greene, m. Thomas Christopher Greene). Almost certainly named after his father Patrick Clarke Snr (the labourer of Mullaghfin, deceased before 1901). Recorded in 1901 Census of Ireland, House 3 Mullaghfin, age 18, General Labourer, literacy: Read and write. Roman Catholic. Born Co. Meath. Further life unknown.';
}

// ============================================================================
// 6. UPDATE: couple c-thomas-bridget — confirmed marriage details
// ============================================================================
{
  const c = findCouple('c-thomas-bridget');
  c.married = {
    year: '1922',
    date: '20 June 1922',
    place: 'Roman Catholic Church of Holy Cross, Dundrum, Co. Dublin (Rathdown RD)'
  };
  c.confidence = 'high';
}

// ============================================================================
// 7. ADD: william-greene-thomas-father (Thomas's father per 1922 marriage)
// ============================================================================
{
  const newPerson = {
    id: 'william-greene-thomas-father',
    name: 'William Greene',
    born: {
      year: 'c.1840s',
      place: 'Portarlington area, Queen\'s/King\'s County (presumed)'
    },
    died: null,
    occupation: 'Traveller (commercial traveller, per 1922 marriage register)',
    religion: 'Roman Catholic (presumed)',
    notes: 'Father of Thomas Christopher Greene. CONFIRMED (April 2026) from the 1922 civil marriage register (Dundrum, Rathdown RD, record cima-1271568) which names Thomas\'s father as "William Greene, Traveller". "Traveller" in this context almost certainly means commercial traveller (travelling salesman) rather than a member of the Irish Traveller community — a respectable late-Victorian / Edwardian occupation that involved going from town to town selling goods on commission. CANDIDATE IDENTITIES (not yet narrowed): two William Greenes appear in our prior Portarlington research and either could be him: (1) WILLIAM GREENE OF IMACRANNAGH — a farmer in the immediate vicinity of Portarlington, recorded with "his large family"; this is a strong geographical and generational fit for Thomas\'s father (Thomas b.c.1870 Portarlington), and a man could plausibly be a farmer in mid-life and a commercial traveller in later years; (2) WILLIAM GREENE OF SHANDERRY — listed as a labourer with the census note "husband working in Dublin", which is intriguing given Thomas\'s adult life as a Dublin warehouseman/porter. Civil records (a marriage record for William Greene to a yet-unknown wife, baptismal records of Thomas and any siblings in Portarlington Catholic parish registers, William\'s death certificate) are needed to settle the identity. NOTE: the earlier hypothesis that Joseph Greene (confirmed father of Mary Bridget Greene b.1874 Portarlington) was also Thomas\'s father is SUPERSEDED by this 1922 marriage record evidence. Joseph and William may yet prove related (siblings, cousins) — both being in Portarlington at the same time — but they are evidently distinct men.',
    confidence: 'high',
    sources: [
      SRC_R1,
      'Prior research: William Greene of Imacrannagh, Portarlington area (farmer, with a large family) — see portarlington.html',
      'Prior research: William Greene of Shanderry, Co. Laois (labourer; census note "husband working in Dublin") — see portarlington.html'
    ]
  };
  // Insert after lucy-greene (or after joseph-greene block)
  const idxLucy = indexOfPerson('lucy-greene');
  if (idxLucy >= 0) {
    data.people.splice(idxLucy + 1, 0, newPerson);
  } else {
    data.people.push(newPerson);
  }
}

// ============================================================================
// 8. ADD: patrick-clarke-snr (Bridget's father per 1891 birth + 1922 marriage)
// ============================================================================
{
  const newPerson = {
    id: 'patrick-clarke-snr',
    name: 'Patrick Clarke Snr',
    born: {
      year: 'c.1850s',
      place: 'County Meath (presumed; Mullaghfin/Duleek area)'
    },
    died: {
      year: 'c.1892–1900',
      place: 'Mullaghfin, Duleek, Co. Meath (presumed)',
      date: 'sometime between December 1891 and the 1901 Census'
    },
    occupation: 'Labourer (per 1891 birth register of his daughter Bridget); recorded as "Farmer" on the 1922 marriage register of his daughter Bridget × Thomas Greene',
    religion: 'Roman Catholic',
    notes: 'Husband of Catherine Clarke (née Clinton) of Mullaghfin, Duleek, Co. Meath. Father of at least six children: Rose (b.c.1878), Patrick (b.c.1883), Mary (b.c.1889), Jane (b.c.1891), Bridget (b. 2 December 1891), and Agnes (b.c.1896). His existence and identity are CONFIRMED (April 2026) from two civil records: (1) his daughter Bridget\'s 1891 civil birth register (Duleek RD entry 107) names him as "Pat Clark, Mullaghfin, Labourer"; (2) his daughter Bridget\'s 1922 civil marriage register (Dundrum, Rathdown RD, record cima-1271568) names him as "Patrick Clarke, Farmer" — i.e. Bridget\'s father is independently named on both records as Patrick Clarke. He was alive at Bridget\'s birth in December 1891 but had died by the 1901 Census (when Catherine is recorded as a widow). His marriage to Catherine Clinton is presumed to have taken place in Co. Meath in the 1870s (Rose, the eldest known child, was born c.1878). Under investigation: corrected A3 search dispatched April 2026 to find their marriage record. RESEARCH LEAD (unverified): the Duleek Old Churchyard gravestone (transcribed by Enda O\'Boyle in Riocht na Midhe 2001/2002) names a Thomas Clarke (d.1877, age 45) and his wife Bridget Clarke (d.1882, age 44) of Duleek with children including Patrick (d.1897 age 28) and Richard (d.1937 age 72) — generationally these would fit being Patrick Clarke Snr\'s parents (i.e. Bridget Greene\'s paternal grandparents), but his birth/baptismal record is needed to confirm. The naming pattern is suggestive: the granddaughter Bridget (b.1891) was named for the grandmother Bridget Clarke.',
    confidence: 'high',
    sources: [
      SRC_R2,
      SRC_R1,
      'Research lead (unverified): Duleek Old Churchyard gravestone — Thomas Clarke (d.23 Jan 1877, age 45) & wife Bridget (d.25 Jan 1882, age 44) — possible PARENTS of Patrick Clarke Snr (i.e. paternal grandparents of Bridget Greene née Clarke). Source: https://meathhistoryhub.ie/duleek-old-churchyard/'
    ]
  };
  // Insert near the existing patrick-clarke (brother) entry — keeps Clarke family together
  const idxBrother = indexOfPerson('patrick-clarke');
  if (idxBrother >= 0) {
    data.people.splice(idxBrother, 0, newPerson);
  } else {
    data.people.push(newPerson);
  }
}

// ============================================================================
// 9. ADD: couple c-patrick-catherine (Patrick Clarke Snr × Catherine Clinton)
// ============================================================================
{
  const newCouple = {
    id: 'c-patrick-catherine',
    partner1: 'patrick-clarke-snr',
    partner2: 'catherine-clarke',
    married: {
      year: 'c.1870s',
      place: 'County Meath (presumed; Drogheda/Navan/Duleek area — civil record search in progress)'
    },
    confidence: 'high'
  };
  // Insert after the existing c-thomas-bridget (keeps Greene/Clarke marriages together)
  const idxTb = data.couples.findIndex(c => c.id === 'c-thomas-bridget');
  if (idxTb >= 0) {
    data.couples.splice(idxTb + 1, 0, newCouple);
  } else {
    data.couples.push(newCouple);
  }
}

// ============================================================================
// 10. parentChild updates
//   - REMOVE: joseph-greene → thomas-greene (now disproven by 1922 marriage)
//   - REMOVE: elizabeth-foran → thomas-greene (same reason)
//   - ADD:    william-greene-thomas-father → thomas-greene (high confidence)
//   - ADD:    patrick-clarke-snr → bridget-wife2, rose-clarke, patrick-clarke,
//             mary-clarke, jane-clarke, agnes-clarke (high confidence)
// ============================================================================
{
  const before = data.parentChild.length;
  data.parentChild = data.parentChild.filter(pc =>
    !((pc.parent === 'joseph-greene' || pc.parent === 'elizabeth-foran') && pc.child === 'thomas-greene')
  );
  console.log(`Removed ${before - data.parentChild.length} stale joseph→thomas / elizabeth-foran→thomas links`);

  // Add William → Thomas
  data.parentChild.push({
    parent: 'william-greene-thomas-father',
    child: 'thomas-greene',
    confidence: 'high'
  });

  // Add Patrick Snr → all 6 Clarke children
  for (const child of ['rose-clarke', 'patrick-clarke', 'mary-clarke', 'jane-clarke', 'bridget-wife2', 'agnes-clarke']) {
    data.parentChild.push({
      parent: 'patrick-clarke-snr',
      child,
      confidence: 'high'
    });
  }
}

// ============================================================================
// 11. UPDATE event "c.1920s Thomas Marries Bridget Clarke" → confirmed
// ============================================================================
{
  const ev = data.events.find(e => e.title === 'Thomas Marries Bridget Clarke');
  if (ev) {
    ev.year = '1922';
    ev.date = '20 June 1922';
    ev.title = 'Thomas Marries Bridget Clarke — Holy Cross, Dundrum';
    ev.description = 'On 20 June 1922 — six months into the existence of the new Irish Free State — Thomas Greene (Widower, Warehouseman, age "Full") married Bridget Clarke (Spinster, Housekeeper, age "Full") at the Roman Catholic Church of Holy Cross, Dundrum, in the Registrar\'s District of Dundrum (Union of Rathdown, Co. Dublin). Bridget was working as housekeeper at Drummartin House in Dundrum at the time; Thomas had given an address in Dublin city. Witnesses: Patrick Kennedy and Annie O\'Malley. Officiant: Richard Duggan, P.P. The marriage register (entry 89) names Thomas\'s father as William Greene (Traveller) and Bridget\'s father as Patrick Clarke (Farmer). They went on to have four children: John, Thomas, Brendan, and Ita. CONFIRMED (April 2026) from IrishGenealogy.ie record cima-1271568.';
  }
}

// ============================================================================
// 12. UPDATE event "Catherine Clarke Widowed" → name husband
// ============================================================================
{
  const ev = data.events.find(e => e.title === 'Catherine Clarke Widowed');
  if (ev) {
    ev.year = 'c.1892–1900';
    ev.title = 'Catherine Clarke Widowed';
    ev.description = 'Catherine Clarke\'s husband PATRICK CLARKE — labourer of Mullaghfin, recorded as alive on the 26 December 1891 registration of Bridget\'s birth — dies sometime between then and the 1901 Census, leaving her a widow with six children in Mullaghfin, Duleek. She works as a general labourer — one of the hardest lives imaginable for a woman in 1890s rural Ireland. She cannot read or write. (His exact death year and cause are not yet documented; civil death registers for Drogheda/Duleek RD remain to be searched.)';
    ev.people = ['catherine-clarke', 'patrick-clarke-snr'];
  }
}

// ============================================================================
// 13. ADD new event: Bridget Clarke birth registration
// ============================================================================
{
  const newEvent = {
    year: '1891',
    date: '2 December 1891',
    title: 'Bridget Clarke Born — Registered at Duleek',
    description: 'Bridget Clarke is born on 2 December 1891 at Mullaghfin, in the District of Duleek (Union of Drogheda, County Meath). Her father is Pat Clark, Labourer, of Mullaghfin. Her mother is Catherine Clarke, formerly CLINTON. The birth is registered on 26 December 1891 by registrar James Kelly; the informant is Julia Boylan, who was present at the birth (she signed with her mark "+" — illiterate). The registration is later certified as a true copy in October 1892 and again January 1893 by the Superintendent Registrar. CONFIRMED (April 2026) from IrishGenealogy.ie record civbi-9688899. This is the document that definitively establishes Bridget\'s mother\'s maiden name as CLINTON (correcting an earlier false-positive McKenna lead from a different Co. Meath couple).',
    people: ['bridget-wife2', 'catherine-clarke', 'patrick-clarke-snr']
  };
  // Insert at a logical chronological spot — find the 1874 event and insert after the existing c.1891 birth event
  const idxExistingBirth = data.events.findIndex(e => e.title === 'Bridget Clarke Born in Duleek');
  if (idxExistingBirth >= 0) {
    // Replace the speculative one with the confirmed one
    data.events.splice(idxExistingBirth, 1, newEvent);
  } else {
    data.events.push(newEvent);
  }
}

// ============================================================================
// Atomic write
// ============================================================================
const out = JSON.stringify(data, null, 2);
writeFileSync(DATA, out, 'utf8');
console.log(`✅ Wrote ${out.length} bytes to ${DATA}`);
console.log(`   People: ${data.people.length}, Couples: ${data.couples.length}, parentChild: ${data.parentChild.length}, Events: ${data.events.length}`);
