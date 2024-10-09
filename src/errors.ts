import type { HttpStatusCode } from "./http_status_code.ts"

export class HttpError extends Error {
  override readonly name = "HttpError"
  readonly status: HttpStatusCode
  readonly statusText: string

  constructor(status: HttpStatusCode, statusText: string) {
    super(`${status} ${statusText}`)
    this.status = status
    this.statusText = statusText
  }
}
