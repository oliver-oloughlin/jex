import type {
  Fetcher,
  FetcherInit,
  Plugin,
  PluginBeforeInit,
  StrippedRequestInit,
} from "../../types.ts"

/**
 * Default init plugin.
 *
 * Set default request options that will always be applied for the given plugin scope unless overridden.
 *
 * @param init - Request options.
 * @returns A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { defaultInit } from "@olli/jex/init"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [defaultInit({
 *     headers: {
 *       "x-client-id": "my-app"
 *     }
 *   })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function defaultInit<TFetcher extends Fetcher = Fetcher>(
  init: StrippedRequestInit<FetcherInit<TFetcher>>,
): Plugin<TFetcher> {
  return new DefaultInit(init)
}

class DefaultInit<TFetcher extends Fetcher> implements Plugin<TFetcher> {
  private init: StrippedRequestInit<FetcherInit<TFetcher>>

  constructor(init: StrippedRequestInit<FetcherInit<TFetcher>>) {
    this.init = init
  }

  before(): PluginBeforeInit<TFetcher> {
    return {
      init: this.init,
    }
  }
}
