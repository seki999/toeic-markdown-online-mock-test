import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePart } from './markdownParser'
import { explanationFor, learningQuestions, splitLearningText, subtitleFor, type LearningNotes } from './learningScript'

const root = new URL('../../public/tests/test-003/', import.meta.url)
const notes: LearningNotes = JSON.parse(readFileSync(new URL('learning.zh-CN.json', root), 'utf8'))
const representatives = [
  [1, 'option', 1], [2, 'question', 7], [3, 'instruction', 32],
  [4, 'instruction', 71], [5, 'question', 101], [6, 'passage', 131], [7, 'passage', 147],
] as const

describe('Learning scripts from the published Markdown', () => {
  it.each(representatives)('preserves the source and uses aligned Chinese for Part %i', (part, type, id) => {
    const parsed = parsePart(readFileSync(new URL(`part${part}.md`, root), 'utf8'), part)
    const scripts = learningQuestions(parsed)
    const script = scripts.find(entry => entry.question.id === id)!
    expect(script.segments[0].type).toBe(type)
    expect(script.segments.every(segment => subtitleFor(notes, segment)?.textZh)).toBe(true)
    expect(explanationFor(notes, script.question)).toMatch(/选 [A-D]/)
    expect(script.question.image || script.image).toBeTruthy()
    expect(subtitleFor(notes, { ...script.segments[0], textEn: 'changed' })).toBeUndefined()
    expect(explanationFor(notes, { ...script.question, explanation: 'changed' })).toBeUndefined()
    expect(scripts.flatMap(entry => entry.segments).filter(segment => !subtitleFor(notes, segment)?.textZh)).toEqual([])
    if (part === 1) expect(script.segments.map(segment => segment.option)).toEqual(['A', 'B', 'C', 'D'])
    if (part === 3) expect(new Set(script.segments.flatMap(segment => segment.speaker ?? []))).toEqual(new Set(['Narrator', 'Speaker 1', 'Speaker 2']))
    if (part === 5) {
      expect(script.segments[0].textEn).toContain('_____')
      expect(script.completedSentence).toContain('divided equally')
    }
  })

  it('preserves instructions, decimals, abbreviations, and paragraph boundaries', () => {
    expect(splitLearningText('Dr. Ruiz paid 2.50. The store opens at 9 a.m. on Monday.\n\nNext paragraph.')).toEqual([
      'Dr. Ruiz paid 2.50.', 'The store opens at 9 a.m. on Monday.', 'Next paragraph.',
    ])
    const source = readFileSync(new URL('part1.md', root), 'utf8').replace('# Part 1', '# Part 1\n\n## Directions\n\nLook at the picture.')
    expect(learningQuestions(parsePart(source, 1))[0].segments[0].textEn).toBe('Look at the picture.')
  })
})
