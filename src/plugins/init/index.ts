/**
 * @module # Init
 *
 * Plugins that handle request options.
 *
 * ## Default Init
 *
 * Set default request options that will always be applied for the given plugin scope unless overridden.
 *
 *  @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { defaultInit } from "@olli/jex/init"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [defaultInit({
 *     headers: {
 *       "x-client-id": "my-app"
 *     }
 *   })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */

export { defaultInit } from "./defaultInit.ts"
