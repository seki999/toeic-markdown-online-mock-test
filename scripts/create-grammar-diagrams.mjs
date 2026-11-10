import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { parsePart } from '../src/services/markdownParser.ts'

const testId = process.argv[2] || 'test-003'
if (testId !== 'test-003') throw Error('These hand-authored semantic diagrams apply only to Test 003; use complete manifest prompts for other tests.')
const questions = parsePart(await readFile(`public/tests/${testId}/part5.md`, 'utf8'), 5).groups.flatMap(g => g.questions)
// Each blueprint models a distinct relation, not a question screenshot.
const blueprints = [
  ['Equal distribution', ['Example award: $900', 'Divide among 3 teams', 'Example: $300 each'], 'Verb + adverb', 'divided → equally', 'teams'],
  ['A clause identifies a person', ['The consultant', 'who → consultant', 'specializes in airports'], 'Relative clause subject', 'Person + who + verb', 'person'],
  ['Keep the exit sign visible', ['Door decoration', 'Decoration blocks sign', 'Sign must remain visible'], 'Meaning: obscure', 'must not + obscure', 'door'],
  ['Compare two brochures', ['Last spring: less detail', 'New version: more detail', 'More informative'], 'Comparative adjective', 'more + adjective + than', 'book'],
  ['Avoid an unsupported suggestion', ['Photograph of a guest', 'No endorsement stated', 'Do not suggest endorsement'], 'Verb + that-clause', 'insinuate → suggest indirectly', 'speech'],
  ['Training must happen first', ['Complete course', 'THEN', 'Operate machine'], 'Time clause', 'before + subject + verb', 'time'],
  ['Support continuing to the present', ['2018: support begins', 'Foundation → museum', 'NOW: still supported'], 'Present perfect passive', 'has been + supported', 'building'],
  ['Identify the contract owner', ['You', 'your → signed contract', 'Send supplier a copy'], 'Possessive determiner', 'your + noun', 'document'],
  ['Describe the kind of activity', ['Auditors investigate', 'Search for hidden activity', 'Finding: no evidence'], 'Adjective → noun', 'covert describes activity', 'search'],
  ['Review precedes submission', ['Review terms', 'THEN', 'Submit application'], 'Time conjunction', 'before links two clauses', 'time'],
  ['Permission and a restricted gate', ['Provisional permit', 'Not sufficient permission', 'Restricted area'], 'Base verb after does not', 'does not + authorize', 'door'],
  ['Reimburse approved costs', ['Employee pays moving costs', 'Employer reimburses', 'Employee receives payment'], 'Verb + object + for', 'compensate employees for expenses', 'money'],
  ['Plural reference count', ['Reference 1', 'Reference 2', 'Several references'], 'Countable plural noun', 'several + references', 'document'],
  ['A barrier to obtaining parts', ['Shipping embargo', 'Parts cannot arrive easily', 'Difficult to obtain parts'], 'Infinitive complement', 'difficult + to obtain', 'shipping'],
  ['Cause of business popularity', ['Reliable service', 'CAUSE →', 'Popular company'], 'Fixed preposition phrase', 'due to + cause', 'building'],
  ['A discount can be lost', ['Pay on time: discount', 'Late payment', 'Discount may be forfeited'], 'Vocabulary: lose entitlement', 'may + forfeit + discount', 'money'],
  ['A deadline creates a consequence', ['Exhibit opens Monday', 'SO →', 'Install this weekend'], 'Result conjunction', 'cause, so + result', 'calendar'],
  ['Describe an explanation', ['Architect explains changes', 'A believable explanation', 'plausible + explanation'], 'Adjective modifies noun', 'a + plausible + explanation', 'building'],
  ['Neither proposal qualifies', ['Proposal A: does not meet', 'Proposal B: does not meet', 'Neither one meets'], 'Singular subject agreement', 'Neither of two + meets', 'document'],
  ['Sales only at approved shops', ['Branded apparel', 'Approved shop', 'Retailer may vend here'], 'Vocabulary: vend = sell', 'to + vend + merchandise', 'store'],
  ['Training revision has a purpose', ['Revise materials', 'PURPOSE →', 'Employees understand terms'], 'Purpose clause', 'so that + subject + verb', 'book'],
  ['Each entry owns its merits', ['Entry 1 → its merits', 'Entry 2 → its merits', 'Judge each entry separately'], 'Singular possessive', 'each entry → its', 'document'],
  ['Council makes an ordinance law', ['Council vote', 'New ordinance', 'Law enacted'], 'Verb + object', 'will + enact + ordinance', 'building'],
  ['A request triggers delivery', ['Reader requests', 'Office sends prospectus', 'Information becomes available'], 'Fixed expression', 'on request = when requested', 'book'],
  ['A completed replacement', ['Faulty sensor: before', 'Team replaces sensor', 'Working sensor: now'], 'Present perfect', 'has + replaced', 'machine'],
  ['A campaign reaches its finale', ['Campaign work', 'Progress →', 'Public awards ceremony'], 'Vocabulary + preposition', 'culminate in + final event', 'teams'],
  ['Compare processing speeds', ['Old scanner: longer time', 'New scanner: shorter time', 'Processes more quickly'], 'Comparative adverb', 'more quickly + than', 'machine'],
  ['Set aside a room', ['Staff make booking', 'Conference room reserved', 'Interviews take place'], 'Modal + base verb', 'should + reserve', 'calendar'],
  ['Keep the evaluation impartial', ['Application A', 'Equal political treatment', 'Application B'], 'Noun object of maintains', 'political + neutrality', 'scales'],
  ['Distinguish two motives', ['Help others', 'Award recognizes altruism', 'Rather than personal gain'], 'Contrast noun phrases', 'altruism rather than gain', 'scales'],
]
const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
function lines(text, max = 49) {
  const words = text.split(/\s+/), out = []; let line = ''
  for (const word of words) { if ((line + word).length > max) { out.push(line); line = '' } line += `${word} ` }
  if (line) out.push(line)
  return out
}
function text(text, x, y, size = 28, fill = '#183f3b', max = 49) {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}">${lines(text, max).map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${esc(line)}</tspan>`).join('')}</text>`
}
function pictogram(kind, x, y, stage, questionId) {
  const common = `transform="translate(${x} ${y})" fill="none" stroke="#2c5c57" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"`
  const symbols = {
    teams: '<circle cx="30" cy="30" r="17"/><circle cx="85" cy="30" r="17"/><circle cx="140" cy="30" r="17"/><path d="M10 100V75Q30 50 50 75v25m15 0V75q20-25 40 0v25m15 0V75q20-25 40 0v25"/>',
    person: '<circle cx="80" cy="28" r="23"/><path d="M25 125V95q55-65 110 0v30M130 38h45v45h-45z"/>',
    door: '<path d="M30 140V0h100v140M0 140h160M110 73h1"/><rect x="22" y="-20" width="116" height="34"/><path d="M60-3h40m-10-9 12 9-12 9"/>',
    book: '<path d="M5 10q35-15 70 5 35-20 70-5v100q-35-15-70 5-35-20-70-5zM75 15v100M23 40h30m-30 24h30m45-24h30m-30 24h30"/>',
    speech: '<rect x="10" y="5" width="145" height="85" rx="18"/><path d="M30 90v25l30-25M40 35h80M40 60h60"/>',
    time: '<circle cx="80" cy="65" r="60"/><path d="M80 25v40l32 22M80 5v8M20 65h8M132 65h8"/>',
    building: '<path d="M10 45l70-42 70 42H10m15 10v65m36-65v65m38-65v65m36-65v65M5 125h150M5 140h150"/>',
    document: '<path d="M30 0h80l35 35v110H30zM110 0v35h35M50 65h70M50 90h70M50 115h45"/>',
    search: '<circle cx="66" cy="60" r="47"/><path d="M100 95l48 48M45 45h40M45 65h30"/>',
    money: '<rect x="5" y="20" width="145" height="88" rx="8"/><circle cx="78" cy="64" r="24"/><path d="M78 32v64M18 40h12m90 48h12"/>',
    shipping: '<rect x="5" y="30" width="100" height="70"/><path d="M105 55h32l20 25v20h-52M30 100a15 15 0 1 0 1 0m90 0a15 15 0 1 0 1 0M50 30v40l15-10 15 10V30"/>',
    calendar: '<rect x="10" y="20" width="140" height="120" rx="8"/><path d="M10 55h140M45 5v30M115 5v30M40 85h20m30 0h20m-70 25h20"/>',
    store: '<path d="M10 45l15-35h110l15 35H10M20 45v95h120V45M45 140V80h35v60M100 75h25v25h-25z"/>',
    machine: '<rect x="5" y="35" width="150" height="100" rx="12"/><path d="M30 35V0h100v35M35 75h60m-60 25h60"/><circle cx="128" cy="65" r="7"/>',
    scales: '<path d="M80 5v130M35 140h90M15 40h130M35 40l-25 60h50zM125 40l-25 60h50z"/>',
  }
  let drawing = symbols[kind]
  if (questionId === 103) {
    const cy = stage === 1 ? -3 : 95
    drawing += `<circle cx="80" cy="${cy}" r="27" stroke="#b89561" stroke-width="16"/><path d="M60 ${cy-18}l-12-8m62 20 12 3m-25 20 6 12" stroke="#b89561"/>`
  }
  if (questionId === 101) drawing += `<rect x="45" y="105" width="70" height="30" rx="4" fill="#f2d8ab" stroke-width="3"/>`
  if (questionId === 127) drawing += `<path d="M20 155h${stage === 0 ? 135 : 65}" stroke="#ca7858" stroke-width="12"/>`
  return `<g ${common}>${drawing}</g>`
}
const only = new Set((process.argv[3] || '').split(',').filter(Boolean).map(Number))
const dir = `public/images/${testId}/practice/part5`; await mkdir(dir, { recursive: true })
for (let i = 0; i < questions.length; i++) {
  if (only.size && !only.has(questions[i].id)) continue
  if (!only.size && [103,105,109,112,116,118,120,123,126].includes(questions[i].id)) continue
  const q = questions[i], [title, steps, focus, relation, kind] = blueprints[i]
  const answer = q.choices.find(c => c.label === q.answer).text
  const completed = q.text.replace(/_{3,}/g, answer)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" role="img"><title>${esc(title)}</title><desc>${esc(completed)} ${esc(q.explanation)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ca7858"/></marker></defs><rect width="1536" height="1024" fill="#faf8f2"/><g font-family="Arial, sans-serif">${text(`PART 5 · QUESTION ${q.id}`,60,65,22)}${text(title,60,125,42)}${text(completed,60,190,28,'#384e52',90)}${steps.map((step, j) => `<rect x="${55+j*500}" y="300" width="425" height="300" rx="24" fill="#e6efea"/>${pictogram(kind,185+j*500,330,j,q.id)}${text(step,80+j*500,515,27,'#183f3b',23)}${j<2?`<path d="M${485+j*500} 440h60" stroke="#ca7858" stroke-width="5" marker-end="url(#arrow)"/>`:''}`).join('')}<rect x="55" y="635" width="1425" height="325" rx="24" fill="#183f3b"/>${text(focus,85,685,29,'#ffffff',75)}${text(relation,85,735,34,'#f5c998',65)}${text(q.explanation,85,795,25,'#ffffff',100)}</g></svg>`
  const file = `${dir}/q${q.id}.svg`; await writeFile(file, svg)
  execFileSync(process.execPath, ['scripts/practice-images.mjs', 'import', testId, `${testId}-part5-q${q.id}`, file])
}
console.log('Created requested semantic grammar diagrams; visual review is still required.')
