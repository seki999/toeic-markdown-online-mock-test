import { readFile, writeFile, mkdir, readdir, copyFile, rmdir, rename } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { parsePart } from '../src/services/markdownParser.ts'

const [command = 'validate', testId = 'test-003', id, input] = process.argv.slice(2)
if (!/^test-[a-z0-9-]+$/.test(testId)) throw Error('Unsafe test ID')
const root = path.resolve('public')
const directory = path.join(root, 'images', testId, 'practice')
const manifestPath = path.join(directory, 'manifest.json')
const hash = (value) => createHash('sha256').update(value).digest('hex')
const safe = (value) => /^images\/[a-zA-Z0-9/_-]+\.(?:webp|png|jpg|svg)$/.test(value) && !value.includes('..')
const load = async () => JSON.parse(await readFile(manifestPath, 'utf8'))
const save = async (m) => {
  await mkdir(directory, { recursive: true })
  const temp = path.join(directory, `.manifest-${process.pid}.json`)
  await writeFile(temp, JSON.stringify(m, null, 2) + '\n')
  // Windows virus scanners and dev-server watchers may briefly hold a file open.
  for (let attempt = 0; ; attempt++) {
    try { await rename(temp, manifestPath); break }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 30) throw error
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}
const strategies = {
  1: 'Draw four equal panels in a 2 by 2 grid: A top-left, B top-right, C bottom-left, D bottom-right. Depict EACH option literally as its own scene. No correctness cues, checkmarks or emphasized panel. Render large accurate A/B/C/D labels. Do not depict only the correct option.',
  2: 'Draw the workplace exchange: show the question or statement, the correct reply as an action or spatial relationship, and the communicative intent. Use a small secondary visual contrast only if needed to explain distractions; do not merely draw an isolated object.',
  3: 'Draw one coherent scene or three-step storyboard for the COMPLETE conversation. Show place, participants, problem, decision and next action, including evidence for ALL THREE correct answers. Do not invent facts.',
  4: 'Draw one coherent event/process or storyboard for the COMPLETE talk. Include setting, important times, people, actions and evidence for ALL THREE answers; not just its first sentence.',
  5: 'Create a precise educational diagram combining sentence meaning with the grammatical relationship. Use a timeline for tense, agent-to-recipient arrows for passive voice, modifier arrows for word class, relative-clause links for pronouns, spatial/temporal links for prepositions/conjunctions. Explain why alternatives do not fit. Do not merely typeset the question.',
  7: 'Create a reading evidence map for the complete passage group. Distinguish each source document, connect people, dates, requests and replies, and show the reasoning for every correct answer. For multiple passages explicitly connect evidence across documents. Preserve uncertainty, conditions, and exact arithmetic. Use a timeline or relationship diagram; do not merely reproduce questions.',
  6: 'Draw one unified process/scene for the entire passage with a small grammatical relationship layer for ALL FOUR blanks. Incorporate chronology, people, setting, actions and logical connections. Not four unrelated scenes.',
}

export async function entriesFor(test) {
  const entries = []
  const questionIds = new Set()
  for (let part = 1; part <= 7; part++) {
    const parsed = parsePart(await readFile(`public/tests/${test}/part${part}.md`, 'utf8'), part)
    parsed.groups.forEach((group, index) => {
      for (const q of group.questions) {
        if (questionIds.has(q.id)) throw Error(`Duplicate source question: ${q.id}`)
        questionIds.add(q.id)
        if (q.choices.length !== (part === 2 ? 3 : 4) || !q.choices.some(c => c.label === q.answer) || !q.explanation.trim()) throw Error(`Incomplete source question ${q.id}`)
        if (part <= 4 && !q.speech.length) throw Error(`Missing transcript for question ${q.id}`)
      }
      const grouped = [3, 4, 6, 7].includes(part)
      const token = grouped ? `group-${String(index + 1).padStart(2, '0')}` : `q${String(group.questions[0].id).padStart(3, '0')}`
      const source = {
        speech: group.speech,
        passages: group.passages,
        questions: group.questions.map(({ id, text, choices, answer, explanation, speech, image }) => ({ id, text, choices, answer, explanation, speech, image })),
      }
      const entry = {
        id: `${test}-part${part}-${token}`, testId: test, part, groupIndex: index + 1,
        questionIds: group.questions.map(q => q.id), imagePath: `images/${test}/practice/part${part}/${token}.webp`,
        imageType: part === 1 ? 'option-comparison' : part === 5 ? 'grammar-infographic' : 'scene-storyboard',
        status: 'pending', sourceHash: hash(JSON.stringify(source)),
        prompt: `Use case: scientific-educational. Original English learning illustration, consistent refined educational illustration style, clear composition and readable at mobile size. ${strategies[part]} Target ${part <= 2 ? '1536x1536' : '1536x1024'}. No logos, watermark, invented answer facts or unrelated text. This is an answer-bearing PRACTICE aid, not the original exam photograph.\nCOMPLETE SOURCE (use all questions and explanations):\n${JSON.stringify(source, null, 2)}`,
        alt: part === 1 ? `Four scenes labeled A, B, C and D illustrating the four statements in question ${group.questions[0].id}.` : `Learning illustration for Part ${part}, questions ${group.questions.map(q => q.id).join(', ')}: ${group.questions.map(q => q.choices.find(c => c.label === q.answer)?.text).join('; ')}`,
        source: 'ai-generated', license: null, attempts: 0,
        markdownPath: grouped ? group.practiceImage : group.questions[0].practiceImage,
      }
      entries.push(entry)
    })
  }
  return entries
}

