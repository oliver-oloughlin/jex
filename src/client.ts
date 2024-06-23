import type {
  ActionConfig,
  Client,
  ClientConfig,
  Fetcher,
  FetcherInit,
  Plugin,
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

      const fetcher = clientConfig.fetcher ?? fetch
      const res = await fetcher(url, init)

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          statusText: res.statusText,
          data: null,
          error: new Error(`HttpError: ${res.status} ${res.statusText}`),
        }
      }

      // TODO
      const data = null

      return {
        success: true,
        status: res.status,
        statusText: res.statusText,
        data,
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
  const ctx: PluginBeforeContext<RequestInit> = {
    path: resourceConfig.path,
    method,
    args,
  }

  let init: RequestInit = {}

  for (const plugin of clientConfig.plugins ?? []) {
    init = await applyBefore(init, ctx, plugin)
  }

  for (const plugin of resourceConfig.plugins ?? []) {
    init = await applyBefore(init, ctx, plugin)
  }

  for (const plugin of actionConfig.plugins ?? []) {
    init = await applyBefore(init, ctx, plugin)
  }

  init = deepMerge(init as object, args?.init ?? {} as object)
  init = deepMerge(init, { method })
  return init
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
