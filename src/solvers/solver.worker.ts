import { getPairTables } from './cfop'
import { initKociemba } from './kociemba'
import { getCrossTable } from './search'
import { solveAll } from './index'

// 建表共約數百毫秒，Worker 一啟動就先做，使用者按「解題」時通常已完成
initKociemba()
getCrossTable()
getPairTables()

self.onmessage = (e: MessageEvent<string>) => {
  self.postMessage(solveAll(e.data))
}
