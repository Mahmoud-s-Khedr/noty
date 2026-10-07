import { useRef } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { Icon, type IconName } from '../ui/Icon'

type Tool = { icon: IconName; label: string; active?: boolean; run: () => void; disabled?: boolean }

export function Toolbar({ editor, onImages }: { editor: Editor; onImages: (files: File[]) => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'), italic: e.isActive('italic'), strike: e.isActive('strike'), code: e.isActive('code'),
      h2: e.isActive('heading', { level: 2 }), h3: e.isActive('heading', { level: 3 }),
      ul: e.isActive('bulletList'), ol: e.isActive('orderedList'), quote: e.isActive('blockquote'), block: e.isActive('codeBlock'),
      canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  })
  const c = () => editor.chain().focus()
  const groups: Tool[][] = [
    [
      { icon: 'bold', label: 'Bold', active: s.bold, run: () => c().toggleBold().run() },
      { icon: 'italic', label: 'Italic', active: s.italic, run: () => c().toggleItalic().run() },
      { icon: 'strike', label: 'Strikethrough', active: s.strike, run: () => c().toggleStrike().run() },
      { icon: 'code', label: 'Inline code', active: s.code, run: () => c().toggleCode().run() },
    ],
    [
      { icon: 'h2', label: 'Heading', active: s.h2, run: () => c().toggleHeading({ level: 2 }).run() },
      { icon: 'h3', label: 'Subheading', active: s.h3, run: () => c().toggleHeading({ level: 3 }).run() },
    ],
    [
      { icon: 'ul', label: 'Bulleted list', active: s.ul, run: () => c().toggleBulletList().run() },
      { icon: 'ol', label: 'Numbered list', active: s.ol, run: () => c().toggleOrderedList().run() },
      { icon: 'quote', label: 'Quote', active: s.quote, run: () => c().toggleBlockquote().run() },
      { icon: 'codeblock', label: 'Code block', active: s.block, run: () => c().toggleCodeBlock().run() },
    ],
    [
      { icon: 'undo', label: 'Undo', disabled: !s.canUndo, run: () => c().undo().run() },
      { icon: 'redo', label: 'Redo', disabled: !s.canRedo, run: () => c().redo().run() },
    ],
  ]
  const renderGroups = (list: Tool[][], offset: number) =>
    list.map((g, j) => (
      <span key={offset + j} style={{ display: 'contents' }}>
        {offset + j > 0 && <span className="tool-sep" aria-hidden="true" />}
        {g.map((t) => (
          <button
            key={t.label}
            type="button"
            className="tool"
            aria-label={t.label}
            title={t.label}
            aria-pressed={t.active === undefined ? undefined : t.active}
            disabled={t.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </span>
    ))
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {renderGroups(groups.slice(0, 3), 0)}
      <span className="tool-sep" aria-hidden="true" />
      <button type="button" className="tool" aria-label="Insert image" title="Insert image" onClick={() => fileInput.current?.click()}>
        <Icon name="image" />
      </button>
      {renderGroups(groups.slice(3), 3)}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        data-testid="image-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) onImages(files)
        }}
      />
    </div>
  )
}
