export type Result<T> = {
  success: true
  data: T
} | {
  success: false
  error: unknown
}

export async function handled<T>(fn: () => T): Promise<Result<Awaited<T>>> {
  try {
    return {
      success: true,
      data: await fn(),
    }
  } catch (e) {
    return {
      success: false,
      error: e,
    }
  }
}
