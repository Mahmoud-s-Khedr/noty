import type { JSONContent } from '@tiptap/react'

export function docToText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  const parts = (node.content ?? []).map(docToText)
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'tableRow') return parts.join('\t')
  return ['doc', 'table', 'tableCell', 'tableHeader', 'bulletList', 'orderedList', 'listItem', 'blockquote'].includes(node.type ?? '') ? parts.join('\n') : parts.join('')
}
