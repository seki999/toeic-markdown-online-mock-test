import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { load } from 'js-yaml'

const root = join(process.cwd(), 'public', 'tests')
const directories = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
const entries = []

for (const directory of directories) {
  const folder = join(root, directory.name)
  const metadataSource = await readFile(join(folder, 'metadata.md'), 'utf8')
  const match = /^---\s*\n([\s\S]*?)\n---/.exec(metadataSource.replace(/\r\n/g, '\n'))
  if (!match) throw new Error(`${directory.name}/metadata.md has no YAML frontmatter`)
  const metadata = load(match[1])
  if (!metadata?.id || !metadata?.title) throw new Error(`${directory.name}/metadata.md requires id and title`)
  await Promise.all(Array.from({ length: 7 }, (_, index) => readFile(join(folder, `part${index + 1}.md`), 'utf8')))
  entries.push({ id: String(metadata.id), title: String(metadata.title), version: String(metadata.version ?? '1.0'), difficulty: metadata.difficulty, targetScore: metadata.targetScore, demo: metadata.demo === true, path: `tests/${directory.name}/` })
}

await writeFile(join(root, 'index.json'), `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
console.log(`Generated public/tests/index.json with ${entries.length} test(s).`)
