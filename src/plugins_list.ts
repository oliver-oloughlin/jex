import type {
  ActionConfig,
  ClientConfig,
  EndpointConfig,
  Fetcher,
  Plugin,
} from "./types.ts"
import { safeAwait } from "./utils.ts"

export class PluginsList {
  private clientConfig: ClientConfig<any, Fetcher>
  private endpointConfig: EndpointConfig<Fetcher>
  private actionConfig: ActionConfig<Fetcher>

  constructor({ clientConfig, endpointConfig, actionConfig }: {
    clientConfig: ClientConfig<any, Fetcher>
    endpointConfig: EndpointConfig<Fetcher>
    actionConfig: ActionConfig<Fetcher>
  }) {
    this.clientConfig = clientConfig
    this.endpointConfig = endpointConfig
    this.actionConfig = actionConfig
  }

  async apply(fn: (plugin: Plugin) => void | Promise<void>) {
    await PluginsList.applyFor(fn, this.clientConfig.plugins)
    await PluginsList.applyFor(fn, this.endpointConfig.plugins)
    await PluginsList.applyFor(fn, this.actionConfig.plugins)
  }

  private static async applyFor(
    fn: (plugin: Plugin) => void | Promise<void>,
    plugins?: Plugin[],
  ) {
    for (const plugin of plugins ?? []) {
      await safeAwait(fn(plugin))
    }
  }
}
