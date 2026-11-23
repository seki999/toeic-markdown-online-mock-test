<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import PracticeIllustration from './PracticeIllustration.vue'
import { renderMarkdown } from '../services/markdownParser'
import { explanationFor, subtitleFor, type LearningNotes, type LearningQuestion } from '../services/learningScript'
import { useLearningPlayback } from '../services/learningPlayback'
import { getTtsEngine } from '../services/ttsEngine'
import type { ChoiceLabel, PartNumber } from '../types/exam'

const props = defineProps<{ testId: string; part: PartNumber; items: LearningQuestion[]; notes?: LearningNotes; wrongOnly: boolean; continuousLaunch?: boolean }>()
const defaults = {
  mode: 'bilingual', captions: 'both', rate: 1, chinese: false, explanations: true,
  nextLine: true, nextQuestion: false, loop: false, gap: 0.5, repeat: false, voice: '',
  scope: 'part', answerMode: 'manual',
}
function readSaved<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Storage may be disabled. */ }
}
const settingsKey = 'toeic.learning.settings'
const settings = ref({ ...defaults, ...readSaved(settingsKey, defaults) })
if (props.continuousLaunch) Object.assign(settings.value, { scope: 'test', answerMode: 'auto', nextLine: true, nextQuestion: true, loop: false })
watch(settings, value => { if (!props.continuousLaunch) save(settingsKey, value) }, { deep: true })
const progressKey = computed(() => `toeic.learning.progress.${props.testId}.${props.wrongOnly ? 'wrong' : 'all'}`)
const saved = computed(() => readSaved(progressKey.value, {} as Record<string, number>))
const items = computed(() => settings.value.scope === 'test' ? props.items : props.items.filter(entry => entry.question.part === props.part))
function position(fallbackToLast = false) {
  const target = fallbackToLast ? saved.value.last : saved.value[props.part]
  const found = items.value.findIndex(entry => entry.question.id === target)
  return found >= 0 ? found : Math.max(0, items.value.findIndex(entry => entry.question.part === props.part))
}
const index = ref(props.continuousLaunch
  ? items.value.findIndex(entry => entry.question.part >= props.part)
  : position(settings.value.scope === 'test'))
const item = computed(() => items.value[index.value])
const question = computed(() => item.value?.question)
const sharedLabel = computed(() => {
  const ids = item.value?.sharedQuestionIds ?? []
  return ids.length ? `第 ${ids.join('、')} 题共用` : ''
})
const startingLine = computed(() => {
  const current = item.value
  const previous = items.value[index.value - 1]
  return current?.sharedQuestionIds.length && current.sharedQuestionIds[0] === previous?.sharedQuestionIds[0]
    ? current.questionStart : 0
})
const line = ref(startingLine.value)
const segment = computed(() => item.value?.segments[line.value])
const subtitle = computed(() => segment.value && subtitleFor(props.notes, segment.value))
const explanation = computed(() => question.value && explanationFor(props.notes, question.value))
const correctChoice = computed(() => question.value?.choices.find(choice => choice.label === question.value?.answer))
const choice = ref<ChoiceLabel>()
const revealed = ref(false)
const finished = ref(false)
const played = new Set<number>()
const failedImage = ref(false)
const skipDetail = ref(false)
const reviewText = ref('')
const { state, error, supported, stop, run, speak, gap, togglePause } = useLearningPlayback()
const voices = ref<SpeechSynthesisVoice[]>([])
const questionCount = computed(() => item.value?.segments.length ?? 0)
const imageUrl = computed(() => question.value?.image && `${import.meta.env.BASE_URL}${question.value.image.replace(/^\/+/, '')}`)
const showEnglish = computed(() => ['both', 'en'].includes(settings.value.captions))
const showChinese = computed(() => ['both', 'zh'].includes(settings.value.captions))

