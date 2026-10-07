import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="toasts" style={{ bottom: '5rem' }}>
      <div className="toast" role="status">
        <span>A new version of Noty is ready.</span>
        <button onClick={() => updateServiceWorker(true)}>Reload</button>
        <button className="dismiss" onClick={() => setNeedRefresh(false)}>Later</button>
      </div>
    </div>
  )
}
