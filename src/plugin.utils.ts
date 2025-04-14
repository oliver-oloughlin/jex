import { deepMerge } from "@std/collections/deep-merge"
import type {
  ActionConfig,
  ClientConfig,
  EndpointConfig,
  Fetcher,
  Method,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
  PluginInterceptContext,
  PossibleActionArgs,
  PreparedFetch,
} from "./types.ts"
import { safeAwait } from "./utils.ts"
import type { PluginsList } from "./plugins_list.ts"

export async function applyBefore(
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  plugins: PluginsList,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: string,
  method: Method,
  id: string,
): Promise<PluginBeforeContext<Fetcher>> {
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

  await plugins.apply(async (plugin) => {
    if (!plugin.before) return

    const result = await safeAwait(plugin.before(ctx))
    if (!result) return

    const { query, ...init2 } = result

    ctx = deepMerge(ctx as object, {
      init: init2,
      args: { query },
    } as object) as PluginBeforeContext<Fetcher>
  })

  return ctx
}

export async function applyInterceptors(
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  plugins: PluginsList,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: string,
  method: Method,
  id: string,
  fetch: PreparedFetch<Fetcher>,
): Promise<Response | null> {
  let res: Response | null = null

  let ctx: PluginInterceptContext = {
    client: clientConfig,
    endpoint: endpointConfig,
    action: actionConfig,
    args,
    init,
    url,
    method,
    id,
    res,
    fetch,
  }

  await plugins.apply(async (plugin) => {
    if (!plugin.intercept) return

    res = await safeAwait(plugin.intercept(ctx)) ?? null
    ctx = {
      ...ctx,
      res,
    }
  })

  return res
}

export async function applyAfter(
  clientConfig: ClientConfig<any, any>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
  plugins: PluginsList,
  args: PossibleActionArgs | undefined,
  init: RequestInit,
  url: string,
  method: Method,
  id: string,
  response: Response,
  fetch: PreparedFetch<Fetcher>,
): Promise<Response> {
  let res = response

  let ctx: PluginAfterContext = {
    client: clientConfig,
    endpoint: endpointConfig,
    action: actionConfig,
    args,
    init,
    url,
    method,
    id,
    res,
    fetch,
  }

  await plugins.apply(async (plugin) => {
    if (!plugin.after) return

    res = await safeAwait(plugin.after(ctx)) ?? res
    ctx = {
      ...ctx,
      res,
    }
  })

  return res
}

export function pluginsList(
  clientConfig: ClientConfig<any, Fetcher>,
  endpointConfig: EndpointConfig<any>,
  actionConfig: ActionConfig<any>,
): Plugin[] {
  return [
    ...(clientConfig.plugins ?? []),
    ...(endpointConfig.plugins ?? []),
    ...(actionConfig.plugins ?? []),
  ]
}
