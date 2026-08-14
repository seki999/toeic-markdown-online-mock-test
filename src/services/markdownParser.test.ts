import { describe, expect, it } from 'vitest'
import { parseMetadata, parsePart, ToeicMarkdownError } from './markdownParser'

describe('Markdown parser', () => {
  it('parses metadata frontmatter', () => {
    expect(parseMetadata('---\nid: test-a\ntitle: Test A\ndemo: true\n---\n# Test')).toMatchObject({ id: 'test-a', title: 'Test A', demo: true })
  })
  it('parses a Part 5 question into the internal model', () => {
    const part = parsePart('# Part 5\n\n## Question 101\n\nThe team _____ early.\n\n- A. arrive\n- B. arrives\n- C. arriving\n- D. arrival\n\n### Answer\n\nB\n\n### Explanation\n\nA singular subject takes arrives.\n\n### Tags\n\n- grammar', 5)
    expect(part.groups[0].questions[0]).toMatchObject({ id: 101, answer: 'B', tags: ['grammar'] })
  })
  it('reports a useful parser error when an answer is missing', () => {
    expect(() => parsePart('# Part 5\n\n## Question 101\n\nText\n\n- A. a\n- B. b\n- C. c\n- D. d')).toThrow(ToeicMarkdownError)
  })
  it('parses speakers and group answers', () => {
    const part = parsePart('# Part 3\n\n## Group 1\n\n### Audio\n\nNarrator:\nListen.\n\nSpeaker 1:\nHello.\n\n### Question 32\n\nWhat?\n\n- A. One\n- B. Two\n- C. Three\n- D. Four\n\n### Answers\n\n32: A', 3)
    expect(part.groups[0].speech.map((line) => line.speaker)).toEqual(['Narrator', 'Speaker 1'])
    expect(part.groups[0].questions[0].answer).toBe('A')
  })
  it('associates Part 6 and 7 sibling Answer sections with the preceding question', () => {
    const part = parsePart('# Part 7\n\n## Passage Group 1\n\n### Type\n\nsingle\n\n### Passage 1\n\n#### Email\n\nHello.\n\n### Question 147\n\nWhy?\n\n- A. One\n- B. Two\n- C. Three\n- D. Four\n\n### Answer\n\nB\n\n### Explanation\n\nBecause two.', 7)
    expect(part.groups[0].questions[0]).toMatchObject({ id: 147, answer: 'B', explanation: 'Because two.' })
    expect(part.groups[0].questions[0].text).toBe('Why?')
    expect(part.groups[0].questions[0].passages[0]).toMatchObject({ title: 'Email', type: 'single' })
  })
})
