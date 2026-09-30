import { applyMove, applyMoves, CORNERS, EDGES, FACES, SOLVED, type CubeState } from '@/cube/cube'
import { toFaceMoves, type Move } from '@/cube/notation'

export const FACE_MOVES: Move[] = FACES.flatMap((f) => [f, `${f}'`, `${f}2`])
export const AUF: Move[][] = [[], ['U'], ['U2'], ["U'"]]

// DEST[m][i] = 第 i 格的貼紙經過 FACE_MOVES[m] 後跑到哪一格
const MARKERS = Array.from({ length: 54 }, (_, i) => String.fromCharCode(0x100 + i)).join('')
export const DEST: number[][] = FACE_MOVES.map((m) => {
  const moved = applyMove(MARKERS, m)
  const dest: number[] = []
  for (let j = 0; j < 54; j++) dest[moved.charCodeAt(j) - 0x100] = j
  return dest
})

export const isSolvedAt = (state: CubeState, indices: readonly number[]) =>
  indices.every((i) => state[i] === SOLVED[i])

export type Goal = (state: CubeState) => boolean

/** 依序試套候選公式，回傳第一個讓 goal 成立的；都不行回傳 null */
export function firstWorking(state: CubeState, candidates: readonly Move[][], goal: Goal): Move[] | null {
  return candidates.find((c) => goal(applyMoves(state, c))) ?? null
}

/** 把整段公式當成一步做 IDDFS，找最少段數的組合；U 類巨集不連續使用 */
export function macroSearch(state: CubeState, macros: readonly Move[][], goal: Goal, maxDepth: number): Move[] | null {
  const isAuf = macros.map((m) => m.length === 1 && m[0]![0] === 'U')
  const path: number[] = []

  function dfs(s: CubeState, depth: number, lastWasAuf: boolean): boolean {
    if (depth === 0) return goal(s)
    return macros.some((macro, k) => {
      if (isAuf[k] && lastWasAuf) return false
      path.push(k)
      if (dfs(applyMoves(s, macro), depth - 1, isAuf[k]!)) return true
      path.pop()
      return false
    })
  }

  for (let depth = 0; depth <= maxDepth; depth++) {
    if (dfs(state, depth, false)) return toFaceMoves(path.flatMap((k) => macros[k]!))
  }
  return null
}

/** 每顆角塊/邊塊的「主貼紙」（CORNERS/EDGES 表中的第一格）目前在哪一格 */
export function locatePieces(state: CubeState): { corners: number[]; edges: number[] } {
  const locate = (pieces: readonly (readonly number[])[]) => {
    const targets = pieces.map((p) => p.map((i) => SOLVED[i]).join(''))
    const out: number[] = []
    pieces.forEach((stickers) => {
      const n = stickers.length
      for (let o = 0; o < n; o++) {
        const colors = stickers.map((_, k) => state[stickers[(o + k) % n]!]).join('')
        const piece = targets.indexOf(colors)
        if (piece !== -1) out[piece] = stickers[o]!
      }
    })
    return out
  }
  return { corners: locate(CORNERS), edges: locate(EDGES) }
}

// --- 查表：主貼紙所在格 → 編號 0..23（角塊、邊塊各 24 格） ---
function idTable(facelets: readonly number[]): Int8Array {
  const ids = new Int8Array(54).fill(-1)
  facelets.forEach((f, i) => (ids[f] = i))
  return ids
}
const EDGE_FACELETS = EDGES.flat()
const CORNER_FACELETS = CORNERS.flat()
const EDGE_ID = idTable(EDGE_FACELETS)
const CORNER_ID = idTable(CORNER_FACELETS)

export interface PieceTable {
  distance(locs: readonly number[]): number
}

/** 對一組追蹤中的主貼紙做 BFS，得到每個狀態離還原的最少步數 */
function pieceTable(homes: number[], kinds: ('corner' | 'edge')[]): PieceTable {
  const ids = kinds.map((k) => (k === 'corner' ? CORNER_ID : EDGE_ID))
  const facelets = kinds.map((k) => (k === 'corner' ? CORNER_FACELETS : EDGE_FACELETS))
  const n = homes.length
  const encode = (locs: readonly number[]) => {
    let code = 0
    for (let k = 0; k < n; k++) code = code * 24 + ids[k]![locs[k]!]!
    return code
  }
  const decode = (code: number) => {
    const locs: number[] = []
    for (let k = n - 1; k >= 0; k--) {
      locs[k] = facelets[k]![code % 24]!
      code = Math.floor(code / 24)
    }
    return locs
  }

  const dist = new Uint8Array(24 ** n).fill(255)
  const queue = new Int32Array(24 ** n)
  let head = 0
  let tail = 0
  const start = encode(homes)
  dist[start] = 0
  queue[tail++] = start
  while (head < tail) {
    const code = queue[head++]!
    const locs = decode(code)
    for (const dest of DEST) {
      const next = encode(locs.map((l) => dest[l]!))
      if (dist[next] !== 255) continue
      dist[next] = dist[code]! + 1
      queue[tail++] = next
    }
  }
  return { distance: (locs) => dist[encode(locs)]! }
}

// 底層十字：DR DF DL DB 四條邊（EDGES 4..7）的 D 色貼紙
export const CROSS_PIECES = [4, 5, 6, 7]
let crossTable: PieceTable | undefined
export function getCrossTable(): PieceTable {
  crossTable ??= pieceTable(
    CROSS_PIECES.map((e) => EDGES[e]![0]),
    CROSS_PIECES.map(() => 'edge'),
  )
  return crossTable
}

/** 查表直接走最短路徑做出底層十字（最多 8 步） */
export function solveCross(state: CubeState): Move[] {
  const table = getCrossTable()
  const { edges } = locatePieces(state)
  let locs = CROSS_PIECES.map((e) => edges[e]!)
  const moves: Move[] = []
  for (let d = table.distance(locs); d > 0; d--) {
    const m = DEST.findIndex((dest) => table.distance(locs.map((l) => dest[l]!)) === d - 1)
    locs = locs.map((l) => DEST[m]![l]!)
    moves.push(FACE_MOVES[m]!)
  }
  return moves
}

/** F2L 角塊＋邊塊的距離表（任一組槽位） */
export function pairTable(corner: number, edge: number): PieceTable {
  return pieceTable([CORNERS[corner]![0], EDGES[edge]![0]], ['corner', 'edge'])
}
