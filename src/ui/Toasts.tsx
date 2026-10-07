import { useCallback, useEffect, useRef, useState } from 'react'

export type ToastInput = { text: string; action?: { label: string; run: () => void }; ms?: number }
type Toast = ToastInput & { id: number }

export function useToasts() {
  const [toast, setToast] = useState<Toast | null>(null)
  const seq = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setToast(null)
  }, [])
  const show = useCallback((t: ToastInput) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, id: ++seq.current })
    timer.current = window.setTimeout(() => setToast(null), t.ms ?? (t.action ? 7000 : 4500))
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return { toast, show, dismiss }
}

export function ToastRegion({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  return (
    <div className="toasts">
      <div role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast.id}>
            <span>{toast.text}</span>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action!.run()
                  onDismiss()
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button className="dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
          </div>
        )}
      </div>
    </div>
  )
}
