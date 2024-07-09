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
 * ```
 *
 * ## Bearer Auth
 *
 * Bearer (token) authentication.
 *
 * @example
 * ```ts
 * import { jex } from "@olli/jex"
 * import { bearerAuth } from "@olli/jex/auth"
 *
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   // Static token
 *   plugins: [bearerAuth({ token: "super_secret_token" })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * import { jex, schema } from "@olli/jex"
 * import { bearerAuth } from "@olli/jex/auth"
 *
 * // Dynamic token using basic auth
 * const client = jex({
 *   baseUrl: "https://domain.com/api",
 *   plugins: [bearerAuth({
 *     tokenUrl: "https://domain.com/api/token",
 *     tokenSchema: schema<{ token: string, expiresAt: number }>(),
 *     mapper: (data) => data.token,
 *     validator: (data) => data.expiresAt > Date.now(),
 *     credentials: {
 *       username: "olli",
 *       password: "banana123",
 *     }
 *   })],
 *   endpoints: {
 *     // ...
 *   },
 * })
 * ```
 */

export { basicAuth } from "./basic.ts"
export {
  bearerAuth,
  type BearerAuthOptions,
  type DynamicBearerAuthOptions,
  type StaticBearerAuthOptions,
} from "./bearer.ts"
