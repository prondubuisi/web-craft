export const PRIMER_KEY = 'zineverse.primer.v1'

export function primerSeen(): boolean {
  try {
    return localStorage.getItem(PRIMER_KEY) === '1'
  } catch {
    return true
  }
}

export function dismissPrimer(): void {
  try {
    localStorage.setItem(PRIMER_KEY, '1')
  } catch {
    /* private mode */
  }
}
