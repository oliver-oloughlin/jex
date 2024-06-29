import {
  type BodylessActionConfig,
  jex,
  type Plugin,
  type Schema,
  schema,
} from "../mod.ts"

type Data = {
  args: Record<string, any>
  data: any
  files: Record<string, any>
  form: Record<string, any>
  headers: Record<string, string>
  json: any
  method: string
  origin: string
  url: string
}

type Args = {
  plugins?: Plugin[]
  getAnything?: BodylessActionConfig
  getAnythingWithParam?: BodylessActionConfig
}

export function createClient<TArgs extends Args = Record<string, string>>(
  args?: TArgs,
) {
  const getAnything = {
    ...args?.getAnything,
    data: schema<Data>(),
  } as { data: Schema<Data, Data> } & TArgs["getAnything"]

  const getAnythingWithParam = {
    ...args?.getAnythingWithParam,
    data: schema<Data>(),
  } as { data: Schema<Data, Data> } & TArgs["getAnythingWithParam"]

  return jex({
    baseUrl: "https://httpbin.org",
    plugins: args?.plugins,
    resources: {
      anything: {
        path: "/anything",
        actions: {
          get: getAnything,
        },
      },
      anythingWithParam: {
        path: "/anything/{anything}",
        actions: {
          get: getAnythingWithParam,
        },
      },
    },
  })
}
