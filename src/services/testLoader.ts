import type { PartNumber, TestIndexEntry, ToeicTest } from '../types/exam'
import { parseMetadata, parsePart } from './markdownParser'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

async function getText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Unable to load ${url}: HTTP ${response.status}`)
  return response.text()
}

export async function loadTestIndex(): Promise<TestIndexEntry[]> {
  const response = await fetch(assetUrl('tests/index.json'))
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

export function allQuestions(test: ToeicTest) { return test.parts.flatMap((part) => part.groups.flatMap((group) => group.questions)) }
