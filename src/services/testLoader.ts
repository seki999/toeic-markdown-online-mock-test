import type { PartNumber, TestIndexEntry, ToeicTest } from '../types/exam'
import { parseMetadata, parsePart } from './markdownParser'
import type { LearningNotes } from './learningScript'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

async function getText(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`)
  return response.text()
}

export async function loadTestIndex(): Promise<TestIndexEntry[]> {
  const response = await fetch(assetUrl('tests/index.json'), { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load test index: HTTP ${response.status}`)
  return response.json() as Promise<TestIndexEntry[]>
}

export async function loadTest(testId: string): Promise<ToeicTest> {
  const entries = await loadTestIndex()
  const entry = entries.find((item) => item.id === testId)
  if (!entry) throw new Error(`Unknown test: ${testId}`)
  const root = assetUrl(entry.path)
  const [metadataSource, ...partSources] = await Promise.all([
    getText(`${root}metadata.md`),
    ...([1, 2, 3, 4, 5, 6, 7] as PartNumber[]).map((part) => getText(`${root}part${part}.md`)),
  ])
  const test = { metadata: parseMetadata(metadataSource), parts: partSources.map((source, index) => parsePart(source, (index + 1) as PartNumber)) }
  return test
}

export async function loadLearningNotes(testId: string): Promise<LearningNotes | undefined> {
  const entry = (await loadTestIndex()).find(item => item.id === testId)
  if (!entry) return undefined
  const response = await fetch(assetUrl(`${entry.path}learning.zh-CN.json`))
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`Unable to load learning notes: HTTP ${response.status}`)
  return response.json() as Promise<LearningNotes>
}

export function allQuestions(test: ToeicTest) { return test.parts.flatMap((part) => part.groups.flatMap((group) => group.questions)) }
