/********************/
/*                  */
/*   CONFIG TYPES   */
/*                  */
/********************/

export type ClientConfig<
  TResourceConfigs extends ResourceRecord<FetcherInit<TFetcher>>,
  TFetcher extends Fetcher,
> = {
  baseUrl: string
  resources: TResourceConfigs
  logger?: Logger
  fetcher?: TFetcher
  plugins?: Plugin<FetcherInit<TFetcher>>[]
}

export type ResourceRecord<TInit extends RequestInit> = {
  [K in string]: ResourceConfig<TInit>
}

export type ResourceConfig<TInit extends RequestInit> = {
  path: string
  actions: ActionsRecord<TInit>
  plugins?: Plugin<TInit>[]
}

export type ActionsRecord<TInit extends RequestInit> = {
  get?: BodylessActionConfig<TInit>
  head?: BodylessActionConfig<TInit>
  post?: BodyfullActionConfig<TInit>
  delete?: BodyfullActionConfig<TInit>
  patch?: BodyfullActionConfig<TInit>
  put?: BodyfullActionConfig<TInit>
  options?: BodyfullActionConfig<TInit>
}

export type BodylessActionConfig<TInit extends RequestInit> = {
  data?: Schema<any>
  dataSource?: "json" | "text" | "blob" | "arrayBuffer" | "bytes" | "formData"
  query?: Schema<any>
  plugins?: Plugin<TInit>[]
}

export type BodyfullActionConfig<TInit extends RequestInit> =
  & BodylessActionConfig<TInit>
  & {
    body?: Schema<any>
    bodySource?: "json" | "raw" | "URLSearchParameters" | "FormData"
  }

export type ActionConfig<TInit extends RequestInit> =
  | BodylessActionConfig<TInit>
  | BodyfullActionConfig<TInit>

/********************/
/*                  */
/*   CLIENT TYPES   */
/*                  */
/********************/

export type Client<
  TResourceConfigs extends ResourceRecord<TInit>,
  TInit extends RequestInit,
> = {
  [K in keyof TResourceConfigs]: Resource<TResourceConfigs[K], TInit>
}

export type Resource<
  TResourceConfig extends ResourceConfig<TInit>,
  TInit extends RequestInit,
> = {
  [K in KeysOfThatDontExtend<TResourceConfig["actions"], undefined>]:
    TResourceConfig["actions"][K] extends ActionConfig<TInit> ? Action<
        PathParams<TResourceConfig["path"]>,
        TResourceConfig["actions"][K],
        TInit
      >
      : never
}

export type Action<
  TPathParams extends PathParams<any>,
  TActionConfig extends ActionConfig<TInit>,
  TInit extends RequestInit,
> = IsOptionalObject<ActionArgs<TPathParams, TActionConfig, TInit>> extends true
  ? (
    args?: ActionArgs<TPathParams, TActionConfig, TInit>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any> ? TypeOf<TActionConfig["data"]>
        : null
    >
  >
  : (
    args: ActionArgs<TPathParams, TActionConfig, TInit>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any> ? TypeOf<TActionConfig["data"]>
        : null
    >
  >

export type Result<T> =
  & {
    raw?: Response
    statusText?: string
    status?: number
  }
  & ({
    success: true
    data: T
  } | {
    success: false
    data: null
    error: unknown
  })

export type ActionArgs<
  TPathParams extends PathParams<any>,
  TActionConfig extends ActionConfig<TInit>,
  TInit extends RequestInit,
> =
  & (IsOptionalObject<
    WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
  > extends false
    ? WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
    : { init?: StrippedRequestInit<TInit> })
  & (TActionConfig["query"] extends Schema<any>
    ? WithOptionalProperty<{ query: TypeOf<TActionConfig["query"]> }>
    : { init?: StrippedRequestInit<TInit> })
  & (TActionConfig extends BodyfullActionConfig<TInit>
    ? (TActionConfig["body"] extends Schema<any>
      ? WithOptionalProperty<{ body: TypeOf<TActionConfig["body"]> }>
      : { init?: StrippedRequestInit<TInit> })
    : { init?: StrippedRequestInit<TInit> })
  & { init?: StrippedRequestInit<TInit> }

/*********************/
/*                   */
/*   UTILITY TYPES   */
/*                   */
/*********************/

export type PossibleActionArgs = ActionArgs<
  "param",
  { query: Schema<Record<string, never>>; body: Schema<Record<string, never>> },
  RequestInit
>

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

export type DataSource = "json" | "text"

export type Schema<TData> = {
  parse(data: unknown): TData
}

export type TypeOf<TSchema extends Schema<any>> = ReturnType<TSchema["parse"]>

export type LogFn = (...data: unknown[]) => void

export type Logger = {
  log: LogFn
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

export type FetcherInit<TFetcher extends Fetcher> = Exclude<
  Parameters<TFetcher>["1"],
  undefined
>

export type Plugin<TInit extends RequestInit> = {
  before?(
    ctx: PluginBeforeContext<TInit>,
  ):
    | StrippedRequestInit<TInit>
    | Promise<StrippedRequestInit<TInit>>
    | void
    | Promise<void>
  after?(
    ctx: PluginAfterContext<TInit>,
  ):
    | Response
    | Promise<Response>
    | void
    | Promise<void>
}

export type PluginBeforeContext<TInit extends RequestInit> = {
  path: string
  method: string
  init: TInit
  args?: PossibleActionArgs
}

export type PluginAfterContext<TInit extends RequestInit> =
  & PluginBeforeContext<TInit>
  & {
    res: Response
    refetch(init: StrippedRequestInit<TInit>): Promise<Response>
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
