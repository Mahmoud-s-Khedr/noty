import Dexie, { type EntityTable } from 'dexie'

export interface Note {
  id: string
  title: string
  doc: unknown // Tiptap JSON
  docVersion: number
  plainText: string
  createdAt: number
  updatedAt: number
}

export interface Asset {
  id: string
  noteId: string
  filename: string
  mimeType: string
  blob: Blob
  createdAt: number
}

export const DOC_VERSION = 1

export const db = new Dexie('noty') as Dexie & {
  notes: EntityTable<Note, 'id'>
  assets: EntityTable<Asset, 'id'>
}

db.version(1).stores({
  notes: 'id, updatedAt, title',
  assets: 'id, noteId',
})
