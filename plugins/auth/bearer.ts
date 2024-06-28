import type { Plugin } from "../../src/types.ts"

export function bearer(token: string) {
  return new BearerAuth(token)
}

export class BearerAuth implements Plugin {
  private token: string

  constructor(token: string) {
    if (token.toLowerCase().includes("bearer")) this.token = token
    else this.token = `Bearer ${token}`
  }

  before() {
    return {
      headers: {
        Authorization: this.token,
      },
    }
  }
}
