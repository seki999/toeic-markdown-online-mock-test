import { readdir, access } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
let ids = []
if (args[0] && !args[0].startsWith('--')) ids = [args.shift()]
else {
  for (const entry of await readdir('public/images', { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^test-[a-z0-9-]+$/.test(entry.name)) continue
    try { await access(`public/images/${entry.name}/practice/manifest.json`); ids.push(entry.name) } catch { /* Legacy images without a manifest remain compatible. */ }
  }
}
if (!ids.length) throw Error('No practice image manifests found')
for (const id of ids) {
  const result = spawnSync(process.execPath, ['scripts/practice-images.mjs', 'validate', id, ...args.filter(a => a !== '--all')], { stdio: 'inherit' })
  if (result.status !== 0) process.exitCode = 1
}
