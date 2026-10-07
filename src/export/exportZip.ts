import JSZip from 'jszip'
import type { JSONContent } from '@tiptap/react'
import { db, type Note } from '../db/db'
import { docToMarkdown, mapImages } from './markdown'

export function safeName(s: string) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^\.+/, '').trim().slice(0, 80) || 'Untitled'
}

async function addNote(zip: JSZip, note: Note, base: string) {
  const assets = await db.assets.where('noteId').equals(note.id).toArray()
  const byId = new Map(assets.map((a) => [a.id, a]))
  const doc = mapImages(note.doc as JSONContent, (attrs) => {
    const a = byId.get(attrs.assetId)
    return a ? { ...attrs, src: `images/${a.filename}` } : null // drop images whose asset is gone
  })
  zip.file(`${base}${safeName(note.title)}.md`, docToMarkdown(doc))
  for (const a of assets) zip.file(`${base}images/${a.filename}`, a.blob)
}

export async function exportNote(note: Note): Promise<Blob> {
  const zip = new JSZip()
  await addNote(zip, note, '')
  return zip.generateAsync({ type: 'blob' })
}

export async function exportAll(): Promise<Blob> {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const note of await db.notes.toArray()) {
    let dir = safeName(note.title)
    for (let i = 2; used.has(dir.toLowerCase()); i++) dir = `${safeName(note.title)} (${i})`
    used.add(dir.toLowerCase())
    const folder = zip.folder(dir)!
    await addNote(folder, note, '')
  }
  return zip.generateAsync({ type: 'blob' })
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  try {
    localStorage.setItem('noty:lastBackup', String(Date.now()))
  } catch {
    /* storage unavailable */
  }
}
