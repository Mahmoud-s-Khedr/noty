import { Editor, type JSONContent } from '@tiptap/react'
import { generateHTML } from '@tiptap/core'
import { editorExtensions } from '../editor/extensions'

const extensions = editorExtensions()

export function docToMarkdown(doc: JSONContent): string {
  const ed = new Editor({ extensions, content: doc })
  // HTML table blocks retain rich cell content and widths, with Markdown around them.
  const md = (doc.content ?? []).map((node) => {
    if (node.type === 'table') return generateHTML({ type: 'doc', content: [node] }, extensions).replace(/\n/g, '&#10;')
    ed.commands.setContent({ type: 'doc', content: [node] })
    return ed.getMarkdown().trimEnd()
  }).join('\n\n')
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

export { docToText } from '../editor/documentText'
