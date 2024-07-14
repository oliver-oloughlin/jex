/**
 * @module # Throttle
 *
 * Built-in throttle plugins.
 *
 * ## Fixed Throttle
 *
 * Throttle requests based on a fixed interval.
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
 *
 * ## Rate Throttle
 *
 * Throttle requests based on a request rate limit.
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

export { fixedThrottle } from "./fixed_throttle.ts"
export { type Rate, rateThrottle, type TimeUnit } from "./rate_throttle.ts"
