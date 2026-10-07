import { expect, test } from '@playwright/test'
import { assetCount, backdateAssets, newNote, openFresh, pasteImage } from './fixtures'

test('pasted image persists across reload, offline', async ({ page, context }) => {
  await openFresh(page)
  await context.setOffline(true)
  await page.reload()
  await newNote(page)
  await page.keyboard.type('with image')
  await pasteImage(page)
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()

  await page.reload()
  await page.locator('aside li').click()
  await expect(page.locator('.ProseMirror img')).toHaveAttribute('src', /^blob:/)
  await expect
    .poll(() => page.locator('.ProseMirror img').evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
})

test('orphaned asset is garbage-collected on save', async ({ page }) => {
  await openFresh(page)
  await newNote(page)
  await pasteImage(page)
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()
  expect(await assetCount(page)).toBe(1)

  await backdateAssets(page) // skip the 60 s grace period
  await page.locator('.ProseMirror img').click()
  await page.keyboard.press('Backspace')
  await expect(page.locator('.ProseMirror img')).toHaveCount(0)
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()
  await expect.poll(() => assetCount(page)).toBe(0)
})
