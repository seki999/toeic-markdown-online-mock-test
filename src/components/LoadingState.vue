<script setup lang="ts">defineProps<{ loading?: boolean; error?: string }>()</script>
<template><div v-if="loading" class="state-card" aria-live="polite">Loading test content…</div><div v-else-if="error" class="state-card error" role="alert"><strong>Invalid TOEIC Markdown format.</strong><span>{{ error }}</span></div></template>
