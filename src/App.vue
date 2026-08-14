<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
import { getTtsEngine } from './services/ttsEngine'
onBeforeUnmount(() => getTtsEngine().cancelSpeech())
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/"><span class="brand-mark">T</span><span>TOEIC Markdown Lab</span></RouterLink>
      <nav aria-label="Main navigation"><RouterLink to="/tests">Tests</RouterLink><RouterLink to="/settings">Voice settings</RouterLink></nav>
    </header>
    <main><RouterView /></main>
    <footer><p>Original TOEIC-style practice content · No audio files · Browser speech only</p></footer>
  </div>
</template>
