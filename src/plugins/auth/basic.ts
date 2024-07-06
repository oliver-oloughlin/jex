import type { Plugin, PluginBeforeInit } from "../../types.ts"
import { encodeBase64 } from "@std/encoding/base64"

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
    const encoded = encodeBase64(`${username}:${password}`)
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
