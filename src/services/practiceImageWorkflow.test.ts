import { afterAll, describe, expect, it } from 'vitest'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import { parsePart } from './markdownParser'

const testId = `test-image-workflow-${process.pid}`
const tests = path.resolve('public/tests', testId)
const images = path.resolve('public/images', testId)
const manifest = path.join(images, 'practice/manifest.json')
function cli(...args: string[]) { return execFileSync(process.execPath, ['scripts/practice-images.mjs', ...args], { encoding: 'utf8' }) }
afterAll(async () => {
  for (const [target, parent] of [[tests, path.resolve('public/tests')], [images, path.resolve('public/images')]]) {
    if (!target.startsWith(parent + path.sep)) throw Error('Unsafe test cleanup path')
    await rm(target, { recursive: true, force: true })
  }
})
describe('offline image workflow', () => {
  it('prepares full-group prompts, retains work, links without changing bodies, and refuses stale approvals', async () => {
    await mkdir(tests, { recursive: true })
    for (let part = 1; part <= 7; part++) await writeFile(path.join(tests, `part${part}.md`), await readFile(`public/tests/test-003/part${part}.md`))
    cli('prepare', testId)
    const first = JSON.parse(await readFile(manifest, 'utf8'))
    expect(first.entries).toHaveLength(106)
    const grouped = first.entries.find((entry: { part: number }) => entry.part === 6)
    for (const id of [131, 132, 133, 134]) expect(grouped.prompt).toContain(`"id": ${id}`)
    const reading = first.entries.filter((entry: { part: number }) => entry.part === 7)
    expect(reading).toHaveLength(18)
    expect(reading.at(-1).questionIds).toEqual([198, 199, 200])
    expect(reading.at(-1).prompt).toContain('No repairs begin without your approval')
    const id = `${testId}-part5-q101`
    const original = parsePart(await readFile(path.join(tests, 'part5.md'), 'utf8')).groups[0].questions[0]
    const fixture = path.join(tests, 'test-only.svg')
    await writeFile(fixture, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024"><path d="M0 0L1536 1024M1536 0L0 1024" stroke="black"/></svg>')
    const tooSmall = path.join(tests, 'tiny.svg')
    await writeFile(tooSmall, '<svg viewBox="0 0 64 64"></svg>')
    expect(spawnSync(process.execPath, ['scripts/practice-images.mjs', 'import', testId, id, tooSmall]).status).toBe(1)
    cli('import', testId, id, fixture)
    cli('review', testId, id, 'Test-only workflow fixture, not a production illustration')
    cli('prepare', testId)
    expect(JSON.parse(await readFile(manifest, 'utf8')).entries.find((e: { id: string }) => e.id === id).status).toBe('approved')
    cli('link', testId)
    const linked = await readFile(path.join(tests, 'part5.md'), 'utf8')
    const question = parsePart(linked).groups[0].questions[0]
    expect(question.text).toBe(original.text)
    expect(question.choices).toEqual(original.choices)
    expect(question.answer).toBe(original.answer)
    expect(question.explanation).toBe(original.explanation)
    expect(question.practiceImage).toContain(testId)
    cli('link', testId)
    expect(await readFile(path.join(tests, 'part5.md'), 'utf8')).toBe(linked)
    const check = spawnSync(process.execPath, ['scripts/practice-images.mjs', 'validate', testId], { encoding: 'utf8' })
    expect(check.status).toBe(1) // One imported asset does not count as complete coverage.
    const intactManifest = await readFile(manifest, 'utf8')
    const tampered = JSON.parse(intactManifest)
    tampered.entries.push({ ...tampered.entries[0], imagePath: 'images/../../private.svg' })
    await writeFile(manifest, JSON.stringify(tampered))
    const unsafe = spawnSync(process.execPath, ['scripts/practice-images.mjs', 'validate', testId, '--allow-pending'], { encoding: 'utf8' })
    expect(unsafe.status).toBe(1)
    expect(unsafe.stdout).toContain('Duplicate ID')
    expect(unsafe.stdout).toContain('Unsafe path')
    await writeFile(manifest, intactManifest)
    await writeFile(path.join(tests, 'part5.md'), linked.replace('monetary award', 'monetary prize'))
    expect(spawnSync(process.execPath, ['scripts/practice-images.mjs', 'link', testId]).status).toBe(1)
    cli('prepare', testId)
    expect(JSON.parse(await readFile(manifest, 'utf8')).entries.find((e: { id: string }) => e.id === id).status).toBe('pending')
  }, 30000)
})