function refreshVoices() {
  const engine = getTtsEngine()
  engine.refreshVoices()
  voices.value = engine.getVoices().filter(voice => /^en(?:[-_]|$)/i.test(voice.lang))
    .sort((a, b) => Number(b.default) - Number(a.default) || Number(/^en-(US|GB)$/i.test(b.lang)) - Number(/^en-(US|GB)$/i.test(a.lang)))
}
onMounted(() => {
  if (supported()) {
    refreshVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices)
  }
  window.addEventListener('keydown', shortcuts)
  if (props.continuousLaunch && item.value) void run(signal => playlist(signal, true))
})
onBeforeUnmount(() => {
  window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices)
  window.removeEventListener('keydown', shortcuts)
})

function resetQuestion(position: number) {
  index.value = position
  line.value = startingLine.value
  finished.value = revealed.value = failedImage.value = false
  skipDetail.value = false
  reviewText.value = ''
  choice.value = undefined
  played.clear()
}
function remember() {
  if (!question.value) return
  saved.value[question.value.part] = saved.value.last = question.value.id
  save(progressKey.value, saved.value)
}
watch([items, () => props.part, progressKey], () => {
  stop()
  resetQuestion(position())
  remember()
})
watch(() => question.value?.id, remember, { immediate: true })

function selectQuestion(position: number) {
  if (!items.value[position]) return
  stop()
  resetQuestion(position)
}
function selectLine(position: number) {
  stop()
  reviewText.value = ''
  line.value = Math.min(Math.max(position, 0), Math.max(questionCount.value - 1, 0))
}
function setMode(mode: string) {
  stop()
  reviewText.value = ''
  settings.value.mode = mode
  settings.value.captions = mode === 'english' ? 'en' : 'both'
}
function shortcuts(event: KeyboardEvent) {
  if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, a, dialog, [contenteditable]'))) return
  if (event.code === 'Space') toggle()
  else if (event.key === 'ArrowLeft') moveLine(-1)
  else if (event.key === 'ArrowRight') moveLine(1)
  else if (event.key.toLowerCase() === 'r') replayLine()
  else return
  event.preventDefault()
}

