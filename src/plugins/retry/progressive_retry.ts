import { RETRYABLE_HTTP_STATUS_CODES } from "../../http_status_code.ts"
import type { Fetcher, Plugin, PluginAfterContext } from "../../types.ts"
import { sleep } from "../../utils.ts"

export function retryList(retries: number[]): RetryList {
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
