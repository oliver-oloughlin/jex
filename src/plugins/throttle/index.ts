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
 *   resources: {
 *     // ...
 *   },
 * })
 * ```
 */

export { fixedThrottle } from "./fixed_throttle.ts"