function canContinue() {
  return settings.value.scope !== 'question' && Boolean(items.value[index.value + 1])
}
async function speakEnglish(text: string, signal: AbortSignal, speaker?: NonNullable<typeof segment.value>['speaker']) {
  await speak(text, signal, settings.value.rate, speaker, settings.value.voice)
}
async function playCurrent(signal: AbortSignal) {
  const current = segment.value
  if (!current) return
  const note = subtitle.value
  if (state.value !== 'paused') skipDetail.value = false
  await speakEnglish(current.textEn, signal, current.speaker)
  played.add(line.value)
  if (settings.value.mode !== 'english' && settings.value.chinese && note?.textZh) {
    await speak(note.textZh, signal, 1, undefined, '', 'zh-CN')
  }
  if (settings.value.mode === 'detailed' && note?.noteZh && !skipDetail.value) {
    if (settings.value.chinese) await speak(note.noteZh, signal, 1, undefined, '', 'zh-CN')
    else await gap(1600, signal)
    if (settings.value.repeat && !skipDetail.value) await speakEnglish(current.textEn, signal, current.speaker)
  }
}
async function review(signal: AbortSignal) {
  revealed.value = true
  if (!item.value || settings.value.mode === 'english') return
  const text = item.value.completedSentence ?? (question.value?.part === 1 || settings.value.repeat ? correctChoice.value?.text : undefined)
  if (text) {
    reviewText.value = text
    await speakEnglish(text, signal)
    if (settings.value.repeat) await speakEnglish(text, signal)
  }
  if (settings.value.mode === 'detailed' && settings.value.explanations && settings.value.chinese && explanation.value && !skipDetail.value) {
    await speak(explanation.value, signal, 1, undefined, '', 'zh-CN')
  }
}
async function playlist(signal: AbortSignal, observe = false, startWithReview = false) {
  let reviewing = startWithReview
  while (item.value) {
    if (!reviewing) {
      if (observe && question.value?.part === 1 && imageUrl.value && !failedImage.value) await gap(2500, signal)
      for (;;) {
        await playCurrent(signal)
        if (line.value + 1 >= questionCount.value) break
        if (!settings.value.nextLine) return
        await gap(settings.value.gap * 1000, signal)
        line.value += 1
      }
      finished.value = item.value.segments.slice(startingLine.value).every((_, offset) => played.has(startingLine.value + offset))
      if (settings.value.answerMode === 'auto' && finished.value) await review(signal)
      else if (!revealed.value) {
        if (!settings.value.loop) return
        await gap(settings.value.gap * 1000, signal)
        line.value = startingLine.value
        played.clear()
        observe = true
        continue
      }
    } else {
      await review(signal)
    }
    if (!settings.value.loop && !(settings.value.nextQuestion && canContinue())) return
    await gap(Math.max(settings.value.gap * 1000, 1800), signal)
    resetQuestion(settings.value.loop ? index.value : index.value + 1)
    reviewing = false
    observe = true
  }
}
function toggle() {
  if (state.value === 'playing' || state.value === 'paused') return togglePause()
  if (revealed.value && reviewText.value && state.value === 'error') {
    void run(signal => playlist(signal, false, true))
    return
  }
  reviewText.value = ''
  void run(signal => playlist(signal, line.value === 0))
}
function moveLine(delta: number) {
  const active = state.value === 'playing' || state.value === 'paused' || state.value === 'error'
  selectLine(line.value + delta)
  if (active && segment.value) void run(signal => playlist(signal))
}
function replayLine() {
  selectLine(line.value)
  if (segment.value) void run(playCurrent)
}
function replayQuestion() {
  stop()
  resetQuestion(index.value)
  line.value = 0
  void run(signal => playlist(signal, true))
}
function submitAnswer() {
  if (!choice.value) return
  revealed.value = true
  skipDetail.value = false
  void run(signal => playlist(signal, false, true))
}
function skipAudio() {
  stop()
  reviewText.value = ''
  skipDetail.value = true
  if (revealed.value && settings.value.nextQuestion && canContinue()) {
    resetQuestion(index.value + 1)
    void run(signal => playlist(signal, true))
  } else if (line.value + 1 < questionCount.value) {
    line.value += 1
  } else if (revealed.value) {
    reviewText.value = item.value?.completedSentence ?? ''
  } else {
    finished.value = true
  }
}
</script>

