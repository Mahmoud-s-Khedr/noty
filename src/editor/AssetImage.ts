import Image from '@tiptap/extension-image'
import { getAssetUrl } from './assetUrls'
import { previewImage } from './imagePreview'

/** Image node that references a Blob in IndexedDB by assetId instead of a URL. */
export const AssetImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null, rendered: false },
    }
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'asset-image'
      wrapper.contentEditable = 'false'
      let preview: HTMLDialogElement | undefined
      const img = document.createElement('img')
      img.alt = node.attrs.alt ?? ''
      const id = node.attrs.assetId as string | null
      if (id) getAssetUrl(id).then((u) => u && (img.src = u))
      else if (node.attrs.src) img.src = node.attrs.src
      const enlarge = document.createElement('button')
      enlarge.type = 'button'
      enlarge.className = 'image-enlarge'
      enlarge.textContent = 'Enlarge'
      enlarge.setAttribute('aria-label', 'Enlarge image')
      enlarge.onclick = () => { if (img.src) preview = previewImage(img.src, img.alt, enlarge) }
      img.onclick = () => {
        const pos = getPos()
        if (pos !== undefined) editor.chain().focus().setNodeSelection(pos).run()
      }
      wrapper.append(img, enlarge)
      return {
        dom: wrapper,
        stopEvent: (event) => event.target === enlarge,
        selectNode: () => img.classList.add('ProseMirror-selectednode'),
        deselectNode: () => img.classList.remove('ProseMirror-selectednode'),
        destroy: () => { preview?.close(); preview?.remove() },
      }
    }
  },
})
