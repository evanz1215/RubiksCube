<script setup lang="ts">
import { computed, onMounted } from 'vue'

import ColorPalette from '@/components/ColorPalette.vue'
import CubeCanvas from '@/components/CubeCanvas.vue'
import NetEditor from '@/components/NetEditor.vue'
import SolutionPlayer from '@/components/SolutionPlayer.vue'
import { useCubeStore, warmUpSolver } from '@/stores/cube'

const store = useCubeStore()
const inputMode = computed(() => store.mode === 'input')
const missing = computed(() => 54 - Object.values(store.validation.counts).reduce((a, b) => a + b, 0))
const unlocatable = computed(() => store.validation.issues.some((i) => i.stickers.length === 0))

function onStickerClick(index: number) {
  if (inputMode.value) store.paint(index)
}

onMounted(() => {
  if (typeof Worker !== 'undefined') warmUpSolver()
})
</script>

<template>
  <header class="top">
    <h1>魔術方塊解法</h1>
    <p class="grip">握法：<b>白色朝下</b>、<b>綠色朝前</b>（黃上、橘右）</p>
  </header>

  <main class="layout">
    <section class="viewer">
      <CubeCanvas
        :state="store.displayState"
        :highlights="inputMode ? store.highlights : []"
        :labels="store.showLabels3d"
        :move="inputMode ? null : store.lastMove"
        :duration="store.duration"
        :reset-key="store.viewResetKey"
        @sticker-click="onStickerClick"
      />
      <div class="viewer-tools">
        <button type="button" @click="store.viewResetKey++">重設視角</button>
        <label><input v-model="store.showLabels3d" type="checkbox" /> 顯示字母</label>
        <button v-if="!inputMode" type="button" @click="store.backToInput">← 回到編輯</button>
      </div>
    </section>

    <section v-if="inputMode" class="editor">
      <NetEditor :state="store.state" :highlights="store.highlights" @paint="store.paint" />

      <div class="actions">
        <button type="button" @click="store.fillSolved">填入已還原狀態</button>
        <button type="button" @click="store.scramble">隨機打亂</button>
        <button type="button" @click="store.clear">清空</button>
      </div>

      <div class="status" aria-live="polite">
        <p v-if="!store.validation.complete && store.validation.issues.length === 0" class="muted">
          還有 {{ missing }} 格未填色
        </p>
        <ul v-if="store.validation.issues.length" class="issues">
          <li v-for="issue in store.validation.issues" :key="issue.message + issue.stickers.join()">
            {{ issue.message }}
          </li>
          <li v-if="unlocatable" class="muted">請檢查最近填的幾格</li>
        </ul>
        <p v-if="store.solveError" class="issues">{{ store.solveError }}</p>
      </div>

      <button
        type="button"
        class="primary solve"
        :disabled="!store.validation.solvable || store.solving"
        data-testid="solve"
        @click="store.solve"
      >
        {{ store.solving ? '計算中…' : '解題' }}
      </button>
    </section>

    <SolutionPlayer v-else class="editor" />
  </main>

  <footer v-if="inputMode" class="palette-bar">
    <ColorPalette v-model="store.color" :counts="store.validation.counts" />
  </footer>
</template>

<style>
:root {
  --bg: #f6f7f9;
  --surface: #ffffff;
  --text: #1b1d21;
  --muted: #6b7280;
  --border: #d6d9de;
  --accent: #2563eb;
  --on-accent: #ffffff;
  --danger: #dc2626;
  --empty: #9ca3af;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #111317;
    --surface: #1c1f24;
    --text: #e8eaed;
    --muted: #9aa0a6;
    --border: #33373d;
    --accent: #60a5fa;
    --on-accent: #0b1220;
    --danger: #f87171;
    --empty: #4b5563;
    color-scheme: dark;
  }
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, 'Noto Sans TC', sans-serif;
}
button {
  font: inherit;
}
button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
button.primary {
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: var(--on-accent);
  cursor: pointer;
}
</style>

<style scoped>
.top {
  padding: 12px 16px 0;
  text-align: center;
}
.top h1 {
  margin: 0;
  font-size: 20px;
}
.grip {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 16px 120px;
}
.viewer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.viewer :deep(.cube-canvas) {
  height: min(50vh, 420px);
}
.viewer-tools,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  align-items: center;
}
.viewer-tools button,
.actions button {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.status {
  min-height: 24px;
  text-align: center;
}
.issues {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--danger);
}
.muted {
  margin: 0;
  color: var(--muted);
}
.solve {
  min-height: 52px;
  font-size: 18px;
  font-weight: 700;
}
.palette-bar {
  position: fixed;
  inset: auto 0 0;
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.palette-bar > * {
  max-width: 560px;
  margin: 0 auto;
}
@media (min-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: start;
  }
  .viewer {
    position: sticky;
    top: 12px;
  }
  .viewer :deep(.cube-canvas) {
    height: 480px;
  }
}
</style>
