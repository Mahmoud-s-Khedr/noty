import JSZip from 'jszip'
import { db, DOC_VERSION } from '../db/db'
import { docToText, mapImages, markdownToDoc } from './markdown'

/** Import a ZIP produced by exportNote/exportAll (or a plain .md file). Returns number of notes imported. */
export async function importFile(file: File): Promise<number> {
  if (file.name.toLowerCase().endsWith('.md')) {
    await importMarkdown(await file.text(), file.name.replace(/\.md$/i, ''), async () => null)
    return 1
  }
  const zip = await JSZip.loadAsync(file).catch(() => {
    throw new Error(`"${file.name}" is not a valid ZIP or Markdown file.`)
  })
  const mds = Object.keys(zip.files).filter((n) => n.toLowerCase().endsWith('.md') && !zip.files[n].dir)
  for (const path of mds) {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : ''
    const title = path.slice(dir.length).replace(/\.md$/i, '')
    await importMarkdown(await zip.files[path].async('string'), title, async (src) => {
      const entry = zip.file(dir + src)
      return entry ? entry.async('blob') : null
    })
  }
  if (!mds.length) throw new Error('No Markdown files found in the ZIP.')
  return mds.length
}

const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' }

async function importMarkdown(md: string, title: string, loadImage: (src: string) => Promise<Blob | null>) {
  const noteId = crypto.randomUUID()
  const doc = markdownToDoc(md)
  const srcs = new Set<string>()
  mapImages(doc, (a) => {
    if (a.src) srcs.add(a.src)
    return a
  })
  const assetBySrc = new Map<string, string>()
  for (const src of srcs) {
    const raw = await loadImage(src)
    if (!raw) continue
    const filename = src.split('/').pop()!
    const mimeType = MIME[filename.split('.').pop()!.toLowerCase()] ?? raw.type
    const id = crypto.randomUUID()
    await db.assets.add({ id, noteId, filename, mimeType, blob: new Blob([raw], { type: mimeType }), createdAt: Date.now() })
    assetBySrc.set(src, id)
  }
  const finalDoc = mapImages(doc, (a) => {
    const assetId = assetBySrc.get(a.src)
    return assetId ? { ...a, assetId, src: null } : a
  })
  const now = Date.now()
  await db.notes.add({
    id: noteId,
    title,
    doc: finalDoc,
    docVersion: DOC_VERSION,
    plainText: docToText(finalDoc),
    createdAt: now,
    updatedAt: now,
  })
}
