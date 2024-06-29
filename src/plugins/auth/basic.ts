import type { Plugin, PluginBeforeInit } from "../../types.ts"

export type BasicAuthOptions = {
  username: string
  password: string
}

export function basicAuth(options: BasicAuthOptions): BasicAuth {
  return new BasicAuth(options)
}

class BasicAuth implements Plugin {
  private token: string

  constructor({
    username,
    password,
  }: BasicAuthOptions) {
    const encoded = btoa(`${username}:${password}`)
    this.token = `Basic ${encoded}`
  }

  before(): PluginBeforeInit {
    return {
      init: {
        headers: {
          Authorization: this.token,
        },
      },
    }
  }
}
