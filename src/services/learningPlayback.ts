import { onBeforeUnmount, ref } from 'vue'
import { assignDefaultVoices, getTtsEngine } from './ttsEngine'
import type { SpeechLine } from '../types/exam'

type State = 'idle' | 'playing' | 'paused' | 'error'

export function useLearningPlayback() {
  const state = ref<State>('idle')
  const error = ref('')
  let current: AbortController | undefined
  let wake: (() => void) | undefined

  const supported = () => Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance)
  function stop() {
    current?.abort()
    current = undefined
    const resume = wake
    wake = undefined
    resume?.()
    if (supported()) getTtsEngine().cancelSpeech()
    state.value = 'idle'
    error.value = ''
  }

  async function run(play: (signal: AbortSignal) => Promise<void>) {
    stop()
    const controller = new AbortController()
    current = controller
    state.value = 'playing'
    try {
      await play(controller.signal)
      if (!controller.signal.aborted) state.value = 'idle'
    } catch (cause) {
      if (controller.signal.aborted) return
      error.value = cause instanceof Error ? cause.message : String(cause)
      state.value = 'error'
    }
  }

  async function ready(signal: AbortSignal) {
    if (state.value === 'paused' && !signal.aborted) {
      await new Promise<void>(resolve => { wake = resolve })
    }
    signal.throwIfAborted()
  }

  async function gap(ms: number, signal: AbortSignal) {
    signal.throwIfAborted()
    if (ms > 0) {
      await new Promise<void>(resolve => {
        const finish = () => {
          clearTimeout(timer)
          signal.removeEventListener('abort', finish)
          resolve()
        }
        const timer = setTimeout(finish, ms)
        signal.addEventListener('abort', finish, { once: true })
      })
    }
    await ready(signal)
  }

  async function speak(text: string, signal: AbortSignal, rate = 1, speaker: SpeechLine['speaker'] = 'Narrator', voice = '', language = 'en-US') {
    await ready(signal)
    if (!supported()) throw new Error('此浏览器不支持语音合成。你可以继续阅读字幕或手动切换。')
    const engine = getTtsEngine()
    engine.refreshVoices()
    const voices = engine.getVoices().filter(item => item.lang.toLowerCase().startsWith(language.slice(0, 2)))
    if (!voices.length) throw new Error(`未找到${language === 'zh-CN' ? '中文' : '英语'}语音。请检查浏览器或系统语音设置，也可手动跳过。`)
    const selection = assignDefaultVoices(voices)
    if (voices.some(item => item.voiceURI === voice)) {
      const selected = voices.findIndex(item => item.voiceURI === voice)
      selection.Narrator = selection['Speaker 1'] = voice
      selection['Speaker 2'] = voices[(selected + 1) % voices.length].voiceURI
      selection['Speaker 3'] = voices[(selected + 2) % voices.length].voiceURI
    }
    await engine.speakLine({ text, speaker }, selection, rate, language, signal)
    await ready(signal)
  }

  function togglePause() {
    if (state.value === 'playing') {
      state.value = 'paused'
      if (supported()) getTtsEngine().pauseSpeech()
    } else if (state.value === 'paused') {
      if (supported()) getTtsEngine().resumeSpeech()
      state.value = 'playing'
      const resume = wake
      wake = undefined
      resume?.()
    }
  }

  onBeforeUnmount(stop)
  return { state, error, supported, stop, run, speak, gap, togglePause }
}
