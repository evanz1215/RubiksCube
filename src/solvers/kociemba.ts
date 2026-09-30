import * as min2phase from 'min2phase.js'

import { splitAlg, type CubeState } from '@/cube/cube'
import type { Move } from '@/cube/notation'

// 我們的狀態字串本來就是 Kociemba 的 URFDLB 貼紙格式，不必轉換
export function initKociemba(): void {
  min2phase.initFull()
}

export function solveKociemba(state: CubeState): Move[] {
  const result: string = new min2phase.Search().solution(state)
  if (result.startsWith('Error')) throw new Error(`Kociemba 求解失敗（${result}）`)
  return splitAlg(result)
}
