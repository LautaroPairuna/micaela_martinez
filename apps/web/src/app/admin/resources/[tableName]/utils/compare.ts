const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })
export function smartCompare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a === b) ? 0 : a ? 1 : -1
  if (typeof a === 'number'  && typeof b === 'number')  return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return collator.compare(String(a), String(b))
}
