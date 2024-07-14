import type { Plugin } from "../../types.ts"
import { sleep } from "../../utils.ts"

/** A unit of time. */
export type TimeUnit = "ms" | "s" | "min" | "h" | "d" | "week" | "month"

/**
 * A request rate limit.
 *
 * Noted as a number divided by a unit of time.
 *
 * @example "10/s"
 *
 * @example "100/min"
 *
 * @example "10000/day"
 *
 * @example "500000/month"
 */
export type Rate = `${number}/${TimeUnit}`

/**
 * Rate throttle plugin.
 *
 * Throttle requests based on a request rate limit.
 *
 * @param rate - Request rate limit, noted as a number divided by a unit of time.
 * @returns - A plugin object.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { rateThrottle } from "@olli/jex/throttle"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   // Throttles requests to 100 per minute
 *   plugins: [rateThrottle("100/min")],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */
export function rateThrottle(rate: Rate): Plugin {
  return new RateThrottle(rate)
}

const MS_MULTIPLIER_MAP: Record<TimeUnit, number> = {
  ms: 1,
  s: 1_000,
  min: 1_000 * 60,
  h: 1_000 * 60 * 60,
  d: 1_000 * 60 * 60 * 24,
  week: 1_000 * 60 * 60 * 24 * 7,
  month: 1_000 * 60 * 60 * 24 * 31,
}

class RateThrottle implements Plugin {
  private windowLimit: number
  private windowMs: number
  private windowTimestamp: number
  private windowCount: number
  private waiting: number

  constructor(rate: Rate) {
    const [windowLimitStr, unit] = rate.split("/")
    const windowLimit = parseInt(windowLimitStr)
    const windowMs = MS_MULTIPLIER_MAP[unit as TimeUnit]

    if (windowLimit <= 0 || Number.isNaN(windowLimit)) {
      throw new Error("Rate must be a valid number greater than 0")
    }

    if (!unit) {
      throw new Error("Rate must be in the format <number/unit>")
    }

    if (!windowMs) {
      throw new Error("Rate unit must be a valid TimeUnit")
    }

    this.windowLimit = windowLimit
    this.windowMs = windowMs
    this.windowTimestamp = 0
    this.windowCount = 0
    this.waiting = 0
  }

  async before() {
    const now = Date.now()
    const diff = now - this.windowTimestamp
    if (this.windowCount <= 0 || diff >= this.windowMs) {
      this.windowTimestamp = Date.now()
      this.windowCount = 0
    }

    if (this.windowCount >= this.windowLimit) {
      const msUntilNextWidnow = this.windowTimestamp + this.windowMs - now
      const waitingWinows = Math.floor(this.waiting / this.windowLimit)
      const sleepMs = msUntilNextWidnow + waitingWinows * this.windowMs

      this.waiting++
      await sleep(sleepMs)
      this.waiting--
    }

    this.windowCount++
  }
}
