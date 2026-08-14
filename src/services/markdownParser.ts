import MarkdownIt from 'markdown-it'
import { load as loadYaml } from 'js-yaml'
import type { Choice, ChoiceLabel, PartNumber, Passage, Question, QuestionGroup, SpeechLine, TestMetadata, TestPart } from '../types/exam'

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true })
const choicePattern = /^-\s+([A-D])\.\s+(.+)$/
const speakerPattern = /^(Narrator|Speaker [123]):\s*$/

export class ToeicMarkdownError extends Error {
  readonly line?: number

  constructor(message: string, line?: number) {
    super(line ? `${message} (line ${line})` : message)
    this.name = 'ToeicMarkdownError'
    this.line = line
  }
}

interface Section { level: number; title: string; lines: string[]; line: number }

function sections(source: string): Section[] {
  const result: Section[] = []
  let current: Section = { level: 0, title: '', lines: [], line: 1 }
  result.push(current)
  source.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    const heading = /^(#{1,4})\s+(.+?)\s*$/.exec(line)
    if (heading) {
      current = { level: heading[1].length, title: heading[2], lines: [], line: index + 1 }
      result.push(current)
    } else current.lines.push(line)
  })
  return result
}

function clean(lines: string[]): string { return lines.join('\n').trim() }
function tags(lines: string[]): string[] { return lines.map((line) => /^-\s+(.+)$/.exec(line)?.[1]).filter((tag): tag is string => Boolean(tag)) }
function choices(lines: string[]): Choice[] {
  return lines.map((line) => choicePattern.exec(line.trim())).filter((match): match is RegExpExecArray => Boolean(match)).map((match) => ({ label: match[1] as ChoiceLabel, text: match[2] }))
}
function speech(lines: string[], lineOffset: number): SpeechLine[] {
  const result: SpeechLine[] = []
  let speaker: SpeechLine['speaker'] | undefined
  let buffer: string[] = []
  const flush = () => {
    const text = buffer.join(' ').trim()
    if (speaker && text) result.push({ speaker, text })
    buffer = []
  }
  lines.forEach((line, index) => {
    const match = speakerPattern.exec(line.trim())
    if (match) { flush(); speaker = match[1] as SpeechLine['speaker'] }
    else if (line.trim()) {
      if (!speaker) throw new ToeicMarkdownError('Audio text must follow a supported speaker label', lineOffset + index)
      buffer.push(line.trim())
    }
  })
  flush()
  return result
}

function answerValue(lines: string[], line: number): ChoiceLabel {
  const value = clean(lines).toUpperCase()
  if (!/^[A-D]$/.test(value)) throw new ToeicMarkdownError('Answer must be A, B, C, or D', line)
  return value as ChoiceLabel
}

export function parseMetadata(source: string): TestMetadata {
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(source.replace(/\r\n/g, '\n'))
  if (!match) throw new ToeicMarkdownError('metadata.md must begin with YAML frontmatter')
  const data = loadYaml(match[1]) as Record<string, unknown>
  if (typeof data.id !== 'string' || typeof data.title !== 'string') throw new ToeicMarkdownError('Metadata requires string id and title')
  return { id: data.id, title: data.title, version: String(data.version ?? '1.0'), difficulty: typeof data.difficulty === 'string' ? data.difficulty : undefined, targetScore: typeof data.targetScore === 'string' ? data.targetScore : undefined, demo: data.demo === true }
}

function questionFromSection(all: Section[], index: number, part: PartNumber, defaults: { speech?: SpeechLine[]; passages?: Passage[]; answers?: Map<number, ChoiceLabel>; explanations?: Map<number, string>; tags?: string[] } = {}): Question {
  const root = all[index]
  const idMatch = /^Question\s+(\d+)$/i.exec(root.title)
  if (!idMatch) throw new ToeicMarkdownError('Invalid question heading', root.line)
  const id = Number(idMatch[1])
  const children: Section[] = []
  for (let i = index + 1; i < all.length && all[i].level > root.level; i += 1) if (all[i].level === root.level + 1) children.push(all[i])
  const child = (name: string) => children.find((entry) => entry.title.toLowerCase() === name.toLowerCase())
  // Heading 本身的 body 已完整保存在 root.lines；不可继续扫描后续低层级 heading，
  // 否则下一 Passage 的内容会被错误并入当前题干。
  const bodyLines = root.lines
  const ownChoices = choices(bodyLines)
  const audioSection = child('Audio')
  const answerSection = child('Answer')
  const answer = answerSection ? answerValue(answerSection.lines, answerSection.line) : defaults.answers?.get(id)
  if (!answer) throw new ToeicMarkdownError(`Question ${id} is missing Answer`, root.line)
  let questionText = clean(bodyLines.filter((line) => !choicePattern.test(line.trim())))
  let questionChoices = ownChoices
  const audio = audioSection ? speech(audioSection.lines, audioSection.line + 1) : (defaults.speech ?? [])
  if ((part === 1 || part === 2) && questionChoices.length === 0) {
    questionChoices = audio.flatMap((entry) => {
      const match = /^([A-D])\.\s+(.+)$/.exec(entry.text)
      return match ? [{ label: match[1] as ChoiceLabel, text: match[2] }] : []
    })
  }
  if (questionChoices.length < 2) throw new ToeicMarkdownError(`Question ${id} requires choices`, root.line)
  if ((part === 1 || part === 2) && questionText === '') questionText = `Question ${id}`
  return {
    id, part, text: questionText, choices: questionChoices, answer,
    explanation: child('Explanation') ? clean(child('Explanation')!.lines) : (defaults.explanations?.get(id) ?? ''),
    vocabulary: child('Vocabulary') ? clean(child('Vocabulary')!.lines) : undefined,
    tags: child('Tags') ? tags(child('Tags')!.lines) : (defaults.tags ?? []),
    image: child('Image') ? clean(child('Image')!.lines) : undefined,
    speech: audio,
    passages: defaults.passages ?? [],
  }
}

