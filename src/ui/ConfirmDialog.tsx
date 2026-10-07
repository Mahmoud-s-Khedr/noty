import { useEffect, useRef } from 'react'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (props.open && !d.open) d.showModal()
    if (!props.open && d.open) d.close()
  }, [props.open])
  return (
    <dialog ref={ref} className="confirm" onCancel={(e) => { e.preventDefault(); props.onCancel() }} aria-labelledby="confirm-title">
      <h2 id="confirm-title">{props.title}</h2>
      <p>{props.body}</p>
      <div className="actions">
        <button className="btn" onClick={props.onCancel} autoFocus>Cancel</button>
        <button className="btn danger" onClick={props.onConfirm}>{props.confirmLabel}</button>
      </div>
    </dialog>
  )
}
