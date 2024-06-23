import { HttpError } from "./errors.ts"
import type {
  ActionConfig,
  BodyfullActionConfig,
  Client,
  ClientConfig,
  Fetcher,
  FetcherInit,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PossibleActionArgs,
  ResourceConfig,
  ResourceRecord,
  Result,
} from "./types.ts"
import { deepMerge } from "@std/collections"

export function createClient<
  const TResourceConfigs extends ResourceRecord<FetcherInit<TFetcher>>,
  const TFetcher extends Fetcher = Fetcher,
>(
  config: ClientConfig<TResourceConfigs, TFetcher>,
): Client<TResourceConfigs, FetcherInit<TFetcher>> {
  const resourceEntries = Object
    .entries(config.resources)
    .map((
      [key, resourceConfig],
    ) => [key, createResource(config, resourceConfig)])

  return Object.fromEntries(resourceEntries) as Client<
    TResourceConfigs,
    FetcherInit<TFetcher>
  >
}

function createResource(
  clientConfig: ClientConfig<any, any>,
  resourceConfig: ResourceConfig<any>,
) {
  const actionEntries = Object
    .entries(resourceConfig.actions)
    .map((
      [key, actionConfig],
    ) => [key, createAction(clientConfig, resourceConfig, actionConfig, key)])

  return Object.fromEntries(actionEntries)
}

function createAction(
  clientConfig: ClientConfig<any, Fetcher>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  method: string,
) {
  return async function (args?: PossibleActionArgs): Promise<Result<any>> {
    try {
      const url = createUrl(
        clientConfig.baseUrl,
        resourceConfig.path,
        args?.params,
        args?.query,
      )

      const init = await createInit(
        clientConfig,
        resourceConfig,
        actionConfig,
        args,
        method,
      )

      const res = await sendRequest(
        clientConfig,
        resourceConfig,
        actionConfig,
        args,
        init,
        url,
        method,
      )

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          data: null,
          error: new HttpError(res.status, res.statusText),
          raw: res,
        }
      }

      const data = await parseData(actionConfig, res)

      return {
        success: true,
        status: res.status,
        statusText: res.statusText,
        data,
        raw: res,
      }
    } catch (e) {
      return {
        success: false,
        error: e,
        data: null,
        statusText: "A client-side error occured",
      }
    }
  }
}

function createUrl(
  baseUrl: string,
  path: string,
  params: Record<string, any> | undefined,
  query: Record<string, any> | undefined,
) {
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

  if (query) {
    let isFirst = true
    Object
      .entries(query)
      .forEach(([name, value]) => {
        url += isFirst
          ? `?${name}=${value.toString()}`
          : `&${name}=${value.toString()}`

        isFirst = false
      })
  }

  return url
}

async function createInit(
  clientConfig: ClientConfig<any, any>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  method: string,
) {
  let init: RequestInit = {}

  let ctx: PluginBeforeContext<RequestInit> = {
    path: resourceConfig.path,
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

  for (const plugin of resourceConfig.plugins ?? []) {
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

  init = deepMerge(init as object, args?.init ?? {} as object)
  init = deepMerge(init, { method })
  return init
}

async function sendRequest(
  clientConfig: ClientConfig<any, any>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: string,
  method: string,
): Promise<Response> {
  const fetcher = clientConfig.fetcher ?? fetch
  let res = await fetcher(url, init)

  let ctx: PluginAfterContext<RequestInit> = {
    init,
    args,
    method,
    path: resourceConfig.path,
    res,
    async refetch(refetchInit) {
      let i = deepMerge(init, refetchInit)
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

  for (const plugin of resourceConfig.plugins ?? []) {
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
  ctx: PluginBeforeContext<RequestInit>,
  plugin: Plugin<RequestInit>,
): Promise<RequestInit> {
  if (!plugin.before) return init
  const result = await plugin.before(ctx)
  if (result) return deepMerge(init as object, result)
  return init
}

async function applyAfter(
  ctx: PluginAfterContext<RequestInit>,
  plugin: Plugin<RequestInit>,
): Promise<Response> {
  if (!plugin.after) return ctx.res
  const res = await plugin.after(ctx)
  if (res) return res
  return ctx.res
}

function createBody(
  actionConfig: BodyfullActionConfig<any>,
  args: PossibleActionArgs | undefined,
): {
  body?: BodyInit
  contentType?: string
} {
  if (!actionConfig.body || !args?.body) {
    return {}
  }

  const bodySource = actionConfig.bodySource ?? "json"
  const parsed = actionConfig.body.parse(args.body)

  switch (bodySource) {
    case "json": {
      return {
        body: JSON.stringify(parsed),
        contentType: "application/json",
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
  if (!actionConfig.data) return null
  const dataSource = actionConfig.dataSource ?? "json"
  const data = await res[dataSource]()
  return actionConfig.data.parse(data)
}
