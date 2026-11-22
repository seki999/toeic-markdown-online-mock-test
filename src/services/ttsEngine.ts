import type { SpeechLine } from '../types/exam'

export type TtsState = 'IDLE' | 'PLAYING_NARRATOR' | 'PLAYING_CONTENT' | 'PAUSED' | 'COMPLETED'
export type VoiceRole = SpeechLine['speaker']
export type VoiceSelection = Record<VoiceRole, string>

export function assignDefaultVoices(voices: SpeechSynthesisVoice[]): VoiceSelection {
  const english = voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang))
  const pool = english.length ? english : voices
  const at = (index: number) => pool[index % Math.max(pool.length, 1)]?.voiceURI ?? ''
  return { Narrator: at(0), 'Speaker 1': at(1), 'Speaker 2': at(2), 'Speaker 3': at(3) }
}

export class TtsEngine {
  state: TtsState = 'IDLE'
  private generation = 0
  private voices: SpeechSynthesisVoice[] = []
  private readonly synth: SpeechSynthesis | undefined

  constructor(synth: SpeechSynthesis | undefined = window.speechSynthesis) {
    this.synth = synth
    this.refreshVoices()
    this.synth?.addEventListener?.('voiceschanged', () => this.refreshVoices())
  }

  refreshVoices() { this.voices = this.synth?.getVoices() ?? [] }
  getVoices() { return [...this.voices] }

  speakLine(line: SpeechLine, voiceSelection: VoiceSelection, rate = 1, language = 'en-US', signal?: AbortSignal): Promise<void> {
    const synth = this.synth
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return Promise.reject(new Error('Speech synthesis is unavailable'))
    const utterance = new SpeechSynthesisUtterance(line.text)
    utterance.lang = language
    utterance.rate = rate
    utterance.pitch = 1
    const prefix = language.split('-')[0].toLowerCase()
    const compatible = this.voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === prefix)
    utterance.voice = compatible.find(voice => voice.voiceURI === voiceSelection[line.speaker]) ?? compatible.find(voice => voice.lang.toLowerCase() === language.toLowerCase()) ?? compatible[0] ?? null
    this.state = line.speaker === 'Narrator' ? 'PLAYING_NARRATOR' : 'PLAYING_CONTENT'
    return new Promise((resolve, reject) => {
      const abort = () => finish(new DOMException('Speech cancelled', 'AbortError'))
      const finish = (error?: Error) => {
        signal?.removeEventListener('abort', abort)
        utterance.onend = null
        utterance.onerror = null
        if (error) reject(error)
        else resolve()
      }
      if (signal?.aborted) return abort()
      signal?.addEventListener('abort', abort, { once: true })
      utterance.onend = () => finish()
      utterance.onerror = (event) => finish(new Error(`Speech synthesis failed: ${event.error}`))
      try { synth.speak(utterance) } catch (error) { finish(new Error(String(error))) }
    })
  }

  async speakSequence(lines: SpeechLine[], voiceSelection: VoiceSelection, rate = 1) {
    this.cancelSpeech()
    const run = this.generation
    for (let index = 0; index < lines.length; index += 1) {
      if (run !== this.generation) return
      await this.speakLine(lines[index], voiceSelection, rate)
      const hasNextLine = index < lines.length - 1
      if (hasNextLine || lines[index].pauseAfterMs !== undefined) {
        const pauseAfterMs = lines[index].pauseAfterMs ?? (lines[index].speaker === 'Narrator' ? 500 : 300)
        await new Promise((resolve) => setTimeout(resolve, pauseAfterMs))
      }
    }
    if (run === this.generation) this.state = 'COMPLETED'
  }

  cancelSpeech() { this.generation += 1; this.synth?.cancel(); if (this.synth?.paused) this.synth.resume(); this.state = 'IDLE' }
  pauseSpeech() { if (this.synth?.speaking && !this.synth.paused) { this.synth.pause(); this.state = 'PAUSED' } }
  resumeSpeech() { if (this.synth?.paused) { this.synth.resume(); this.state = 'PLAYING_CONTENT' } }
}

let singleton: TtsEngine | undefined
export function getTtsEngine() {
  if (!singleton) singleton = new TtsEngine()
  return singleton
}
