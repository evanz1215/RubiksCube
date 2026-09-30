import { describe, expect, it } from 'vitest'

import { autoComplete } from '../autocomplete'
import { applyMoves, CENTERS, CORNERS, EMPTY, randomScramble, SOLVED, type CubeState } from '../cube'

const scrambled = () => applyMoves(SOLVED, randomScramble())
const hide = (state: CubeState, indices: Iterable<number>) => {
  const chars = [...state]
  for (const i of indices) if (!CENTERS.includes(i)) chars[i] = '.'
  return chars.join('')
}
const filledCount = (s: CubeState) => [...s].filter((c) => c !== '.').length

describe('autoComplete', () => {
  it('never fills a sticker with a wrong color', () => {
    for (let n = 0; n < 500; n++) {
      const truth = scrambled()
      const hidden = hide(truth, [...Array(54).keys()].filter(() => Math.random() < 0.5))
      const wrong = [...autoComplete(hidden)].filter((ch, i) => ch !== '.' && ch !== truth[i])
      expect(wrong).toEqual([])
    }
  })

  it('fills the third sticker of a corner from the other two', () => {
    const truth = scrambled()
    const [a] = CORNERS[3]
    expect(autoComplete(hide(truth, [a]))).toBe(truth)
  })

  // 只填五面時，約九成能完全推出第六面；其餘是「兩顆不同的合法方塊五面相同」，
  // 資訊本身不足，只剩第六面的 3～4 格邊塊。逐格補填：剩 2 格時排列奇偶必定能分辨，所以最多補 2 格
  it('fills almost all of a single empty face, and the rest after at most two more stickers', () => {
    const RUNS = 600
    const extraNeeded: number[] = []
    for (let n = 0; n < RUNS; n++) {
      const truth = scrambled()
      const faceStickers = Array.from({ length: 9 }, (_, k) => (n % 6) * 9 + k)
      let result = autoComplete(hide(truth, faceStickers))
      expect(faceStickers.filter((i) => result[i] === '.').length).toBeLessThanOrEqual(4)
      let extra = 0
      for (let missing = result.indexOf('.'); missing !== -1; missing = result.indexOf('.')) {
        result = autoComplete(result.slice(0, missing) + truth[missing] + result.slice(missing + 1))
        extra++
      }
      expect(result).toBe(truth)
      extraNeeded.push(extra)
    }
    expect(Math.max(...extraNeeded)).toBeLessThanOrEqual(2)
    expect(extraNeeded.filter((e) => e === 0).length / RUNS).toBeGreaterThan(0.8)
  })

  it('leaves unknowable stickers empty and keeps existing input', () => {
    expect(autoComplete(EMPTY)).toBe(EMPTY)
    expect(autoComplete(SOLVED)).toBe(SOLVED)
    const partial = hide(scrambled(), [...Array(54).keys()])
    expect(filledCount(autoComplete(partial))).toBe(6)
  })

  it('does not invent colors for contradictory input', () => {
    // 同一顆角塊的三格都填黃色：不存在的方塊，不能被推算「修正」
    const [a, b, c] = CORNERS[0]
    const chars = [...EMPTY]
    ;[chars[a], chars[b], chars[c]] = ['U', 'U', 'U']
    expect(autoComplete(chars.join(''))).toBe(chars.join(''))
  })
})
