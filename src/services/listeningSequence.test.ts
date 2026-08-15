import { describe, expect, it } from 'vitest'
import type { QuestionGroup } from '../types/exam'
import { buildContinuousListeningSequence, LISTENING_INTERVALS } from './listeningSequence'

const group = (part: 1 | 2 | 3 | 4, id: number): QuestionGroup => ({
  id: `part-${part}-${id}`,
  part,
  speech: [{ speaker: 'Speaker 1', text: `Material ${id}` }],
  passages: [],
  tags: [],
  questions: [{
    id,
    part,
    text: `Question ${id}?`,
    choices: [
      { label: 'A', text: 'First option' },
      { label: 'B', text: 'Second option' },
      { label: 'C', text: 'Third option' },
      { label: 'D', text: 'Fourth option' },
    ],
    answer: 'A',
    explanation: '',
    tags: [],
    speech: [],
    passages: [],
  }],
})

describe('continuous Listening sequence', () => {
  it('adds answer time and an extra interval when the Part changes', () => {
    const lines = buildContinuousListeningSequence([group(1, 1), group(2, 7)])

    expect(lines[0].pauseAfterMs).toBe(LISTENING_INTERVALS.part1AnswerMs + LISTENING_INTERVALS.partTransitionExtraMs)
    expect(lines.at(-1)?.pauseAfterMs).toBe(LISTENING_INTERVALS.part2AnswerMs)
  })

  it('reads Part 3 questions and choices, then pauses for each answer', () => {
    const lines = buildContinuousListeningSequence([group(3, 32)])

    expect(lines.map((line) => line.text)).toEqual([
      'Material 32',
      'Question 32?',
      'A. First option',
      'B. Second option',
      'C. Third option',
      'D. Fourth option',
    ])
    expect(lines.at(-1)?.pauseAfterMs).toBe(LISTENING_INTERVALS.part3And4AnswerMs)
  })
})
