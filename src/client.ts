import { HttpError } from "./errors.ts"
import type {
  ActionConfig,
  ActionsRecord,
  BodyfullActionConfig,
  Client,
  ClientConfig,
  Fetcher,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PluginBeforeInit,
  PossibleActionArgs,
  ResourceConfig,
  ResourceRecord,
  Result,
} from "./types.ts"
import { deepMerge } from "@std/collections"
import { ulid } from "@std/ulid"

export function jex<
  const TResourceRecord extends ResourceRecord<TFetcher>,
  const TFetcher extends Fetcher = Fetcher,
>(
  config: ClientConfig<TResourceRecord, TFetcher>,
): Client<TResourceRecord, TFetcher> {
  const resourceEntries = Object
    .entries(config.resources)
    .map((
      [key, resourceConfig],
    ) => [key, createResource(config, resourceConfig)])

  return Object.fromEntries(resourceEntries) as Client<
    TResourceRecord,
    TFetcher
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
    ) => [
      key,
      createAction(
        clientConfig,
        resourceConfig,
        actionConfig,
        key as keyof ActionsRecord<Fetcher>,
      ),
    ])

  return Object.fromEntries(actionEntries)
}

function createAction(
  clientConfig: ClientConfig<any, Fetcher>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  method: keyof ActionsRecord<Fetcher>,
) {
  return async function (args?: PossibleActionArgs): Promise<Result<any>> {
    try {
      const id = clientConfig.generateId?.() ?? ulid()

      const { init, url } = await createInitAndUrl(
        clientConfig,
        resourceConfig,
        actionConfig,
        args,
        method,
        id,
      )

      const res = await sendRequest(
        clientConfig,
        resourceConfig,
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
  clientConfig: ClientConfig<any, Fetcher>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
) {
  const baseUrl = clientConfig.baseUrl
  const path = resourceConfig.path
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

  if (actionConfig.query) {
    const parsed = (
      actionConfig.query.transform?.(query ?? {}) ??
        actionConfig.query.parse(query ?? {})
    ) as Record<string, any>

    Object
      .entries(parsed)
      .forEach(([name, value]) => {
        url.searchParams.append(name, value.toString())
      })
  }

  return url
}

async function createInitAndUrl(
  clientConfig: ClientConfig<any, any>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  method: keyof ActionsRecord<Fetcher>,
  id: string,
) {
  const url = createUrl(
    clientConfig,
    resourceConfig,
    actionConfig,
    args,
  )

  let pluginInit: Required<PluginBeforeInit> = {
    init: {},
    query: {},
  }

  let ctx: PluginBeforeContext<Fetcher> = {
    id,
    client: clientConfig,
    resource: resourceConfig,
    action: actionConfig,
    url,
    method,
    init: pluginInit.init,
    args,
  }

  for (const plugin of clientConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init: pluginInit.init,
    }
    pluginInit = await applyBefore(pluginInit, ctx, plugin)
  }

  for (const plugin of resourceConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init: pluginInit.init,
    }
    pluginInit = await applyBefore(pluginInit, ctx, plugin)
  }

  for (const plugin of actionConfig.plugins ?? []) {
    ctx = {
      ...ctx,
      init: pluginInit.init,
    }
    pluginInit = await applyBefore(pluginInit, ctx, plugin)
  }

  const bodyData = createBody(actionConfig, args)

  let init = pluginInit.init
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
    actionConfig?.headers?.transform?.(args?.headers ?? {}) ??
      actionConfig.headers?.parse(args?.headers ?? {}) ??
      {}

  const stringifiedHeaders = stringifyEntries(parsedHeaders)
  init = deepMerge(init as object, args?.init ?? {} as object)
  init = deepMerge(init as object, { headers: stringifiedHeaders })
  init = deepMerge(init as object, { method })

  Object.entries(pluginInit.query).forEach(([key, val]) => {
    url.searchParams.append(key, val.toString())
  })

  return {
    init,
    url,
  }
}

async function sendRequest(
  clientConfig: ClientConfig<any, any>,
  resourceConfig: ResourceConfig<any>,
  actionConfig: ActionConfig<any>,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: URL,
  method: keyof ActionsRecord<Fetcher>,
  id: string,
): Promise<Response> {
  const fetcher = clientConfig.fetcher ?? fetch
  let res = await fetcher(url, init)

  let ctx: PluginAfterContext<Fetcher> = {
    id,
    client: clientConfig,
    resource: resourceConfig,
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
  init: Required<PluginBeforeInit>,
  ctx: PluginBeforeContext<Fetcher>,
  plugin: Plugin<Fetcher>,
): Promise<Required<PluginBeforeInit>> {
  if (!plugin.before) return init
  const result = await plugin.before(ctx)
  if (result) return deepMerge(init as object, result)
  return init
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
  if (!actionConfig.body || !args?.body) {
    return {}
  }

  const bodySource = actionConfig.bodySource ?? "json"

  const parsed = actionConfig.body.transform?.(args.body) ??
    actionConfig.body.parse(args.body)

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
  if (!res.ok || !actionConfig.data) {
    await res.body?.cancel()
    return null
  }

  const dataSource = actionConfig.dataSource ?? "json"
  const data = await res[dataSource]()
  return actionConfig.data.transform?.(data) ?? actionConfig.data.parse(data)
}
