import type { ToeicTest, ValidationIssue } from '../types/exam'
import { allQuestions } from './testLoader'

const officialCounts = [6, 25, 39, 30, 30, 16, 54]

export function validateTestContent(test: ToeicTest): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seen = new Set<number>()
  test.parts.forEach((part) => {
    const questions = part.groups.flatMap((group) => group.questions)
    if (!test.metadata.demo && questions.length !== officialCounts[part.number - 1]) issues.push({ severity: 'warning', part: part.number, message: `Part ${part.number} has ${questions.length}; expected ${officialCounts[part.number - 1]}.` })
    questions.forEach((question) => {
      if (seen.has(question.id)) issues.push({ severity: 'error', part: part.number, questionId: question.id, message: `Duplicate question ID ${question.id}.` })
      seen.add(question.id)
      if (!question.answer) issues.push({ severity: 'error', part: part.number, questionId: question.id, message: 'Answer is missing.' })
      const expected = part.number === 2 ? 3 : 4
      if (question.choices.length !== expected) issues.push({ severity: 'warning', part: part.number, questionId: question.id, message: `Question ${question.id} has ${question.choices.length} choices; expected ${expected}.` })
    })
  })
  if (!allQuestions(test).length) issues.push({ severity: 'error', message: 'Test contains no questions.' })
  return issues
}
