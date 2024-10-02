/********************/
/*                  */
/*   CONFIG TYPES   */
/*                  */
/********************/

import type { HttpStatusCode } from "./http_status_code.ts"

/** API client configuration. */
export type ClientConfig<
  TEndpointRecord extends EndpointRecord<TFetcher>,
  TFetcher extends Fetcher,
> = {
  /**
   * Base API url.
   *
   * @example "https://domain.com/api"
   * @default "/"
   */
  baseUrl?: string

  /** Record of configured HTTP endpoints */
  endpoints: TEndpointRecord

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

/** Record of endpoints configurations. */
export type EndpointRecord<TFetcher extends Fetcher = Fetcher> = {
  [K in string]: EndpointConfig<TFetcher>
}

type BodylessMethod = "get" | "head"

type BodyfullMethod = "post" | "delete" | "patch" | "put" | "options"

/** HTTP method. */
export type Method = BodylessMethod | BodyfullMethod

/** API endpoint configuration. */
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

/** API action configuration without body.  */
export type BodylessActionConfig<TFetcher extends Fetcher = Fetcher> = {
  /**
   * Schema for data that is returned by this action.
   *
   * If no data schema is specified, the action will return null for the data field.
   */
  data?: Schema<any, any>

  /**
   * Source from which to extract data from the response.
   *
   * Is `json` by default.
   *
   * @default "json"
   */
  dataSource?: "json" | "text" | "blob" | "arrayBuffer" | "formData"

  /**
   * Schema for the query that this action takes as argument.
   *
   * If no query schema is specified, the action will not expect a query argument.
   */
  query?: Schema<any, any>

  /** List of plugins that will be applied for this action */
  plugins?: Plugin<TFetcher>[]

  /**
   * Schema for the headers that this action takes as argument.
   *
   * If no headers schema is specified, the action will not expect a headers argument.
   */
  headers?: Schema<any, any>
}

/** API action configuration with body.  */
export type BodyfullActionConfig<TFetcher extends Fetcher = Fetcher> =
  & BodylessActionConfig<TFetcher>
  & {
    /**
     * Schema for the body that this action takes as argument.
     *
     * If no body schema is specified, the action will not expect a body argument.
     */
    body?: Schema<any, any>

    /**
     * Source in which the body will be sent.
     *
     * Is `json` by default.
     *
     * @default "json"
     */
    bodySource?: "json" | "raw" | "URLSearchParameters" | "FormData"
  }

/** API action configuration.  */
export type ActionConfig<TFetcher extends Fetcher = Fetcher> =
  | BodylessActionConfig<TFetcher>
  | BodyfullActionConfig<TFetcher>

/********************/
/*                  */
/*   CLIENT TYPES   */
/*                  */
/********************/

/** API client, containing configured endpoints. */
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

/** API endpoint, containing configured actions. */
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

/** API action, taking arguments based on configuration. */
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
        ? Output<TActionConfig["data"]>
        : null
    >
  >
  : (
    args: ActionArgs<TPathParams, TActionConfig, TFetcher>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any, any>
        ? Output<TActionConfig["data"]>
        : null
    >
  >

/**
 * API action result.
 *
 * Contains the expected data if successful, or an error if not.
 */
export type Result<T> =
  & {
    /** The raw response object returned by the fetch call. */
    raw?: Response

    /** HTTP status text. */
    statusText?: string

    /** HTTP status code. */
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

type ParseArg<
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
type EmptyObject = typeof __EMPTY_OBJECT__

/** The possible arguments that an API action might expect. */
export type PossibleActionArgs = {
  query?: Record<string, string>
  body?: Record<string, string>
  headers?: Record<string, string>
  params?: Record<string, string>
  init?: RequestInit
}

type WithOptionalProperty<T> = IsOptionalObject<T[keyof T]> extends true
  ? { [Key in keyof T]?: T[Key] }
  : { [Key in keyof T]: T[Key] }

type IsOptionalObject<T> = IsEmptyObject<RequiredProperties<T>>

type RequiredProperties<T> = {
  [K in KeysOfThatNeverExtend<T, undefined>]: T[K]
}

type IsEmptyObject<T> = [keyof T] extends [never] ? true : false

type KeysOfThatDontExtend<T1, T2> = keyof {
  [K in keyof T1 as T1[K] extends T2 ? never : K]: unknown
}

type KeysOfThatNeverExtend<T1, T2> = keyof {
  [
    K in keyof T1 as HasMembersExtending<T1[K], T2> extends true ? never
      : K
  ]: unknown
}

type HasMembersExtending<T1, T2> = Extract<T1, T2> extends never ? false
  : true

/** Source of response data. */
export type DataSource =
  | "json"
  | "text"
  | "blob"
  | "arrayBuffer"
  | "formData"

/** Source of request body. */
export type BodySource = "json" | "raw" | "URLSearchParameters" | "FormData"

/** Data schema. */
export type Schema<TInput, TOutput> = {
  /**
   * Parse function that takes data as argument and returns the parsed output.
   *
   * Can throw an error if parse fails.
   */
  parse(data: unknown): TOutput

  /** Transform function that takes input as argument and returns the output type. */
  _transform?(input: TInput): TOutput

  /** Used to infer the input type. */
  _input: TInput
}

type Output<TSchema extends Schema<any, any>> = ReturnType<
  TSchema["parse"]
>

type Input<TSchema extends Schema<any, any>> = TSchema["_input"]

/**
 * Fetcher function that sends a request and returns a response.
 *
 * @param url - Relative or absolute URL of HTTP endpoint.
 * @param init - Request options.
 */
export type Fetcher = (
  url: string | URL,
  init?: RequestInit,
) => Response | Promise<Response>

/** Available request options for fetcher function. */
export type FetcherInit<TFetcher extends Fetcher = Fetcher> = Exclude<
  Parameters<TFetcher>["1"],
  undefined
>

/**
 * A plugin object that can be provided to either a client, endpoint, or action.
 */
export type Plugin<TFetcher extends Fetcher = Fetcher> = {
  /**
   * Runs before a request is sent.
   *
   * Can return either void or a PluginBeforeInit object.
   *
   * @param ctx - Context object from before a request is sent.
   */
  before?(
    ctx: PluginBeforeContext<TFetcher>,
  ):
    | PluginBeforeInit
    | void
    | Promise<PluginBeforeInit | void>

  /**
   * Runs after a response is received.
   *
   * Can return either void or a response object.
   *
   * @param ctx - Context object from after a response is received.
   */
  after?(
    ctx: PluginAfterContext<TFetcher>,
  ):
    | Response
    | void
    | Promise<Response | void>
}

/** Options that can be applied before a request is sent */
export type PluginBeforeInit<TFetcher extends Fetcher = Fetcher> =
  & StrippedRequestInit<FetcherInit<TFetcher>>
  & {
    query?: Record<string, string>
  }

/** Context object from before a request is sent. */
export type PluginBeforeContext<TFetcher extends Fetcher = Fetcher> = {
  id: string
  client: ClientConfig<EndpointRecord<TFetcher>, TFetcher>
  endpoint: EndpointConfig<TFetcher>
  action: ActionConfig<TFetcher>
  url: string
  method: Method
  init: StrippedRequestInit<FetcherInit<TFetcher>>
  args?: PossibleActionArgs
}

/** Context object from after a response is received. */
export type PluginAfterContext<TFetcher extends Fetcher = Fetcher> =
  & PluginBeforeContext<TFetcher>
  & {
    res: Response
    refetch(
      init?: StrippedRequestInit<FetcherInit<TFetcher>>,
    ): Promise<Response>
  }

/** Path parameters extracted from given path. */
export type PathParams<TPath extends string> = TPath extends
  `${infer A}/${infer B}` ? ParsePathParam<A> | PathParams<B>
  : ParsePathParam<TPath>

type ParsePathParam<TPathPart extends string> = TPathPart extends
  `<${infer Param}>` ? Param
  : TPathPart extends `[${infer Param}]` ? Param
  : TPathPart extends `{${infer Param}}` ? Param
  : TPathPart extends `:${infer Param}` ? Param
  : never

/** Request options without method and body. */
export type StrippedRequestInit<TInit extends RequestInit> = Omit<
  TInit,
  "method"
>
