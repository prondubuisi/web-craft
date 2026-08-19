export const SHARED_KEY = 'zineverse.shared.v1'

export function hasShared(): boolean {
  try {
    return localStorage.getItem(SHARED_KEY) === '1'
  } catch {
    return false
  }
}

export function markShared(): void {
  try {
    localStorage.setItem(SHARED_KEY, '1')
  } catch {
    /* private mode */
  }
}
