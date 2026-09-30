import { applyMoves, SOLVED, type CubeState } from '@/cube/cube'
import { toFaceMoves, type Move } from '@/cube/notation'
import { OLL_ALGS, PLL_ALGS } from './algs'
import type { SolutionStage } from './index'
import { beginnerLastLayer, F2L_FACELETS, SLOTS } from './lbl'
import {
  AUF,
  CROSS_PIECES,
  DEST,
  FACE_MOVES,
  getCrossTable,
  isSolvedAt,
  locatePieces,
  pairTable,
  solveCross,
  type PieceTable,
} from './search'

const MAX_F2L_DEPTH = 14
// ponytail: 節點上限防止極端狀態卡死；超過就回報錯誤，該分頁顯示失敗，其他解法不受影響
const NODE_LIMIT = 20_000_000

let pairTables: PieceTable[] | undefined
export function getPairTables(): PieceTable[] {
  pairTables ??= SLOTS.map((s) => pairTable(s.corner, s.edge))
  return pairTables
}

const faceOf = (m: number) => Math.floor(m / 3)
// FACES 順序 URFDLB：相差 3 為對面；對面轉動可交換，只保留一種順序
const redundant = (face: number, last: number) =>
  face === last || (last >= 0 && (face + 3) % 6 === last && face < last)

/**
 * 在目前狀態下放好一組 F2L（十字與已完成的組不能被破壞）。
 * 各槽位以同樣的深度上限輪流嘗試，先找到的就是最短的那一組。
 */
function solveNextPair(state: CubeState, remaining: number[], done: number[]): { slot: number; moves: Move[] } {
  const cross = getCrossTable()
  const tables = getPairTables()
  const { corners, edges } = locatePieces(state)
  const crossLocs = CROSS_PIECES.map((e) => edges[e]!)
  const pairLocs = (k: number) => [corners[SLOTS[k]!.corner]!, edges[SLOTS[k]!.edge]!]
  let nodes = 0

  // locs = [十字 4 格, 目標組 2 格, 已完成的組各 2 格]
  function search(locs: number[], tracked: number[], g: number, bound: number, last: number, path: number[]): boolean {
    let h = cross.distance(locs.slice(0, 4))
    tracked.forEach((k, j) => {
      h = Math.max(h, tables[k]!.distance(locs.slice(4 + 2 * j, 6 + 2 * j)))
    })
    if (h === 0) return true
    if (g + h > bound) return false
    if (++nodes > NODE_LIMIT) throw new Error('CFOP：F2L 搜尋超過上限')
    for (let m = 0; m < 18; m++) {
      if (redundant(faceOf(m), last)) continue
      const dest = DEST[m]!
      path.push(m)
      if (search(locs.map((l) => dest[l]!), tracked, g + 1, bound, faceOf(m), path)) return true
      path.pop()
    }
    return false
  }

  for (let bound = 0; bound <= MAX_F2L_DEPTH; bound++) {
    for (const k of remaining) {
      const tracked = [k, ...done]
      const locs = [...crossLocs, ...tracked.flatMap(pairLocs)]
      const path: number[] = []
      if (search(locs, tracked, 0, bound, -1, path)) return { slot: k, moves: path.map((m) => FACE_MOVES[m]!) }
    }
  }
  throw new Error('CFOP：F2L 找不到解')
}

function solveF2L(state: CubeState): { state: CubeState; stages: SolutionStage[] } {
  let s = state
  const remaining = [0, 1, 2, 3]
  const done: number[] = []
  const stages: SolutionStage[] = []
  while (remaining.length) {
    const { slot, moves } = solveNextPair(s, remaining, done)
    s = applyMoves(s, moves)
    remaining.splice(remaining.indexOf(slot), 1)
    done.push(slot)
    stages.push({ title: `F2L 第 ${done.length} 組`, moves })
  }
  return { state: s, stages }
}

type NamedAlg = { name: string; moves: Move[] }
let ollAlgs: NamedAlg[] | undefined
let pllAlgs: NamedAlg[] | undefined
const prepare = (list: readonly [string, string][]) => list.map(([name, a]) => ({ name, moves: toFaceMoves(a) }))

const U_FACELETS = [0, 1, 2, 3, 4, 5, 6, 7, 8]
const ollDone = (s: CubeState) => isSolvedAt(s, F2L_FACELETS) && U_FACELETS.every((i) => s[i] === 'U')

/** 找出哪一條 OLL（含前置 U 轉動）能讓頂面全黃 */
function solveOll(state: CubeState): SolutionStage | null {
  if (ollDone(state)) return { title: 'OLL（跳過）', moves: [] }
  ollAlgs ??= prepare(OLL_ALGS)
  for (const pre of AUF) {
    for (const { name, moves } of ollAlgs) {
      const seq = toFaceMoves([...pre, ...moves])
      if (ollDone(applyMoves(state, seq))) return { title: `OLL（${name}）`, moves: seq }
    }
  }
  return null
}

/** 找出哪一條 PLL（含前後 U 轉動）能完成方塊 */
function solvePll(state: CubeState): SolutionStage | null {
  pllAlgs ??= prepare(PLL_ALGS)
  const skip = AUF.find((post) => applyMoves(state, post) === SOLVED)
  if (skip) return { title: 'PLL（跳過）', moves: skip }
  for (const pre of AUF) {
    for (const { name, moves } of pllAlgs) {
      for (const post of AUF) {
        const seq = toFaceMoves([...pre, ...moves, ...post])
        if (applyMoves(state, seq) === SOLVED) return { title: `PLL（${name}）`, moves: seq }
      }
    }
  }
  return null
}

export function solveCfop(state: CubeState): SolutionStage[] {
  const cross = solveCross(state)
  const f2l = solveF2L(applyMoves(state, cross))
  const head = [{ title: '十字', moves: cross }, ...f2l.stages]

  const oll = solveOll(f2l.state)
  if (!oll) return [...head, ...beginnerLastLayer(f2l.state)]
  const afterOll = applyMoves(f2l.state, oll.moves)
  const pll = solvePll(afterOll)
  if (!pll) return [...head, oll, ...beginnerLastLayer(afterOll, 2)]
  return [...head, oll, pll]
}
