import { Editor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { AssetImage } from '../editor/AssetImage'

const extensions = [StarterKit, Markdown, AssetImage]

export function docToMarkdown(doc: JSONContent): string {
  const ed = new Editor({ extensions, content: doc })
  const md = ed.getMarkdown()
  ed.destroy()
  return md
}

export function markdownToDoc(md: string): JSONContent {
  const ed = new Editor({ extensions, content: md, contentType: 'markdown' })
  const json = ed.getJSON()
  ed.destroy()
  return json
}

type Attrs = NonNullable<JSONContent['attrs']>

/** Rewrites image nodes; return null from fn to drop the node. */
export function mapImages(node: JSONContent, fn: (attrs: Attrs) => Attrs | null): JSONContent {
  if (node.type === 'image') return { ...node, attrs: fn(node.attrs ?? {}) ?? undefined }
  if (!node.content) return node
  const content = node.content
    .map((c) => mapImages(c, fn))
    .filter((c) => !(c.type === 'image' && c.attrs === undefined))
  return { ...node, content }
}

export function docToText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  const parts = (node.content ?? []).map(docToText)
  return node.type === 'doc' ? parts.join('\n') : parts.join('')
}
