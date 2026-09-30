<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useCubeStore } from '@/stores/cube'
import { moveAnimationMs } from '@/three/cubeScene'

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

/** 步驟格子的樣式；done / current / next 也是測試用的語意 class */
function chipClass(index: number): string[] {
  const base = 'min-w-10 rounded-lg border px-2 py-1.5 font-mono'
  if (index === store.step - 1) return [base, 'current border-accent bg-accent text-on-accent']
  if (store.started && index === store.step) return [base, 'next border-2 border-dashed border-accent bg-surface']
  return [base, 'border-line bg-surface', index < store.step - 1 ? 'done opacity-45' : '']
}

const playing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function loop() {
  if (!playing.value || store.step >= total.value) {
    playing.value = false
    return
  }
  if (!store.started) {
    store.start()
    timer = setTimeout(loop, 600)
    return
  }
  const move = store.moves[store.step]!
  store.next()
  timer = setTimeout(loop, moveAnimationMs(move, store.duration) + 250)
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
// 快捷鍵：空白鍵 / → 開始或下一步，← 上一步。
// 焦點在按鈕、選單等控制項上時不攔截，避免一次按鍵觸發兩個動作
const FORM_CONTROLS = 'button, select, input, textarea, [contenteditable]'
function onKeydown(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return
  if (e.target instanceof Element && e.target.closest(FORM_CONTROLS)) return
  if (e.key === ' ' || e.key === 'ArrowRight') {
    e.preventDefault()
    if (!store.started) stopAnd(store.start)
    else if (nextMove.value) stopAnd(store.next)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (store.started) stopAnd(store.prev)
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex gap-1.5" role="tablist" aria-label="解法">
      <button
        v-for="r in store.results"
        :key="r.method"
        type="button"
        role="tab"
        :aria-selected="r.method === store.methodId"
        class="btn flex-1 px-1"
        :class="{ 'border-accent shadow-[inset_0_-3px_0_var(--color-accent)]': r.method === store.methodId }"
        @click="stopAnd(() => store.selectMethod(r.method))"
      >
        {{ r.name }}
        <small class="block text-muted">{{
          'stages' in r ? `${r.stages.reduce((n, s) => n + s.moves.length, 0)} 步` : '失敗'
        }}</small>
      </button>
    </div>

    <p v-if="active && 'error' in active" class="text-danger">{{ active.error }}</p>

    <template v-else>
      <div class="flex items-baseline justify-center gap-3" aria-live="polite">
        <span class="text-muted tabular-nums">{{ store.step }} / {{ total }}</span>
        <!-- leading 與大字記號同高，切換時版面不跳動 -->
        <span v-if="!store.started" class="text-lg leading-[53px] font-semibold" data-testid="ready">
          握好方塊後按「開始」
        </span>
        <template v-else>
          <span v-if="nextMove" class="text-muted">下一步</span>
          <strong class="font-mono text-[44px]" data-testid="next-move">{{ nextMove ?? '完成！' }}</strong>
          <span
            v-if="nextMove?.endsWith('2')"
            class="rounded-full bg-accent px-2 py-0.5 text-sm font-bold text-on-accent"
            data-testid="double-hint"
          >
            轉兩次
          </span>
        </template>
      </div>

      <div class="grid grid-cols-[48px_48px_1fr_48px_64px] gap-1.5 *:min-h-13">
        <button
          type="button"
          class="btn px-0"
          aria-label="上一步"
          :disabled="store.step === 0"
          @click="stopAnd(store.prev)"
        >
          ◀
        </button>
        <button
          type="button"
          class="btn px-0"
          :aria-label="playing ? '暫停' : '自動播放'"
          :disabled="!nextMove"
          @click="togglePlay"
        >
          {{ playing ? '❚❚' : '▶▶' }}
        </button>
        <button
          v-if="!store.started"
          type="button"
          class="btn-primary text-xl font-bold"
          data-testid="start"
          @click="stopAnd(store.start)"
        >
          開始 ▶
        </button>
        <button
          v-else
          type="button"
          class="btn-primary text-xl font-bold"
          :disabled="!nextMove"
          data-testid="next-step"
          @click="stopAnd(store.next)"
        >
          下一步 ▶
        </button>
        <button
          type="button"
          class="btn px-0"
          aria-label="重播這一步"
          :disabled="store.step === 0"
          @click="stopAnd(store.replay)"
        >
          ↺
        </button>
        <select v-model.number="store.duration" class="btn px-1" aria-label="動畫速度">
          <option v-for="s in SPEEDS" :key="s.ms" :value="s.ms">{{ s.label }}</option>
        </select>
      </div>
      <!-- 觸控裝置沒有鍵盤，不顯示 -->
      <p class="text-center text-[13px] text-muted [@media(hover:none)]:hidden [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-line [&_kbd]:px-1.5">
        快捷鍵：<kbd>空白鍵</kbd> / <kbd>→</kbd> 開始・下一步　<kbd>←</kbd> 上一步
      </p>

      <!-- 實心 = 目前所在位置（做完的最後一步），虛線 = 下一步要轉的 -->
      <ol class="flex flex-col gap-2.5">
        <li v-for="row in stageRows" :key="row.title">
          <h3 class="mb-1 text-sm text-muted">{{ row.title }}</h3>
          <p v-if="row.moves.length === 0" class="text-[13px] text-muted">此階段已完成</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="{ m, index } in row.moves"
              :key="index"
              type="button"
              :class="chipClass(index)"
              :data-testid="`move-${index}`"
              @click="stopAnd(() => store.goTo(index + 1))"
            >
              {{ m }}
            </button>
          </div>
        </li>
      </ol>
    </template>
  </section>
</template>
