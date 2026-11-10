import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'
import { parsePart } from '../src/services/markdownParser.ts'

// The user explicitly requested controllable SVG text layers for grammar infographics.
// Keep original generated artwork outside public; only the reviewed composite is served.
if (process.argv[2] && process.argv[2] !== 'test-003') throw Error('This semantic overlay blueprint applies only to Test 003.')
const definitions = {
  103: [1016, 'Modal + base verb', 'must not + obscure', ['Door ornament', 'May obscure the sign', 'Keep the sign visible']],
  105: [960, 'Verb + content clause', 'insinuate + that-clause', ['Indirect suggestion', 'that introduces content', 'No endorsement established']],
  109: [-570, 'Adjective modifies noun', 'covert → activity', ['Adjective: covert', 'Noun: activity', 'Finding: no evidence']],
  112: [1000, 'Verb + object + for', 'compensate employees for expenses', ['Company reimburses', 'Employees receive payment', 'for + approved expenses']],
  116: [-520, 'Modal + base verb', 'may + forfeit + discount', ['Condition: late payment', 'Possible loss', 'Not a certain result']],
  118: [916, 'Adjective modifies noun', 'plausible → explanation', ['Explanation is a noun', 'Plausible is an adjective', 'Believable explanation']],
  120: [1024, 'Infinitive + object', 'to + vend + apparel', ['Retailer', 'Sells branded apparel', 'Approved locations only']],
  123: [1024, 'Future: will + base verb', 'will + enact + ordinance', ['Now: planning', 'Next month', 'Enact: make law']],
  126: [1000, 'Verb + preposition', 'culminate in + final event', ['Campaign progress', 'Final stage', 'Awards ceremony: planned']],
}
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
function wrap(s, max) {
  const out = []; let line = ''
  for (const word of s.split(/\s+/)) { if ((line + word).length > max) { out.push(line); line = '' } line += word + ' ' }
  if (line) out.push(line)
  return out
}
function text(s, x, y, font, max, color = '#183f3b') {
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${font}">${wrap(s, max).map((line, i) => `<tspan x="${x}" dy="${i ? font * 1.3 : 0}">${esc(line)}</tspan>`).join('')}</text>`
}
const sourceDir = 'artwork/test-003/practice/part5'
await mkdir(sourceDir, { recursive: true })
const questions = parsePart(await readFile('public/tests/test-003/part5.md', 'utf8'), 5).groups.flatMap(g => g.questions)
for (const q of questions) {
  if (!definitions[q.id]) continue
  const [split, focus, relation, steps] = definitions[q.id]
  const target = `public/images/test-003/practice/part5/q${q.id}.webp`
  const original = `${sourceDir}/q${q.id}.webp`
  try { await access(original) } catch { await copyFile(target, original) }
  const raw = await sharp(original).resize(1536, 1024, { fit: 'fill' }).toBuffer()
  const horizontal = split < 0, x = horizontal ? 0 : split, y = horizontal ? -split : 0
  const width = 1536 - x, height = 1024 - y, pad = 28
  let content = `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#faf8f2"/>`
  content += text(`QUESTION ${q.id} · GRAMMAR & MEANING`, x + pad, y + 38, horizontal ? 22 : 19, horizontal ? 95 : 35)
  content += text(focus, x + pad, y + 89, 29, horizontal ? 90 : 29)
  content += text(relation, x + pad, y + (horizontal ? 132 : 175), horizontal ? 30 : 26, horizontal ? 95 : 28)
  if (horizontal) {
    const cardWidth = (width - 120) / 3
    steps.forEach((step, i) => {
      const left = x + 28 + i * (cardWidth + 30)
      content += `<rect x="${left}" y="${y + 160}" width="${cardWidth}" height="88" rx="14" fill="#dcebe5"/>${text(step, left + 15, y + 194, 25, 31)}`
      if (i < 2) content += `<path d="M${left + cardWidth + 3} ${y + 204}h23" stroke="#ca7858" stroke-width="4" marker-end="url(#arrow)"/>`
    })
    content += text(q.explanation, x + pad, y + 295, 23, 119)
  } else {
    steps.forEach((step, i) => {
      const top = y + 275 + i * 116
      content += `<rect x="${x + pad}" y="${top}" width="${width - 2 * pad}" height="88" rx="14" fill="#dcebe5"/>${text(step, x + pad + 18, top + 35, 24, 29)}`
      if (i < 2) content += `<path d="M${x + width / 2} ${top + 91}v20" stroke="#ca7858" stroke-width="4" marker-end="url(#arrow)"/>`
    })
    content += text('Why the other forms do not fit', x + pad, y + 665, 23, 35)
    content += text(q.explanation, x + pad, y + 712, 21, Math.floor((width - 56) / 11))
  }
  // Replace the old AI explanation strip below the Q123 scene as well.
  if (q.id === 123) content += `<rect x="0" y="836" width="1024" height="188" fill="#dcebe5"/>${text('Planned future action: next month, the city council will enact the ordinance.', 35, 900, 31, 55)}`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ca7858"/></marker></defs><g font-family="Arial, sans-serif">${content}</g></svg>`
  const layer = `${sourceDir}/q${q.id}-grammar.svg`
  await writeFile(layer, svg)
  await sharp(raw).composite([{ input: Buffer.from(svg) }]).webp({ quality: 90 }).toFile(target)
  execFileSync(process.execPath, ['scripts/practice-images.mjs', 'import', 'test-003', `test-003-part5-q${q.id}`, target])
}
console.log('Composed nine scene + controlled grammar layers. Re-review before linking.')
