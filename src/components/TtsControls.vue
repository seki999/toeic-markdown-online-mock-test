<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SpeechLine } from '../types/exam'
import { getTtsEngine } from '../services/ttsEngine'
import { useSettingsStore } from '../stores/settings'

const props = defineProps<{ lines: SpeechLine[]; exam?: boolean }>()
const settings = useSettingsStore()
const state = ref(getTtsEngine().state)
const hasAudio = computed(() => props.lines.length > 0)
async function play() {
  if (!hasAudio.value) return
  state.value = 'PLAYING_CONTENT'
  try { await getTtsEngine().speakSequence(props.lines, settings.selection, props.exam ? 1 : settings.rate) }
  catch (error) { console.error(error) }
  state.value = getTtsEngine().state
}
function pause() { getTtsEngine().pauseSpeech(); state.value = getTtsEngine().state }
function resume() { getTtsEngine().resumeSpeech(); state.value = getTtsEngine().state }
function stop() { getTtsEngine().cancelSpeech(); state.value = getTtsEngine().state }
</script>
<template><div v-if="hasAudio" class="tts-controls" aria-label="Listening controls"><button class="primary" type="button" @click="play">▶ {{ state === 'COMPLETED' ? 'Replay' : 'Play audio' }}</button><button type="button" @click="pause">Pause</button><button type="button" @click="resume">Resume</button><button type="button" @click="stop">Stop</button><span class="status-dot">{{ state.replaceAll('_', ' ') }}</span></div></template>
