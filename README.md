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
    bar: "Hello",
  },
  query: {
    q: "World",
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

### Plugins

`jex` also provides a handful of built-in plugins to provide easy logging,
authentication and more. Plugins can be applied for all endpoints, all actions
of a specific endpoint, or for a specific action of a specific endpoint.

```ts
import { jex } from "@olli/jex"
import { example } from "@olli/jex/example"

const client = jex({
  baseUrl: "https://domain.com/api",
  // Applied for all endpoints and actions
  plugins: [example()],
  endpoints: {
    "/foo": {
      // Applied for all actions of this endpoint
      plugins: [example()],
      get: {
        // Applied for this action only
        plugins: [example()],
      },
    },
  },
})
```

#### Logger

Provides basic logging of outgoing requests and incoming responses.

```ts
import { jex } from "@olli/jex"
import { logger } from "@olli/jex/logger"

// With default log function
const client = jex({
  baseUrl: "https://domain.com/api",
  plugins: [logger()],
  endpoints: {},
})

// With specified log function
const client = jex({
  baseUrl: "https://domain.com/api",
  plugins: [logger(console.info)],
  endpoints: {},
})
```

#### Basic Auth

Provides basic authentication using the `Authorization` header.

```ts
import { jex } from "@olli/jex"
import { basicAuth } from "@olli/jex/auth"

const client = jex({
  baseUrl: "https://domain.com/api",
  plugins: [basicAuth({
    username: "olli",
    password: "secret123",
  })],
  endpoints: {},
})
```

#### Basic Auth

Provides bearer (token) authentication.

```ts
import { jex } from "@olli/jex"
import { bearerAuth } from "@olli/jex/auth"

const client = jex({
  baseUrl: "https://domain.com/api",
  plugins: [bearerAuth("super_secret_token")],
  endpoints: {},
})
```

#### Retry List

Retries failed requests in a progressive manner, following the provided list of
retry delays, specified in milliseconds.

```ts
import { jex } from "@olli/jex"
import { retryList } from "@olli/jex/retry"

const client = jex({
  baseUrl: "https://domain.com/api",
  // First waits 500ms, then 1000ms, and then 3000ms between retries.
  // Returns failed response if last attempt fails
  plugins: [retryList([500, 1000, 3000])],
  endpoints: {},
})
```

#### Fixed Throttle

Throttles requests based on a fixed interval, specified in milliseconds.

```ts
import { jex } from "@olli/jex"
import { fixedThrottle } from "@olli/jex/throttle"

const client = jex({
  baseUrl: "https://domain.com/api",
  // Ensures a minimum delay of 1 second between requests
  plugins: [fixedThrottle(1000)],
  endpoints: {},
})
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
