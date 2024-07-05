/********************/
/*                  */
/*   CONFIG TYPES   */
/*                  */
/********************/

import type { HttpStatusCode } from "./http_status_code.ts"

export type ClientConfig<
  TEndpointRecord extends EndpointRecord<TFetcher>,
  TFetcher extends Fetcher,
> = {
  /**
   * Base API url.
   *
   * @example "https://domain.com/api"
   */
  baseUrl: string

  /** Record of configured HTTP endpoints */
  endpoints: TEndpointRecord

  /**
   * Logger used for logging outgoing and incoming requests.
   *
   * Is also passed to plugins.
   */
  logger?: Logger

  /**
   * Whether to disable the default logging or not.
   *
   * Is `false` by default.
   *
   * @default false
   */
  disableDefaultLogging?: boolean

  /**
   * Fetcher function used to send HTTP requests.
   *
   * Uses global `fetch()` function by default.
   *
   * @default fetch()
   */
  fetcher?: TFetcher

  /** List of plugins to be applied for every endpoint. */
  plugins?: Plugin<TFetcher>[]

  /**
   * Generator function used to create new request IDs.
   *
   * Uses `ulid()` by default.
   *
   * @default ulid()
   */
  idGenerator?: () => string
}

export type EndpointRecord<TFetcher extends Fetcher = Fetcher> = {
  [K in string]: EndpointConfig<TFetcher>
}

export type BodylessMethod = "get" | "head"

export type BodyfullMethod = "post" | "delete" | "patch" | "put" | "options"

export type Method = BodylessMethod | BodyfullMethod

export type EndpointConfig<TFetcher extends Fetcher = Fetcher> =
  & {
    [K in BodylessMethod]?: BodylessActionConfig
  }
  & {
    [K in BodyfullMethod]?: BodyfullActionConfig
  }
  & {
    plugins?: Plugin<TFetcher>[]
  }

export type BodylessActionConfig<TFetcher extends Fetcher = Fetcher> = {
  data?: Schema<any, any>
  dataSource?: "json" | "text" | "blob" | "arrayBuffer" | "bytes" | "formData"
  query?: Schema<any, any>
  plugins?: Plugin<TFetcher>[]
  headers?: Schema<any, any>
}

export type BodyfullActionConfig<TFetcher extends Fetcher = Fetcher> =
  & BodylessActionConfig<TFetcher>
  & {
    body?: Schema<any, any>
    bodySource?: "json" | "raw" | "URLSearchParameters" | "FormData"
  }

export type ActionConfig<TFetcher extends Fetcher = Fetcher> =
  | BodylessActionConfig<TFetcher>
  | BodyfullActionConfig<TFetcher>

/********************/
/*                  */
/*   CLIENT TYPES   */
/*                  */
/********************/

export type Client<
  TEndpointRecord extends EndpointRecord<TFetcher>,
  TFetcher extends Fetcher = Fetcher,
> = {
  [K in Extract<keyof TEndpointRecord, string>]: Endpoint<
    K,
    TEndpointRecord[K],
    TFetcher
  >
}

export type Endpoint<
  TPath extends string,
  TEndpointConfig extends EndpointConfig<TFetcher>,
  TFetcher extends Fetcher = Fetcher,
> = {
  [
    K in KeysOfThatDontExtend<
      Pick<TEndpointConfig, Extract<keyof TEndpointConfig, Method>>,
      undefined
    >
  ]: TEndpointConfig[K] extends ActionConfig<TFetcher> ? Action<
      PathParams<TPath>,
      TEndpointConfig[K],
      TFetcher
    >
    : never
}

export type Action<
  TPathParams extends PathParams<any>,
  TActionConfig extends ActionConfig<TFetcher>,
  TFetcher extends Fetcher = Fetcher,
