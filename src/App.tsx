import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Note } from './db/db'
import { createNote, deleteNote, requestPersistence, searchNotes } from './db/notes'
import { NotePane } from './editor/Editor'
import { UpdatePrompt } from './pwa/UpdatePrompt'
import { ConfirmDialog } from './ui/ConfirmDialog'
import { Highlight } from './ui/Highlight'
import { Icon, Logo } from './ui/Icon'
import { ToastRegion, useToasts } from './ui/Toasts'
import { listDate, snippetFor } from './ui/format'

// JSZip + markdown conversion are only needed on click, so load them lazily (still precached for offline).
const loadExport = () => import('./export/exportZip')
const loadImport = () => import('./export/importZip')

function useHashId() {
  const read = () => location.hash.match(/^#\/n\/(.+)$/)?.[1] ?? null
  const [id, setId] = useState<string | null>(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return id
}
const openNote = (id: string | null) => {
  if (id) {
    location.hash = `/n/${id}`
  } else {
    history.replaceState(null, '', location.pathname + location.search)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }
}

function usePersistence() {
  useEffect(() => {
    void requestPersistence()
  }, [])
}

export default function App() {
  const [query, setQuery] = useState('')
  const selectedId = useHashId()
  const [freshId, setFreshId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const allNotes = useLiveQuery(() => searchNotes(query), [query])
  const totalNotes = useLiveQuery(() => db.notes.count(), [])
  // Tagged with the id it was read for: useLiveQuery briefly returns the previous id's result after a change.
  const lookup = useLiveQuery(async (): Promise<{ id: string; note: Note | undefined } | null> => {
    if (!selectedId) return null
    return { id: selectedId, note: await db.notes.get(selectedId) }
  }, [selectedId])
  const settled = lookup && lookup.id === selectedId ? lookup : undefined
  const selected = settled?.note
  const missing = !!selectedId && !!settled && !settled.note
  const notes = useMemo(() => (allNotes ?? []).filter((n) => n.id !== pendingDelete), [allNotes, pendingDelete])
  const fileInput = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const deleteTimer = useRef<number | undefined>(undefined)
  const pendingRef = useRef<string | null>(null)
  usePersistence()
  const { toast, show, dismiss } = useToasts()

  // A hash that points at a note that no longer exists should not leave us on a blank screen.
  useEffect(() => {
    if (missing) openNote(null)
  }, [missing])

  const commitDelete = useCallback(async () => {
    window.clearTimeout(deleteTimer.current)
    const id = pendingRef.current
    pendingRef.current = null
    setPendingDelete(null)
    if (id) await deleteNote(id)
  }, [])

  const requestDelete = async () => {
    if (!selected) return
    await commitDelete()
    pendingRef.current = selected.id
    setPendingDelete(selected.id)
    setConfirmOpen(false)
    openNote(null)
    deleteTimer.current = window.setTimeout(commitDelete, 7000)
    show({
      text: 'Note deleted.',
      action: {
        label: 'Undo',
        run: () => {
          window.clearTimeout(deleteTimer.current)
          pendingRef.current = null
          setPendingDelete(null)
          openNote(selected.id)
        },
      },
    })
  }

  const newNote = async () => {
    const n = await createNote()
    setQuery('')
    setFreshId(n.id)
    openNote(n.id)
  }

  const exportAll = async () => {
    const m = await loadExport()
    m.download(await m.exportAll(), 'noty-library.zip')
    show({ text: 'Exported all notes as noty-library.zip.' })
  }

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && e.shiftKey && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setFocusMode((f) => !f) }
      else if (e.key === 'Escape') setFocusMode((f) => (f && !document.querySelector('dialog[open]') ? false : f))
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  // "/" jumps to search, like most list-first apps.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      if (t.closest('input, textarea, [contenteditable=true]')) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const moveFocus = (dir: 1 | -1) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('.note-item') ?? [])
    const at = items.indexOf(document.activeElement as HTMLElement)
    if (at < 0 && dir < 0) return
    const next = items[at < 0 ? 0 : at + dir]
    if (next) next.focus()
    else if (dir < 0) searchRef.current?.focus()
  }

  const term = query.trim()
  const view = selectedId && selected ? 'note' : 'list'
  const emptyLibrary = totalNotes === 0 && !pendingDelete

  return (
    <div className="app" data-view={view} data-focus={focusMode && view === 'note'}>
      <aside className="sidebar">
        <div className="side-head">
          <span className="brand"><Logo />Noty</span>
          <button className="btn primary" onClick={newNote}>
            <Icon name="plus" />New note
          </button>
        </div>

        <div className="search" role="search">
          <Icon name="search" />
          <input
            ref={searchRef}
            type="search"
            aria-label="Search notes"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setQuery(''); e.currentTarget.blur() }
              if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1) }
            }}
          />
          {query ? (
            <button className="btn quiet icon clear" onClick={() => { setQuery(''); searchRef.current?.focus() }} aria-label="Clear search">
              <Icon name="x" />
            </button>
          ) : (
            <kbd aria-hidden="true">/</kbd>
          )}
        </div>

        {notes.length > 0 && <ul
          className="note-list"
          ref={listRef}
          aria-label="Notes"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1) }
            if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(-1) }
          }}
        >
          {notes.map((n) => (
            <li key={n.id}>
              <button className="note-item" aria-current={n.id === selectedId} onClick={() => openNote(n.id)}>
                <span className="top">
                  <span dir="auto" className={'name' + (n.title ? '' : ' untitled')}>
                    {n.title ? <Highlight text={n.title} term={term} /> : 'Untitled'}
                  </span>
                  <time dateTime={new Date(n.updatedAt).toISOString()}>{listDate(n.updatedAt)}</time>
                </span>
                {n.plainText.trim() && (
                  <span className="snippet" dir="auto"><Highlight text={snippetFor(n.plainText, term)} term={term} /></span>
                )}
              </button>
            </li>
          ))}
        </ul>}
        {allNotes && notes.length === 0 && (
          <div className="list-empty">
            {term ? (
              <>
                <strong>No matches</strong>
                <p>Nothing in your notes contains “{term}”.</p>
                <button className="btn" onClick={() => setQuery('')}>Clear search</button>
              </>
            ) : (
              <>
                <strong>No notes yet</strong>
                <p>Your first note is one click away.</p>
              </>
            )}
          </div>
        )}

        <div className="side-foot">
          <div className="foot-actions">
            <button className="btn small" onClick={() => fileInput.current?.click()}>
              <Icon name="upload" />Import
            </button>
            <button className="btn small" onClick={exportAll}>
              <Icon name="download" />Export all
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept=".zip,.md"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                const n = await (await loadImport()).importFile(f)
                show({ text: `Imported ${n} note${n === 1 ? '' : 's'}.` })
              } catch (err) {
                show({ text: err instanceof Error ? err.message : 'Import failed.', ms: 8000 })
              }
            }}
          />
        </div>
      </aside>

      {selected ? (
        <NotePane
          key={selected.id}
          note={selected}
          focusTitle={freshId === selected.id}
          onBack={() => openNote(null)}
          onDelete={() => setConfirmOpen(true)}
          onExported={(what) => show({ text: `Exported note as ${what}.` })}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((f) => !f)}
        />
      ) : (
        <main className="pane">
          <div className="welcome">
            {emptyLibrary ? (
              <div>
                <h1>Notes that stay with you</h1>
                <p>Everything is saved in this browser, so Noty works without a connection.</p>
                <ul>
                  <li>Paste or drop images straight into a note</li>
                  <li>Search across every note as you type</li>
                  <li>Export to Markdown and images whenever you like</li>
                </ul>
                <button className="btn primary" onClick={newNote}><Icon name="plus" />Write your first note</button>
              </div>
            ) : (
              <div>
                <h1>Pick a note</h1>
                <p>Choose one from the list, or start a new one.</p>
                <button className="btn primary" onClick={newNote}><Icon name="plus" />New note</button>
              </div>
            )}
          </div>
        </main>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this note?"
        body="Its images are deleted too. You can undo for a few seconds afterwards."
        confirmLabel="Delete note"
        onConfirm={requestDelete}
        onCancel={() => setConfirmOpen(false)}
      />
      <ToastRegion toast={toast} onDismiss={dismiss} />
      <UpdatePrompt />
    </div>
  )
}
