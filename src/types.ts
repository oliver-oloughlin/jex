/********************/
/*                  */
/*   CONFIG TYPES   */
/*                  */
/********************/

export type ClientConfig<
  TResourceConfigs extends ResourceRecord<TFetcher>,
  TFetcher extends Fetcher,
> = {
  baseUrl: string
  resources: TResourceConfigs
  logger?: Logger
  fetcher?: TFetcher
  plugins?: Plugin<TFetcher>[]
}

export type ResourceRecord<TFetcher extends Fetcher> = {
  [K in string]: ResourceConfig<TFetcher>
}

export type ResourceConfig<TFetcher extends Fetcher> = {
  path: string
  actions: ActionsRecord<TFetcher>
  plugins?: Plugin<TFetcher>[]
}

export type ActionsRecord<TFetcher extends Fetcher> = {
  get?: BodylessActionConfig<TFetcher>
  head?: BodylessActionConfig<TFetcher>
  post?: BodyfullActionConfig<TFetcher>
  delete?: BodyfullActionConfig<TFetcher>
  patch?: BodyfullActionConfig<TFetcher>
  put?: BodyfullActionConfig<TFetcher>
  options?: BodyfullActionConfig<TFetcher>
}

export type BodylessActionConfig<TFetcher extends Fetcher> = {
  data?: Schema<any>
  dataSource?: "json" | "text" | "blob" | "arrayBuffer" | "bytes" | "formData"
  query?: Schema<any>
  plugins?: Plugin<TFetcher>[]
}

export type BodyfullActionConfig<TFetcher extends Fetcher> =
  & BodylessActionConfig<TFetcher>
  & {
    body?: Schema<any>
    bodySource?: "json" | "raw" | "URLSearchParameters" | "FormData"
  }

export type ActionConfig<TFetcher extends Fetcher> =
  | BodylessActionConfig<TFetcher>
  | BodyfullActionConfig<TFetcher>

/********************/
/*                  */
/*   CLIENT TYPES   */
/*                  */
/********************/

export type Client<
  TResourceConfigs extends ResourceRecord<TFetcher>,
  TFetcher extends Fetcher,
> = {
  [K in keyof TResourceConfigs]: Resource<TResourceConfigs[K], TFetcher>
}

export type Resource<
  TResourceConfig extends ResourceConfig<TFetcher>,
  TFetcher extends Fetcher,
> = {
  [K in KeysOfThatDontExtend<TResourceConfig["actions"], undefined>]:
    TResourceConfig["actions"][K] extends ActionConfig<TFetcher> ? Action<
        PathParams<TResourceConfig["path"]>,
        TResourceConfig["actions"][K],
        TFetcher
      >
      : never
}

export type Action<
  TPathParams extends PathParams<any>,
  TActionConfig extends ActionConfig<TFetcher>,
  TFetcher extends Fetcher,
> = IsOptionalObject<ActionArgs<TPathParams, TActionConfig, TFetcher>> extends
  true ? (
    args?: ActionArgs<TPathParams, TActionConfig, TFetcher>,
  ) => Promise<
    Result<
      TActionConfig["data"] extends Schema<any> ? TypeOf<TActionConfig["data"]>
        : null
    >
  >
  : (
    args: ActionArgs<TPathParams, TActionConfig, TFetcher>,
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
  TActionConfig extends ActionConfig<TFetcher>,
  TFetcher extends Fetcher,
> =
  & (IsOptionalObject<
    WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
  > extends false
    ? WithOptionalProperty<{ params: { [K in TPathParams]: string } }>
    : { init?: StrippedRequestInit<FetcherInit<TFetcher>> })
  & (TActionConfig["query"] extends Schema<any>
    ? WithOptionalProperty<{ query: TypeOf<TActionConfig["query"]> }>
    : { init?: StrippedRequestInit<FetcherInit<TFetcher>> })
  & (TActionConfig extends BodyfullActionConfig<TFetcher>
    ? (TActionConfig["body"] extends Schema<any>
      ? WithOptionalProperty<{ body: TypeOf<TActionConfig["body"]> }>
      : { init?: StrippedRequestInit<FetcherInit<TFetcher>> })
    : { init?: StrippedRequestInit<FetcherInit<TFetcher>> })
  & { init?: StrippedRequestInit<FetcherInit<TFetcher>> }

/*********************/
/*                   */
/*   UTILITY TYPES   */
/*                   */
/*********************/

export type PossibleActionArgs = ActionArgs<
  "param",
  { query: Schema<Record<string, never>>; body: Schema<Record<string, never>> },
  Fetcher
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

export type Plugin<TFetcher extends Fetcher = Fetcher> = {
  before?(
    ctx: PluginBeforeContext<TFetcher>,
  ):
    | StrippedRequestInit<FetcherInit<TFetcher>>
    | Promise<StrippedRequestInit<FetcherInit<TFetcher>>>
    | void
    | Promise<void>
  after?(
    ctx: PluginAfterContext<TFetcher>,
  ):
    | Response
    | Promise<Response>
    | void
    | Promise<void>
}

export type PluginBeforeContext<TFetcher extends Fetcher> = {
  client: ClientConfig<ResourceRecord<TFetcher>, TFetcher>
  resource: ResourceConfig<TFetcher>
  action: ActionConfig<TFetcher>
  method: keyof ActionsRecord<TFetcher>
  init: FetcherInit<TFetcher>
  args?: PossibleActionArgs
}

export type PluginAfterContext<TFetcher extends Fetcher> =
  & PluginBeforeContext<TFetcher>
  & {
    res: Response
    refetch(init: StrippedRequestInit<FetcherInit<TFetcher>>): Promise<Response>
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
