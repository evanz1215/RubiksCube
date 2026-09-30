import { CENTERS, CORNERS, EDGES, FACE_COLORS, FACES, SOLVED, type CubeState, type Face } from './cube'

export interface ValidationIssue {
  message: string
  /** 有問題的貼紙位置，供畫面標紅框；可解性錯誤無法定位，為空陣列 */
  stickers: number[]
}

export interface ValidationResult {
  /** 54 格都填了色 */
  complete: boolean
  counts: Record<Face, number>
  issues: ValidationIssue[]
  /** 已填滿且沒有任何問題，可以求解 */
  solvable: boolean
}

interface PieceReading {
  perm: number[]
  orientation: number[]
  issues: ValidationIssue[]
}

/** 認出每個位置上是哪一顆角塊/邊塊、朝向為何 */
function readPieces(state: CubeState, pieces: readonly (readonly number[])[], kind: string): PieceReading {
  const targets = pieces.map((p) => p.map((i) => SOLVED[i]).join(''))
  const perm: number[] = []
  const orientation: number[] = []
  const issues: ValidationIssue[] = []
  const seenAt = new Map<number, number>()

  pieces.forEach((stickers, pos) => {
    const colors = stickers.map((i) => state[i])
    const n = stickers.length
    for (let o = 0; o < n; o++) {
      const rotated = colors.map((_, k) => colors[(o + k) % n]).join('')
      const piece = targets.indexOf(rotated)
      if (piece === -1) continue
      perm.push(piece)
      orientation.push(o)
      const other = seenAt.get(piece)
      if (other !== undefined) {
        issues.push({ message: `有兩個相同的${kind}`, stickers: [...pieces[other]!, ...stickers] })
      }
      seenAt.set(piece, pos)
      return
    }
    issues.push({ message: `這個${kind}的顏色組合不存在`, stickers: [...stickers] })
  })
  return { perm, orientation, issues }
}

function parity(perm: number[]): number {
  let swaps = 0
  perm.forEach((p, i) => {
    for (let j = i + 1; j < perm.length; j++) if (perm[j]! < p) swaps++
  })
  return swaps % 2
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export function validate(state: CubeState): ValidationResult {
  const counts = Object.fromEntries(FACES.map((f) => [f, 0])) as Record<Face, number>
  for (const ch of state) if (ch in counts) counts[ch as Face]++
  const complete = !state.includes('.')

  const issues: ValidationIssue[] = FACES.filter((f) => counts[f] > 9).map((f) => ({
    message: `${FACE_COLORS[f].name}色有 ${counts[f]} 格，最多 9 格`,
    stickers: [],
  }))
  CENTERS.forEach((i, k) => {
    if (state[i] !== FACES[k]) issues.push({ message: '中心塊顏色不正確', stickers: [i] })
  })

  if (!complete || issues.length > 0) return { complete, counts, issues, solvable: false }

  const corners = readPieces(state, CORNERS, '角塊')
  const edges = readPieces(state, EDGES, '邊塊')
  issues.push(...corners.issues, ...edges.issues)

  if (issues.length === 0) {
    if (sum(corners.orientation) % 3 !== 0) issues.push({ message: '有一個角塊被扭轉了', stickers: [] })
    if (sum(edges.orientation) % 2 !== 0) issues.push({ message: '有一個邊塊被翻面了', stickers: [] })
    if (parity(corners.perm) !== parity(edges.perm)) {
      issues.push({ message: '有兩個方塊的位置被對調了', stickers: [] })
    }
  }
  return { complete, counts, issues, solvable: issues.length === 0 }
}
