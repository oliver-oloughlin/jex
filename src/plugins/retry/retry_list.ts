import { RETRYABLE_HTTP_STATUS_CODES } from "../../http_status_code.ts"
import type { Fetcher, Plugin, PluginAfterContext } from "../../types.ts"
import { sleep } from "../../utils.ts"

/**
 * Retry list plugin.
 *
 * Wait and retry requests based on specified retry list.
 *
 * @param retries - List of retries and specified delays.
 * @returns - A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { retryList } from "@olli/jex/retry"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   // Retry up to 3 times, waiting 500ms, then 1000ms and then 3000ms
 *   plugins: [retryList([500, 1000, 3000])],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function retryList(retries: number[]): Plugin {
  return new RetryList(retries)
}

class RetryList implements Plugin {
  private retries: number[]

  constructor(retries: number[]) {
    this.retries = retries
  }

  async after(ctx: PluginAfterContext<Fetcher>): Promise<Response> {
    // Return response if successful or not retryable
    if (ctx.res.ok || !RETRYABLE_HTTP_STATUS_CODES.includes(ctx.res.status)) {
      return ctx.res
    }

    for (const ms of this.retries) {
      await sleep(ms)
      const res = await ctx.refetch()
      if (res.ok || !RETRYABLE_HTTP_STATUS_CODES.includes(ctx.res.status)) {
        return res
      }
    }

    return ctx.res
  }
}
