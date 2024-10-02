import type { HttpStatusCode } from "../../http_status_code.ts"
import type {
  Fetcher,
  Method,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
} from "../../types.ts"
import { brightWhite, green, red, rgb24, yellow } from "@std/fmt/colors"

const SUCCESS_LIGHT_RGB = { r: 175, g: 215, b: 190 }
const WARNING_LIGHT_RGB = { r: 205, g: 205, b: 170 }
const ERROR_LIGHT_RGB = { r: 220, g: 180, b: 180 }

/** Logger function, prints the provided arguments. */
export type LogFn = (...data: unknown[]) => void

/** Options for logger. */
export type LoggerOptions = {
  /**
   * Logger function, prints the provided arguments.
   *
   * @default console.info()
   */
  fn?: LogFn

  /**
   * Whether to include the query or not when printing the URL.
   *
   * `true` by default.
   *
   * @default true
   */
  query?: boolean

  /**
   * Whether to include the origin when printing the URL.
   *
   * `true` by default.
   *
   * @default true
   */
  origin?: boolean

  /**
   * Whether to include the status text or not when printing responses.
   *
   * `false` by default.
   *
   * @default false
   */
  statusText?: boolean
}

/**
 * Logger plugin.
 *
 * Logs outgoing requests and incoming responses.
 *
 * @param fn - Optional logger function.
 * @returns - A plugin object.
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
export function logger(options?: LoggerOptions): Plugin {
  return new Logger(options)
}

class Logger implements Plugin {
  private fn: LogFn
  private query: boolean
  private origin: boolean
  private statusText: boolean
  private reqTimestampMap: Map<string, number>

  constructor(options?: LoggerOptions) {
    // deno-lint-ignore no-console
    this.fn = options?.fn ?? console.info
    this.query = options?.query ?? true
    this.origin = options?.origin ?? true
    this.statusText = options?.statusText ?? false
    this.reqTimestampMap = new Map()
  }

  before(ctx: PluginBeforeContext<Fetcher>) {
    this.reqTimestampMap.set(ctx.id, Date.now())
    const url = this.urlToString(ctx.url)
    const method = this.methodToString(ctx.method)
    const text = `--> ${method} ${url}`
    this.fn(text)
  }

  after(ctx: PluginAfterContext<Fetcher>) {
    const ms = this.deltaMsToString(ctx.id)
    const url = this.urlToString(ctx.url)
    const status = this.statusToString(ctx.res.status, ctx.res.statusText)
    const method = this.methodToString(ctx.method)
    const text = `<-- ${method} ${status} ${ms} ${url}`
    this.fn(text)
  }

  private urlToString(url: string) {
    let urlStr = url
    try {
      const parsed = new URL(url)
      if (this.origin) urlStr += parsed.origin
      urlStr += parsed.pathname
      if (this.query) urlStr += parsed.search
      return urlStr
    } catch (_) {
      if (!this.query) {
        const [host, _] = urlStr.split("?")
        urlStr = host
      }
    }
    return urlStr
  }

  private methodToString(method: Method) {
    return method.toUpperCase()
  }

  private statusToString(status: HttpStatusCode, statusText: string) {
    const statusStr = status.toString()

    const type = statusStr.startsWith("2")
      ? "success"
      : statusStr.startsWith("4")
      ? "error"
      : "warning"

    const statusFmt = type === "success"
      ? green(statusStr)
      : type === "error"
      ? red(statusStr)
      : yellow(statusStr)

    const rgb = type === "success"
      ? SUCCESS_LIGHT_RGB
      : type === "error"
      ? ERROR_LIGHT_RGB
      : WARNING_LIGHT_RGB

    const statusTextStr = this.statusText ? ` ${statusText}` : ""
    const statusTextFmt = rgb24(statusTextStr, rgb)

    return `${statusFmt}${statusTextFmt}`
  }

  private deltaMsToString(reqId: string) {
    const timestamp = this.reqTimestampMap.get(reqId)
    this.reqTimestampMap.delete(reqId)
    const deltaMs = Math.max(0, Date.now() - (timestamp ?? Number.MAX_VALUE))
    return brightWhite(`${deltaMs}ms`)
  }
}
