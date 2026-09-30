import { applyMoves, SOLVED, type CubeState } from '@/cube/cube'
import type { Move } from '@/cube/notation'
import { solveCfop } from './cfop'
import { solveKociemba } from './kociemba'
import { solveLbl } from './lbl'

export interface SolutionStage {
  /** 階段標題；Kociemba 不分階段 */
  title: string
  moves: Move[]
}

export type MethodId = 'kociemba' | 'lbl' | 'cfop'

export type SolveResult =
  | { method: MethodId; name: string; stages: SolutionStage[] }
  | { method: MethodId; name: string; error: string }

interface Method {
  id: MethodId
  name: string
  solve: (state: CubeState) => SolutionStage[]
}

const METHODS: Method[] = [
  { id: 'kociemba', name: 'Kociemba', solve: (s) => [{ title: '最少步數解', moves: solveKociemba(s) }] },
  { id: 'lbl', name: '層先法', solve: solveLbl },
  { id: 'cfop', name: 'CFOP', solve: solveCfop },
]

/** 跑所有解法；每一種都套回原狀態確認有還原，錯的解法不交給使用者 */
export function solveAll(state: CubeState): SolveResult[] {
  return METHODS.map(({ id, name, solve }) => {
    try {
      const stages = solve(state)
      if (applyMoves(state, stages.flatMap((s) => s.moves)) !== SOLVED) {
        throw new Error('解法驗證失敗，未能還原方塊')
      }
      return { method: id, name, stages }
    } catch (e) {
      return { method: id, name, error: e instanceof Error ? e.message : String(e) }
    }
  })
}
