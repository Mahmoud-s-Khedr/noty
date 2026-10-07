import { expect, test } from '@playwright/test'
import JSZip from 'jszip'
import { newNote, openFresh, pasteImage } from './fixtures'

async function zipFromDownload(download: import('@playwright/test').Download) {
  const path = await download.path()
  return JSZip.loadAsync(await (await import('node:fs/promises')).readFile(path))
}

test('export all produces markdown + images, and import restores it', async ({ page }) => {
  await openFresh(page)
  await newNote(page)
  await page.keyboard.type('round trip text ')
  await pasteImage(page)
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export all' }).click()])
  const zip = await zipFromDownload(download)
  const names = Object.keys(zip.files)
  const md = names.find((n) => n.endsWith('.md'))!
  expect(md).toBeTruthy()
  const imgPath = names.find((n) => /\/images\/.+\.png$/.test(n))!
  expect(imgPath).toBeTruthy()
  const text = await zip.files[md].async('string')
  expect(text).toContain('round trip text')
  expect(text).toMatch(/!\[[^\]]*\]\(images\/[^)]+\.png\)/)

  // Save the zip, delete the note, import it back.
  const buffer = await zip.generateAsync({ type: 'nodebuffer' })
  await page.getByRole('button', { name: 'Delete note' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete note' }).click()
  await expect(page.locator('aside li')).toHaveCount(0)

  await page.locator('input[type=file]').setInputFiles({ name: 'noty-library.zip', mimeType: 'application/zip', buffer })
  await expect(page.locator('aside li')).toHaveCount(1)
  await page.locator('aside li').click()
  await expect(page.locator('.ProseMirror')).toContainText('round trip text')
  await expect(page.locator('.ProseMirror img')).toHaveAttribute('src', /^blob:/)
  await expect
    .poll(() => page.locator('.ProseMirror img').evaluate((i: HTMLImageElement) => i.naturalWidth))
    .toBeGreaterThan(0)
})

test('single-note export has md at top level', async ({ page }) => {
  await openFresh(page)
  await newNote(page)
  await page.keyboard.type('solo')
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export note' }).click()])
  const zip = await zipFromDownload(download)
  expect(Object.keys(zip.files)).toContain('Untitled.md')
})

test('bad import file shows an error; imported markdown is searchable', async ({ page }) => {
  await openFresh(page)
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.zip', mimeType: 'application/zip', buffer: Buffer.from('nope') })
  await expect(page.getByRole('status').filter({ hasText: 'not a valid ZIP' })).toBeVisible()

  await page.locator('input[type=file]').setInputFiles({ name: 'plan.md', mimeType: 'text/markdown', buffer: Buffer.from('# Heading\n\nzebra **crossing**') })
  await expect(page.getByRole('status').filter({ hasText: 'Imported 1 note' })).toBeVisible()
  await page.getByPlaceholder('Search…').fill('crossing')
  await expect(page.locator('aside li')).toHaveCount(1)
  await page.getByPlaceholder('Search…').fill('**')
  await expect(page.locator('aside li')).toHaveCount(0)
})
