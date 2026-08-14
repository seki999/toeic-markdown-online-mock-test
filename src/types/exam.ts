export type ChoiceLabel = 'A' | 'B' | 'C' | 'D'
export type PartNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface TestMetadata {
  id: string
  title: string
  version: string
  difficulty?: string
  targetScore?: string
  demo: boolean
}

export interface TestIndexEntry extends TestMetadata {
  path: string
}

export interface Choice {
  label: ChoiceLabel
  text: string
}

export interface SpeechLine {
  speaker: 'Narrator' | 'Speaker 1' | 'Speaker 2' | 'Speaker 3'
  text: string
}

export interface Passage {
  title: string
  type?: string
  content: string
}

export interface Question {
  id: number
  part: PartNumber
  text: string
  choices: Choice[]
  answer: ChoiceLabel
  explanation: string
  vocabulary?: string
  tags: string[]
  image?: string
  speech: SpeechLine[]
  passages: Passage[]
}

export interface QuestionGroup {
  id: string
  part: PartNumber
  questions: Question[]
  speech: SpeechLine[]
  passages: Passage[]
  tags: string[]
}

export interface TestPart {
  number: PartNumber
  title: string
  groups: QuestionGroup[]
}

export interface ToeicTest {
  metadata: TestMetadata
  parts: TestPart[]
}

export interface ValidationIssue {
  severity: 'error' | 'warning'
  part?: PartNumber
  questionId?: number
  message: string
}

export interface PartScore {
  part: PartNumber
  correct: number
  total: number
}

export interface TestResult {
  id: string
  testId: string
  date: string
  answers: Record<number, ChoiceLabel>
  partScores: PartScore[]
  listening: { correct: number; total: number }
  reading: { correct: number; total: number }
  total: { correct: number; total: number }
  accuracy: number
  wrongQuestions: number[]
  unansweredQuestions: number[]
}
