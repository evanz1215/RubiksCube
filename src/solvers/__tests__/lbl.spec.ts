import { describe, expect, it } from 'vitest'

import { applyMoves, randomScramble, SOLVED } from '@/cube/cube'
import { F2L_FACELETS, solveLbl } from '../lbl'
import { isSolvedAt } from '../search'

const RUNS = 1000

describe('beginner layer-by-layer', () => {
  it(
    `solves ${RUNS} random scrambles with seven named stages`,
    () => {
      let total = 0
      for (let n = 0; n < RUNS; n++) {
        const state = applyMoves(SOLVED, randomScramble())
        const stages = solveLbl(state)
        expect(stages.map((s) => s.title)).toEqual([
          '底層十字',
          '底層角塊',
          '中層邊塊',
          '頂層十字',
          '頂面全黃',
          '頂層角塊歸位',
          '頂層邊塊歸位',
        ])
        // 第三階段結束時，前兩層必須完成
        const afterF2L = applyMoves(state, stages.slice(0, 3).flatMap((s) => s.moves))
        expect(isSolvedAt(afterF2L, F2L_FACELETS)).toBe(true)
        const moves = stages.flatMap((s) => s.moves)
        expect(applyMoves(state, moves)).toBe(SOLVED)
        for (const m of moves) expect(m).toMatch(/^[URFDLB](2|')?$/)
        total += moves.length
      }
      expect(total / RUNS).toBeLessThan(160)
    },
    120_000,
  )

  it('returns empty stages for a solved cube', () => {
    expect(solveLbl(SOLVED).flatMap((s) => s.moves)).toEqual([])
  })
})
