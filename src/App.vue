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
  <header class="px-4 pt-3 text-center">
    <h1 class="text-xl font-bold">魔術方塊解法</h1>
    <p class="mt-1 text-sm text-muted">握法：<b>白色朝下</b>、<b>綠色朝前</b>（黃上、橘右）</p>
  </header>

  <main
    class="mx-auto grid max-w-275 grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-3 pb-30 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start"
  >
    <section class="flex flex-col gap-2 md:sticky md:top-3">
      <CubeCanvas
        class="h-[min(50vh,420px)] md:h-120"
        :state="store.displayState"
        :highlights="inputMode ? store.highlights : []"
        :labels="store.showLabels3d"
        :move="inputMode ? null : store.lastMove"
        :duration="store.duration"
        :reset-key="store.viewResetKey"
        @sticker-click="onStickerClick"
      />
      <div class="flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="btn" @click="store.viewResetKey++">重設視角</button>
        <label class="flex items-center gap-1"><input v-model="store.showLabels3d" type="checkbox" /> 顯示字母</label>
        <button v-if="!inputMode" type="button" class="btn" @click="store.backToInput">← 回到編輯</button>
      </div>
    </section>

    <section v-if="inputMode" class="flex flex-col gap-3">
      <NetEditor
        :state="store.filled"
        :highlights="store.highlights"
        :auto="store.autoFilled"
        @paint="store.paint"
      />

      <div class="actions flex flex-wrap items-center justify-center gap-2">
        <button type="button" class="btn" @click="store.fillSolved">填入已還原狀態</button>
        <button type="button" class="btn" @click="store.scramble">隨機打亂</button>
        <button type="button" class="btn" @click="store.clear">清空</button>
      </div>

      <div class="status min-h-6 text-center" aria-live="polite">
        <p v-if="!store.validation.complete && store.validation.issues.length === 0" class="text-muted">
          還有 {{ missing }} 格未填色
        </p>
        <p v-if="store.autoFilled.length" class="text-muted" data-testid="auto-count">
          已依規則自動推算 {{ store.autoFilled.length }} 格（虛線框），推錯的格子直接重新塗色即可
        </p>
        <ul v-if="store.validation.issues.length" class="text-danger">
          <li v-for="issue in store.validation.issues" :key="issue.message + issue.stickers.join()">
            {{ issue.message }}
          </li>
          <li v-if="unlocatable" class="text-muted">請檢查最近填的幾格</li>
        </ul>
        <p v-if="store.solveError" class="text-danger">{{ store.solveError }}</p>
      </div>

      <button
        type="button"
        class="btn-primary min-h-13 text-lg font-bold"
        :disabled="!store.validation.solvable || store.solving"
        data-testid="solve"
        @click="store.solve"
      >
        {{ store.solving ? '計算中…' : '解題' }}
      </button>
    </section>

    <SolutionPlayer v-else />
  </main>

  <footer
    v-if="inputMode"
    class="fixed inset-x-0 bottom-0 border-t border-line bg-page px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
  >
    <ColorPalette v-model="store.color" class="mx-auto max-w-140" :counts="store.validation.counts" />
  </footer>
</template>