<template>
  <section v-if="item && question" class="learning-player" aria-label="沉浸式视听学习">
    <header class="player-row">
      <h2>Part {{ question.part }} · 第 {{ question.id }} 题</h2>
      <span>{{ index + 1 }} / {{ items.length }} 题</span>
    </header>

    <p v-if="question.part >= 3" class="learning-stem" lang="en">{{ question.text }}</p>

    <div v-if="imageUrl && !failedImage" class="learning-picture">
      <img :src="imageUrl" :alt="'第 ' + question.id + ' 题原图'" @error="failedImage = true">
    </div>
    <PracticeIllustration v-else-if="item.image" :image="item.image" :alt="item.imageAlt" :caption="sharedLabel ? `学习配图 · ${sharedLabel}` : '学习配图'" />
    <p v-else class="image-status">这道题没有可用配图。</p>

    <div class="learning-captions" aria-live="polite">
      <template v-if="reviewText">
        <p v-if="showEnglish" lang="en">{{ reviewText }}</p>
      </template>
      <template v-else-if="segment">
        <small v-if="sharedLabel && line < item.questionStart" class="shared-caption">{{ sharedLabel }}材料</small>
        <small v-if="segment.speaker || segment.option">{{ [segment.speaker, segment.option].filter(Boolean).join(' · ') }}</small>
        <button v-if="showEnglish" type="button" class="english-caption" lang="en" title="点击重播本句" @click="replayLine"><template v-for="(fragment, i) in segment.textEn.split(/(_{2,}|\*\*\[\d+\]\*\*)/)" :key="i"><mark v-if="i % 2">{{ fragment }}</mark><template v-else>{{ fragment }}</template></template></button>
        <p v-if="showChinese" lang="zh-CN">{{ subtitle?.textZh || '本句中文字幕待补充。' }}</p>
        <p v-if="settings.mode === 'detailed' && !skipDetail && subtitle?.noteZh">{{ subtitle.noteZh }}</p>
      </template>
    </div>

    <div class="player-row">
      <progress :value="line + 1" :max="Math.max(1, questionCount)" aria-label="句子进度" />
      <span>{{ line + 1 }} / {{ questionCount }} 句</span>
      <span role="status">{{ { idle: '就绪', playing: '播放中', paused: '已暂停', error: '播放失败' }[state] }}</span>
    </div>
    <p v-if="item.missingOptions" role="status">题库缺少部分看图题选项，可继续练习现有选项。</p>
    <p v-if="!supported()" role="status">此浏览器不支持语音合成，仍可手动阅读字幕。</p>
    <div v-if="error" class="player-row">
      <span role="alert">{{ error }}</span>
      <button type="button" @click="skipAudio">跳过</button>
    </div>
    <div class="player-row">
      <button type="button" :disabled="index === 0" @click="selectQuestion(index - 1)">上一题</button>
      <button type="button" :disabled="line === 0" @click="moveLine(-1)">上一句</button>
      <button class="primary" type="button" @click="toggle">{{ state === 'playing' ? '暂停' : state === 'paused' ? '继续' : state === 'error' ? '重试' : '播放' }}</button>
      <button type="button" :disabled="line + 1 >= questionCount" @click="moveLine(1)">下一句</button>
      <button type="button" :disabled="index + 1 >= items.length" @click="selectQuestion(index + 1)">下一题</button>
      <button type="button" @click="replayLine">重播本句</button>
      <button type="button" @click="replayQuestion">重播本题</button>
      <button v-if="settings.mode === 'detailed' && state !== 'idle'" type="button" @click="skipAudio">跳过当前段</button>
    </div>

    <div v-if="!revealed" class="learning-answer">
      <fieldset>
        <legend>作答</legend>
        <label v-for="option in question.choices" :key="option.label" class="choice" :class="{ selected: option.label === segment?.option }">
          <input v-model="choice" type="radio" name="learning-answer" :value="option.label">
          <span>{{ option.label }}<template v-if="question.part >= 3"> · {{ option.text }}</template></span>
        </label>
      </fieldset>
      <button type="button" :disabled="!choice" @click="submitAnswer">确认答案</button>
      <p v-if="finished && !choice">原文已播放完毕，可以作答查看解析。</p>
    </div>
    <div v-else class="learning-answer">
      <strong>正确答案 {{ question.answer }} · {{ correctChoice?.text }}</strong>
      <p v-if="item.completedSentence" lang="en">{{ item.completedSentence }}</p>
      <details :open="settings.explanations && settings.mode !== 'english'">
        <summary>中文答案解析</summary>
        <p v-if="explanation">{{ explanation }}</p>
        <template v-else>
          <p>本题中文解析待补充。</p>
          <div v-if="question.explanation" lang="en" class="markdown" v-html="renderMarkdown(question.explanation)" />
        </template>
      </details>
    </div>

    <details class="learning-settings">
      <summary>播放设置</summary>
      <div class="player-settings-grid">
        <label>学习模式
          <select aria-label="学习模式" :value="settings.mode" @change="setMode(($event.target as HTMLSelectElement).value)">
            <option value="english">纯英语听力</option><option value="bilingual">双语学习</option><option value="detailed">精讲学习</option>
          </select>
        </label>
        <label>字幕
          <select v-model="settings.captions" aria-label="字幕">
            <option value="both">英文＋中文</option><option value="en">仅英文</option><option value="zh">仅中文</option><option value="none">隐藏</option>
          </select>
        </label>
        <label>英语语速
          <select v-model.number="settings.rate" aria-label="英语语速"><option v-for="rate in [0.75, 0.9, 1, 1.25]" :key="rate" :value="rate">{{ rate }}×</option></select>
        </label>
        <label>英语语音
          <select v-model="settings.voice" aria-label="英语语音"><option value="">系统推荐</option><option v-for="voice in voices" :key="voice.voiceURI" :value="voice.voiceURI">{{ voice.name }} ({{ voice.lang }})</option></select>
        </label>
        <label>句间停顿（秒）<input v-model.number="settings.gap" type="number" min="0" max="5" step="0.5" @change="settings.gap = Math.min(5, Math.max(0, Number(settings.gap) || 0))"></label>
        <label>连续学习范围
          <select v-model="settings.scope" aria-label="连续学习范围">
            <option value="question">当前题</option><option value="part">当前 Part</option><option value="test">{{ wrongOnly ? '全部错题' : '整套试题' }}</option>
          </select>
        </label>
        <label>答题方式
          <select v-model="settings.answerMode" aria-label="答题方式"><option value="manual">先做题再解析</option><option value="auto">播完原文后自动揭晓</option></select>
        </label>
        <label><input v-model="settings.chinese" type="checkbox"> 朗读中文</label>
        <label><input v-model="settings.explanations" type="checkbox"> 展开中文解析</label>
        <label><input v-model="settings.nextLine" type="checkbox"> 自动下一句</label>
        <label><input v-model="settings.nextQuestion" type="checkbox"> 自动下一题</label>
        <label><input v-model="settings.loop" type="checkbox"> 循环当前题</label>
        <label><input v-model="settings.repeat" type="checkbox"> 重复朗读正确句</label>
      </div>
    </details>
  </section>
  <p v-else class="empty-state">当前范围没有可学习的题目。</p>