async function inspect(file) {
  const data = await readFile(file)
  if (data.length > 3 * 1024 * 1024) throw Error('Image exceeds 3 MB')
  let width, height
  if (file.endsWith('.svg')) {
    const svg = data.toString()
    if (/<script|<foreignObject|on\w+=|@import|url\(\s*["']?(?!#)|(?:href|src)\s*=\s*["'](?!#)/i.test(svg)) throw Error('Unsafe SVG')
    const match = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)
    if (!match) throw Error('SVG requires explicit viewBox')
    ;[, width, height] = match.map(Number)
  } else {
    // Built-in browser decoders perform final UI validation; sharp reads actual raster metadata offline.
    const sharp = (await import('sharp')).default
    ;({ width, height } = await sharp(data).metadata())
    await sharp(data).stats()
  }
  if (Math.min(width || 0, height || 0) < 768) throw Error('Image edge is smaller than 768')
  return { width, height, bytes: data.length, checksum: hash(data) }
}

// Serialize manifest mutations: image generation, diagram imports and reviews may overlap.
const mutating = ['prepare', 'import', 'review', 'link', 'fail', 'annotate'].includes(command)
let locked = false
if (mutating) {
  await mkdir(directory, { recursive: true })
  for (let attempt = 0; attempt < 200; attempt++) {
    try { await mkdir(path.join(directory, '.lock')); locked = true; break }
    catch (error) { if (error.code !== 'EEXIST') throw error; await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  if (!locked) throw Error('Manifest is locked by another operation; retry after it finishes.')
}
try {
if (command === 'prepare') {
  let old = { entries: [] }; try { old = await load() } catch { /* New test */ }
  const entries = (await entriesFor(testId)).map(entry => {
    const prior = old.entries.find(e => e.id === entry.id && e.sourceHash === entry.sourceHash)
    return prior ? { ...entry, ...prior, prompt: entry.prompt, alt: entry.alt } : entry
  })
  await save({ version: 1, testId, entries })
  console.log(`Prepared ${entries.length} complete prompts for ${testId}`)
} else if (command === 'import') {
  const manifest = await load(); const entry = manifest.entries.find(e => e.id === id)
  if (!entry || !input) throw Error('Provide manifest ID and local image')
  const extension = path.extname(input).toLowerCase()
  if (!['.webp', '.png', '.jpg', '.svg'].includes(extension)) throw Error('Unsupported image')
  const imagePath = entry.imagePath.replace(/\.[a-z]+$/, extension)
  if (!safe(imagePath)) throw Error('Unsafe image path')
  const metadata = await inspect(input)
  const target = path.join(root, imagePath); await mkdir(path.dirname(target), { recursive: true })
  if (path.resolve(input) !== target) await copyFile(input, target)
  Object.assign(entry, metadata, { imagePath, status: 'generated', importedAt: new Date().toISOString(), attempts: (entry.attempts || 0) + 1, review: null, license: extension === '.svg' ? 'Original project-authored educational diagram' : 'Original image generated for this project', source: extension === '.svg' ? 'project-authored-svg' : 'ai-generated' })
  await save(manifest)
} else if (command === 'annotate') {
  const manifest = await load(); const entry = manifest.entries.find(e => e.id === id)
  if (!entry || !input) throw Error('Provide ID and actual prompt JSON file')
  const details = JSON.parse(await readFile(input, 'utf8'))
  if (typeof details.prompt !== 'string') throw Error('Annotation requires an actual prompt')
  entry.generationDetails = details
  await save(manifest)
} else if (command === 'fail') {
  const manifest = await load(); const entry = manifest.entries.find(e => e.id === id)
  if (!entry || !input) throw Error('Provide ID and failure reason')
  Object.assign(entry, { status: 'failed', error: input, attempts: (entry.attempts || 0) + 1, failedAt: new Date().toISOString() })
  await save(manifest)
} else if (command === 'review') {
  const manifest = await load(); const entry = manifest.entries.find(e => e.id === id)
  if (!entry || !input || !['generated', 'reviewed', 'approved'].includes(entry.status)) throw Error('Import image and provide semantic/visual review note first')
  if ((await entriesFor(testId)).find(e => e.id === id)?.sourceHash !== entry.sourceHash) throw Error('Source changed; prepare and regenerate before review')
  const metadata = await inspect(path.join(root, entry.imagePath))
  Object.assign(entry, metadata, { status: 'approved', review: input, reviewedAt: new Date().toISOString() })
  await save(manifest)
} else if (command === 'link') {
  const manifest = await load()
  const current = await entriesFor(testId)
  for (const entry of manifest.entries.filter(e => e.status === 'approved')) {
    if (typeof entry.alt !== 'string' || /[\r\n]/.test(entry.alt)) throw Error(`Alt text must be one line: ${entry.id}`)
    if (!safe(entry.imagePath) || current.find(e => e.id === entry.id)?.sourceHash !== entry.sourceHash || (await inspect(path.join(root, entry.imagePath))).checksum !== entry.checksum) throw Error(`Stale approved image: ${entry.id}`)
  }
  for (let part = 1; part <= 7; part++) {
    const filename = `public/tests/${testId}/part${part}.md`
    let source = await readFile(filename, 'utf8')
    // Sections have one-line values. Never consume a question body while removing metadata.
    source = source.replace(/^### Practice Image(?: Alt)?\r?\n[ \t]*\r?\n[^\r\n]+\r?\n(?:[ \t]*\r?\n)?/gm, '')
    const entries = manifest.entries.filter(e => e.part === part)
    let index = 0
    source = source.split(/(?=^## (?:Question|Group|Passage Group) \d+)/m).map(block => {
      if (!/^## (?:Question|Group|Passage Group) \d+/.test(block)) return block
      const entry = entries[index++]
      if (entry?.status !== 'approved') return block
      const fields = `### Practice Image\n\n${entry.imagePath}\n\n### Practice Image Alt\n\n${entry.alt}\n\n`
      if ([3, 4, 6, 7].includes(part)) return block.replace(/^(## [^\n]+\n)(?:[ \t]*\n)*/, `$1\n${fields}`)
      const position = block.search(/^### /m)
      if (position < 0) throw Error(`Question has no child sections in ${filename}`)
      return block.slice(0, position) + fields + block.slice(position)
    }).join('')
    source = source.replace(/\n{3,}/g, '\n\n')
    await writeFile(filename, source)
  }
} else if (command === 'validate') {
  const manifest = await load(); const expected = await entriesFor(testId)
  const errors = [], missing = [], unreferenced = [], pendingReview = [], seen = new Set(), paths = new Set()
  let generated = 0, approved = 0
  for (const entry of manifest.entries) {
    if (seen.has(entry.id)) errors.push(`Duplicate ID: ${entry.id}`); seen.add(entry.id)
    if (paths.has(entry.imagePath)) errors.push(`Duplicate image path: ${entry.imagePath}`); paths.add(entry.imagePath)
    const want = expected.find(e => e.id === entry.id)
    if (!want || want.sourceHash !== entry.sourceHash || JSON.stringify(want.questionIds) !== JSON.stringify(entry.questionIds)) errors.push(`Stale/unknown source: ${entry.id}`)
    if (!safe(entry.imagePath) || !entry.imagePath.startsWith(`images/${testId}/practice/`)) { errors.push(`Unsafe path: ${entry.imagePath}`); continue }
    try {
      const info = await inspect(path.join(root, entry.imagePath)); generated++
      if (entry.status === 'approved' && entry.review && entry.checksum === info.checksum) approved++
      else pendingReview.push(entry.id)
      if (want?.markdownPath !== entry.imagePath) unreferenced.push(entry.id)
    } catch (error) { missing.push(entry.id); if (entry.status !== 'pending' && entry.status !== 'failed') errors.push(`${entry.id}: ${error.message}`) }
    if (want?.markdownPath && want.markdownPath !== entry.imagePath) errors.push(`Reference mismatch: ${entry.id}`)
  }
  for (const entry of expected) if (!seen.has(entry.id)) errors.push(`Missing manifest entry: ${entry.id}`)
  const declared = new Set(manifest.entries.map(e => e.imagePath))
  for (const file of await readdir(directory, { recursive: true })) {
    const relative = `images/${testId}/practice/${file.replaceAll('\\', '/')}`
    if (/\.(webp|png|jpg|svg)$/.test(file) && !declared.has(relative)) unreferenced.push(relative)
  }
  const report = { testId, expected: expected.length, generated, approved, missing, unreferenced, pendingReview, errors,
    parts: Array.from({ length: 7 }, (_, i) => ({ part: i + 1, expected: expected.filter(e => e.part === i + 1).length, generated: manifest.entries.filter(e => e.part === i + 1 && !missing.includes(e.id)).length, approved: manifest.entries.filter(e => e.part === i + 1 && e.status === 'approved' && !missing.includes(e.id) && !pendingReview.includes(e.id)).length })) }
  await writeFile(path.join(directory, 'coverage.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  if (errors.length || (!process.argv.includes('--allow-pending') && (missing.length || unreferenced.length || pendingReview.length || approved !== expected.length))) process.exitCode = 1
} else throw Error('Unknown command')

} finally { if (locked) await rmdir(path.join(directory, '.lock')) }
