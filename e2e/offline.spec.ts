import { expect, test } from '@playwright/test'

test('create, edit, search and reload work offline', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // now controlled by the SW
  await context.setOffline(true)
  await page.reload()

  await page.locator('aside').getByRole('button', { name: 'New note' }).click()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('hello offline world')
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()

  await page.reload()
  await page.getByPlaceholder('Search…').fill('offline')
  await expect(page.locator('aside li')).toHaveCount(1)
  await page.locator('aside li').click()
  await expect(page.locator('.ProseMirror')).toContainText('hello offline world')
})
