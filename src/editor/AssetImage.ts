import Image from '@tiptap/extension-image'
import { getAssetUrl } from './assetUrls'

/** Image node that references a Blob in IndexedDB by assetId instead of a URL. */
export const AssetImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: { default: null, rendered: false },
    }
  },
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img')
      img.alt = node.attrs.alt ?? ''
      const id = node.attrs.assetId as string | null
      if (id) getAssetUrl(id).then((u) => u && (img.src = u))
      else if (node.attrs.src) img.src = node.attrs.src
      return { dom: img }
    }
  },
})
