import { expect, test, type Locator, type Page } from '@playwright/test'
import { newNote, openFresh } from './fixtures'

async function expectDirection(locator: Locator, direction: 'rtl' | 'ltr') {
  await expect(locator).toHaveCSS('direction', direction)
  await expect(locator).toHaveCSS('text-align', 'start')
}

async function pasteHtml(page: Page, html: string) {
  await page.locator('.ProseMirror').evaluate((el, content) => {
    const data = new DataTransfer()
    data.setData('text/html', content)
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, html)
}

test('typing chooses direction per paragraph and updates it when text changes', async ({ page }) => {
  await openFresh(page)
  await newNote(page)
  const title = page.getByRole('textbox', { name: 'Title', exact: true })
  await title.fill('ملاحظات Python')
  await expectDirection(title, 'rtl')
  await page.locator('.ProseMirror').click()
  await page.keyboard.insertText('1. النص المستخدم في التجربة (Tokenization).')
  await page.keyboard.press('Enter')
  await page.keyboard.insertText('Students are studying programming and developing applications.')
  await page.keyboard.press('Enter')
  await page.keyboard.insertText('كود الطالب: 152200217')
  const paragraphs = page.locator('.ProseMirror > p')
  await expectDirection(paragraphs.nth(0), 'rtl')
  await expectDirection(paragraphs.nth(1), 'ltr')
  await expectDirection(paragraphs.nth(2), 'rtl')
  // Replacing the first strong character must update direction without a reload.
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+End')
  await page.keyboard.insertText('English paragraph')
  await expectDirection(paragraphs.nth(2), 'ltr')
  await expect(page.locator('.status')).toHaveAttribute('data-state', 'saved')
  await page.reload()
  await expectDirection(page.locator('.ProseMirror > p').nth(0), 'rtl')
  await expectDirection(page.locator('.ProseMirror > p').nth(1), 'ltr')
  await expectDirection(page.getByRole('textbox', { name: 'Title', exact: true }), 'rtl')
  await expectDirection(page.locator('.note-item .name'), 'rtl')
  await expectDirection(page.locator('.note-item .snippet'), 'rtl')
})

test('rich paste supports mixed headings, lists, quotes, tables and isolated code, including print', async ({ page }) => {
  await openFresh(page)
  await newNote(page)
  await pasteHtml(page, `
    <h2>2. تقطيع النص إلى كلمات (Tokenization)</h2>
    <p>استخدم مكتبة <code>re.split(r"\\s+", text)</code> في Python.</p>
    <p>Researchers are analyzing data and improving systems.</p>
    <ul><li><p>الجملة الأولى</p></li><li><p>English list item</p></li></ul>
    <blockquote><p>هذه ملاحظة باللغة العربية.</p></blockquote>
    <table><tbody><tr><th><p>العنوان</p></th><th><p>Title</p></th></tr>
    <tr><td><p>القيمة 123</p></td><td><p>Value 123</p></td></tr></tbody></table>
    <pre><code># تعليق عربي\nprint("مرحبا")</code></pre>
    <p dir="rtl">Python داخل فقرة عربية</p>
  `)
  await expectDirection(page.locator('.ProseMirror h2'), 'rtl')
  await expectDirection(page.locator('.ProseMirror > p').nth(0), 'rtl')
  await expectDirection(page.locator('.ProseMirror > p').nth(1), 'ltr')
  await expectDirection(page.locator('.ProseMirror li').nth(0), 'rtl')
  await expectDirection(page.locator('.ProseMirror li').nth(1), 'ltr')
  await expect(page.locator('.ProseMirror ul')).toHaveCSS('direction', 'rtl')
  expect(await page.locator('.ProseMirror ul').evaluate((list) => {
    const style = getComputedStyle(list)
    return parseFloat(style.paddingRight) > 0 && parseFloat(style.paddingLeft) > 0
  })).toBe(true)
  await expect(page.locator('.ProseMirror blockquote')).toHaveCSS('border-right-width', '3px')
  await expectDirection(page.locator('.ProseMirror td').nth(0).locator('p'), 'rtl')
  await expectDirection(page.locator('.ProseMirror td').nth(1).locator('p'), 'ltr')
  await expect(page.locator('.ProseMirror p code')).toHaveCSS('direction', 'ltr')
  await expect(page.locator('.ProseMirror p code')).toHaveCSS('unicode-bidi', 'isolate')
  await expect(page.locator('.ProseMirror pre')).toHaveCSS('direction', 'ltr')
  await expectDirection(page.locator('.ProseMirror > p').last(), 'rtl')
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await page.emulateMedia({ media: 'print' })
  await expectDirection(page.locator('.print-document h2'), 'rtl')
  await expectDirection(page.locator('.print-document td').nth(1).locator('p'), 'ltr')
  await expect(page.locator('.print-document pre')).toHaveCSS('direction', 'ltr')
})

test('existing notes without direction attributes gain automatic direction on load', async ({ page }) => {
  await openFresh(page)
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('noty')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const tx = request.result.transaction('notes', 'readwrite')
      tx.objectStore('notes').put({
        id: 'legacy-mixed', title: 'ملاحظات English', createdAt: Date.now(), updatedAt: Date.now(),
        plainText: 'اسم الطالب: محمود\nEnglish sentence.',
        doc: { type: 'doc', content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'اسم الطالب: محمود' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'English sentence.' }] },
        ] },
      })
      tx.oncomplete = () => { request.result.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  await page.goto('/#/n/legacy-mixed')
  await expectDirection(page.locator('.ProseMirror > p').nth(0), 'rtl')
  await expectDirection(page.locator('.ProseMirror > p').nth(1), 'ltr')
})
