import type { Question, QuestionGroup, SpeechLine, TestPart } from '../types/exam'

export interface LearningSegment {
  id: string
  type: 'instruction' | 'question' | 'dialogue' | 'option' | 'passage'
  textEn: string
  speaker?: SpeechLine['speaker']
  option?: string
  audioUrl?: string
  startMs?: number
  endMs?: number
}

export interface LearningNotes {
  subtitles: Record<string, { textEn: string; textZh: string; noteZh?: string }>
  answers: Record<string, { source: string; textZh: string }>
}

export interface LearningQuestion {
  question: Question
  segments: LearningSegment[]
  questionStart: number
  sharedQuestionIds: number[]
  image?: string
  imageAlt?: string
  completedSentence?: string
  missingOptions: boolean
}

export function learningQuestions(part: TestPart): LearningQuestion[] {
  return part.groups.flatMap(group => group.questions.map(question => buildScript(part, group, question)))
}

export function splitLearningText(text: string): string[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' })
  return text.split(/\n\s*\n/).flatMap(paragraph => {
    const sentences: string[] = []
    let pending = ''
    for (const { segment } of segmenter.segment(paragraph)) {
      pending += segment
      if (/(?:\b(?:Mr|Mrs|Ms|Dr|Prof|St|vs|e\.g|i\.e)\.|\b[A-Z]\.)\s*$/.test(pending)) continue
      if (pending.trim()) sentences.push(pending.trim())
      pending = ''
    }
    if (pending.trim()) sentences.push(pending.trim())
    return sentences
  })
}

export function answerSource(question: Question) {
  return [question.answer, question.explanation, question.vocabulary].filter(Boolean).join('\n')
}

function buildScript(part: TestPart, group: QuestionGroup, question: Question): LearningQuestion {
  const segments: LearningSegment[] = []
  const questionKey = `q${question.id}`
  const add = (key: string, type: LearningSegment['type'], text: string, speaker?: SpeechLine['speaker'], option?: string) => {
    splitLearningText(text).forEach((textEn, index) => segments.push({ id: `${key}.${index + 1}`, type, textEn, speaker, option }))
  }
  if (part.instructions) add(`part${part.number}.instruction`, 'instruction', part.instructions)

  const lines = group.speech.length ? group.speech : question.speech
  const audioOptions = new Set<string>()
  lines.forEach(({ speaker, text }, index) => {
    const option = part.number <= 2 ? /^([A-D])\.\s+/.exec(text)?.[1] : undefined
    if (option) audioOptions.add(option)
    add(
      group.speech.length ? `${group.id}.audio.${index + 1}` : `${questionKey}.audio.${index + 1}`,
      option ? 'option' : speaker === 'Narrator' ? 'instruction' : part.number === 2 ? 'question' : 'dialogue',
      text, speaker, option,
    )
  })

  question.passages.forEach((passage, index) => add(`${group.id}.passage.${index + 1}`, 'passage', passage.content))
  const questionStart = segments.length
  if (part.number > 2 || question.text !== `Question ${question.id}`) add(`${questionKey}.stem`, 'question', question.text)
  for (const choice of question.choices) {
    if (!audioOptions.has(choice.label)) add(`${questionKey}.option.${choice.label}`, 'option', choice.text, undefined, choice.label)
  }

  const correct = question.choices.find(choice => choice.label === question.answer)
  return {
    question, segments, questionStart,
    sharedQuestionIds: group.questions.length > 1 ? group.questions.map(entry => entry.id) : [],
    image: question.practiceImage ?? group.practiceImage,
    imageAlt: question.practiceImage ? question.practiceImageAlt : group.practiceImageAlt,
    completedSentence: part.number === 5 && correct && /_{2,}/.test(question.text)
      ? question.text.replace(/_{2,}/, () => correct.text) : undefined,
    missingOptions: part.number === 1 && question.choices.length < 4,
  }
}

export function subtitleFor(notes: LearningNotes | undefined, segment: LearningSegment) {
  const note = notes?.subtitles[segment.id]
  return note?.textEn === segment.textEn ? note : undefined
}

export function explanationFor(notes: LearningNotes | undefined, question: Question) {
  const answer = notes?.answers[question.id]
  return answer?.source === answerSource(question) ? answer.textZh : undefined
}
