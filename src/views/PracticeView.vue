<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoadingState from '../components/LoadingState.vue'
import QuestionCard from '../components/QuestionCard.vue'
import PracticeIllustration from '../components/PracticeIllustration.vue'
import LearningPlayer from '../components/LearningPlayer.vue'
import { learningQuestions, type LearningNotes } from '../services/learningScript'
import { loadLearningNotes } from '../services/testLoader'
import { renderMarkdown } from '../services/markdownParser'
import TtsControls from '../components/TtsControls.vue'
import { buildContinuousListeningSequence } from '../services/listeningSequence'
import { getTtsEngine } from '../services/ttsEngine'
import { useExamStore } from '../stores/exam'
import type { ChoiceLabel, PartNumber, QuestionGroup, ToeicTest } from '../types/exam'

const route = useRoute()
const router = useRouter()
const store = useExamStore()
const testId = String(route.params.testId)
const test = ref<ToeicTest>()
const part = ref<PartNumber>(Number(route.query.part || 1) as PartNumber)
const revealedGroups = ref<Record<string, boolean>>({})
const illustrationVisibility = ref<Record<string, boolean>>({})
const visibleTranscripts = ref<Record<string, boolean>>({})
const immersive = computed(() => route.query.mode === 'learning')
const playerScreen = ref<HTMLElement>()
const fullPlayback = ref(false)
let nativeFullscreen = false
const learningNotes = ref<LearningNotes>()
const notesError = ref(false)
watch(immersive, async enabled => {
  if (window.speechSynthesis) getTtsEngine().cancelSpeech()
  if (!enabled || learningNotes.value) return
  try { learningNotes.value = await loadLearningNotes(testId); notesError.value = false }
  catch { notesError.value = true }
}, { immediate: true })

function chooseMode(learning: boolean) {
  void router.replace({ query: { ...route.query, mode: learning ? 'learning' : undefined } })
}

function launchFullPlayback() {
  const screen = playerScreen.value
  if (!screen) return
  fullPlayback.value = true
  chooseMode(true)
  void screen.requestFullscreen?.().catch(() => { /* The viewport layout remains available. */ })
}

function exitFullPlayback() {
  fullPlayback.value = false
  if (document.fullscreenElement === playerScreen.value && document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {})
  }
}

function onFullscreenChange() {
  if (document.fullscreenElement && document.fullscreenElement === playerScreen.value) nativeFullscreen = true
  else if (nativeFullscreen) {
    nativeFullscreen = false
    fullPlayback.value = false
  }
}

function onEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullPlayback.value && !document.fullscreenElement) exitFullPlayback()
}

onMounted(async () => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('keydown', onEscape)
  try {
    test.value = await store.ensureTest(testId)
  } catch {
    // Store exposes the parser/loading error through its error state.
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('keydown', onEscape)
  exitFullPlayback()
  getTtsEngine().cancelSpeech()
})

watch(immersive, enabled => { if (!enabled) exitFullPlayback() })