function parseGroup(all: Section[], rootIndex: number, part: PartNumber): QuestionGroup {
  const root = all[rootIndex]
  const direct: Array<{ section: Section; index: number }> = []
  for (let i = rootIndex + 1; i < all.length && all[i].level > root.level; i += 1) if (all[i].level === root.level + 1) direct.push({ section: all[i], index: i })
  const find = (name: string) => direct.find(({ section }) => section.title.toLowerCase() === name.toLowerCase())?.section
  const audioSection = find('Audio')
  const groupSpeech = audioSection ? speech(audioSection.lines, audioSection.line + 1) : []
  const answers = new Map<number, ChoiceLabel>()
  find('Answers')?.lines.forEach((line) => {
    const match = /^(\d+):\s*([A-D])\s*$/.exec(line.trim())
    if (match) answers.set(Number(match[1]), match[2] as ChoiceLabel)
  })
  const explanationMap = new Map<number, string>()
  const explanationRoot = direct.find(({ section }) => section.title.toLowerCase() === 'explanation')
  if (explanationRoot) {
    for (let i = explanationRoot.index + 1; i < all.length && all[i].level > explanationRoot.section.level; i += 1) {
      const match = /^Question\s+(\d+)$/i.exec(all[i].title)
      if (match) explanationMap.set(Number(match[1]), clean(all[i].lines))
    }
  }
  const groupTags = find('Tags') ? tags(find('Tags')!.lines) : []
  const type = clean(find('Type')?.lines ?? []) || undefined
  const passages: Passage[] = direct.filter(({ section }) => /^Passage(?:\s+\d+)?$/i.test(section.title)).map(({ section, index }) => {
    const nested = all.find((candidate, candidateIndex) => candidateIndex > index && candidate.level === section.level + 1 && candidateIndex < all.length && candidate.line < (direct.find((entry) => entry.index > index)?.section.line ?? Number.MAX_SAFE_INTEGER))
    const content = clean(section.lines.concat(nested ? [`#### ${nested.title}`, ...nested.lines] : []))
    return { title: nested?.title ?? section.title, type, content }
  })
  const questionEntries = direct.filter(({ section }) => /^Question\s+\d+$/i.test(section.title))
  const questions = questionEntries.map(({ section, index }) => {
    const id = Number(/^Question\s+(\d+)$/i.exec(section.title)?.[1])
    const position = direct.findIndex((entry) => entry.index === index)
    const trailing = direct.slice(position + 1, direct.findIndex((entry, entryIndex) => entryIndex > position && /^Question\s+\d+$/i.test(entry.section.title)) === -1 ? direct.length : direct.findIndex((entry, entryIndex) => entryIndex > position && /^Question\s+\d+$/i.test(entry.section.title)))
    const localAnswers = new Map(answers)
    const localExplanations = new Map(explanationMap)
    const siblingAnswer = trailing.find(({ section: item }) => item.title.toLowerCase() === 'answer')?.section
    const siblingExplanation = trailing.find(({ section: item }) => item.title.toLowerCase() === 'explanation')?.section
    if (siblingAnswer) localAnswers.set(id, answerValue(siblingAnswer.lines, siblingAnswer.line))
    if (siblingExplanation) localExplanations.set(id, clean(siblingExplanation.lines))
    return questionFromSection(all, index, part, { speech: groupSpeech, passages, answers: localAnswers, explanations: localExplanations, tags: groupTags })
  })
  if (!questions.length) throw new ToeicMarkdownError(`${root.title} contains no questions`, root.line)
  return { id: `${part}-${root.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, part, questions, speech: groupSpeech, passages, tags: groupTags }
}

export function parsePart(source: string, expectedPart?: PartNumber): TestPart {
  const all = sections(source)
  const title = all.find((entry) => entry.level === 1)
  const match = title && /^Part\s+([1-7])$/i.exec(title.title)
  if (!match) throw new ToeicMarkdownError('Part file requires a level-one Part 1-7 heading')
  const number = Number(match[1]) as PartNumber
  if (expectedPart && number !== expectedPart) throw new ToeicMarkdownError(`Expected Part ${expectedPart}, found Part ${number}`, title.line)
  const roots = all.map((section, index) => ({ section, index })).filter(({ section }) => section.level === 2)
  const groups = roots.map(({ section, index }) => /^Question\s+\d+$/i.test(section.title)
    ? { id: `${number}-q-${section.title.split(' ').pop()}`, part: number, questions: [questionFromSection(all, index, number)], speech: [], passages: [], tags: [] }
    : parseGroup(all, index, number))
  if (!groups.length) throw new ToeicMarkdownError(`Part ${number} contains no question blocks`)
  return { number, title: title.title, groups }
}

export function renderMarkdown(source: string): string { return markdown.render(source) }
