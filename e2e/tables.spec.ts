import { expect, test, type Page, type Download } from '@playwright/test'
import JSZip from 'jszip'
import { readFile } from 'node:fs/promises'
import { assetCount, backdateAssets, newNote, openFresh } from './fixtures'

async function insertTable(page: Page, rows = 3, columns = 3) {
  await page.getByRole('button', { name: 'Insert table', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Insert table', exact: true })
  await dialog.getByLabel('Rows').fill(String(rows))
  await dialog.getByLabel('Columns').fill(String(columns))
  await dialog.getByRole('button', { name: 'Insert', exact: true }).click()
  await expect(page.locator('.ProseMirror tr')).toHaveCount(rows)
}
async function action(page: Page, name: string) {
  await page.getByLabel('Table options').selectOption({ label: name })
}
async function zipFromDownload(download: Download) {
  return JSZip.loadAsync(await readFile((await download.path())!))
}
async function saved(page: Page) {
  await expect(page.locator('.status[data-state="saved"]')).toBeVisible()
}
async function storedNotes(page: Page) {
  return page.evaluate(() => new Promise<{ doc: object; plainText: string }[]>((resolve) => {
    const request = indexedDB.open('noty')
    request.onsuccess = () => {
      const query = request.result.transaction('notes').objectStore('notes').getAll()
      query.onsuccess = () => { resolve(query.result); request.result.close() }
    }
  }))
}
async function uploadImages(page: Page) {
  // A landscape original large enough to distinguish a thumbnail from its preview.
  const buffer = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640; canvas.height = 320
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffe45c'; ctx.fillRect(0, 0, 640, 320)
    ctx.fillStyle = '#16202c'; ctx.font = '32px sans-serif'; ctx.fillText('Bug report screenshot', 30, 160)
    return Array.from(new Uint8Array(await (await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!)))).arrayBuffer()))
  })
  await page.getByTestId('image-input').setInputFiles([
    { name: 'first.png', mimeType: 'image/png', buffer: Buffer.from(buffer) },
    { name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(buffer) },
  ])
  await expect(page.locator('td img')).toHaveCount(2)
  await expect(page.locator('td img').first()).toHaveJSProperty('naturalWidth', 640)
}

test('nine-column table supports rich text, structure, first-row headers and undo', async ({ page }) => {
  await openFresh(page); await newNote(page)
  await insertTable(page, 3, 9)
  await expect(page.locator('th')).toHaveCount(9)
  await expect(page.getByRole('button', { name: 'Insert table', exact: true })).toBeDisabled()
  await page.keyboard.type('Bug ID')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Summary')
  await page.locator('td').first().click()
  await page.keyboard.type('BUG-104')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second paragraph')
  await expect(page.locator('td').first().locator('p')).toHaveCount(2)
  await page.getByRole('button', { name: 'Bulleted list', exact: true }).click()
  await page.keyboard.type('Steps to reproduce')
  await expect(page.locator('td').first().locator('ul li')).toHaveCount(1)
  await action(page, 'Insert row above')
  await expect(page.locator('tr')).toHaveCount(4)
  await action(page, 'Insert row below')
  await expect(page.locator('tr')).toHaveCount(5)
  await action(page, 'Delete current row')
  await expect(page.locator('tr')).toHaveCount(4)
  await action(page, 'Insert column left')
  await expect(page.locator('tr').first().locator('th, td')).toHaveCount(10)
  await action(page, 'Insert column right')
  await expect(page.locator('tr').first().locator('th, td')).toHaveCount(11)
  await action(page, 'Delete current column')
  await expect(page.locator('tr').first().locator('th, td')).toHaveCount(10)
  await action(page, 'Toggle first row as headers')
  await expect(page.locator('th')).toHaveCount(0)
  await action(page, 'Toggle first row as headers')
  await expect(page.locator('tr').first().locator('th')).toHaveCount(10)
  await saved(page)
  const tableText = await page.locator('table').textContent()
  await action(page, 'Delete table')
  await expect(page.locator('table')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('table')).toHaveCount(1)
  await expect(page.locator('table')).toHaveText(tableText!)
})

