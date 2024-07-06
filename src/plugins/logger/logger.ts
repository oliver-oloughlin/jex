import type {
  Fetcher,
  Plugin,
  PluginAfterContext,
  PluginBeforeContext,
} from "../../types.ts"
import { brightWhite, green, red, yellow } from "@std/fmt/colors"

export type LogFn = (...data: unknown[]) => void

export function logger(fn?: LogFn): Plugin {
  return new Logger(fn)
}

class Logger implements Plugin {
  private fn: LogFn
  private reqTimestampMap: Map<string, number>

  constructor(fn?: LogFn) {
    // deno-lint-ignore no-console
    this.fn = fn ?? console.info
    this.reqTimestampMap = new Map()
  }

  before(ctx: PluginBeforeContext<Fetcher>) {
    this.reqTimestampMap.set(ctx.id, Date.now())
    const text = `--> ${ctx.method.toUpperCase()} ${ctx.url.toString()}`
    this.fn(text)
  }

  after(ctx: PluginAfterContext<Fetcher>) {
    const timestamp = this.reqTimestampMap.get(ctx.id)
    this.reqTimestampMap.delete(ctx.id)
    const deltaMs = Date.now() - (timestamp ?? Number.MAX_VALUE)
    const deltaMsStr = deltaMs < 0 ? "" : ` ${deltaMs}ms `
    const deltaMsFmt = brightWhite(deltaMsStr)

    const statusStr = ctx.res.status.toString()
    const statusFmt = statusStr.startsWith("2")
      ? green(statusStr)
      : statusStr.startsWith("4")
      ? red(statusStr)
      : yellow(statusStr)

    const text =
      `<-- ${ctx.method.toUpperCase()} ${statusFmt}${deltaMsFmt}${ctx.url.toString()}`

    this.fn(text)
  }
}
