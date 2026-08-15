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
  private readonly synth: SpeechSynthesis

  constructor(synth: SpeechSynthesis = window.speechSynthesis) {
    this.synth = synth
    this.refreshVoices()
    this.synth.addEventListener?.('voiceschanged', () => this.refreshVoices())
  }

  refreshVoices() { this.voices = this.synth.getVoices() }
  getVoices() { return [...this.voices] }

  speakLine(line: SpeechLine, voiceSelection: VoiceSelection, rate = 1): Promise<void> {
    const utterance = new SpeechSynthesisUtterance(line.text)
    utterance.rate = rate
    utterance.pitch = 1
    utterance.voice = this.voices.find((voice) => voice.voiceURI === voiceSelection[line.speaker]) ?? this.voices.find((voice) => /^en/i.test(voice.lang)) ?? null
    this.state = line.speaker === 'Narrator' ? 'PLAYING_NARRATOR' : 'PLAYING_CONTENT'
    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve()
      utterance.onerror = (event) => reject(new Error(`Speech synthesis failed: ${event.error}`))
      this.synth.speak(utterance)
    })
  }

  async speakSequence(lines: SpeechLine[], voiceSelection: VoiceSelection, rate = 1) {
    this.cancelSpeech()
    const run = this.generation
    for (let index = 0; index < lines.length; index += 1) {
      if (run !== this.generation) return
      await this.speakLine(lines[index], voiceSelection, rate)
      if (index < lines.length - 1) {
        const pauseAfterMs = lines[index].pauseAfterMs ?? (lines[index].speaker === 'Narrator' ? 500 : 300)
        await new Promise((resolve) => setTimeout(resolve, pauseAfterMs))
      }
    }
    if (run === this.generation) this.state = 'COMPLETED'
  }

  cancelSpeech() { this.generation += 1; this.synth.cancel(); this.state = 'IDLE' }
  pauseSpeech() { if (this.synth.speaking && !this.synth.paused) { this.synth.pause(); this.state = 'PAUSED' } }
  resumeSpeech() { if (this.synth.paused) { this.synth.resume(); this.state = 'PLAYING_CONTENT' } }
}

let singleton: TtsEngine | undefined
export function getTtsEngine() {
  if (!singleton) singleton = new TtsEngine()
  return singleton
}