watch(part, () => {
  revealedGroups.value = {}
  visibleTranscripts.value = {}
  illustrationVisibility.value = {}
  getTtsEngine().cancelSpeech()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

const wrongOnly = computed(() => route.query.wrong === '1')
const groups = computed<QuestionGroup[]>(() => {
  const source = test.value?.parts.find((item) => item.number === part.value)?.groups ?? []
  if (!wrongOnly.value) return source

  const wrong = new Set(store.latestResults[testId]?.wrongQuestions ?? [])
  return source
    .map((group) => ({ ...group, questions: group.questions.filter((question) => wrong.has(question.id)) }))
    .filter((group) => group.questions.length)
})
const questionCount = computed(() => groups.value.reduce((total, group) => total + group.questions.length, 0))
const learningItems = computed(() => {
  if (!immersive.value || !test.value) return []
  const wrong = new Set(store.latestResults[testId]?.wrongQuestions ?? [])
  return test.value.parts.flatMap(learningQuestions).filter(item => !wrongOnly.value || wrong.has(item.question.id))
})

function hasIllustration(group: QuestionGroup) {
  return Boolean(group.practiceImage || group.questions.some(question => question.practiceImage))
}
function showIllustration(group: QuestionGroup) {
  return illustrationVisibility.value[group.id] ?? Boolean(revealedGroups.value[group.id])
}

function choose(questionId: number, value: ChoiceLabel) {
  store.answer(testId, questionId, value)
}

function audioLines(group: QuestionGroup) {
  if (group.part === 3 || group.part === 4) return buildContinuousListeningSequence([group])
  return group.speech.length ? group.speech : group.questions.flatMap((question) => question.speech)
}

</script>

<template>
  <div class="page">
    <LoadingState :loading="store.loading" :error="store.error" />

    <template v-if="test">
      <div class="workspace-header">
        <div>
          <p class="eyebrow">{{ wrongOnly ? 'Wrong answer practice' : 'Practice mode' }}</p>
          <h1>Part {{ part }}</h1>
          <p v-if="!immersive" class="lead part-summary">{{ questionCount }} questions · Complete this Part from top to bottom.</p>
        </div>
        <RouterLink class="button quiet" :to="`/test/${testId}`">Exit practice</RouterLink>
      </div>

      <div class="part-tabs" role="tablist" aria-label="Choose a TOEIC Part">
        <button
          v-for="number in 7"
          :key="number"
          :class="{ active: part === number }"
          type="button"
          @click="part = number as PartNumber"
        >
          Part {{ number }}
          <small>{{ number < 5 ? 'Listening' : 'Reading' }}</small>
        </button>
      </div>

      <div class="set-actions practice-mode-switch" role="group" aria-label="Practice mode">
        <button type="button" :aria-pressed="!immersive" @click="chooseMode(false)">传统做题</button>
        <button type="button" :aria-pressed="immersive" @click="launchFullPlayback">沉浸式视听学习</button>
      </div>
      <div ref="playerScreen" v-show="immersive || fullPlayback" :class="{ 'full-playback': fullPlayback }">
        <div v-if="fullPlayback" class="fullscreen-toolbar">
          <button type="button" @click="exitFullPlayback">退出全屏</button>
        </div>
        <p v-if="immersive && notesError" role="status">暂时无法加载中文学习资料，可继续使用英文原文。</p>
        <LearningPlayer v-if="immersive" :key="String(fullPlayback)" :test-id="testId" :part="part" :items="learningItems" :notes="learningNotes" :wrong-only="wrongOnly" :continuous-launch="fullPlayback" />
      </div>
      <div v-if="!immersive && groups.length" class="full-part-practice">
        <section v-for="(group, groupIndex) in groups" :key="group.id" class="practice-set">
          <header class="set-toolbar">
            <div>
              <p class="eyebrow">Set {{ groupIndex + 1 }} of {{ groups.length }}</p>
              <h2>Questions {{ group.questions[0]?.id }}<template v-if="group.questions.length > 1">–{{ group.questions.at(-1)?.id }}</template></h2>
            </div>

            <div class="set-actions">
              <TtsControls v-if="audioLines(group).length" :lines="audioLines(group)" />
              <button
                v-if="audioLines(group).length"
                type="button"
                @click="visibleTranscripts[group.id] = !visibleTranscripts[group.id]"
              >
                {{ visibleTranscripts[group.id] ? 'Hide' : 'Show' }} transcript
              </button>
              <button v-if="hasIllustration(group)" type="button" :aria-pressed="showIllustration(group)" @click="illustrationVisibility[group.id] = !showIllustration(group)">
                {{ showIllustration(group) ? 'Hide' : 'Show' }} learning illustrations
              </button>
              <button
                class="primary"
                type="button"
                @click="revealedGroups[group.id] = true"
              >
                Check answers
              </button>
            </div>
          </header>

          <div
            v-if="(group.part === 3 || group.part === 4) && visibleTranscripts[group.id]"
            class="group-transcript"
          >
            <h3>Transcript</h3>
            <p v-for="(line, index) in (group.speech.length ? group.speech : group.questions.flatMap(question => question.speech))" :key="index">
              <strong>{{ line.speaker }}:</strong> {{ line.text }}
            </p>
          </div>

          <p v-if="hasIllustration(group) && !revealedGroups[group.id]" class="illustration-notice">Learning illustrations may contain answer clues. You can view them now or check your answers first.</p>
          <div class="questions-stack">
            <QuestionCard
              v-for="(question, questionIndex) in group.questions"
              :key="question.id"
              :question="question"
              :model-value="store.answers[testId]?.[question.id]"
              :reveal="Boolean(revealedGroups[group.id])"
              :show-practice-image="!group.practiceImage && showIllustration(group)"
              :hide-explanation="Boolean(group.practiceImage)"
              :show-transcript="group.part !== 3 && group.part !== 4 && Boolean(visibleTranscripts[group.id])"
              :hide-passages="group.part >= 6 && questionIndex > 0"
              @update:model-value="choose(question.id, $event)"
            />
          </div>
          <PracticeIllustration v-if="showIllustration(group)" :image="group.practiceImage" :alt="group.practiceImageAlt" />
          <div v-if="group.practiceImage && revealedGroups[group.id]" class="group-transcript">
            <details v-for="question in group.questions" :key="question.id" open>
              <summary>Question {{ question.id }} · Explanation</summary>
              <div class="markdown" v-html="renderMarkdown(question.explanation)" />
            </details>
          </div>
        </section>
      </div>

      <div v-else-if="!immersive" class="empty-state">
        <h2>No questions here yet</h2>
        <p>{{ wrongOnly ? 'Complete an exam to build your wrong-answer list.' : 'This Part has no content.' }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.practice-mode-switch { justify-content: flex-start; margin: 1rem 0; }
.practice-mode-switch [aria-pressed='true'] { background: #153633; color: #fff; }
.full-playback { position: fixed; inset: 0; z-index: 30; width: 100%; height: 100%; overflow: auto; overscroll-behavior: contain; background: #f5f4ee; padding: clamp(.5rem, 2vw, 1.5rem); }
.full-playback > * { max-width: 1200px; margin-inline: auto; }
.fullscreen-toolbar { display: flex; justify-content: flex-end; margin-bottom: .65rem; }
.group-transcript {
  margin-bottom: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--mint);
}

.group-transcript h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
}

.group-transcript p {
  margin: 0.5rem 0;
  line-height: 1.65;
}

.part-summary {
  margin: 0.7rem 0 0;
  font-size: 1rem;
}

.full-part-practice {
  display: grid;
  gap: 2rem;
}

.practice-set {
  scroll-margin-top: 100px;
}

.set-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1.25rem;
  background: var(--mint);
  border: 1px solid var(--line);
  border-radius: 18px;
}

.set-toolbar h2 {
  margin: 0;
  font-size: 1.7rem;
}

.set-toolbar .eyebrow {
  margin-bottom: 0.4rem;
}

.set-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.set-actions :deep(.tts-controls) {
  margin: 0;
  padding: 0.45rem;
}

@media (max-width: 800px) {
  .set-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .set-actions {
    justify-content: flex-start;
  }
}
</style>
