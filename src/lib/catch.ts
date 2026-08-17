/** Background sync / offline-first. Failure is expected when the API is down. */
export function catchBackground(_err?: unknown): undefined {
  return undefined
}

/** User-initiated. Caller must show the returned string. */
export function actionError(err: unknown, fallback: string): string {
  return err instanceof Error && err.message.trim() ? err.message : fallback
}
