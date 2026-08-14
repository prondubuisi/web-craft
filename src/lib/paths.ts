export function appBasename(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '')
}

export function assetUrl(path: string): string {
  if (!path || path.startsWith('data:') || /^https?:\/\//.test(path)) return path
  const base = import.meta.env.BASE_URL
  const clean = path.replace(/^\//, '')
  if (path.startsWith(base)) return path
  return `${base}${clean}`
}

export function appHref(path: string): string {
  const base = appBasename()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${base}${normalized}`
}
