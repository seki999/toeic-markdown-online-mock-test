import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePart } from '../src/services/markdownParser.ts'
import { answerSource, explanationFor, learningQuestions, subtitleFor } from '../src/services/learningScript.ts'

const mode = process.argv[2]
if (!['generate', 'validate'].includes(mode)) throw new Error('Expected generate or validate')
const requested = process.argv.slice(3).find(argument => !argument.startsWith('--'))
const includeScripts = process.argv.includes('--scripts')
const root = resolve('public')
const entries = JSON.parse(await readFile(resolve(root, 'tests/index.json'), 'utf8'))
const tests = entries.filter(entry => !requested || entry.id === requested)
if (requested && !tests.length) throw new Error(`Unknown published test: ${requested}`)
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const chinese = value => nonempty(value) && /\p{Script=Han}/u.test(value)

for (const test of tests) {
  const folder = resolve(root, test.path)
  const parts = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
    const number = index + 1
    return parsePart(await readFile(resolve(folder, `part${number}.md`), 'utf8'), number)
  }))
  let notes = { subtitles: {}, answers: {} }
  try {
    notes = JSON.parse(await readFile(resolve(folder, 'learning.zh-CN.json'), 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  for (const key of ['subtitles', 'answers']) {
    if (!notes?.[key] || typeof notes[key] !== 'object' || Array.isArray(notes[key])) throw new Error(`${test.id}: invalid ${key}`)
  }
  const questions = parts.flatMap(learningQuestions)
  const segments = new Map()
  const answers = new Map()
  for (const { question, segments: lines } of questions) {
    if (answers.has(String(question.id))) throw new Error(`${test.id}: duplicate question ${question.id}`)
    answers.set(String(question.id), question)
    for (const line of lines) {
      if (segments.has(line.id) && segments.get(line.id).textEn !== line.textEn) throw new Error(`${test.id}: conflicting segment ${line.id}`)
      segments.set(line.id, line)
    }
  }
  let invalid = false
  for (const [id, note] of Object.entries(notes.subtitles)) {
    if (segments.get(id)?.textEn !== note?.textEn || !chinese(note?.textZh) || (note.noteZh !== undefined && !chinese(note.noteZh))) {
      console.error(`${test.id}: invalid or outdated subtitle ${id}`)
      invalid = true
    }
  }
  for (const [id, note] of Object.entries(notes.answers)) {
    const question = answers.get(id)
    if (!question || note?.source !== answerSource(question) || !chinese(note.textZh)) {
      console.error(`${test.id}: invalid or outdated explanation ${id}`)
      invalid = true
    }
  }
  const missingSubtitles = Object.fromEntries([...segments.values()].filter(line => !subtitleFor(notes, line)).map(line => [line.id, { textEn: line.textEn, textZh: '' }]))
  const missingAnswers = Object.fromEntries([...answers].filter(([, question]) => !explanationFor(notes, question)).map(([id, question]) => [id, { source: answerSource(question), textZh: '' }]))
  const coverage = {
    questions: questions.length,
    fullyTranslated: questions.filter(item => item.segments.every(line => subtitleFor(notes, line))).length,
    subtitles: { translated: segments.size - Object.keys(missingSubtitles).length, total: segments.size },
    explanations: { translated: answers.size - Object.keys(missingAnswers).length, total: answers.size },
  }
  if (mode === 'generate') {
    const scripts = includeScripts ? questions.map(({ question, segments: lines, image, completedSentence }) => ({
      questionId: question.id, part: question.part,
      imageUrls: [question.image, image].filter(Boolean),
      segments: lines.map(line => ({ ...line, textZh: subtitleFor(notes, line)?.textZh, noteZh: subtitleFor(notes, line)?.noteZh })),
      correctAnswer: question.answer, completedSentence, explanationZh: explanationFor(notes, question),
    })) : undefined
    console.log(JSON.stringify({ testId: test.id, coverage, missingSubtitles, missingAnswers, scripts }, null, 2))
  } else {
    console.log(`${test.id}: ${JSON.stringify(coverage)}`)
  }
  if (invalid) process.exitCode = 1
}