test('table dialog validates whole numbers and keyboard navigation can exit the table', async ({ page }) => {
  await openFresh(page); await newNote(page)
  await page.getByRole('button', { name: 'Insert table', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Rows').fill('0')
  await dialog.getByRole('button', { name: 'Insert', exact: true }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Rows').fill('1.5')
  await dialog.getByRole('button', { name: 'Insert', exact: true }).click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await insertTable(page, 1, 2)
  await page.keyboard.type('first')
  await page.keyboard.press('Tab')
  await page.keyboard.type('second')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('End')
  await page.keyboard.type(' cell')
  await expect(page.locator('th').first()).toHaveText('first cell')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.locator('tr')).toHaveCount(2)
  await page.keyboard.type('new row')
  await action(page, 'Write after table')
  await page.keyboard.type('After the table')
  await expect(page.locator('.ProseMirror > p').last()).toHaveText('After the table')
})

test('resized widths and text survive note switches and offline reload; mobile scroll stays inside note', async ({ page, context }) => {
  await openFresh(page); await newNote(page)
  await page.getByLabel('Title', { exact: true }).fill('Bug reports')
  await insertTable(page, 3, 9)
  const headers = ['ID', 'Summary', 'Priority', 'Status', 'Owner', 'Environment', 'Steps', 'Expected', 'Actual']
  for (const header of headers) { await page.keyboard.type(header); await page.keyboard.press('Tab') }
  await page.keyboard.type('BUG-104')
  await page.keyboard.press('Tab')
  const values = ['Offline image upload loses cursor position', 'High', 'Open', 'Mona', 'Chrome / Android', 'Open note, go offline, paste image', 'Image stays in selected cell', 'Cursor moves to another cell', 'BUG-105', 'Long text should wrap naturally', 'Medium', 'In review', 'Ali', 'Firefox / Linux', 'Resize a column and reload', 'Saved column widths return', 'Verified after offline reload']
  for (const value of values) { await page.keyboard.type(value); await page.keyboard.press('Tab') }
  await page.locator('.tableWrapper').evaluate((el) => { el.scrollLeft = 0 })
  const cell = page.locator('th').first()
  const box = (await cell.boundingBox())!
  expect(Math.round(box.width)).toBe(160)
  await page.mouse.move(box.x + box.width - 1, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 65, box.y + 12, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => (await cell.boundingBox())!.width).toBeGreaterThan(200)
  await saved(page)
  const original = (await storedNotes(page))[0].doc
  await newNote(page)
  await page.keyboard.type('Other note')
  await page.locator('aside .note-item').filter({ hasText: 'Bug reports' }).click()
  await expect(page.locator('td').first()).toHaveText('BUG-104')
  await context.setOffline(true)
  await page.reload()
  await page.locator('aside .note-item').filter({ hasText: 'Bug reports' }).click()
  expect((await storedNotes(page)).find((n) => n.plainText.includes('BUG-104'))!.doc).toEqual(original)
  await expect.poll(async () => (await page.locator('.note-content th').first().boundingBox())!.width).toBeGreaterThan(200)
  await page.screenshot({ path: 'test-results/bug-report-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  expect(await page.locator('.tableWrapper').evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/bug-report-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1000, height: 1000 })
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media: 'print' })
  expect(await page.locator('.print-document table').evaluate((el) => el.getBoundingClientRect().width <= window.innerWidth)).toBe(true)
  expect(await page.locator('.print-document .tableWrapper').evaluate((el) => getComputedStyle(el).overflowX)).toBe('visible')
  await expect(page.locator('.print-document thead th')).toHaveCount(9)
  await page.screenshot({ path: 'test-results/bug-report-print.png', fullPage: true })
})

test('cell image uploads retain position, preview original with keyboard, delete and clean assets', async ({ page }) => {
  await openFresh(page); await newNote(page); await insertTable(page)
  await page.locator('td').first().click()
  await uploadImages(page)
  await expect(page.locator('td').first().locator('img')).toHaveCount(2)
  const img = page.locator('td img').first()
  const box = (await img.boundingBox())!
  expect(box.width).toBeLessThanOrEqual(120)
  expect(box.height).toBeLessThanOrEqual(80)
  const column = page.locator('th').first()
  const columnBox = (await column.boundingBox())!
  await page.mouse.move(columnBox.x + columnBox.width - 1, columnBox.y + 12)
  await page.mouse.down()
  await page.mouse.move(columnBox.x - 40, columnBox.y + 12, { steps: 5 })
  await page.mouse.up()
  await expect.poll(async () => Math.round((await column.boundingBox())!.width)).toBe(80)
  expect((await img.boundingBox())!.width).toBeLessThanOrEqual(80)
  const enlarge = page.getByRole('button', { name: 'Enlarge image' }).first()
  await enlarge.focus()
  await page.keyboard.press('Enter')
  const preview = page.getByRole('dialog', { name: 'Image preview' })
  await expect(preview).toBeVisible()
  await expect(preview.locator('img')).toHaveJSProperty('naturalWidth', 640)
  expect((await preview.locator('img').boundingBox())!.width).toBeGreaterThan(120)
  await page.keyboard.press('Tab')
  await expect(preview.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(preview).toHaveCount(0)
  await expect(enlarge).toBeFocused()
  await saved(page); await backdateAssets(page)
  await img.click(); await page.keyboard.press('Backspace')
  await expect(page.locator('td img')).toHaveCount(1)
  await saved(page)
  await expect.poll(() => assetCount(page)).toBe(1)
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media: 'print' })
  await expect(enlarge).toBeHidden()
  await expect(page.locator('.print-document .image-enlarge')).toHaveCount(0)
  await expect(page.locator('.print-document img')).toHaveCount(1)
})

for (const library of [false, true]) {
  test(`${library ? 'library' : 'single-note'} ZIP preserves rich HTML tables, widths and original images; DOCX uses native tables`, async ({ page }) => {
    await openFresh(page); await newNote(page)
    await page.keyboard.type('Before table')
    await page.keyboard.press('Enter')
    await insertTable(page)
    await page.keyboard.type('Header')
    await page.locator('td').first().click()
    await page.getByRole('button', { name: 'Bold', exact: true }).click()
    await page.keyboard.type('Bold cell')
    await page.getByRole('button', { name: 'Bold', exact: true }).click()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Bulleted list', exact: true }).click()
    await page.keyboard.type('First step')
    await page.locator('td').nth(1).click()
    await uploadImages(page)
    await action(page, 'Write after table')
    await page.keyboard.type('After table')
    const cellBox = (await page.locator('th').first().boundingBox())!
    await page.mouse.move(cellBox.x + cellBox.width - 1, cellBox.y + 12)
    await page.mouse.down()
    await page.mouse.move(cellBox.x + cellBox.width + 45, cellBox.y + 12, { steps: 5 })
    await page.mouse.up()
    await expect.poll(async () => (await page.locator('th').first().boundingBox())!.width).toBeGreaterThan(200)
    await saved(page)
    const original = (await storedNotes(page))[0].doc
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: library ? 'Export all' : 'Export note', exact: true }).click()])
    const zip = await zipFromDownload(download)
    const md = await zip.file(/\.md$/)[0].async('string')
    expect(md).toContain('<table')
    expect(md).toContain('colwidth="160"')
    expect(md).toContain('<strong>Bold cell</strong>')
    expect(md).toContain('<ul>')
    expect(md).toContain('src="images/')
    expect(md).toContain('Before table')
    expect(md).toContain('After table')
    expect(zip.file(/\.png$/)).toHaveLength(2)
    const [wordDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DOCX', exact: true }).click()])
    const word = await zipFromDownload(wordDownload)
    const xml = await word.file('word/document.xml')!.async('string')
    expect(xml).toContain('<w:tbl>')
    expect(xml).toContain('<w:tblHeader')
    expect(xml).toContain('Bold cell')
    expect(xml).toContain('<w:b')
    expect(xml).toContain('<w:drawing>')
    const imageWidths = [...xml.matchAll(/<wp:extent cx="(\d+)"/g)].map((match) => Number(match[1]))
    expect(imageWidths.length).toBeGreaterThan(0)
    expect(imageWidths.every((width) => width < 200 * 9525)).toBe(true)
    const rels = await word.file('word/_rels/document.xml.rels')!.async('string')
    expect(rels).toContain('/image')
    await page.getByRole('button', { name: 'Delete note', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete note', exact: true }).click()
    await page.locator('aside input[type=file]').setInputFiles({ name: 'tables.zip', mimeType: 'application/zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) })
    await expect(page.locator('aside li')).toHaveCount(1)
    await page.locator('aside li').click()
    await expect(page.locator('table')).toHaveCount(1)
    await expect(page.locator('td img')).toHaveCount(2)
    await expect(page.locator('td img').first()).toHaveJSProperty('naturalWidth', 640)
    expect((await storedNotes(page))[0].plainText).toContain('Bold cell\nFirst step')
    // Asset IDs are remapped while all other cell content and widths are retained.
    const normalize = (doc: object) => JSON.parse(JSON.stringify(doc), (key, value) => key === 'assetId' ? null : value)
    expect(normalize((await storedNotes(page))[0].doc)).toEqual(normalize(original))
  })
}

test('standard pipe table imports with separate searchable cell and row text', async ({ page }) => {
  await openFresh(page)
  await page.locator('aside input[type=file]').setInputFiles({ name: 'pipe.md', mimeType: 'text/markdown', buffer: Buffer.from('Before\n\n| Name | Status |\n| --- | --- |\n| **Alpha** | Open |\n| Beta | Closed |\n\nAfter') })
  await expect(page.locator('aside li')).toHaveCount(1)
  await page.locator('aside li').click()
  await expect(page.locator('th')).toHaveCount(2)
  await expect(page.locator('td')).toHaveCount(4)
  await expect(page.locator('td strong')).toHaveText('Alpha')
  const text = (await storedNotes(page))[0].plainText
  expect(text).toContain('Alpha\tOpen\nBeta\tClosed')
  expect(text).not.toContain('AlphaOpen')
  await page.getByPlaceholder('Search…').fill('Closed')
  await expect(page.locator('aside li')).toHaveCount(1)
})

test('async uploads, pastes, and drops insert in the intended cells', async ({ page }) => {
  await openFresh(page); await newNote(page); await insertTable(page)
  await page.locator('td').first().click()
  // Hold an IndexedDB write lock so the selection can move while upload saves.
  await page.evaluate(() => new Promise<void>((resolve) => {
    document.documentElement.dataset.holdAssets = 'yes'
    const request = indexedDB.open('noty')
    request.onsuccess = () => {
      const tx = request.result.transaction('assets', 'readwrite')
      const store = tx.objectStore('assets')
      const keepAlive = () => {
        const query = store.get('test-lock')
        query.onsuccess = () => {
          resolve()
          if (document.documentElement.dataset.holdAssets === 'yes') keepAlive()
        }
      }
      keepAlive()
      tx.oncomplete = () => request.result.close()
    }
  }))
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Insert image', exact: true }).click()])
  await chooser.setFiles({ name: 'pending.png', mimeType: 'image/png', buffer: bytes })
  await page.locator('td').nth(1).click()
  await page.evaluate(() => { document.documentElement.dataset.holdAssets = 'no' })
  await expect(page.locator('td').first().locator('img')).toHaveCount(1)
  await page.locator('td').nth(1).locator('p').click()
  await page.locator('td').nth(1).evaluate((cell, b64) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'paste.png', { type: 'image/png' }))
    cell.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }))
  }, bytes.toString('base64'))
  await expect(page.locator('td').nth(1).locator('img')).toHaveCount(1)
  await page.locator('td').nth(2).evaluate((cell, b64) => {
    const transfer = new DataTransfer()
    transfer.items.add(new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], 'drop.png', { type: 'image/png' }))
    const box = cell.getBoundingClientRect()
    cell.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, clientX: box.x + 15, clientY: box.y + 15, bubbles: true, cancelable: true }))
  }, bytes.toString('base64'))
  await expect(page.locator('td').nth(2).locator('img')).toHaveCount(1)
  await saved(page)
  await page.reload()
  await expect(page.locator('td img')).toHaveCount(3)
})
