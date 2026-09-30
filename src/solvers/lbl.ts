import { applyMoves, CORNERS, EDGES, splitAlg, type CubeState, type Face } from '@/cube/cube'
import { toFaceMoves, type Move } from '@/cube/notation'
import type { SolutionStage } from './index'
import { AUF, firstWorking, isSolvedAt, locatePieces, macroSearch, solveCross, type Goal } from './search'

/** 底層四個槽位：從哪一面當正面、右手邊是哪一面，以及對應的角塊/中層邊塊編號 */
export const SLOTS = [
  { front: 'F', right: 'R', corner: 4, edge: 8 }, // DFR / FR
  { front: 'R', right: 'B', corner: 7, edge: 11 }, // DRB / BR
  { front: 'B', right: 'L', corner: 6, edge: 10 }, // DBL / BL
  { front: 'L', right: 'F', corner: 5, edge: 9 }, // DLF / FL
] as const
type Slot = (typeof SLOTS)[number]

const OPPOSITE: Record<string, Face> = { F: 'B', B: 'F', R: 'L', L: 'R' }

/** 以 F=正面、R=右面寫成的公式，換成指定槽位的面代號（相當於繞 U 軸轉整顆，但不必換握法） */
function forSlot(alg: string, slot: Slot): Move[] {
  const map: Record<string, string> = {
    F: slot.front,
    R: slot.right,
    B: OPPOSITE[slot.front]!,
    L: OPPOSITE[slot.right]!,
  }
  return splitAlg(alg).map((m) => (map[m[0]!] ?? m[0]) + m.slice(1))
}

const repeat = (moves: Move[], n: number) => Array.from({ length: n }, () => moves).flat()

const CROSS_FACELETS = EDGES.slice(4, 8).flat()
const D_LAYER_FACELETS = [...CROSS_FACELETS, ...CORNERS.slice(4).flat()]
export const F2L_FACELETS = [...D_LAYER_FACELETS, ...EDGES.slice(8).flat()]

interface StageResult {
  state: CubeState
  moves: Move[]
}

/** 目前 at 這一格屬於哪個底層槽位（角塊或中層邊塊） */
function slotContaining(at: number, pieces: typeof CORNERS | typeof EDGES, key: 'corner' | 'edge') {
  return SLOTS.find((t) => (pieces[t[key]] as readonly number[]).includes(at))
}

/** 讓每個槽位的目標方塊歸位：先試公式；方塊卡在別的槽位就先「彈出」再試 */
function placeEach(
  state: CubeState,
  preserved: number[],
  targetOf: (slot: Slot) => readonly number[],
  candidatesFor: (slot: Slot) => Move[][],
  popFrom: (s: CubeState, slot: Slot) => Move[],
): StageResult {
  let s = state
  const moves: Move[] = []
  const kept = [...preserved]
  for (const slot of SLOTS) {
    const target = targetOf(slot)
    const goal: Goal = (st) => isSolvedAt(st, target) && isSolvedAt(st, kept)
    const candidates = [[], ...candidatesFor(slot)]
    let step = firstWorking(s, candidates, goal)
    if (!step) {
      const pop = popFrom(s, slot)
      const rest = firstWorking(applyMoves(s, pop), candidates, goal)
      if (!rest) throw new Error('層先法：無法放入方塊')
      step = [...pop, ...rest]
    }
    s = applyMoves(s, step)
    moves.push(...step)
    kept.push(...target)
  }
  return { state: s, moves: toFaceMoves(moves) }
}

const SEXY = "R U R' U'"

function firstLayerCorners(state: CubeState): StageResult {
  return placeEach(
    state,
    CROSS_FACELETS,
    (slot) => CORNERS[slot.corner]!,
    (slot) => AUF.flatMap((a) => [1, 2, 3, 4, 5].map((n) => [...a, ...repeat(forSlot(SEXY, slot), n)])),
    (s, slot) => {
      // 角塊卡在別的底層槽位：在那個槽位做一次 R U R' U' 把它帶到頂層
      const home = slotContaining(locatePieces(s).corners[slot.corner]!, CORNERS, 'corner')
      return home ? forSlot(SEXY, home) : []
    },
  )
}

