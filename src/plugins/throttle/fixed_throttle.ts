import type { Plugin } from "../../types.ts"
import { sleep } from "../../utils.ts"

export function fixedThrottle(interval: number): FixedThrottle {
  return new FixedThrottle(interval)
}

/**
 * A fixed minimum delay between requests.
 *
 * Ignores time spent completing requests.
 */
class FixedThrottle implements Plugin {
  private interval: number
  private previousTimestamp: number
  private waiting: number

  /**
   * @param interval - Fixed interval in milliseconds, guarantees a minimum delay between requests.
   */
  constructor(interval: number) {
    this.interval = interval
    this.previousTimestamp = 0
    this.waiting = 0
  }

  async before(): Promise<void> {
    // Calculate current sleep time in milliseconds
    const now = Date.now()
    const diff = now - this.previousTimestamp
    this.previousTimestamp = now
    const sleepMs = this.interval * (1 + this.waiting) - diff

    // Sleep if time is greater than zero
    if (sleepMs > 0) {
      this.waiting += 1
      await sleep(sleepMs)
      this.waiting -= 1
    }
  }
}
