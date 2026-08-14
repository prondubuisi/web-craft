export function appBasename(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '')
}

export function appHref(path: string): string {
  const base = appBasename()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${window.location.origin}${base}${normalized}`
}
