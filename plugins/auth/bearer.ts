import type { Plugin } from "../../src/types.ts"

export type BearerAuthOptions = {
  token: string
}

export class BearerAuth implements Plugin {
  private token: string

  constructor(options: BearerAuthOptions) {
    this.token = `Bearer ${options.token}`
  }

  before() {
    return {
      headers: {
        Authorization: this.token,
      },
    }
  }
}
