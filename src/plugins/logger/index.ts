/**
 * @module # logger
 *
 * Built-in logger plugin.
 *
 * Logs outgoing and incoming requests.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { logger } from "@olli/jex/logger"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [logger()],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { logger } from "@olli/jex/logger"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   // Use a specific logger function
 *   plugins: [logger(console.info)],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */

export { type LogFn, logger } from "./logger.ts"
