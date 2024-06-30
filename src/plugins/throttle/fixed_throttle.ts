import type { Plugin } from "../../types.ts"
import { sleep } from "../../utils.ts"

export function fixedThrottle(interval: number): FixedThrottle {
  return new FixedThrottle(interval)
}

/**
 * A fixed minimum delay between requests.
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
