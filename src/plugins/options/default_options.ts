import type { Fetcher, Plugin, PluginBeforeInit } from "../../types.ts"

/**
 * Default options plugin.
 *
 * Set default request options that will always be applied for the given plugin scope unless overridden.
 *
 * @param options - Request options.
 * @returns A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { defaultOptions } from "@olli/jex/options"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [defaultOptions({
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
export function defaultOptions<TFetcher extends Fetcher = Fetcher>(
  options: PluginBeforeInit<TFetcher>,
): Plugin<TFetcher> {
  return new DefaultOptions(options)
}

class DefaultOptions<TFetcher extends Fetcher> implements Plugin<TFetcher> {
  name = "@olli/kvdex/plugins/init/default-options"

  private options: PluginBeforeInit<TFetcher>

  constructor(options: PluginBeforeInit<TFetcher>) {
    this.options = options
  }

  before(): PluginBeforeInit<TFetcher> {
    return this.options
  }
}
