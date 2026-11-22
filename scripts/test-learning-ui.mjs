import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const base = process.env.PRACTICE_TEST_URL || 'http://127.0.0.1:5173/'
const browser = await chromium.launch({ headless: true })
const errors = []
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      if (new URLSearchParams(location.hash.split('?')[1]).has('unsupported')) {
        Object.defineProperty(window, 'speechSynthesis', { value: undefined })
        return
      }
      const synth = new EventTarget()
      const sut = { utterances: [], cancelled: [], finish: () => {
        const utterance = sut.utterances.at(-1)
        synth.speaking = false
        utterance?.onend?.()
      } }
      window.learningTest = sut
      Object.assign(synth, {
        paused: false, speaking: false,
        getVoices: () => ['en-US', 'en-GB', 'zh-CN'].map(lang => ({ lang, name: lang, voiceURI: lang })),
        speak: (utterance) => { synth.speaking = true; sut.utterances.push(utterance) },
        pause: () => { synth.paused = true },
        resume: () => { synth.paused = false },
        cancel: () => {
          if (synth.speaking) sut.cancelled.push(sut.utterances.at(-1))
          synth.speaking = false
        },
      })
      Object.defineProperty(window, 'speechSynthesis', { value: synth })
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: class { constructor(text) { this.text = text } },
      })
    })
    const player = page.getByRole('region', { name: '沉浸式视听学习' })
    const button = name => player.getByRole('button', { name, exact: true })
    const caption = player.locator('.learning-captions')
    const open = async (part, extra = '') => {
      await page.goto(`${base}#/test/test-003/practice?part=${part}&mode=learning${extra}`)
      await page.reload()
      await player.waitFor()
    }
    await page.goto(`${base}#/test/test-003/practice?part=1`)
    await page.getByRole('button', { name: '沉浸式视听学习', exact: true }).click()
    const exitFullscreen = page.getByRole('button', { name: '退出全屏', exact: true })
    await exitFullscreen.waitFor()
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains('full-playback'))
    await page.waitForFunction(() => window.learningTest.utterances.length === 1)
    if (width === 1440) {
      for (let question = 2; question <= 6; question++) {
        await button('下一题').click()
        await player.getByRole('heading', { name: `Part 1 · 第 ${question} 题` }).waitFor()
      }
      await button('播放').click()
      for (let count = 2; count <= 6; count++) {
        await page.waitForFunction(expected => window.learningTest.utterances.length === expected, count)
        await page.evaluate(() => window.learningTest.finish())
      }
      await player.getByRole('heading', { name: 'Part 2 · 第 7 题' }).waitFor()
    }
    await exitFullscreen.click()
    await page.waitForFunction(() => !document.fullscreenElement && !speechSynthesis.speaking)
    await page.evaluate(() => localStorage.removeItem('toeic.learning.progress.test-003.all'))
    await open(1)
    await caption.getByText('A. 厨师正在案板上切馅饼。', { exact: true }).waitFor()
    await player.locator('.learning-picture img').evaluate(image => image.decode())
    await button('播放').click()
    await page.waitForFunction(() => window.learningTest.utterances.length === 1)
    await button('暂停').click()
    assert.equal(await page.evaluate(() => speechSynthesis.paused), true)
    await button('继续').click()
    assert.equal(await page.evaluate(() => speechSynthesis.paused), false)
    await page.evaluate(() => window.learningTest.finish())
    await caption.getByText('B. 有人正在用布擦干一些盘子。', { exact: true }).waitFor()
    await page.waitForFunction(() => window.learningTest.utterances.length === 2)
    await button('下一题').click()
    await player.getByRole('heading', { name: 'Part 1 · 第 2 题' }).waitFor()
    await page.evaluate(() => window.learningTest.cancelled.at(-1)?.onend?.())
    await caption.getByText('本句中文字幕待补充。', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => window.learningTest.utterances.length), 2)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)

    await open(2)
    await caption.getByText('谁将牵头负责这次慈善活动？', { exact: true }).waitFor()
    await player.getByText('播放设置', { exact: true }).click()
    await player.getByLabel('字幕', { exact: true }).selectOption('zh')
    await player.getByLabel('英语语速').selectOption('0.9')
    await player.getByLabel('句间停顿（秒）').fill('0')
    await player.getByLabel('答题方式').selectOption('auto')
    await player.getByLabel('自动下一题').check()
    assert.equal(await caption.locator('[lang=en]').count(), 0)
    await button('播放').click()
    for (let count = 1; count <= 4; count++) {
      await page.waitForFunction(expected => window.learningTest.utterances.length === expected, count)
      assert.equal(await page.evaluate(() => window.learningTest.utterances.at(-1).rate), 0.9)
      assert.equal(await player.getByText('正确答案 A', { exact: false }).count(), 0)
      await page.evaluate(() => window.learningTest.finish())
    }
    await player.getByText('选 A。Who 问的是人', { exact: false }).waitFor()
    await player.getByRole('heading', { name: 'Part 2 · 第 8 题' }).waitFor()
    await page.reload()
    await player.getByRole('heading', { name: 'Part 2 · 第 8 题' }).waitFor()
    await player.getByText('播放设置', { exact: true }).click()
    assert.equal(await player.getByLabel('字幕', { exact: true }).inputValue(), 'zh')
    assert.equal(await player.getByLabel('英语语速').inputValue(), '0.9')
    await player.getByLabel('字幕', { exact: true }).selectOption('both')

    for (const [part, question, translation] of [
      [3, 32, '第 32 至 34 题根据以下对话作答。'],
      [4, 71, '第 71 至 73 题根据以下讲话作答。'],
      [5, 101, '奖金将在三支获胜队伍之间 _____ 分配。'],
      [6, 131, '收件人：exhibition@lantern.example'],
    ]) {
      await open(part)
      await player.getByRole('heading', { name: `Part ${part} · 第 ${question} 题` }).waitFor()
      await caption.getByText(translation, { exact: true }).waitFor()
      await player.getByRole('button', { name: /查看学习配图/ }).click()
      await player.locator('.practice-illustration img').first().evaluate(image => image.decode())
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    }

    await page.route('**/tests/test-003/part3.md', async route => {
      const response = await route.fetch()
      const body = (await response.text()).replace(/^### Practice Image(?: Alt)?\r?\n(?:[^#\r\n]*\r?\n)*/gm, '')
      await route.fulfill({ response, body })
    })
    await open(3, '&unsupported=1')
    await player.getByText('这道题没有可用配图。', { exact: true }).waitFor()
    await player.getByText('此浏览器不支持语音合成，仍可手动阅读字幕。').waitFor()
    await button('播放').click()
    await player.getByRole('alert').waitFor()
    await button('跳过').click()
    await caption.getByText('我们的新子公司需要一套多功能接待系统。', { exact: true }).waitFor()
    await page.getByRole('button', { name: '传统做题' }).click()
    await page.locator('.question-card').first().waitFor()
    await page.close()
  }
  assert.deepEqual(errors, [])
  console.log('Learning UI passed at 1440px and 390px, with mocked Web Speech events.')
} finally {
  await browser.close()
}
