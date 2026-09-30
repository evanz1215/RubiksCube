<script setup lang="ts">
import { FACE_COLORS, FACES, type Face } from '@/cube/cube'

defineProps<{ counts: Record<Face, number> }>()
const selected = defineModel<Face>({ required: true })
</script>

<template>
  <div class="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="選擇顏色">
    <button
      v-for="f in FACES"
      :key="f"
      type="button"
      role="radio"
      class="flex flex-col items-center gap-0.5 rounded-[10px] border-2 bg-surface py-1.5 text-ink"
      :class="selected === f ? 'border-accent' : 'border-transparent'"
      :aria-checked="selected === f"
      :aria-label="`${FACE_COLORS[f].name}色，已填 ${counts[f]} 格`"
      :data-color="f"
      @click="selected = f"
    >
      <span
        class="grid size-8.5 place-items-center rounded-lg border border-black/30 font-bold text-[#111]"
        :style="{ background: FACE_COLORS[f].hex }"
      >
        {{ FACE_COLORS[f].letter }}
      </span>
      <span class="text-xs tabular-nums" :class="counts[f] > 9 && 'font-bold text-danger'">{{ counts[f] }}/9</span>
    </button>
  </div>
</template>
