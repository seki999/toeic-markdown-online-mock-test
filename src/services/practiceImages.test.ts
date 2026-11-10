import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { parsePart } from './markdownParser'
import { practiceImageUrl } from './practiceImages'

describe('practice image contract', () => {
  it('resolves Pages bases and refuses external or traversal paths', () => {
    expect(practiceImageUrl('images/test-004/practice/a.webp', '/repo/')).toBe('/repo/images/test-004/practice/a.webp')
    expect(practiceImageUrl('images/test-004/practice/a.svg', './')).toBe('./images/test-004/practice/a.svg')
    for (const path of ['../private.png', 'images/../../x.svg', 'https://a.test/x.png', '/images/x.png', 'images/x.png?key=secret', 'images/x.html', 'images\\x.png']) expect(practiceImageUrl(path)).toBeUndefined()
  })
  it('keeps original and practice images independent on a single question', async () => {
    const source = await readFile('public/tests/test-001/part1.md', 'utf8')
    const original = parsePart(source)
    const enhanced = parsePart(source.replace('## Question 1', '## Question 1\n\n### Practice Image\n\nimages/test-004/practice/q001.webp\n\n### Practice Image Alt\n\nFour equal option scenes.'))
    expect(enhanced.groups[0].questions[0].image).toBe(original.groups[0].questions[0].image)
    expect(enhanced.groups[0].questions[0].practiceImage).toBe('images/test-004/practice/q001.webp')
    expect(original.groups[0].questions[0].practiceImage).toBeUndefined()
    expect(enhanced.groups[0].questions[0].answer).toBe(original.groups[0].questions[0].answer)
  })
  for (const part of [3, 4, 6, 7] as const) it(`owns Part ${part} group images without polluting questions or passages`, async () => {
    const source = await readFile(`public/tests/test-001/part${part}.md`, 'utf8')
    const original = parsePart(source)
    const enhanced = parsePart(source.replace(/^(## (?:Group|Passage Group) 1)$/m, '$1\n\n### Practice Image\n\nimages/test-004/practice/group-01.webp\n\n### Practice Image Alt\n\nAn integrated scene.'))
    const group = enhanced.groups[0]
    expect(group.practiceImage).toBe('images/test-004/practice/group-01.webp')
    expect(group.questions.every(q => !q.practiceImage)).toBe(true)
    expect(group.questions).toEqual(original.groups[0].questions)
    expect(group.passages).toEqual(original.groups[0].passages)
    const wrongOnly = { ...group, questions: group.questions.slice(-1) }
    expect(wrongOnly.practiceImage).toBe(group.practiceImage)
  })
  for (const part of [3, 4, 6, 7] as const) it(`keeps trailing Part ${part} metadata on its Group, not the last question`, async () => {
    const source = await readFile(`public/tests/test-001/part${part}.md`, 'utf8')
    const original = parsePart(source)
    const enhanced = parsePart(source + '\n### Practice Image\n\nimages/test-004/practice/final-group.webp\n')
    expect(enhanced.groups.at(-1)?.practiceImage).toBe('images/test-004/practice/final-group.webp')
    expect(enhanced.groups.at(-1)?.questions).toEqual(original.groups.at(-1)?.questions)
    expect(enhanced.groups.at(-1)?.passages).toEqual(original.groups.at(-1)?.passages)
  })

})
