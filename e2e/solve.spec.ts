import { expect, test } from '@playwright/test'

test('fill → scramble → solve → play every step to the end', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('solve')).toBeDisabled()

  await page.getByRole('button', { name: '隨機打亂' }).click()
  await page.getByTestId('solve').click()

  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveCount(3)
  await expect(tabs.nth(0)).toContainText('Kociemba')
  await expect(tabs.nth(1)).toContainText('層先法')
  await expect(tabs.nth(2)).toContainText('CFOP')
  for (const tab of await tabs.all()) await expect(tab).toContainText('步')

  await tabs.nth(1).click()
  await expect(page.getByRole('heading', { name: '底層十字' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '頂層邊塊歸位' })).toBeVisible()

  await tabs.nth(0).click()
  await expect(page.getByTestId('next-step')).toHaveCount(0)
  await page.getByTestId('start').click()
  const next = page.getByTestId('next-step')
  while (await next.isEnabled()) await next.click()
  await expect(page.getByTestId('next-move')).toHaveText('完成！')
})

test('shows a readable error for an unsolvable cube', async ({ page }) => {
  // 已還原狀態把 URF 角塊扭轉一次
  const solved = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
  const chars = [...solved]
  ;[chars[8], chars[9], chars[20]] = ['R', 'F', 'U']
  await page.goto(`./?s=${chars.join('')}`)
  await expect(page.getByText('有一個角塊被扭轉了')).toBeVisible()
  await expect(page.getByText('請檢查最近填的幾格')).toBeVisible()
  await expect(page.getByTestId('solve')).toBeDisabled()
})
