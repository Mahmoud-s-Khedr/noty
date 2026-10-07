import {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  type FileChild, type ParagraphChild,
} from 'docx'
import type { JSONContent } from '@tiptap/react'
import { db, type Note } from '../db/db'

type Ctx = { images: Map<string, { data: Uint8Array; w: number; h: number; type: 'png' | 'jpg' | 'gif' | 'bmp' }> }

const MAX_W = 600 // px, fits a page with default margins

function imageType(mime: string) {
  if (mime.includes('png')) return 'png' as const
  if (mime.includes('gif')) return 'gif' as const
  if (mime.includes('bmp')) return 'bmp' as const
  return mime.includes('jpeg') || mime.includes('jpg') ? ('jpg' as const) : null // webp/svg unsupported by Word via docx
}

async function size(blob: Blob) {
  try {
    const bmp = await createImageBitmap(blob)
    const r = { w: bmp.width, h: bmp.height }
    bmp.close()
    return r
  } catch {
    return { w: 400, h: 300 }
  }
}

function runs(node: JSONContent, ctx: Ctx): ParagraphChild[] {
  return (node.content ?? []).flatMap((c): ParagraphChild[] => {
    if (c.type === 'hardBreak') return [new TextRun({ break: 1 })]
    if (c.type === 'image') {
      const img = ctx.images.get(c.attrs?.assetId)
      if (!img) return []
      const w = Math.min(img.w, MAX_W)
      return [new ImageRun({ type: img.type, data: img.data, transformation: { width: w, height: Math.round((img.h * w) / img.w) } })]
    }
    if (c.type !== 'text') return runs(c, ctx)
    const m = new Set((c.marks ?? []).map((x) => x.type))
    return [new TextRun({
      text: c.text ?? '', bold: m.has('bold'), italics: m.has('italic'), strike: m.has('strike'),
      font: m.has('code') ? 'Consolas' : undefined, shading: m.has('code') ? { fill: 'EEEEEE' } : undefined,
    })]
  })
}

function blocks(nodes: JSONContent[], ctx: Ctx, o: { list?: { ordered: boolean; level: number }; quote?: boolean } = {}): FileChild[] {
  return nodes.flatMap((n): FileChild[] => {
    switch (n.type) {
      case 'paragraph':
        return [new Paragraph({
          children: runs(n, ctx),
          numbering: o.list ? (o.list.ordered ? { reference: 'ol', level: o.list.level } : undefined) : undefined,
          bullet: o.list && !o.list.ordered ? { level: o.list.level } : undefined,
          indent: o.quote ? { left: 480 } : undefined,
          border: o.quote ? { left: { style: 'single', size: 12, color: 'AAAAAA', space: 8 } } : undefined,
          spacing: { after: 120 },
        })]
      case 'heading': {
        const lv = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6]
        return [new Paragraph({ children: runs(n, ctx), heading: lv[(n.attrs?.level ?? 1) - 1] })]
      }
      case 'bulletList':
      case 'orderedList': {
        const level = o.list ? o.list.level + 1 : 0
        return (n.content ?? []).flatMap((li) => blocks(li.content ?? [], ctx, { ...o, list: { ordered: n.type === 'orderedList', level } }))
      }
      case 'blockquote':
        return blocks(n.content ?? [], ctx, { ...o, quote: true })
      case 'codeBlock': {
        const text = (n.content ?? []).map((c) => c.text ?? '').join('')
        return text.split('\n').map((line) => new Paragraph({
          children: [new TextRun({ text: line, font: 'Consolas' })],
          shading: { fill: 'F2F2F2' }, spacing: { after: 0 },
        }))
      }
      case 'horizontalRule':
        return [new Paragraph({ border: { bottom: { style: 'single', size: 6, color: 'AAAAAA', space: 1 } } })]
      case 'image':
        return [new Paragraph({ children: runs({ content: [n] }, ctx), alignment: AlignmentType.LEFT })]
      default:
        return blocks(n.content ?? [], ctx, o)
    }
  })
}

export async function exportDocx(note: Note): Promise<Blob> {
  const ctx: Ctx = { images: new Map() }
  for (const a of await db.assets.where('noteId').equals(note.id).toArray()) {
    const type = imageType(a.mimeType)
    if (!type) continue
    const { w, h } = await size(a.blob)
    ctx.images.set(a.id, { data: new Uint8Array(await a.blob.arrayBuffer()), w, h, type })
  }
  const children = blocks((note.doc as JSONContent).content ?? [], ctx)
  if (note.title) children.unshift(new Paragraph({ text: note.title, heading: HeadingLevel.TITLE }))
  const doc = new Document({
    numbering: {
      config: [{ reference: 'ol', levels: [0, 1, 2, 3].map((level) => ({
        level, format: 'decimal' as const, text: `%${level + 1}.`, alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
      })) }],
    },
    sections: [{ children }],
  })
  return Packer.toBlob(doc)
}
