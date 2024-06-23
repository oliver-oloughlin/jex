export class HttpError extends Error {
  name: string = "HttpError"

  constructor(status: number, statusText: string) {
    super(`${status} ${statusText}`)
  }
}
