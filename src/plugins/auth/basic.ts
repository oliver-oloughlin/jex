import type { Plugin, PluginBeforeInit } from "../../types.ts"
import { encodeBase64 } from "@std/encoding/base64"

/** Basic authentication options. */
export type BasicAuthOptions = {
  /** Username as plaintext. */
  username: string

  /** Password as plaintext. */
  password: string
}

/**
 * Basic authentication plugin.
 *
 * @param options - Basic authentication options.
 * @returns A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { basicAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [basicAuth({ username: "user", password: "pass" })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function basicAuth(options: BasicAuthOptions): Plugin {
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
