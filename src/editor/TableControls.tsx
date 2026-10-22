import { useRef } from 'react'
import { findParentNode } from '@tiptap/core'
import { useEditorState, type Editor } from '@tiptap/react'
import type { SelectionBookmark } from '@tiptap/pm/state'

export function TableControls({ editor }: { editor: Editor }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const bookmark = useRef<SelectionBookmark | null>(null)
  const inTable = useEditorState({ editor, selector: ({ editor: e }) => e.isActive('table') })
  const restore = () => {
    if (bookmark.current) {
      const selection = bookmark.current.resolve(editor.state.doc)
      editor.commands.command(({ tr }) => { tr.setSelection(selection); return true })
    }
  }
  const actions: Record<string, () => void> = {
    'Insert row above': () => { editor.chain().focus().addRowBefore().run() },
    'Insert row below': () => { editor.chain().focus().addRowAfter().run() },
    'Insert column left': () => { editor.chain().focus().addColumnBefore().run() },
    'Insert column right': () => { editor.chain().focus().addColumnAfter().run() },
    'Delete current row': () => { editor.chain().focus().deleteRow().run() },
    'Delete current column': () => { editor.chain().focus().deleteColumn().run() },
    'Toggle first row as headers': () => {
      editor.chain().focus().command(({ state, tr }) => {
        const table = findParentNode((n) => n.type.name === 'table')(state.selection)
        const firstRow = table?.node.firstChild
        if (!table || !firstRow) return false
        const header = firstRow.firstChild?.type.name !== 'tableHeader'
        firstRow.forEach((cell, offset) => {
          tr.setNodeMarkup(table.pos + 2 + offset, state.schema.nodes[header ? 'tableHeader' : 'tableCell'], cell.attrs)
        })
        return true
      }).run()
    },
    'Write after table': () => {
      const table = findParentNode((n) => n.type.name === 'table')(editor.state.selection)
      if (table) editor.chain().focus().setTextSelection(table.pos + table.node.nodeSize + 1).run()
    },
    'Delete table': () => { editor.chain().focus().deleteTable().run() },
  }
  return <>
    <button type="button" className="btn quiet small" disabled={inTable}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { bookmark.current = editor.state.selection.getBookmark(); dialog.current?.showModal() }}>
      Insert table
    </button>
    {inTable && <select className="table-options" aria-label="Table options" value=""
      onChange={(e) => actions[e.target.value]?.()}>
      <option value="" disabled>Table options</option>
      {Object.keys(actions).map((label) => <option key={label}>{label}</option>)}
    </select>}
    <dialog ref={dialog} className="confirm table-dialog" aria-labelledby="table-title"
      onClose={() => { restore(); editor.commands.focus() }}>
      <form onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const rows = Number(data.get('rows'))
        const cols = Number(data.get('columns'))
        if (!Number.isSafeInteger(rows) || rows < 1 || !Number.isSafeInteger(cols) || cols < 1) return
        restore()
        if (editor.isActive('table')) return
        // Close first so the dialog's selection restoration precedes insertion.
        bookmark.current = null
        dialog.current?.close()
        editor.chain().focus().insertTable({ rows, cols, withHeaderRow: data.has('headers') }).run()
      }}>
        <h2 id="table-title">Insert table</h2>
        <label>Rows <input name="rows" type="number" min="1" step="1" required defaultValue="3" autoFocus /></label>
        <label>Columns <input name="columns" type="number" min="1" step="1" required defaultValue="3" /></label>
        <label className="header-choice"><input name="headers" type="checkbox" defaultChecked /> Header row</label>
        <div className="actions">
          <button type="button" className="btn" onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="btn primary">Insert</button>
        </div>
      </form>
    </dialog>
  </>
}
