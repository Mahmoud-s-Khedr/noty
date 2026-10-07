import { db } from '../db/db'

// assetId -> object URL. Kept for the page lifetime; revoked on pagehide.
const cache = new Map<string, Promise<string | null>>()

export function getAssetUrl(assetId: string): Promise<string | null> {
  let p = cache.get(assetId)
  if (!p) {
    p = db.assets.get(assetId).then((a) => (a ? URL.createObjectURL(a.blob) : null))
    cache.set(assetId, p)
  }
  return p
}

export function forgetAssetUrl(assetId: string) {
  const p = cache.get(assetId)
  cache.delete(assetId)
  p?.then((u) => u && URL.revokeObjectURL(u))
}

window.addEventListener('pagehide', () => [...cache.keys()].forEach(forgetAssetUrl))
