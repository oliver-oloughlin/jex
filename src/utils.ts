import { deepMerge } from "@std/collections/deep-merge"
import type {
  ActionConfig,
  BodyfullActionConfig,
  ClientConfig,
  EndpointConfig,
  Fetcher,
  Method,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PossibleActionArgs,
} from "./types.ts"

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function parseData(
  actionConfig: ActionConfig<any>,
  res: Response,
) {
  if (!res.ok || (!actionConfig.data && !actionConfig.dataSource)) {
    await res.body?.cancel()
    return null
  }

  const dataSource = actionConfig.dataSource ?? "json"
  const data = typeof dataSource === "function"
    ? await dataSource(res)
    : await res[dataSource]()

  return actionConfig.data?._transform?.(data) ??
    actionConfig.data?.parse(data) ?? data
}

export async function createInitAndUrl(
  path: string,
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  method: Method,
  id: string,
) {
  let url = createUrl(
    path,
    clientConfig,
    actionConfig,
    args,
  )

  const { body, contentType } = await createBody(actionConfig, args)
  let init = {
    body,
    ...(contentType
      ? {
        headers: {
          "Content-Type": contentType,
        },
      }
      : {}),
  } as object

  let ctx: PluginBeforeContext<Fetcher> = {
    id,
    client: clientConfig,
    endpoint: endpointConfig,
    action: actionConfig,
    url,
    method,
    init: init,
    args: args ?? {},
  }

  for (const plugin of clientConfig.plugins ?? []) {
    ctx = await applyBefore(ctx, plugin)
  }

  for (const plugin of endpointConfig.plugins ?? []) {
    ctx = await applyBefore(ctx, plugin)
  }

  for (const plugin of actionConfig.plugins ?? []) {
    ctx = await applyBefore(ctx, plugin)
  }

  const parsedHeaders =
    actionConfig.headers?._transform?.(args?.headers ?? {}) ??
      actionConfig.headers?.parse(args?.headers ?? {}) ??
      args?.headers ?? {}

  const stringifiedHeaders = stringifyEntries(parsedHeaders)
  init = deepMerge(ctx.init as object, args?.init ?? {} as object)
  init = deepMerge(init as object, { headers: stringifiedHeaders })
  init = deepMerge(init as object, { method })

  Object.entries(ctx.args?.query ?? {}).forEach(([key, value]) => {
    url = appendQuery(url, key, value)
  })

  return {
    init,
    url,
  }
}

export async function sendRequest(
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: string,
  method: Method,
  id: string,
): Promise<Response> {
  const fetcher = clientConfig.fetcher ?? fetch
  let res = await fetcher(url, init)

  let ctx: PluginAfterContext<Fetcher> = {
    id,
    client: clientConfig,
    endpoint: endpointConfig,
    action: actionConfig,
    init,
    args: args ?? {},
    url,
    method,
    res,
    async refetch(refetchInit) {
      let i = deepMerge(init, refetchInit ?? {})
      i = deepMerge(i, { method })
      return await fetcher(url, init)
    },
  }

  for (const plugin of clientConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      res,
    }
    res = await applyAfter(ctx, plugin)
  }

  for (const plugin of endpointConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      res,
    }
    res = await applyAfter(ctx, plugin)
  }

  for (const plugin of actionConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      res,
    }
    res = await applyAfter(ctx, plugin)
  }

  return res
}

export function appendQuery(url: string, key: string, value: any) {
  return url += `${url.includes("?") ? "&" : "?"}${key}=${value.toString()}`
}

export function stringifyEntries(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, val.toString()]),
  )
}

export async function applyAfter(
  ctx: PluginAfterContext<Fetcher>,
  plugin: Plugin<Fetcher>,
): Promise<Response> {
  if (!plugin.after) return ctx.res
  const res = await plugin.after(ctx)
  if (res) return res
  return ctx.res
}

export async function createBody(
  actionConfig: BodyfullActionConfig<any>,
  args: PossibleActionArgs | undefined,
): Promise<{
  body?: BodyInit
  contentType?: string
}> {
  if (!args?.body || !actionConfig.body) {
    return {}
  }

  const parsed = actionConfig.body?._transform?.(args.body) ??
    actionConfig.body?.parse(args.body) ??
    args.body

  const bodySource = actionConfig.bodySource ?? "json"

  const bodyData = typeof bodySource === "function"
    ? await bodySource(parsed)
    : parsed

  if (isValidBody(bodyData)) {
    return {
      body: parsed,
    }
  }

  switch (bodySource) {
    case "json": {
      return {
        body: JSON.stringify(bodyData),
        contentType: "application/json; charset=utf-8",
      }
    }
    case "FormData": {
      if (bodyData instanceof FormData) {
        return {
          body: bodyData,
        }
      }

      const data = new FormData()

      Object
        .entries(bodyData)
        .forEach(([key, value]) => data.append(key, (value as any).toString()))

      return {
        body: data,
      }
    }
    case "URLSearchParameters": {
      if (bodyData instanceof URLSearchParams) {
        return {
          body: bodyData,
        }
      }

      const data = new URLSearchParams()

      Object
        .entries(bodyData)
        .forEach(([key, value]) => data.append(key, (value as any).toString()))

      return {
        body: new URLSearchParams(data),
      }
    }
    default: {
      return {
        body: bodyData,
      }
    }
  }
}

export function createUrl(
  path: string,
  clientConfig: ClientConfig<any, Fetcher>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
) {
  const baseUrl = clientConfig.baseUrl ?? "/"
  const query = args?.query
  const params = args?.params

  let url = baseUrl
    .replace(/[/]{1}$/, "")
    .concat("/")
    .concat(
      path
        .replace(/^[/]{1}/, "")
        .replace(/[/]{1}$/, ""),
    )

  if (params) {
    Object
      .entries(params)
      .forEach(([name, value]) => {
        url = url.replace(`:${name}`, value.toString())
        url = url.replace(`[${name}]`, value.toString())
        url = url.replace(`{${name}}`, value.toString())
        url = url.replace(`<${name}>`, value.toString())
      })
  }

  if (query || actionConfig.query) {
    const parsed = actionConfig.query?._transform?.(query ?? {}) ??
      actionConfig.query?.parse(query ?? {}) ??
      query

    Object
      .entries(parsed as Record<string, any>)
      .forEach(([key, value]) => {
        url = appendQuery(url, key, value)
      })
  }

  return url
}

export function isValidBody(value: unknown) {
  if (value === undefined) return true

  if (typeof value === "object") {
    if (value === null) return true
    if ((value as any).constructor === Object) return false

    const val = value as ArrayBufferView
    const bufferCheck = val.buffer instanceof ArrayBuffer ||
      val.buffer instanceof SharedArrayBuffer
    const byteLengthCheck = typeof val.byteLength === "number"
    const byteOffsetCheck = typeof val.byteOffset === "number"
    if (bufferCheck && byteLengthCheck && byteOffsetCheck) return true
  }

  if (
    typeof value === "string" ||
    value instanceof URLSearchParams ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    value instanceof ReadableStream
  ) {
    return true
  }

  return false
}

export async function applyBefore(
  ctx: PluginBeforeContext<Fetcher>,
  plugin: Plugin<Fetcher>,
): Promise<PluginBeforeContext<Fetcher>> {
  if (!plugin.before) return ctx

  const result = await plugin.before(ctx)
  if (!result) return ctx

  const { query, ...init2 } = result
  return deepMerge(ctx as object, {
    init: init2,
    args: { query },
  } as object) as PluginBeforeContext<Fetcher>
}
