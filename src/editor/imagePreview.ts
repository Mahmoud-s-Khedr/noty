/** Native modal dialogs provide focus trapping and Escape dismissal. */
export function previewImage(src: string, alt: string, trigger: HTMLButtonElement) {
  const dialog = document.createElement('dialog')
  dialog.className = 'image-preview'
  dialog.setAttribute('aria-label', 'Image preview')
  const close = document.createElement('button')
  close.className = 'btn'
  close.textContent = 'Close'
  close.type = 'button'
  close.autofocus = true
  const img = document.createElement('img')
  img.src = src
  img.alt = alt
  dialog.append(close, img)
  close.onclick = () => dialog.close()
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      close.focus()
    }
  })
  dialog.addEventListener('close', () => {
    dialog.remove()
    if (trigger.isConnected) trigger.focus()
  }, { once: true })
  document.body.append(dialog)
  dialog.showModal()
  return dialog
}
