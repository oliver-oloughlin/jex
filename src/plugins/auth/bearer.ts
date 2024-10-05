import { encodeBase64 } from "jsr:@std/encoding@^1.0.0/base64"
import type {
  DataSource,
  Fetcher,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PluginBeforeInit,
  Schema,
} from "../../types.ts"
import { HttpStatusCode } from "../../http_status_code.ts"

export type BearerAuthOptions<TData, TToken> =
  | StaticBearerAuthOptions
  | DynamicBearerAuthOptions<TData, TToken>

export type StaticBearerAuthOptions = {
  /** A static bearer token. */
  token: string
}

export type DynamicBearerAuthOptions<TData, TToken> = {
  /** Absolute URL of where to fetch the bearer token from. */
  tokenUrl: string

  /** Schema of token data. */
  tokenSchema?: Schema<TData, TToken>

  /**
   * What source to extract the token data from the response.
   *
   * Can either be a data source, or function that takes the response as argument and returns the token data.
   *
   * @default "json"
   */
  tokenSource?: DataSource | ((res: Response) => TData | Promise<TData>)

  /** Request options.
   *
   * Can be used to set the token request body, method, or other options that need to be overriden.
   */
  init?: RequestInit

  /** Credentials for basic authentication based server login. */
  credentials?: {
    username: string
    password: string
  }

  /**
   * Mapper function from the data returned by the token endpoint to the token string.
   *
   * If not specified, the returned data is used directly as the token.
   */
  mapper?: (token: TToken) => string

  /**
   * Validator function for validating if the current token is still valid or not.
   *
   * If specified, tokens are validated before new requests are made, and are refreshed if the validator returns `false`.
   */
  validator?: (token: TToken) => boolean
}

/**
 * Bearer (token) authentication plugin.
 *
 * @param token - Bearer token.
 * @returns - A plugin object.
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
 * // Dynamic token with basic auth
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
export function bearerAuth<TData, TToken>(
  options: BearerAuthOptions<TData, TToken>,
): Plugin {
  return new BearerAuth(options)
}

type StaticStrategy = {
  strategy: "static"
  token: string
}

type DynamicStrategy<TData, TToken> = {
  strategy: "dynamic"
  basic: string | null
} & Omit<DynamicBearerAuthOptions<TData, TToken>, "credentials">

class BearerAuth<TData, TToken> implements Plugin {
  private dynamicToken: TToken | null
  private options: StaticStrategy | DynamicStrategy<TData, TToken>

  constructor(options: BearerAuthOptions<TData, TToken>) {
    this.dynamicToken = null

    if ((options as StaticBearerAuthOptions).token) {
      this.options = {
        strategy: "static",
        token: parseToken((options as StaticBearerAuthOptions).token),
      }
    } else {
      const opts = options as DynamicBearerAuthOptions<TData, TToken>
      this.options = {
        strategy: "dynamic",
        ...opts,
        basic: opts.credentials
          ? encodeBase64(
            `${opts.credentials.username}:${opts.credentials.password}`,
          )
          : null,
      }
    }
  }

  async before(ctx: PluginBeforeContext<Fetcher>): Promise<PluginBeforeInit> {
    return {
      headers: {
        Authorization: await this.getToken(ctx.client.fetcher ?? fetch),
      },
    }
  }

  async after(
    ctx: PluginAfterContext<Fetcher>,
  ): Promise<Response | void> {
    const isRetryable = this.options.strategy === "dynamic" &&
        !ctx.res.ok &&
        ctx.res.status === HttpStatusCode.Unauthorized ||
      ctx.res.status === HttpStatusCode.Forbidden

    if (!isRetryable) return

    return await ctx.refetch({
      headers: {
        Authorization: await this.getToken(ctx.client.fetcher ?? fetch),
      },
    })
  }

  private async getToken(fetcher: Fetcher) {
    if (this.options.strategy === "static") return this.options.token

    // If no valid token, fetch dynamic token
    if (
      !this.dynamicToken ||
      this.options.validator?.(this.dynamicToken) === false
    ) {
      const headers = {
        ...this.options.init?.headers,
        ...(this.options.basic ? { Authorization: this.options.basic } : {}),
      }

      const res = await fetcher(this.options.tokenUrl, {
        ...this.options.init,
        headers,
      })

      const tokenSource = this.options.tokenSource ?? "json"

      const data = typeof tokenSource === "function"
        ? await tokenSource(res)
        : await res[tokenSource]()

      this.dynamicToken = this.options.tokenSchema?._transform?.(data) ??
        this.options.tokenSchema?.parse(data) ??
        data
    }

    // Return mapped and parsed token
    const token = this.options.mapper?.(this.dynamicToken!) ?? this.dynamicToken
    return parseToken(token?.toString() ?? "")
  }
}

function parseToken(token: string) {
  return token.toLowerCase().includes("bearer") ? token : `Bearer ${token}`
}
