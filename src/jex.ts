import { HttpError } from "./errors.ts"
import type {
  ActionConfig,
  BodyfullActionConfig,
  Client,
  ClientConfig,
  EndpointConfig,
  EndpointRecord,
  Fetcher,
  Method,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PossibleActionArgs,
  Result,
} from "./types.ts"
import { deepMerge } from "@std/collections"
import { ulid } from "@std/ulid"

export function jex<
  const TEndpointRecord extends EndpointRecord<TFetcher>,
  const TFetcher extends Fetcher = Fetcher,
>(
  config: ClientConfig<TEndpointRecord, TFetcher>,
) {
  const endpointEntries = Object
    .entries(config.endpoints)
    .map((
      [key, endpointConfig],
    ) => [key, createEndpoint(key, config, endpointConfig)])

  return Object.fromEntries(endpointEntries) as Client<
    TEndpointRecord,
    TFetcher
  >
}

function createEndpoint(
  path: string,
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
) {
  const actionEntries = Object
    .entries(endpointConfig)
    .filter(([key]) => key !== "plugins")
    .map((
      [key, actionConfig],
    ) => [
      key,
      createAction(
        path,
        clientConfig,
        endpointConfig,
        actionConfig as ActionConfig,
        key as Method,
      ),
    ])

  return Object.fromEntries(actionEntries)
}

function createAction(
  path: string,
  clientConfig: ClientConfig<any, Fetcher>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  method: Method,
) {
  return async function (args?: PossibleActionArgs): Promise<Result<any>> {
    try {
      const id = clientConfig.idGenerator?.() ?? ulid()

      const { init, url } = await createInitAndUrl(
        path,
        clientConfig,
        endpointConfig,
        actionConfig,
        args,
        method,
        id,
      )

      const res = await sendRequest(
        clientConfig,
        endpointConfig,
        actionConfig,
        args,
        init,
        url,
        method,
        id,
      )

      const data = await parseData(actionConfig, res)

      if (!res.ok) {
        return {
          ok: false,
          status: res.status,
          statusText: res.statusText,
          error: new HttpError(res.status, res.statusText),
          data,
          raw: res,
        }
      }

      return {
        ok: true,
        status: res.status,
        statusText: res.statusText,
        data,
        raw: res,
      }
    } catch (e) {
      return {
        ok: false,
        data: null,
        error: e,
      }
    }
  }
}

function createUrl(
  path: string,
  clientConfig: ClientConfig<any, Fetcher>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
) {
  const baseUrl = clientConfig.baseUrl
  const query = args?.query
  const params = args?.params

  let urlPath = baseUrl
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
        urlPath = urlPath.replace(`:${name}`, value.toString())
        urlPath = urlPath.replace(`[${name}]`, value.toString())
        urlPath = urlPath.replace(`{${name}}`, value.toString())
        urlPath = urlPath.replace(`<${name}>`, value.toString())
      })
  }

  const url = new URL(urlPath)

  if (query || actionConfig.query) {
    const parsed = actionConfig.query?._transform?.(query ?? {}) ??
      actionConfig.query?.parse(query ?? {}) ??
      query

    Object
      .entries(parsed as Record<string, any>)
      .forEach(([name, value]) => {
        url.searchParams.append(name, value.toString())
      })
  }

  return url
}

async function createInitAndUrl(
  path: string,
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  method: Method,
  id: string,
) {
  const url = createUrl(
    path,
    clientConfig,
    actionConfig,
    args,
  )

  let init: RequestInit = {}

  let ctx: PluginBeforeContext<Fetcher> = {
    id,
    client: clientConfig,
    endpoint: endpointConfig,
    action: actionConfig,
    url,
    method,
    init,
    args,
  }

  for (const plugin of clientConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init,
    }
    init = await applyBefore(init, ctx, plugin)
  }

  for (const plugin of endpointConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init,
    }
    init = await applyBefore(init, ctx, plugin)
  }

  for (const plugin of actionConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init,
    }
    init = await applyBefore(init, ctx, plugin)
  }

  const bodyData = createBody(actionConfig, args)

  init = deepMerge(init as object, {
    body: bodyData.body,
    ...(bodyData.contentType
      ? {
        headers: {
          "Content-Type": bodyData.contentType,
        },
      }
      : {}),
  })

  const parsedHeaders =
    actionConfig.headers?._transform?.(args?.headers ?? {}) ??
      actionConfig.headers?.parse(args?.headers ?? {}) ??
      args?.headers ?? {}

  const stringifiedHeaders = stringifyEntries(parsedHeaders)
  init = deepMerge(init as object, args?.init ?? {} as object)
  init = deepMerge(init as object, { headers: stringifiedHeaders })
  init = deepMerge(init as object, { method })

  return {
    init,
    url,
  }
}

async function sendRequest(
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: URL,
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
    args,
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

async function applyBefore(
  init: RequestInit,
  ctx: PluginBeforeContext<Fetcher>,
  plugin: Plugin<Fetcher>,
): Promise<RequestInit> {
  if (!plugin.before) return init

  const result = await plugin.before(ctx)
  if (!result) return init

  if (result.query) {
    Object.entries(result.query).forEach(([key, val]) => {
      ctx.url.searchParams.append(key, val.toString())
    })
  }

  return result.init ?? init
}

async function applyAfter(
  ctx: PluginAfterContext<Fetcher>,
  plugin: Plugin<Fetcher>,
): Promise<Response> {
  if (!plugin.after) return ctx.res
  const res = await plugin.after(ctx)
  if (res) return res
  return ctx.res
}

function stringifyEntries(obj: object) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, val]) => [key, val.toString()]),
  )
}

function createBody(
  actionConfig: BodyfullActionConfig<any>,
  args: PossibleActionArgs | undefined,
): {
  body?: BodyInit
  contentType?: string
} {
  if (!args?.body || !actionConfig.body) {
    return {}
  }

  const bodySource = actionConfig.bodySource ?? "json"

  const parsed = actionConfig.body?._transform?.(args.body) ??
    actionConfig.body?.parse(args.body) ??
    args.body

  switch (bodySource) {
    case "json": {
      return {
        body: JSON.stringify(parsed),
        contentType: "application/json; charset=utf-8",
      }
    }
    case "FormData": {
      if (parsed instanceof FormData) {
        return {
          body: parsed,
        }
      }

      const data = new FormData()

      Object
        .entries(parsed)
        .forEach(([key, value]) => data.append(key, (value as any).toString()))

      return {
        body: data,
      }
    }
    case "URLSearchParameters": {
      if (parsed instanceof URLSearchParams) {
        return {
          body: parsed,
        }
      }

      const data = new URLSearchParams()

      Object
        .entries(parsed)
        .forEach(([key, value]) => data.append(key, (value as any).toString()))

      return {
        body: new URLSearchParams(data),
      }
    }
    default: {
      return {
        body: parsed,
      }
    }
  }
}

async function parseData(
  actionConfig: ActionConfig<any>,
  res: Response,
) {
  if (!res.ok || (!actionConfig.data && !actionConfig.dataSource)) {
    await res.body?.cancel()
    return null
  }

  const dataSource = actionConfig.dataSource ?? "json"
  const data = await res[dataSource]()

  return actionConfig.data?._transform?.(data) ??
    actionConfig.data?.parse(data) ?? data
}
