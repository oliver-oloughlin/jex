import type { Plugin, PluginBeforeInit } from "../../types.ts"

export type ApiKeyAuthOptions = {
  /** The API key used for authentication. */
  apiKey: string

  /**
   * Name of the API key in header/query.
   *
   * @default "X-API-KEY"
   */
  apiKeyName?: string

  /** The app ID used for authenticaation. */
  appId?: string

  /**
   * Name of the app ID in header/query.
   *
   * @default "X-APP-ID"
   */
  appIdName?: string

  /**
   * Strategy used to send the API key with requests.
   *
   * @default "headers"
   */
  strategy?: ApiKeyStrategy
}

/** Strategy for sending API key information with requets. */
export type ApiKeyStrategy = "headers" | "query"

/**
 * API key authentication plugin.
 *
 * @param options - API key authentication options.
 * @returns A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { apiKeyAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [apiKeyAuth({ apiKey: "secret_key" })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { apiKeyAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [apiKeyAuth({
 *     apiKey: "secret_key",
 *     apiKeyName: "X-API-KEY", // default
 *     appId: "my-app",
 *     appIdName: "X-APP-ID", // default
 *     strategy: "query" // default = "headers"
 *   })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function apiKeyAuth(options: ApiKeyAuthOptions): Plugin {
  return new ApiKeyAuth(options)
}

class ApiKeyAuth implements Plugin {
  private options: ApiKeyAuthOptions

  constructor(options: ApiKeyAuthOptions) {
    this.options = options
  }

  before(): PluginBeforeInit | void | Promise<PluginBeforeInit | void> {
    const info = {
      [this.options.apiKeyName ?? "X-API-KEY"]: this.options.apiKey,
      ...(this.options.appId
        ? {
          [this.options.appIdName ?? "X-APP-ID"]: this.options.appId,
        }
        : undefined),
    }

    const strategy = this.options.strategy ?? "headers"
    return strategy === "headers" ? { headers: info } : { query: info }
  }
}
