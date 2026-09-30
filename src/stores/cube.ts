import { defineStore } from 'pinia'
import { computed, nextTick, ref, watch } from 'vue'

import { applyMoves, CENTERS, EMPTY, FACES, randomScramble, SOLVED, type CubeState, type Face } from '@/cube/cube'
import { invertMoves } from '@/cube/notation'
import { validate } from '@/cube/validate'
import type { MethodId, SolveResult } from '@/solvers'

const STATE_PATTERN = /^[URFDLB.]{54}$/

/** 網址是外部輸入：格式或中心塊不對就當作沒有 */
export function parseUrlState(search: string): CubeState | null {
  const s = new URLSearchParams(search).get('s')
  if (!s || !STATE_PATTERN.test(s)) return null
  return CENTERS.every((i, k) => s[i] === FACES[k]) ? s : null
}

let worker: Worker | undefined

/** 提早啟動 Worker，讓 Kociemba 建表在使用者填色時就完成 */
export function warmUpSolver(): Worker {
  worker ??= new Worker(new URL('../solvers/solver.worker.ts', import.meta.url), { type: 'module' })
  return worker
}

function solveInWorker(state: CubeState): Promise<SolveResult[]> {
  const w = warmUpSolver()
  return new Promise((resolve, reject) => {
    w.onmessage = (e: MessageEvent<SolveResult[]>) => resolve(e.data)
    w.onerror = (e) => reject(new Error(e.message || '解題程式發生錯誤'))
    w.postMessage(state)
  })
}

export const useCubeStore = defineStore('cube', () => {
  // --- 輸入 ---
  const state = ref<CubeState>(parseUrlState(location.search) ?? EMPTY)
  const color = ref<Face>('D')
  const showLabels3d = ref(false)
  const validation = computed(() => validate(state.value))
  const highlights = computed(() => validation.value.issues.flatMap((i) => i.stickers))

  watch(state, (s) => history.replaceState(null, '', `${location.pathname}?s=${s}`))

  function paint(index: number) {
    if (CENTERS.includes(index)) return
    state.value = state.value.slice(0, index) + color.value + state.value.slice(index + 1)
  }
  const fillSolved = () => (state.value = SOLVED)
  const clear = () => (state.value = EMPTY)
  const scramble = () => (state.value = applyMoves(SOLVED, randomScramble()))

  // --- 解題與播放 ---
  const mode = ref<'input' | 'solve'>('input')
  const solving = ref(false)
  const solveError = ref('')
  const results = ref<SolveResult[]>([])
  const methodId = ref<MethodId>('kociemba')
  const step = ref(0)
  const lastMove = ref<string | null>(null)
  const viewResetKey = ref(0)
  const duration = ref(350)

  const active = computed(() => results.value.find((r) => r.method === methodId.value))
  const stages = computed(() => (active.value && 'stages' in active.value ? active.value.stages : []))
  const moves = computed(() => stages.value.flatMap((s) => s.moves))
  const displayState = computed(() =>
    mode.value === 'solve' ? applyMoves(state.value, moves.value.slice(0, step.value)) : state.value,
  )

  async function solve() {
    if (!validation.value.solvable || solving.value) return
    solving.value = true
    solveError.value = ''
    try {
      results.value = await solveInWorker(state.value)
      methodId.value = results.value.find((r) => 'stages' in r)?.method ?? 'kociemba'
      goTo(0)
      mode.value = 'solve'
    } catch (e) {
      solveError.value = e instanceof Error ? e.message : String(e)
    } finally {
      solving.value = false
    }
  }

  function goTo(index: number, move: string | null = null) {
    lastMove.value = move
    step.value = Math.max(0, Math.min(index, moves.value.length))
    viewResetKey.value++
  }
  function next() {
    if (step.value < moves.value.length) goTo(step.value + 1, moves.value[step.value]!)
  }
  function prev() {
    if (step.value > 0) goTo(step.value - 1, invertMoves([moves.value[step.value - 1]!])[0]!)
  }
  async function replay() {
    if (step.value === 0) return
    goTo(step.value - 1)
    await nextTick()
    next()
  }
  function selectMethod(id: MethodId) {
    methodId.value = id
    goTo(0)
  }
  function backToInput() {
    mode.value = 'input'
    lastMove.value = null
  }

  return {
    state,
    color,
    showLabels3d,
    validation,
    highlights,
    paint,
    fillSolved,
    clear,
    scramble,
    mode,
    solving,
    solveError,
    results,
    methodId,
    step,
    lastMove,
    viewResetKey,
    duration,
    stages,
    moves,
    displayState,
    solve,
    goTo,
    next,
    prev,
    replay,
    selectMethod,
    backToInput,
  }
})
