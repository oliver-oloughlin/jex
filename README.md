# jex

`jex` is a configurable API client that lets you define strongly-typed HTTP
calls using a JSON-like schema. Data types can be defined and validated using
any third-party library of your choosing, such as Zod, or you can use the
built-in `schema` helper which provides simple type casting. `jex` also provides
a plugin API, enabling easy authentication, logging, request throttling and
more.

## Highlights

- Strong typing with smart type inference
- Flexible plugin API
- Built-in plugins for authentication, request throttling and retrying
- Support for logging

## Installation

Install `jex` on your preferred platform:

```console
deno add @olli/jex
```

```console
npx jsr add @olli/jex
```

```console
pnpm dlx jsr add @olli/jex
```

```console
bunx jsr add @olli/jex
```

## How to use

### Create a basic API client

```ts
import { jex, schema } from "@olli/jex"

type Data = {
  foo: string
  bar: number
}

const client = jex({
  baseUrl: "https://domain.com/api",
  endpoints: {
    "/foo": {
      get: {
        data: schema<Data>(),
      },
    },
  },
})

const result = await client["/foo"].get()
if (result.ok) {
  // Inferred as { foo: string, bar: number }
  const data = result.data
} else {
  // Inferred as null
  const data = result.data
}
```

### With params, query and body

```ts
import { jex, schema } from "@olli/jex"

const client = jex({
  baseUrl: "https://domain.com/api",
  endpoints: {
    // Also supports notations: "/foo/[bar]", "/foo/{bar}", "/foo/<bar>"
    "/foo/:bar": {
      post: {
        body: schema<{ baz: boolean }>(),
        query: schema<{ q: string; n?: number }>(),
      },
    },
  },
})

const result = await client["/foo/:bar"].post({
  params: {
    bar: "bar",
  },
  query: {
    q: "HelloWorld",
  },
  body: {
    baz: true,
  },
})

if (result.ok) {
  // Inferred as null
  const data = result.data
}
```

### Using Zod

```ts
import { jex } from "@olli/jex"
import { z } from "zod"

const DataSchema = z.object({
  foo: z.string(),
  bar: z.number(),
})

const client = jex({
  baseUrl: "https://domain.com/api",
  endpoints: {
    "/foo": {
      get: {
        data: DataSchema,
      },
    },
  },
})

const result = await client.foo.get()
if (result.ok) {
  // Inferred as { foo: string, bar: number }
  const data = result.data
} else {
  // Inferred as null
  const data = result.data
}
```

## Development

Any contributions are welcomed and appreciated. How to contribute:

- Clone this repository
- Add feature / Refactor
- Add or refactor tests as needed
- Ensure code quality (check + lint + format + test) using `deno task prep`
- Open Pull Request

## License

Published under
[MIT License](https://github.com/oliver-oloughlin/jex/blob/main/LICENSE)
