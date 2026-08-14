<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { TestIndexEntry } from '../types/exam'
import { loadTestIndex } from '../services/testLoader'
const tests = ref<TestIndexEntry[]>([]); const error = ref(''); const loading = ref(true)
onMounted(async () => { try { tests.value = await loadTestIndex() } catch (reason) { error.value = reason instanceof Error ? reason.message : 'Unable to load tests.' } finally { loading.value = false } })
</script>
<template><div>
  <section class="hero"><div><p class="eyebrow">Markdown-powered learning</p><h1>TOEIC Online<br><em>Mock Test</em></h1><p class="lead">Practice Listening & Reading with browser TTS and repository-managed Markdown tests. No audio downloads, no account, no backend.</p><div class="hero-actions"><a class="button primary" href="#test-list">Explore tests</a><RouterLink class="button" to="/settings">Set voices</RouterLink></div></div><div class="score-orbit" aria-hidden="true"><span>7</span><small>PARTS</small><div class="orbit-one">TTS</div><div class="orbit-two">MD</div></div></section>
  <section id="test-list" class="section"><div class="section-heading"><div><p class="eyebrow">Test library</p><h2>Choose your session</h2></div><span>{{ tests.length }} available</span></div><p v-if="loading">Loading tests…</p><p v-else-if="error" class="error">{{ error }}</p><div class="test-grid"><article v-for="test in tests" :key="test.id" class="test-card"><div class="card-top"><span class="pill">FULL TEST</span><span>v{{ test.version }}</span></div><h3>{{ test.title }}</h3><dl><div><dt>Difficulty</dt><dd>{{ test.difficulty || 'Mixed' }}</dd></div><div><dt>Target</dt><dd>{{ test.targetScore || 'All levels' }}</dd></div></dl><div class="card-actions"><RouterLink class="button" :to="`/test/${test.id}/practice`">Practice</RouterLink><RouterLink class="button primary" :to="`/test/${test.id}`">Full test</RouterLink></div></article></div></section>
  <section class="feature-strip"><div><strong>Markdown</strong><span>Commit new tests as content</span></div><div><strong>Browser TTS</strong><span>Voices already on your device</span></div><div><strong>Private by design</strong><span>Progress stays in LocalStorage</span></div></section>
</div></template>
