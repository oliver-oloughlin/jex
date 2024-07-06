import type { Plugin, PluginBeforeInit } from "../../types.ts"

/**
 * Bearer (token) authentication plugin.
 *
 * @param token - Bearer token.
 * @returns - A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { bearerAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [bearerAuth("super_secret_token")],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function bearerAuth(token: string): Plugin {
  return new BearerAuth(token)
}

class BearerAuth implements Plugin {
  private token: string

  constructor(token: string) {
    if (token.toLowerCase().includes("bearer")) this.token = token
    else this.token = `Bearer ${token}`
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
