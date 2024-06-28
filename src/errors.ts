export class HttpError extends Error {
  readonly name = "HttpError"

  constructor(status: number, statusText: string) {
    super(`${status} ${statusText}`)
  }
}
