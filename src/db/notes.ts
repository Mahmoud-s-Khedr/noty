import type { JSONContent } from '@tiptap/react'
import { db, DOC_VERSION, type Note } from './db'

const ORPHAN_GRACE_MS = 60_000

export const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] }

export async function createNote(): Promise<Note> {
  const now = Date.now()
  const note: Note = {
    id: crypto.randomUUID(),
    title: '',
    doc: EMPTY_DOC,
    docVersion: DOC_VERSION,
    plainText: '',
    createdAt: now,
    updatedAt: now,
  }
  await db.notes.add(note)
  return note
}

export function renameNote(id: string, title: string) {
  return db.notes.update(id, { title, updatedAt: Date.now() })
}

export async function deleteNote(id: string) {
  await db.transaction('rw', db.notes, db.assets, async () => {
    await db.assets.where('noteId').equals(id).delete()
    await db.notes.delete(id)
  })
}

function collectAssetIds(node: JSONContent, out: Set<string>) {
  if (node.type === 'image' && node.attrs?.assetId) out.add(node.attrs.assetId)
  node.content?.forEach((c) => collectAssetIds(c, out))
}

/** Persist doc + derived text, and drop assets no longer referenced. */
export async function saveNoteDoc(id: string, doc: JSONContent, plainText: string) {
  const used = new Set<string>()
  collectAssetIds(doc, used)
  await db.transaction('rw', db.notes, db.assets, async () => {
    await db.notes.update(id, { doc, plainText, docVersion: DOC_VERSION, updatedAt: Date.now() })
    // Grace period so a just-pasted asset isn't collected before its node is saved.
    const cutoff = Date.now() - ORPHAN_GRACE_MS
    const orphans = (await db.assets.where('noteId').equals(id).toArray())
      .filter((a) => !used.has(a.id) && a.createdAt < cutoff)
      .map((a) => a.id)
    if (orphans.length) await db.assets.bulkDelete(orphans)
  })
}

export async function addAsset(noteId: string, blob: Blob): Promise<string> {
  const id = crypto.randomUUID()
  const ext = (blob.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/[^a-z0-9]/gi, '')
  await db.assets.add({ id, noteId, filename: `${id}.${ext}`, mimeType: blob.type, blob, createdAt: Date.now() })
  return id
}

export async function searchNotes(q: string): Promise<Note[]> {
  const term = q.trim().toLowerCase()
  const all = await db.notes.orderBy('updatedAt').reverse().toArray()
  if (!term) return all
  return all.filter((n) => n.title.toLowerCase().includes(term) || n.plainText.toLowerCase().includes(term))
}

export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