</template>

<style scoped>
.learning-player { display: grid; gap: 1rem; padding: clamp(.75rem, 3vw, 1.5rem); border: 1px solid var(--line); border-radius: 20px; background: var(--paper, #fffdf8); }
.learning-player h2, .image-status { margin: 0; }
.learning-stem { margin: 0; font-size: 1.15rem; font-weight: 650; }
.shared-caption { display: block; }
.player-row { display: flex; flex-wrap: wrap; align-items: center; gap: .55rem .8rem; }
.player-row progress { flex: 1 1 10rem; accent-color: #2c5c57; }
.player-row button { min-height: 44px; padding: .45rem .85rem; }
.learning-picture { display: grid; place-items: center; border-radius: 12px; background: #112b2a; overflow: hidden; }
.learning-picture img { display: block; max-width: 100%; max-height: 55vh; object-fit: contain; }
.learning-captions { background: #153633; color: #fff; padding: 1rem; min-height: 7rem; border-radius: 12px; overflow-wrap: anywhere; white-space: pre-wrap; }
.learning-captions p { margin: .35rem 0; }
.english-caption { display: block; padding: 0; text-align: left; border: 0; color: #fff; background: transparent; font-size: 1.16rem; box-shadow: none; white-space: inherit; }
.english-caption mark { background: #f6dc91; color: #183f3b; border-radius: .2em; }
.learning-answer, .learning-settings { border-top: 1px solid var(--line); padding-top: .8rem; }
.learning-answer fieldset { display: grid; gap: .35rem; padding: 0; margin-bottom: .65rem; border: 0; }
.player-settings-grid { display: grid; gap: .65rem 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); margin-top: .75rem; }
.player-settings-grid select, .player-settings-grid input[type=number] { display: block; width: 100%; }
</style>
