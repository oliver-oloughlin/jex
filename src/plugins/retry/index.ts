/**
 * @module # Retry
 *
 * Built-in retry plugins.
 *
 * ## Retry List
 *
 * Wait and retry based on specified retry list.
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

export { retryList } from "./progressive_retry.ts"