> = IsOptionalObject<ActionArgs<TPathParams, TActionConfig, TFetcher>> extends
  true ? (
    args?: ActionArgs<TPathParams, TActionConfig, TFetcher>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any, any>
        ? TypeOf<TActionConfig["data"]>
        : null
    >
  >
  : (
    args: ActionArgs<TPathParams, TActionConfig, TFetcher>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any, any>
        ? TypeOf<TActionConfig["data"]>
        : null
    >
  >

export type Result<T> =
  & {
    raw?: Response
    statusText?: string
    status?: HttpStatusCode
  }
  & ({
    ok: true
    data: T
  } | {
    ok: false
    data: null
    error: unknown
  })

export type ActionArgs<
  TPathParams extends PathParams<any>,
  TActionConfig extends ActionConfig<TFetcher>,
  TFetcher extends Fetcher = Fetcher,
> =
  & (IsOptionalObject<
    WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
  > extends false
    ? WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
    : EmptyObject)
  & ParseArg<TActionConfig, "query">
  & ParseArg<TActionConfig, "headers">
  & (TActionConfig extends BodyfullActionConfig<TFetcher>
    ? ParseArg<TActionConfig, "body">
    : EmptyObject)
  & { init?: StrippedRequestInit<FetcherInit<TFetcher>> }

export type ParseArg<
  T,
  K extends keyof T,
> = T[K] extends Schema<any, any> ? (
    IsEmptyObject<T[K]> extends false ? (
        IsOptionalObject<Input<T[K]>> extends true
          ? { [key in K]?: Input<T[K]> }
          : { [key in K]: Input<T[K]> }
      )
      : EmptyObject
  )
  : EmptyObject

/*********************/
/*                   */
/*   UTILITY TYPES   */
/*                   */
/*********************/

const __EMPTY_OBJECT__ = {}
export type EmptyObject = typeof __EMPTY_OBJECT__

export type PossibleActionArgs = {
  query?: Record<string, string>
  body?: Record<string, string>
  headers?: Record<string, string>
  params?: Record<string, string>
  init?: RequestInit
}

export type WithOptionalProperty<T> = IsOptionalObject<T[keyof T]> extends true
  ? { [Key in keyof T]?: T[Key] }
  : { [Key in keyof T]: T[Key] }

export type IsOptionalObject<T> = IsEmptyObject<RequiredProperties<T>>

export type RequiredProperties<T> = {
  [K in KeysOfThatNeverExtend<T, undefined>]: T[K]
}

export type IsEmptyObject<T> = [keyof T] extends [never] ? true : false

export type KeysOfThatExtend<T1, T2> = keyof {
  [K in keyof T1 as T1[K] extends T2 ? K : never]: unknown
}

export type KeysOfThatDontExtend<T1, T2> = keyof {
  [K in keyof T1 as T1[K] extends T2 ? never : K]: unknown
}

export type KeysOfThatNeverExtend<T1, T2> = keyof {
  [
    K in keyof T1 as HasMembersExtending<T1[K], T2> extends true ? never
      : K
  ]: unknown
}

export type HasMembersExtending<T1, T2> = Extract<T1, T2> extends never ? false
  : true

export type DataSource =
  | "json"
  | "text"
  | "blob"
  | "arrayBuffer"
  | "bytes"
  | "formData"

export type BodySource = "json" | "raw" | "URLSearchParameters" | "FormData"

export type Schema<TInput, TOutput> = {
  parse(data: unknown): TOutput
  _transform?(input: TInput): TOutput
  _input: TInput
}

export type TypeOf<TSchema extends Schema<any, any>> = ReturnType<
  TSchema["parse"]
>

export type Input<TSchema extends Schema<any, any>> = TSchema["_input"]

export type LogFn = (...data: unknown[]) => void

export type Logger = {
  info: LogFn
  warn: LogFn
  trace: LogFn
  debug: LogFn
  error: LogFn
}

export type Fetcher = (
  url: string | URL,
  init?: RequestInit,
) => Promise<Response>

export type FetcherInit<TFetcher extends Fetcher = Fetcher> = Exclude<
  Parameters<TFetcher>["1"],
  undefined
>

export type Plugin<TFetcher extends Fetcher = Fetcher> = {
  /**
   * Runs before a request is sent.
   *
   * Can return either void or a PluginBeforeInit object.
   *
   * @param ctx - Pre-request context.
   */
  before?(
    ctx: PluginBeforeContext<TFetcher>,
  ):
    | PluginBeforeInit
    | Promise<PluginBeforeInit>
    | void
    | Promise<void>

  /**
   * Runs after a response is received.
   *
   * Can return either void or a response object.
   *
   * @param ctx - Post-request context.
   */
  after?(
    ctx: PluginAfterContext<TFetcher>,
  ):
    | Response
    | Promise<Response>
    | void
    | Promise<void>
}

export type PluginBeforeInit<TFetcher extends Fetcher = Fetcher> = {
  init?: FetcherInit<TFetcher>
  query?: Record<string, string>
}

export type PluginBeforeContext<TFetcher extends Fetcher = Fetcher> = {
  id: string
  client: ClientConfig<EndpointRecord<TFetcher>, TFetcher>
  endpoint: EndpointConfig<TFetcher>
  action: ActionConfig<TFetcher>
  url: URL
  method: Method
  init: FetcherInit<TFetcher>
  args?: PossibleActionArgs
}

export type PluginAfterContext<TFetcher extends Fetcher = Fetcher> =
  & PluginBeforeContext<TFetcher>
  & {
    res: Response
    refetch(
      init?: StrippedRequestInit<FetcherInit<TFetcher>>,
    ): Promise<Response>
  }

export type PathParams<TPath extends string> = TPath extends
  `${infer A}/${infer B}` ? ParsePathParam<A> | PathParams<B>
  : ParsePathParam<TPath>

export type ParsePathParam<TPathPart extends string> = TPathPart extends
  `<${infer Param}>` ? Param
  : TPathPart extends `[${infer Param}]` ? Param
  : TPathPart extends `{${infer Param}}` ? Param
  : TPathPart extends `:${infer Param}` ? Param
  : never

export type StrippedRequestInit<TInit extends RequestInit> = Omit<
  TInit,
  "method" | "body"
>
