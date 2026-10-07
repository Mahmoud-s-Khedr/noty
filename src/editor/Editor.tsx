import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor, type Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'
import type { Note } from '../db/db'
import { addAsset, renameNote, saveNoteDoc } from '../db/notes'
import { Icon } from '../ui/Icon'
import { listDate, wordCount } from '../ui/format'
import { AssetImage } from './AssetImage'
import { Toolbar } from './Toolbar'

// JSZip + markdown conversion are only needed on click, so load them lazily (still precached for offline).
const loadExport = () => import('../export/exportZip')

async function insertImages(editor: TiptapEditor, noteId: string, files: File[]) {
  for (const f of files) {
    const assetId = await addAsset(noteId, f)
    editor.chain().focus().insertContent({ type: 'image', attrs: { assetId, alt: '' } }).run()
  }
}

function imageFiles(list: FileList | DataTransferItemList | null | undefined): File[] {
  const out: File[] = []
  if (!list) return out
  for (const it of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const f = it instanceof File ? it : it.kind === 'file' ? it.getAsFile() : null
    if (f && f.type.startsWith('image/')) out.push(f)
  }
  return out
}

type Props = {
  note: Note
  focusTitle: boolean
  onBack: () => void
  onDelete: () => void
  onExported: (what: string) => void
  focusMode: boolean
  onToggleFocus: () => void
}

export function NotePane({ note, focusTitle, onBack, onDelete, onExported, focusMode, onToggleFocus }: Props) {
  const [status, setStatus] = useState<'saved' | 'saving'>('saved')
  const [words, setWords] = useState(() => wordCount(note.plainText))
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const noteId = note.id

  const editor = useEditor(
    {
      extensions: [StarterKit, Markdown, AssetImage, Placeholder.configure({ placeholder: 'Start writing, or paste an image…' })],
      content: note.doc as object,
      editorProps: {
        handlePaste: (_view, e) => {
          const files = imageFiles(e.clipboardData?.items)
          if (!files.length) return false
          e.preventDefault()
          insertImages(editorRef.current!, noteId, files)
          return true
        },
        handleDrop: (_v, e) => {
          const files = imageFiles(e.dataTransfer?.files)
          if (!files.length) return false
          e.preventDefault()
          insertImages(editorRef.current!, noteId, files)
          return true
        },
      },
      onUpdate: ({ editor }) => {
        setStatus('saving')
        setWords(wordCount(editor.getText({ blockSeparator: ' ' })))
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(async () => {
          await saveNoteDoc(noteId, editor.getJSON(), editor.getText({ blockSeparator: '\n' }))
          setStatus('saved')
        }, 400)
      },
    },
    [noteId],
  )
  const editorRef = useRef<TiptapEditor | null>(null)
  useEffect(() => {
    editorRef.current = editor
  })

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus()
  }, [focusTitle])

  // Flush pending save when switching notes / unmounting.
  useEffect(
    () => () => {
      if (timer.current && editorRef.current && !editorRef.current.isDestroyed) {
        window.clearTimeout(timer.current)
        const ed = editorRef.current
        void saveNoteDoc(noteId, ed.getJSON(), ed.getText({ blockSeparator: '\n' }))
      }
    },
    [noteId],
  )

  const exportThis = async () => {
    const m = await loadExport()
    m.download(await m.exportNote(note), `${m.safeName(note.title)}.zip`)
    onExported('a ZIP')
  }

  const exportDocx = async () => {
    const m = await import('../export/exportDocx')
    const { download, safeName } = await loadExport()
    download(await m.exportDocx(note), `${safeName(note.title)}.docx`)
    onExported('a Word document')
  }

  // The browser's print dialog offers "Save as PDF"; print CSS shows only the note.
  const exportPdf = () => {
    const prev = document.title
    document.title = note.title || 'Untitled'
    window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
    window.print()
  }

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      if (!Array.from(e.dataTransfer.types).includes('Files')) return
      dragDepth.current++
      setDragging(true)
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (!dragDepth.current) setDragging(false)
    },
    onDrop: () => {
      dragDepth.current = 0
      setDragging(false)
    },
  }

  return (
    <main className="pane">
      <div className="pane-head">
        <button className="btn quiet icon back" onClick={onBack} aria-label="All notes" title="All notes">
          <Icon name="back" />
        </button>
        <div className="status" data-state={status}>
          <span className="dot" aria-hidden="true" />
          <span className="words">{words} {words === 1 ? 'word' : 'words'} · edited {listDate(note.updatedAt)}</span>
        </div>
        <span className="spacer" />
        <button className="btn quiet icon" onClick={onToggleFocus} aria-label="Focus mode" aria-pressed={focusMode} title={focusMode ? 'Exit focus mode (Esc)' : 'Focus mode (Ctrl+Shift+F)'}>
          <Icon name={focusMode ? 'collapse' : 'expand'} />
        </button>
        <button className="btn quiet small" onClick={exportThis} aria-label="Export note" title="Export as Markdown + images">ZIP</button>
        <button className="btn quiet small" onClick={exportDocx} title="Export as Word document">DOCX</button>
        <button className="btn quiet small" onClick={exportPdf} title="Save as PDF">PDF</button>
        <button className="btn quiet icon" onClick={onDelete} aria-label="Delete note" title="Delete note">
          <Icon name="trash" />
        </button>
      </div>
      <div className="scroll">
        <div className="sheet dropzone" data-dragging={dragging} {...dragProps}>
          <textarea
            ref={titleRef}
            key={note.id}
            className="note-title"
            rows={1}
            aria-label="Title"
            placeholder="Untitled"
            defaultValue={note.title}
            onChange={(e) => renameNote(note.id, e.target.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || (e.key === 'ArrowDown' && e.currentTarget.selectionStart === e.currentTarget.value.length)) {
                e.preventDefault()
                editor?.commands.focus('start')
              }
            }}
          />
          {editor && <Toolbar editor={editor} onImages={(files) => insertImages(editor, noteId, files)} />}
          <EditorContent editor={editor} />
        </div>
      </div>
    </main>
  )
}
