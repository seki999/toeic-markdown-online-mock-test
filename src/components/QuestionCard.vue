<script setup lang="ts">
import { computed } from 'vue'
import type { ChoiceLabel, Question } from '../types/exam'
import { renderMarkdown } from '../services/markdownParser'

const props = defineProps<{ question: Question; modelValue?: ChoiceLabel; reveal?: boolean; showTranscript?: boolean; exam?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: ChoiceLabel] }>()
const correct = computed(() => props.modelValue === props.question.answer)
</script>
<template>
  <article class="question-card" :class="{ 'with-passage': question.passages.length }">
    <div v-if="question.passages.length" class="passage-pane">
      <section v-for="(passage, index) in question.passages" :key="index" class="passage"><p class="eyebrow">{{ passage.type || passage.title }} · {{ index + 1 }}</p><div class="markdown" v-html="renderMarkdown(passage.content)" /></section>
    </div>
    <div class="question-pane">
      <div class="question-heading"><span class="number">{{ question.id }}</span><span>Part {{ question.part }}</span></div>
      <div v-if="question.image" class="photo-placeholder" role="img" :aria-label="`Illustration for question ${question.id}`"><svg viewBox="0 0 560 260" aria-hidden="true"><rect width="560" height="260" rx="20" fill="#e8f0ee"/><path d="M65 205h430M105 205v-80h110v80M350 205v-105h105v105M135 160h50M377 130h50" stroke="#2c5c57" stroke-width="10" stroke-linecap="round"/><circle cx="280" cy="92" r="32" fill="#e28b64"/><path d="M235 195c2-54 20-79 45-79s44 25 46 79" fill="#183f3b"/></svg></div>
      <div class="question-text markdown" v-html="renderMarkdown(question.text)" />
      <fieldset><legend class="sr-only">Choose an answer for question {{ question.id }}</legend><label v-for="choice in question.choices" :key="choice.label" class="choice" :class="{ selected: modelValue === choice.label, correct: reveal && choice.label === question.answer, incorrect: reveal && modelValue === choice.label && !correct }"><input type="radio" :name="`q-${question.id}`" :checked="modelValue === choice.label" @change="emit('update:modelValue', choice.label)"/><span class="choice-label">{{ choice.label }}</span><span>{{ (question.part <= 2 && exam) ? `Option ${choice.label}` : choice.text }}</span></label></fieldset>
      <div v-if="reveal" class="feedback" :class="correct ? 'success' : 'error'"><strong>{{ correct ? 'Correct' : modelValue ? 'Not quite' : 'Unanswered' }}</strong><span>Correct answer: {{ question.answer }}</span></div>
      <details v-if="reveal && question.explanation" open><summary>Explanation</summary><div class="markdown" v-html="renderMarkdown(question.explanation)" /></details>
      <details v-if="showTranscript && question.speech.length" open><summary>Transcript</summary><p v-for="(line, index) in question.speech" :key="index"><strong>{{ line.speaker }}:</strong> {{ line.text }}</p></details>
      <div v-if="reveal && question.tags.length" class="tags"><span v-for="tag in question.tags" :key="tag">{{ tag }}</span></div>
    </div>
  </article>
</template>
