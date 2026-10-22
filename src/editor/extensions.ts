import type { Attributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TableKit, TableCell, TableHeader } from '@tiptap/extension-table'
import { AssetImage } from './AssetImage'

const cellAttributes = (parent: Attributes = {}) => ({
  ...parent,
  colwidth: {
    ...parent?.colwidth,
    default: [160],
    parseHTML: (element: HTMLElement) => parent?.colwidth?.parseHTML?.(element) ?? [160],
  },
})

/** The same schema is used for editing, HTML blocks, and Markdown imports. */
export function editorExtensions() {
  return [
    StarterKit, Markdown, AssetImage,
    TableKit.configure({ table: { resizable: true, cellMinWidth: 80 }, tableCell: false, tableHeader: false }),
    TableCell.extend({ addAttributes() { return cellAttributes(this.parent?.()) } }),
    TableHeader.extend({ addAttributes() { return cellAttributes(this.parent?.()) } }),
  ]
}
