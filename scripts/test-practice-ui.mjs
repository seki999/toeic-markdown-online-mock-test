import { chromium } from '@playwright/test'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const base = process.env.PRACTICE_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ headless: true })
const errors = []
await mkdir('tmp/practice-visuals', { recursive: true })
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}#/test/test-003/practice?part=1`)
    const first = page.locator('.practice-set').first()
    await first.getByRole('button', { name: 'Check answers', exact: true }).waitFor()
    assert.equal(await first.locator('.photo-placeholder img').count(), 1)
    assert.equal(await first.locator('.practice-illustration').count(), 0)
    await first.getByRole('button', { name: 'Show learning illustrations', exact: true }).click()
    assert.equal(await first.locator('.practice-illustration').count(), 1)
    await first.getByRole('button', { name: 'Hide learning illustrations', exact: true }).click()
    assert.equal(await first.locator('.practice-illustration').count(), 0)
    // Return to automatic reveal behavior for the next set.
    const second = page.locator('.practice-set').nth(1)
    await second.getByRole('button', { name: 'Check answers', exact: true }).click()
    const illustration = second.locator('.practice-illustration')
    await illustration.getByRole('button', { name: 'Enlarge learning illustration', exact: true }).click()
    assert.equal(await illustration.locator('dialog').evaluate(el => el.open), true)
    await page.keyboard.press('Escape')
    assert.equal(await illustration.locator('dialog').evaluate(el => el.open), false)
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Enlarge learning illustration')
    const image = illustration.locator('.image-button img')
    await image.scrollIntoViewIfNeeded()
    await page.waitForFunction(() => [...document.querySelectorAll('.practice-illustration .image-button img')].every(img => img.complete && img.naturalWidth > 0))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await page.screenshot({ path: `tmp/practice-visuals/practice-${viewport.width}.png` })
    await page.goto(`${base}#/test/test-003/practice?part=3`)
    await page.reload()
    await page.locator('.practice-set').first().getByRole('button', { name: 'Check answers', exact: true }).click()
    assert.equal(await page.locator('.practice-set').first().locator('.question-card').count(), 3)
    assert.equal(await page.locator('.practice-set').first().locator('.practice-illustration').count(), 1)
    await context.addInitScript(() => {
      localStorage.setItem('toeic-md-platform-v1', JSON.stringify({ answers: {}, history: [{ testId: 'test-003', wrongQuestions: [34], answers: {}, partScores: [], unansweredQuestions: [] }] }))
    })
    await page.goto(`${base}#/test/test-003/practice?part=3&wrong=1`)
    await page.reload()
    await page.getByRole('button', { name: 'Check answers', exact: true }).click()
    assert.equal(await page.locator('.question-card').count(), 1)
    assert.equal(await page.locator('.practice-illustration').count(), 1)
    await page.goto(`${base}#/test/test-003/practice?part=5`)
    await page.reload()
    await page.locator('.practice-set').first().getByRole('button', { name: 'Check answers', exact: true }).click()
    await page.locator('.practice-illustration .image-button img').first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: `tmp/practice-visuals/grammar-ui-${viewport.width}.png` })
    await page.goto(`${base}#/test/test-003/practice?part=7`)
    await page.reload()
    await page.locator('.practice-set').nth(17).waitFor()
    assert.equal(await page.locator('.practice-set').count(), 18)
    for (const index of [0, 6, 12, 17]) {
      const set = page.locator('.practice-set').nth(index)
      assert.equal(await set.locator('.practice-illustration').count(), 0)
      await set.getByRole('button', { name: 'Check answers', exact: true }).click()
      assert.equal(await set.locator('.practice-illustration').count(), 1)
      assert.equal(await set.locator('.question-card').count(), 3)
      await set.locator('.image-button img').scrollIntoViewIfNeeded()
      await set.locator('.image-button img').evaluate(img => img.decode())
    }
    await page.screenshot({ path: `tmp/practice-visuals/reading-ui-${viewport.width}.png` })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await page.goto(`${base}#/test/test-003/practice?part=5`)
    await page.reload()
    // Simulate a real network failure, then ensure a usable explanation is retained.
    await page.route('**/images/test-003/practice/**', route => route.abort())
    await page.reload()
    await page.locator('.practice-set').first().getByRole('button', { name: 'Check answers', exact: true }).click()
    await page.locator('.practice-illustration').first().scrollIntoViewIfNeeded()
    await page.getByRole('status').filter({ hasText: 'unavailable' }).first().waitFor()
    assert.ok((await page.locator('.practice-set').first().textContent()).includes('Explanation'))
    await page.unrouteAll()
    if (viewport.width === 1440) {
      const decoded = await page.evaluate(async root => {
        const manifest = await fetch(new URL('images/test-003/practice/manifest.json', root)).then(r => r.json())
        let count = 0
        for (const entry of manifest.entries) {
          if (entry.status !== 'approved') throw Error(`Unapproved asset: ${entry.id}`)
          const image = new Image()
          image.src = new URL(entry.imagePath, root).href
          await image.decode()
          if (!image.naturalWidth || !image.naturalHeight) throw Error(`Undecodable image: ${entry.id}`)
          count++
        }
        return count
      }, base)
      assert.equal(decoded, 106)
    }
    await page.goto(`${base}#/test/test-003/exam`)
    await page.getByRole('button', { name: 'Start test', exact: true }).click()
    assert.equal(await page.locator('.practice-illustration').count(), 0)
    assert.equal(await page.locator('.photo-placeholder img').count(), 6)
    await context.close()
  }
  assert.deepEqual(errors, [])
  await writeFile('tmp/practice-visuals/ui-results.json', JSON.stringify({ desktop: 'passed', mobile: 'passed', zoom: 'passed', wrongOnly: 'passed', examIsolation: 'passed', imageFailure: 'passed', errors }, null, 2))
  console.log('Practice desktop/mobile, reveal/toggle, zoom/Escape/focus, Group deduplication, wrong-only, missing images and Exam isolation passed.')
} finally { await browser.close() }
