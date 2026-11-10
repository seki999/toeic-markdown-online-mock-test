import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { parsePart } from '../src/services/markdownParser.ts'

const testId = process.argv[2] || 'test-003'
if (testId !== 'test-003') throw Error('These source-reviewed blueprints apply only to Test 003.')
const groups = parsePart(await readFile(`public/tests/${testId}/part7.md`, 'utf8'), 7).groups
// Hand-authored evidence links: source document numbers are explicit, never inferred by a model.
const plans = [
  ['Riverton Film Weekend', ['Screening: Nov 7, 7 p.m.', 'Then: director discussion', 'Next film: date not announced'], ['Film + discussion included', 'Press: lobby + guest consent', 'Sequel timing remains uncertain']],
  ['Neighborhood survey', ['Apr 10: confirm availability', 'Apr 14, 10 a.m.: practice', 'May: council receives summary'], ['Scope: public-service information', 'Practice required for everyone', 'Insert rule introduction at [1]']],
  ['North Pier access', ['Safety review: queues + access', 'July 1: reservations required', 'Review system after 3 months'], ['Safety problem prompts change', 'Cancellation: 30-day voucher', 'Request shuttle when reserving']],
  ['Mill Fen restoration', ['Gradual reed removal', 'Decoy tests bird responses', 'Compare counts with past surveys'], ['Avoid soil and garden damage', 'Decoy is a research tool', 'Bird-count trend measures progress']],
  ['Fleet safety procedure', ['Inspect before departure', 'Damaged tire: log + replace vehicle', 'Monday 8:30: demonstration'], ['Report damage; change vehicle', 'Mechanics may use recording', 'Ground-level task may be requested']],
  ['Elm House Sunday dining', ['Sunday sales', '10% contribution', 'Charity food deliveries'], ['Sales support deliveries', 'More than 6 guests: deposit', 'Mention ramp needs when booking']],
  ['Lumen Street Festival', ['D1: workshop $25; courtyard #18', 'D2: two places minus one canceled', 'D1 + D2: ballet friend attends 5 p.m.'], ['Retains one paid workshop seat', 'Ballet at 5; concert at 7', 'Instruction behind number 18']],
  ['A confidential claim', ['D2: rejection: missing invoice', 'D1 + D2: upload securely', 'D1 + D2: urgent officer escalation'], ['Rejection is about a document', 'Send claim number + deadline', 'Keep medical details private']],
  ['Harrow Exchange training', ['D2: registers March 8; pays $40', 'D1: before March 10 gets workbook', 'D2: electronic, else collect print'], ['No investment recommendations', 'March 8 is before deadline', 'Printed copy is fallback option']],
  ['Bay Museum admission', ['D2: first session, two visitors', 'D1: week one = water samples', 'D1 + D2: $10 member + $15 other'], ['Requested session: water samples', 'Total admission = $25', 'Online service temporarily down']],
  ['Heritage memorial', ['D1: report 8; opening cue 10', 'D2: arrives 9; offers badge help', 'D1 + D2: 8 to 9 = one hour late'], ['Office reviews written tribute', 'Arrival is one hour after reporting', 'Still available before opening']],
  ['River Stage auditions', ['D2: applicant is 17', 'D1: under 18 needs guardian', 'D2: 3:30 request; leave backdrop'], ['Guardian required because of age', '3:30 fits request and 10–4 window', 'Elaborate backdrop stays at home']],
  ['Crest Lodge weekend', ['D1: $220 per adult package', 'D2: two adults; easy route + room', 'D3: $440; Room 3; Sat meadow'], ['Reply assigns Saturday meadow', 'Ground floor meets room request', '2 × $220 = $440 for packages']],
  ['Screen Rights Forum', ['D3: arrives 14:00; wants producer', 'D2: producer panel at 14:15', 'D2: questions due before 14:45'], ['Producer scheduled at 14:15', '14:00 arrival allows timely submission', 'Concern: public school screening rights']],
  ['Harbor Hotel complaint', ['D2: April 11 says yesterday, 18:20', 'D3: check April 10 desk roster', 'D1 + D3: review before discipline'], ['Yesterday = April 10', 'Interview both staff before deciding', 'Keep accommodation reservation']],
  ['Forge Safety Seminar', ['D1: $60 minus $15 partner discount', 'D2: three partner places; review list', 'D3: 3 × $45 = $135; seminar only'], ['Partner discount gives $45 each', 'Supplier-list review follows seminar', 'No equipment included']],
  ['Orion safety decision', ['D2: May 5 outing; rain concern', 'D3: May 4, 6 p.m. safety review', 'D3: if unsafe, transfer to May 12'], ['Decision: evening before outing', 'Default transfer unless refund requested', 'D1 + D3: avoid unnecessary risk']],
  ['Violin assessment and repair', ['D2: inspect first; $120 budget cap', 'D3: $20 inspection + $70 adjustment', 'D3: email estimate; await approval'], ['Assessment and possible repair', '$90 expected if wood is sound', 'Client approval BEFORE repair']],
]
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
function lines(text, limit) {
  const out = []; let line = ''
  for (const word of String(text).split(/\s+/)) { if ((line + ' ' + word).trim().length > limit && line) { out.push(line); line = word } else line = (line + ' ' + word).trim() }
  if (line) out.push(line)
  return out
}
function text(value, x, y, size = 24, limit = 62, color = '#193f40') {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${lines(value, limit).map((s, i) => `<tspan x="${x}" dy="${i ? size * 1.35 : 0}">${esc(s)}</tspan>`).join('')}</text>`
}
await mkdir(`public/images/${testId}/practice/part7`, { recursive: true })
for (const [i, group] of groups.entries()) {
  const [title, chain, conclusions] = plans[i]
  const height = 1450
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 ${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ba6749"/></marker></defs><rect width="1536" height="${height}" rx="24" fill="#f8f5ec"/><g font-family="Arial, sans-serif">`
  svg += text(`PART 7 · READING EVIDENCE MAP · GROUP ${i + 1}`, 60, 55, 22, 90)
  svg += text(title, 60, 112, 40, 75)
  svg += text('Read the documents → connect the evidence → explain the answers', 60, 158, 24, 100)
  // A document strip makes single/double/triple material ownership explicit.
  const width = (1416 - (group.passages.length - 1) * 24) / group.passages.length
  for (const [d, passage] of group.passages.entries()) {
    const x = 60 + d * (width + 24)
    svg += `<rect x="${x}" y="192" width="${width}" height="96" rx="14" fill="#dcebe5"/><path d="M${x + 22} 211h26l12 12v43h-38zM${x + 48} 211v14h12" fill="none" stroke="#2c5c57" stroke-width="2"/>`
    svg += text(`D${d + 1} · ${passage.title}`, x + 78, 235, 25, Math.floor((width - 95) / 14))
  }
  for (let n = 0; n < 3; n++) {
    const x = 60 + n * 485
    svg += `<rect x="${x}" y="325" width="446" height="145" rx="16" fill="#fff" stroke="#acc6bc"/><circle cx="${x + 30}" cy="355" r="16" fill="#2c5c57"/>`
    svg += text(n + 1, x + 23, 362, 20, 3, '#fff')
    svg += text(chain[n], x + 23, 402, 26, 29)
    if (n < 2) svg += `<path d="M${x + 450} 397h28" stroke="#ba6749" stroke-width="4" marker-end="url(#arrow)"/>`
  }
  svg += text('ANSWER EVIDENCE · follow each connection back to the original material', 60, 520, 23, 100)
  for (const [n, q] of group.questions.entries()) {
    const y = 550 + n * 270
    svg += `<rect x="60" y="${y}" width="1416" height="245" rx="16" fill="${n % 2 ? '#e7eee8' : '#fff'}" stroke="#bdcfc5"/><rect x="60" y="${y}" width="110" height="245" rx="16" fill="#214b49"/>`
    svg += text(`Q${q.id}`, 76, y + 48, 28, 6, '#fff')
    svg += text(conclusions[n], 200, y + 40, 29, 76)
    svg += text(`Answer ${q.answer}: ${q.choices.find(c => c.label === q.answer).text}`, 200, y + 93, 24, 88)
    svg += text(q.explanation, 200, y + 145, 23, 91)
  }
  svg += text('Learning aid with answer clues · conditions and uncertainty remain part of the evidence', 60, 1410, 21, 115)
  svg += '</g></svg>'
  const id = `${testId}-part7-group-${String(i + 1).padStart(2, '0')}`
  const file = `public/images/${testId}/practice/part7/group-${String(i + 1).padStart(2, '0')}.svg`
  await writeFile(file, svg)
  execFileSync(process.execPath, ['scripts/practice-images.mjs', 'import', testId, id, file, 'project-authored', 'Original project-authored SVG evidence map'])
}
console.log(`Created ${groups.length} editable reading evidence maps; review before approval.`)

