const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const dayYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Compact label for the note list: time today, "Yesterday", weekday this week, otherwise a date. */
export function listDate(ts: number, now = Date.now()) {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(ts))) / 864e5)
  if (days <= 0) return time.format(ts)
  if (days === 1) return 'Yesterday'
  if (days < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(ts)
  return new Date(ts).getFullYear() === new Date(now).getFullYear() ? day.format(ts) : dayYear.format(ts)
}

export function ago(ts: number, now = Date.now()) {
  const days = Math.floor((now - ts) / 864e5)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export const wordCount = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)

/** Text around the first match so search hits are visible in the snippet. */
export function snippetFor(text: string, term: string, max = 140) {
  const flat = text.replace(/\s+/g, ' ').trim()
  const at = term ? flat.toLowerCase().indexOf(term.toLowerCase()) : -1
  if (at < 0 || at < 40) return flat.slice(0, max)
  return '…' + flat.slice(Math.max(0, at - 30), at - 30 + max)
}
