export function normalizeTags(input: string[] | string): string[] {
  const parts = Array.isArray(input) ? input : input.split(/[,#\s]+/)
  const out: string[] = []
  for (const part of parts) {
    const tag = part.toLowerCase().replace(/[^a-z0-9-]+/g, '').slice(0, 20)
    if (tag && !out.includes(tag)) out.push(tag)
    if (out.length >= 5) break
  }
  return out
}

export function parseTagField(value: string): string[] {
  return normalizeTags(value)
}

export function formatTags(tags: string[] | undefined): string {
  return (tags ?? []).join(', ')
}
