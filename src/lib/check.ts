export function fail(path: string, expected: string): never {
  throw new Error(`${path} must be ${expected}`)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function str(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'a string')
  return value
}

export function nonempty(value: unknown, path: string): string {
  const next = str(value, path)
  if (!next.trim()) fail(path, 'a non-empty string')
  return next
}

export function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'a finite number')
  return value
}

export function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'a boolean')
  return value
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    fail(path, allowed.join(', '))
  }
  return value as T
}

export function optional<T>(value: unknown, path: string, read: (next: unknown, path: string) => T): T | undefined {
  if (value === undefined) return undefined
  return read(value, path)
}

export function assertStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, 'an array of strings')
  return value.map((item, i) => str(item, `${path}[${i}]`))
}

export function assertNumberList(value: unknown, path: string): number[] {
  if (!Array.isArray(value)) fail(path, 'an array of numbers')
  return value.map((item, i) => num(item, `${path}[${i}]`))
}
