import type { Plugin } from "../../src/types.ts"

export type BasicAuthOptions = {
  username: string
  password: string
}

export function basicAuth(options: BasicAuthOptions) {
  return new BasicAuth(options)
}

export class BasicAuth implements Plugin {
  private token: string

  constructor({
    username,
    password,
  }: BasicAuthOptions) {
    const encoded = btoa(`${username}:${password}`)
    this.token = `Basic ${encoded}`
  }

  before() {
    return {
      headers: {
        Authorization: this.token,
      },
    }
  }
}
