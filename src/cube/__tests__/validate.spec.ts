import { describe, expect, it } from 'vitest'

import { applyMoves, CORNERS, EDGES, EMPTY, randomScramble, SOLVED, type CubeState } from '../cube'
import { validate } from '../validate'

/** 回傳新字串：把 from[k] 位置的顏色放到 to[k] */
function moveStickers(state: CubeState, from: number[], to: number[]): CubeState {
  const chars = [...state]
  to.forEach((t, k) => (chars[t] = state[from[k]!]!))
  return chars.join('')
}

const messages = (s: CubeState) => validate(s).issues.map((i) => i.message)
const scrambled = () => applyMoves(SOLVED, randomScramble())

describe('validate', () => {
  it('accepts solved and random scrambled cubes', () => {
    expect(validate(SOLVED).solvable).toBe(true)
    for (let n = 0; n < 200; n++) expect(validate(scrambled()).solvable).toBe(true)
  })

  it('reports incomplete cube without piece errors', () => {
    const r = validate(EMPTY)
    expect(r.complete).toBe(false)
    expect(r.solvable).toBe(false)
    expect(r.issues).toEqual([])
  })

  it('reports colors used more than 9 times', () => {
    expect(messages(EMPTY.replace(/\./g, 'U'))).toEqual(['黃色有 49 格，最多 9 格'])
  })

  it('reports wrong centers', () => {
    expect(messages(moveStickers(SOLVED, [13, 4], [4, 13]))).toContain('中心塊顏色不正確')
  })

  it('detects a twisted corner', () => {
    const [a, b, c] = CORNERS[0]
    expect(messages(moveStickers(scrambled(), [a, b, c], [b, c, a]))).toEqual(['有一個角塊被扭轉了'])
  })

  it('detects a flipped edge', () => {
    const [a, b] = EDGES[3]
    expect(messages(moveStickers(scrambled(), [a, b], [b, a]))).toEqual(['有一個邊塊被翻面了'])
  })

  it('detects two swapped edges', () => {
    const [a, b] = EDGES[0]
    const [c, d] = EDGES[1]
    expect(messages(moveStickers(scrambled(), [a, b, c, d], [c, d, a, b]))).toEqual([
      '有兩個方塊的位置被對調了',
    ])
  })

  it('locates an impossible (mirrored) corner', () => {
    const [a, b] = CORNERS[2]
    const r = validate(moveStickers(SOLVED, [a, b], [b, a]))
    expect(r.issues).toEqual([{ message: '這個角塊的顏色組合不存在', stickers: [...CORNERS[2]] }])
  })

  it('locates duplicated pieces while color counts stay valid', () => {
    // UR 位置放上 UF 的顏色（多一格綠、少一格橘），再把 FR 的綠改成橘補回數量
    const [ur, urSide] = EDGES[0]
    const [uf, ufSide] = EDGES[1]
    const [frFront] = EDGES[8]
    const s = moveStickers(SOLVED, [uf, ufSide, 12], [ur, urSide, frFront])
    const r = validate(s)
    expect(r.issues.map((i) => i.message)).toContain('有兩個相同的邊塊')
    expect(r.issues.find((i) => i.message === '有兩個相同的邊塊')!.stickers).toEqual([ur, urSide, uf, ufSide])
  })
})
