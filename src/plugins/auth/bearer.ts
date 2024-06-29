import type { Plugin } from "../../types.ts"

export function bearerAuth(token: string): BearerAuth {
  return new BearerAuth(token)
}

class BearerAuth implements Plugin {
  private token: string

  constructor(token: string) {
    if (token.toLowerCase().includes("bearer")) this.token = token
    else this.token = `Bearer ${token}`
  }

  before() {
    return {
      init: {
        headers: {
          Authorization: this.token,
        },
      },
    }
  }
}
