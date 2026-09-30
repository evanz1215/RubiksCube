import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { dot, FACE_COLORS, NORMALS, parseMove, STICKERS, type CubeState, type Face } from '@/cube/cube'

const EMPTY_COLOR = '#8a8a8a'
const HIGHLIGHT_COLOR = '#ff1744'
const DARK_TEXT_FACES = new Set(['L', 'B'])
// 預設視角：看得到正面 (F)、上面 (U)、右面 (R)，即使用者手握方塊的角度
const HOME_CAMERA = new THREE.Vector3(4.3, 4.1, 6.7)

export interface CubeScene {
  setState(state: CubeState): void
  setLabels(show: boolean): void
  setHighlights(stickers: readonly number[]): void
  animateMove(move: string, durationMs: number): Promise<void>
  resetView(): void
  dispose(): void
}

export function createCubeScene(container: HTMLElement, onStickerClick: (index: number) => void): CubeScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  camera.position.copy(HOME_CAMERA)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enablePan = false
  controls.enableZoom = false

  // --- 方塊本體：26 顆小方塊，貼紙掛在小方塊底下 ---
  const bodyGeometry = new THREE.BoxGeometry(0.96, 0.96, 0.96)
  const bodyMaterial = new THREE.MeshBasicMaterial({ color: '#111' })
  const stickerGeometry = new THREE.PlaneGeometry(0.84, 0.84)
  const cubies = new Map<string, THREE.Mesh>()

  const stickers = STICKERS.map((s, index) => {
    let cubie = cubies.get(s.pos.join())
    if (!cubie) {
      cubie = new THREE.Mesh(bodyGeometry, bodyMaterial)
      cubie.position.set(...s.pos)
      cubie.userData.home = s.pos
      scene.add(cubie)
      cubies.set(s.pos.join(), cubie)
    }
    const normal = new THREE.Vector3(...s.normal)
    const mesh = new THREE.Mesh(stickerGeometry, new THREE.MeshBasicMaterial())
    mesh.position.copy(normal.clone().multiplyScalar(0.481))
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    mesh.userData.index = index
    cubie.add(mesh)
    return mesh
  })

  // --- 貼紙貼圖：顏色 + 可選字母 + 可選紅框，依組合快取 ---
  const textures = new Map<string, THREE.CanvasTexture>()
  function textureFor(face: string, label: boolean, highlight: boolean): THREE.CanvasTexture {
    const key = `${face}|${label}|${highlight}`
    const cached = textures.get(key)
    if (cached) return cached
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const info = FACE_COLORS[face as Face]
    ctx.fillStyle = info?.hex ?? EMPTY_COLOR
    ctx.fillRect(0, 0, 128, 128)
    if (highlight) {
      ctx.strokeStyle = HIGHLIGHT_COLOR
      ctx.lineWidth = 20
      ctx.strokeRect(10, 10, 108, 108)
    }
    if (label && info) {
      ctx.fillStyle = DARK_TEXT_FACES.has(face) ? '#fff' : '#111'
      ctx.font = 'bold 64px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(info.letter, 64, 68)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.set(key, texture)
    return texture
  }

  let state: CubeState = ''
  let labels = false
  let highlights = new Set<number>()

  function repaint() {
    stickers.forEach((mesh, i) => {
      mesh.material.map = textureFor(state[i] ?? '.', labels, highlights.has(i))
      mesh.material.needsUpdate = true
    })
  }

  // --- 轉層動畫：暫時把該層掛到樞軸上旋轉，結束後全部歸位，顏色交給 setState ---
  let tick: ((now: number) => void) | null = null

  function animateMove(move: string, durationMs: number): Promise<void> {
    const { base, turns } = parseMove(move)
    const axis = NORMALS[base as Face]
    const pivot = new THREE.Group()
    scene.add(pivot)
    const layer = [...cubies.values()].filter((c) => dot(c.userData.home, axis) === 1)
    layer.forEach((c) => pivot.attach(c))
    const axisVec = new THREE.Vector3(...axis)
    const angle = -(Math.PI / 2) * (turns === 3 ? -1 : turns)
    const start = performance.now()
    const duration = durationMs * (turns === 2 ? 1.5 : 1)

    return new Promise((resolve) => {
      tick = (now) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        pivot.setRotationFromAxisAngle(axisVec, angle * eased)
        if (t < 1) return
        layer.forEach((c) => {
          scene.add(c)
          c.position.set(...(c.userData.home as [number, number, number]))
          c.rotation.set(0, 0, 0)
        })
        scene.remove(pivot)
        tick = null
        resolve()
      }
    })
  }

  // --- 點擊判斷：拖曳距離很短才算點擊，避免和旋轉視角衝突 ---
  const raycaster = new THREE.Raycaster()
  let downAt: { x: number; y: number } | null = null
  const canvas = renderer.domElement
  canvas.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }))
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return
    const rect = canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObjects(stickers, false)[0]
    if (hit) onStickerClick(hit.object.userData.index as number)
  })

  // --- 尺寸與繪製迴圈 ---
  const resizeObserver = new ResizeObserver(() => {
    const { clientWidth: w, clientHeight: h } = container
    if (!w || !h) return
    renderer.setSize(w, h, false) // 只設解析度，尺寸交給 CSS，避免畫布撐寬版面
    camera.aspect = w / h
    camera.zoom = Math.min(1, camera.aspect) // 直立窄畫面時縮小，避免左右被切掉
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(container)

  renderer.setAnimationLoop((now) => {
    tick?.(now)
    controls.update()
    renderer.render(scene, camera)
  })

  return {
    setState(next) {
      state = next
      repaint()
    },
    setLabels(show) {
      labels = show
      repaint()
    },
    setHighlights(list) {
      highlights = new Set(list)
      repaint()
    },
    animateMove,
    resetView() {
      camera.position.copy(HOME_CAMERA)
      controls.target.set(0, 0, 0)
      controls.update()
    },
    dispose() {
      renderer.setAnimationLoop(null)
      resizeObserver.disconnect()
      controls.dispose()
      textures.forEach((t) => t.dispose())
      stickers.forEach((m) => m.material.dispose())
      bodyGeometry.dispose()
      stickerGeometry.dispose()
      bodyMaterial.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
