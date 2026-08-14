import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { PartNumber, ToeicTest } from '../types/exam'
import { parseMetadata, parsePart } from './markdownParser'
import { allQuestions } from './testLoader'
import { validateTestContent } from './validation'

const contentRoot = fileURLToPath(new URL('../../public/tests/test-002/', import.meta.url))

describe('complete test-002 content', () => {
  it('parses all 200 questions with continuous IDs and valid answers', async () => {
    const metadata = parseMetadata(await readFile(`${contentRoot}/metadata.md`, 'utf8'))
    const parts = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
      const number = (index + 1) as PartNumber
      return parsePart(await readFile(`${contentRoot}/part${number}.md`, 'utf8'), number)
    }))
    const test: ToeicTest = { metadata, parts }
    const questions = allQuestions(test)

    expect(parts.map((part) => part.groups.flatMap((group) => group.questions).length)).toEqual([6, 25, 39, 30, 30, 16, 54])
    expect(questions.map((question) => question.id)).toEqual(Array.from({ length: 200 }, (_, index) => index + 1))
    expect(questions.every((question) => question.choices.some((choice) => choice.label === question.answer))).toBe(true)
    expect(questions.filter((question) => !question.explanation.trim())).toEqual([])
    expect(questions.filter((question) => question.part <= 4 && question.speech.length === 0)).toEqual([])
    expect(parts[0].groups.flatMap((group) => group.questions).every((question) => Boolean(question.image))).toBe(true)
    expect(parts[6].groups.reduce<Record<string, number>>((counts, group) => {
      const type = group.passages[0]?.type ?? 'missing'
      counts[type] = (counts[type] ?? 0) + 1
      return counts
    }, {})).toEqual({ single: 6, double: 6, triple: 6 })
    expect(validateTestContent(test)).toEqual([])
  })
})
