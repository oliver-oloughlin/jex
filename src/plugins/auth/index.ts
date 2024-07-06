/**
 * @module # auth
 *
 * Built-in authentication plugins.
 *
 * ## Basic Auth
 *
 * Basic authentication with username and password.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { basicAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [basicAuth({ username: "user", password: "pass" })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 *
 * ## Bearer Auth
 *
 * Bearer/Token authentication using a bearer token.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { bearerAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [bearerAuth("super_secret_token")],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */

export { basicAuth } from "./basic.ts"
export { bearerAuth } from "./bearer.ts"
