import {
  type BodyfullActionConfig,
  type BodylessActionConfig,
  jex,
  type Plugin,
  type Schema,
  schema,
} from "../mod.ts"

type Data = {
  args: Record<string, any>
  data: string
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
  postAnything?: BodyfullActionConfig
  getAnythingWithParam?: BodylessActionConfig
}

export function createClient<TArgs extends Args = Record<string, string>>(
  args?: TArgs,
) {
  const getAnything = {
    ...args?.getAnything,
    data: schema<Data>(),
  } as { data: Schema<Data, Data> } & TArgs["getAnything"]

  const postAnything = {
    ...args?.postAnything,
    data: schema<Data>(),
  } as { data: Schema<Data, Data> } & TArgs["postAnything"]

  const getAnythingWithParam = {
    ...args?.getAnythingWithParam,
    data: schema<Data>(),
  } as { data: Schema<Data, Data> } & TArgs["getAnythingWithParam"]

  return jex({
    baseUrl: "https://httpbin.org",
    plugins: args?.plugins,
    endpoints: {
      "/anything": {
        get: getAnything,
        post: postAnything,
      },
      "/anything/{anything}": {
        get: getAnythingWithParam,
      },
    },
  })
}
