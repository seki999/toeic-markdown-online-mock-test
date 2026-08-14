import type { ChoiceLabel, PartNumber, TestResult, ToeicTest } from '../types/exam'
import { allQuestions } from './testLoader'

export function scoreTest(test: ToeicTest, answers: Record<number, ChoiceLabel>): TestResult {
  const questions = allQuestions(test)
  const partScores = test.parts.map((part) => {
    const partQuestions = part.groups.flatMap((group) => group.questions)
    return { part: part.number, correct: partQuestions.filter((question) => answers[question.id] === question.answer).length, total: partQuestions.length }
  })
  const sum = (parts: PartNumber[]) => partScores.filter((score) => parts.includes(score.part)).reduce((acc, score) => ({ correct: acc.correct + score.correct, total: acc.total + score.total }), { correct: 0, total: 0 })
  const listening = sum([1, 2, 3, 4])
  const reading = sum([5, 6, 7])
  const total = sum([1, 2, 3, 4, 5, 6, 7])
  return {
    id: `${test.metadata.id}-${Date.now()}`, testId: test.metadata.id, date: new Date().toISOString(), answers,
    partScores, listening, reading, total, accuracy: total.total ? Math.round((total.correct / total.total) * 100) : 0,
    wrongQuestions: questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== question.answer).map((question) => question.id),
    unansweredQuestions: questions.filter((question) => answers[question.id] === undefined).map((question) => question.id),
  }
}
