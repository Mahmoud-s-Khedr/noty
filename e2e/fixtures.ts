import { expect, type Page } from '@playwright/test'

const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

export async function openFresh(page: Page) {
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
}

export async function newNote(page: Page) {
  await page.locator('aside').getByRole('button', { name: 'New note' }).click()
  await page.locator('.ProseMirror').click()
}

export async function pasteImage(page: Page) {
  await page.locator('.ProseMirror').evaluate((el, b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const dt = new DataTransfer()
    dt.items.add(new File([bytes], 'shot.png', { type: 'image/png' }))
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, PNG_B64)
  await expect(page.locator('.ProseMirror img')).toHaveAttribute('src', /^blob:/)
}

/** Raw IndexedDB helpers (the Dexie instance isn't exposed on window). */
export function assetCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('noty')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const req = open.result.transaction('assets').objectStore('assets').count()
          req.onsuccess = () => resolve(req.result)
        }
      }),
  )
}

export function backdateAssets(page: Page) {
  return page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('noty')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('assets', 'readwrite')
          const store = tx.objectStore('assets')
          store.openCursor().onsuccess = (e) => {
            const cur = (e.target as IDBRequest<IDBCursorWithValue | null>).result
            if (!cur) return
            cur.update({ ...cur.value, createdAt: 0 })
            cur.continue()
          }
          tx.oncomplete = () => resolve()
        }
      }),
  )
}
