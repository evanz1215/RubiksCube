<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

import { useCubeStore } from '@/stores/cube'

const store = useCubeStore()
const SPEEDS = [
  { label: '慢', ms: 600 },
  { label: '中', ms: 350 },
  { label: '快', ms: 180 },
]

const active = computed(() => store.results.find((r) => r.method === store.methodId))
const total = computed(() => store.moves.length)
const nextMove = computed(() => store.moves[store.step])

/** 每個階段的步驟，附上在整串解法中的位置 */
const stageRows = computed(() => {
  let offset = 0
  return store.stages.map((s) => {
    const row = { title: s.title, moves: s.moves.map((m, k) => ({ m, index: offset + k })) }
    offset += s.moves.length
    return row
  })
})

const playing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function loop() {
  if (!playing.value || store.step >= total.value) {
    playing.value = false
    return
  }
  store.next()
  timer = setTimeout(loop, store.duration + 250)
}
function togglePlay() {
  playing.value = !playing.value
  clearTimeout(timer)
  if (playing.value) loop()
}
function stopAnd(action: () => void) {
  playing.value = false
  clearTimeout(timer)
  action()
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <section class="player">
    <div class="tabs" role="tablist" aria-label="解法">
      <button
        v-for="r in store.results"
        :key="r.method"
        type="button"
        role="tab"
        :aria-selected="r.method === store.methodId"
        :class="{ active: r.method === store.methodId }"
        @click="stopAnd(() => store.selectMethod(r.method))"
      >
        {{ r.name }}
        <small>{{ 'stages' in r ? `${r.stages.reduce((n, s) => n + s.moves.length, 0)} 步` : '失敗' }}</small>
      </button>
    </div>

    <p v-if="active && 'error' in active" class="error">{{ active.error }}</p>

    <template v-else>
      <div class="now" aria-live="polite">
        <span class="progress">{{ store.step }} / {{ total }}</span>
        <strong class="move" data-testid="next-move">{{ nextMove ?? '完成！' }}</strong>
      </div>

      <div class="controls">
        <button type="button" aria-label="上一步" :disabled="store.step === 0" @click="stopAnd(store.prev)">
          ◀
        </button>
        <button type="button" :aria-label="playing ? '暫停' : '自動播放'" :disabled="!nextMove" @click="togglePlay">
          {{ playing ? '❚❚' : '▶▶' }}
        </button>
        <button
          type="button"
          class="primary big"
          :disabled="!nextMove"
          data-testid="next-step"
          @click="stopAnd(store.next)"
        >
          下一步 ▶
        </button>
        <button type="button" aria-label="重播這一步" :disabled="store.step === 0" @click="stopAnd(store.replay)">
          ↺
        </button>
        <select v-model.number="store.duration" aria-label="動畫速度">
          <option v-for="s in SPEEDS" :key="s.ms" :value="s.ms">{{ s.label }}</option>
        </select>
      </div>

      <ol class="stages">
        <li v-for="row in stageRows" :key="row.title">
          <h3>{{ row.title }}</h3>
          <p v-if="row.moves.length === 0" class="muted">此階段已完成</p>
          <div class="moves">
            <button
              v-for="{ m, index } in row.moves"
              :key="index"
              type="button"
              class="chip"
              :class="{ done: index < store.step, current: index === store.step }"
              @click="stopAnd(() => store.goTo(index))"
            >
              {{ m }}
            </button>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped>
.player {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tabs {
  display: flex;
  gap: 6px;
}
.tabs button {
  flex: 1;
  padding: 8px 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
}
.tabs button.active {
  border-color: var(--accent);
  box-shadow: inset 0 -3px 0 var(--accent);
}
.tabs small {
  display: block;
  color: var(--muted);
}
.now {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
}
.move {
  font-size: 44px;
  font-family: ui-monospace, monospace;
}
.progress {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.controls {
  display: grid;
  grid-template-columns: 48px 48px 1fr 48px 64px;
  gap: 6px;
}
.controls button,
.controls select {
  min-height: 52px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  font-size: 16px;
}
.controls .big {
  font-size: 20px;
  font-weight: 700;
  background: var(--accent);
  color: var(--on-accent);
  border: none;
}
.stages {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stages h3 {
  margin: 0 0 4px;
  font-size: 14px;
  color: var(--muted);
}
.moves {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  min-width: 40px;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-family: ui-monospace, monospace;
  cursor: pointer;
}
.chip.done {
  opacity: 0.45;
}
.chip.current {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--on-accent);
}
.error {
  color: var(--danger);
}
.muted {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
