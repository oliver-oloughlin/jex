import type { Plugin } from "../../types.ts"
import { sleep } from "../../utils.ts"

/**
 * Fixed throttle plugin.
 *
 * Throttle requests based on a fixed interval.
 *
 * @param interval - Throttle interval in milliseconds.
 * @returns - A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { fixedThrottle } from "@olli/jex/throttle"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   // Send requests with a minimum of 500ms interval between them
 *   plugins: [fixedThrottle(500)],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function fixedThrottle(interval: number): Plugin {
  return new FixedThrottle(interval)
}

class FixedThrottle implements Plugin {
  private interval: number
  private previousTimestamp: number
  private waiting: number

  constructor(interval: number) {
    this.interval = interval
    this.previousTimestamp = Date.now() - interval
    this.waiting = 0
  }

  async before(): Promise<void> {
    this.waiting += 1
    const now = Date.now()
    const diff = now - this.previousTimestamp
    const sleepMs = this.interval * this.waiting - diff
    this.previousTimestamp = now
    if (sleepMs > 0) await sleep(sleepMs)
    this.previousTimestamp = Date.now()
    this.waiting -= 1
  }
}
