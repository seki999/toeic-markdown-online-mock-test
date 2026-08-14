import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { assignDefaultVoices, getTtsEngine, type VoiceSelection } from '../services/ttsEngine'

const KEY = 'toeic-md-voice-settings-v1'
export const useSettingsStore = defineStore('settings', () => {
  const engine = getTtsEngine()
  const voices = ref(engine.getVoices())
  let saved: { rate?: number; selection?: VoiceSelection } = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  catch { saved = {} }
  const rate = ref(saved.rate ?? 1)
  const selection = ref<VoiceSelection>(saved.selection ?? assignDefaultVoices(voices.value))
  function refresh() { engine.refreshVoices(); voices.value = engine.getVoices(); if (!Object.values(selection.value).some(Boolean)) selection.value = assignDefaultVoices(voices.value) }
  if (typeof window !== 'undefined') window.speechSynthesis.addEventListener('voiceschanged', refresh)
  watch([rate, selection], () => localStorage.setItem(KEY, JSON.stringify({ rate: rate.value, selection: selection.value })), { deep: true })
  return { rate, selection, voices, refresh }
})
