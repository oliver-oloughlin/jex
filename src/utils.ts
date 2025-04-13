export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function safeAwait<T>(data: T | Promise<T>): Promise<T> {
  if (data instanceof Promise) {
    return await data
  }

  return data
}

export function stringifyEntries(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, val.toString()]),
  )
}
