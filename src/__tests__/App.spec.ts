import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import App from '../App.vue'

// jsdom 沒有 WebGL，3D 畫面用替身
const mountApp = () => mount(App, { global: { stubs: { CubeCanvas: true } } })

describe('App', () => {
  beforeEach(() => {
    history.replaceState(null, '', '/')
    setActivePinia(createPinia())
  })

  it('starts with an empty net and a disabled solve button', () => {
    const wrapper = mountApp()
    expect(wrapper.text()).toContain('魔術方塊解法')
    expect(wrapper.text()).toContain('還有 48 格未填色')
    expect(wrapper.get('[data-testid="solve"]').attributes('disabled')).toBeDefined()
  })

  it('enables solving once the cube is filled validly', async () => {
    const wrapper = mountApp()
    await wrapper.findAll('.actions button')[0]!.trigger('click')
    expect(wrapper.get('[data-testid="solve"]').attributes('disabled')).toBeUndefined()
  })

  it('paints a sticker with the selected color and syncs the URL', async () => {
    const wrapper = mountApp()
    await wrapper.get('[data-color="R"]').trigger('click')
    await wrapper.get('[data-index="0"]').trigger('click')
    // R 面是橘色：畫面顯示顏色字母 O，網址存面代號 R
    expect(wrapper.get('[data-index="0"]').text()).toBe('O')
    expect(new URLSearchParams(location.search).get('s')?.[0]).toBe('R')
  })

  it('paints every cell passed over while dragging, skipping the center', async () => {
    const wrapper = mountApp()
    await wrapper.get('[data-color="F"]').trigger('click')
    const net = wrapper.get('.net').element
    const pointer = (type: string, clientX: number) =>
      net.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX }))
    // jsdom 沒有版面配置，用替身讓「座標 x」對應到第 x 格
    const original = document.elementFromPoint
    document.elementFromPoint = (x: number) => wrapper.get(`[data-index="${x}"]`).element
    try {
      pointer('pointerdown', 0)
      for (const i of [1, 2, 4, 5]) pointer('pointermove', i)
      window.dispatchEvent(new Event('pointerup'))
      pointer('pointermove', 8)
      await nextTick()
    } finally {
      document.elementFromPoint = original
    }
    const letters = [0, 1, 2, 4, 5, 8].map((i) => wrapper.get(`[data-index="${i}"]`).text())
    expect(letters).toEqual(['G', 'G', 'G', 'Y', 'G', ''])
  })

  it('does not repaint fixed centers', async () => {
    const wrapper = mountApp()
    expect(wrapper.get('[data-index="4"]').attributes('disabled')).toBeDefined()
  })
})