const RIGHT_INSERT = "U R U' R' U' F' U F"
// 左插公式 U' L' U L U F U' F' 從槽位右側那一面看出去的寫法（插進同一個槽位）
const LEFT_INSERT = "U' F' U F U R U' R'"

function middleEdges(state: CubeState): StageResult {
  return placeEach(
    state,
    D_LAYER_FACELETS,
    (slot) => EDGES[slot.edge]!,
    (slot) =>
      AUF.flatMap((a) => [
        [...a, ...forSlot(RIGHT_INSERT, slot)],
        [...a, ...forSlot(LEFT_INSERT, slot)],
      ]),
    (s, slot) => {
      // 邊塊卡在別的中層槽位（或本槽位但翻面）：用任一條頂層邊把它換出來
      const home = slotContaining(locatePieces(s).edges[slot.edge]!, EDGES, 'edge')
      return home ? forSlot(RIGHT_INSERT, home) : []
    },
  )
}

const U_FACELETS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const ALL_FACELETS = [...Array(54).keys()]
const U_MACROS: Move[][] = [['U'], ["U'"], ['U2']]

const LAST_LAYER_STEPS: { title: string; macros: Move[][]; goal: Goal; depth: number }[] = [
  {
    title: '頂層十字',
    macros: [...U_MACROS, toFaceMoves("F R U R' U' F'")],
    goal: (s) => isSolvedAt(s, F2L_FACELETS) && [1, 3, 5, 7].every((i) => s[i] === 'U'),
    depth: 5,
  },
  {
    title: '頂面全黃',
    macros: [...U_MACROS, toFaceMoves("R U R' U R U2 R'"), toFaceMoves("R U2 R' U' R U' R'")],
    goal: (s) => isSolvedAt(s, F2L_FACELETS) && U_FACELETS.every((i) => s[i] === 'U'),
    depth: 6,
  },
  {
    title: '頂層角塊歸位',
    macros: [
      ...U_MACROS,
      toFaceMoves("x R' U R' D2 R U' R' D2 R2 x'"),
      toFaceMoves("x R2 D2 R U R' D2 R U' R x'"),
    ],
    goal: (s) => isSolvedAt(s, [...F2L_FACELETS, ...U_FACELETS, ...CORNERS.slice(0, 4).flat()]),
    depth: 5,
  },
  {
    title: '頂層邊塊歸位',
    macros: [...U_MACROS, toFaceMoves("R U' R U R U R U' R' U' R2"), toFaceMoves("R2 U R U R' U' R' U' R' U R'")],
    goal: (s) => isSolvedAt(s, ALL_FACELETS),
    depth: 5,
  },
]

/** 層先法的頂層四步；CFOP 查不到 OLL/PLL 時也用這個接手 */
export function beginnerLastLayer(state: CubeState, fromStep = 0): SolutionStage[] {
  let s = state
  return LAST_LAYER_STEPS.slice(fromStep).map(({ title, macros, goal, depth }) => {
    const moves = macroSearch(s, macros, goal, depth)
    if (!moves) throw new Error(`層先法：${title}失敗`)
    s = applyMoves(s, moves)
    return { title, moves }
  })
}

export function solveLbl(state: CubeState): SolutionStage[] {
  const cross = solveCross(state)
  const corners = firstLayerCorners(applyMoves(state, cross))
  const edges = middleEdges(corners.state)
  return [
    { title: '底層十字', moves: cross },
    { title: '底層角塊', moves: corners.moves },
    { title: '中層邊塊', moves: edges.moves },
    ...beginnerLastLayer(edges.state),
  ]
}
