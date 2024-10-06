import { basicAuth } from "../../src/plugins/auth/basic.ts"
import { assert, assertEquals } from "@std/assert"
import { type AnythingData, createClient } from "../utils.ts"
import { bearerAuth } from "../../src/plugins/auth/bearer.ts"
import { schema } from "../../mod.ts"
import { apiKeyAuth } from "../../src/plugins/auth/api_key.ts"

const USERNAME = "user"
const PASSWORD = "pass"

const basic = createClient({
  plugins: [
    basicAuth({
      username: USERNAME,
      password: PASSWORD,
    }),
  ],
})

const token = crypto.randomUUID()
const id = crypto.randomUUID()

const apiKeyAuthHeadersDefault = createClient({
  plugins: [apiKeyAuth({ apiKey: token })],
})

const apiKeyAuthQueryDefault = createClient({
  plugins: [apiKeyAuth({ apiKey: token, strategy: "query" })],
})

const apiKeyAuthHeadersCustom = createClient({
  plugins: [
    apiKeyAuth({
      apiKey: token,
      apiKeyName: "X-KEY",
      appId: id,
      appIdName: "X-ID",
    }),
  ],
})

const apiKeyAuthQueryCustom = createClient({
  plugins: [
    apiKeyAuth({
      apiKey: token,
      apiKeyName: "X-KEY",
      appId: id,
      appIdName: "X-ID",
      strategy: "query",
    }),
  ],
})

const staticBearerWithout = createClient({
  plugins: [bearerAuth({ token })],
})

const staticBearerWith = createClient({
  plugins: [bearerAuth({ token: `Bearer ${token}` })],
})

const dynamicBearerWithout = createClient({
  plugins: [bearerAuth({
    tokenUrl: "https://httpbin.org/anything",
    tokenSchema: schema<AnythingData>(),
    mapper: (data) => data.json.token,
    validator: (data) => data.json.expiresAt > Date.now(),
    init: {
      method: "POST",
      body: JSON.stringify({
        token,
        expiresAt: Date.now() + 60 * 60 * 1_000,
      }),
    },
  })],
})

const dynamicBearerWith = createClient({
  plugins: [bearerAuth({
    tokenUrl: "https://httpbin.org/anything",
    tokenSchema: schema<AnythingData>(),
    mapper: (data) => data.json.token,
    validator: (data) => data.json.expiresAt > Date.now(),
    init: {
      method: "POST",
      body: JSON.stringify({
        token: `Bearer ${token}`,
        expiresAt: Date.now() + 60 * 60 * 1_000,
      }),
    },
  })],
})

const dynamicBearerCustomSource = createClient({
  plugins: [bearerAuth({
    tokenUrl: "https://httpbin.org/anything",
    tokenSchema: schema<AnythingData>(),
    tokenSource: (res) => res.json(),
    mapper: (data) => data.json.token,
    validator: (data) => data.json.expiresAt > Date.now(),
    init: {
      method: "POST",
      body: JSON.stringify({
        token,
        expiresAt: Date.now() + 60 * 60 * 1_000,
      }),
    },
  })],
})

Deno.test("plugins - auth", async (t) => {
  await t.step("basic", async (t) => {
    await t.step("Should set Authorization header as basic auth", async () => {
      const res = await basic["/anything"].get()
      assert(res.ok)

      const auth = res.data.headers.Authorization
      assert(auth.startsWith("Basic "))

      const token = auth.replace("Basic ", "")
      const decoded = atob(token)
      const [user, pass] = decoded.split(":")

      assert(auth.includes("Basic"))
      assertEquals(user, USERNAME)
      assertEquals(pass, PASSWORD)
    })
  })

  await t.step("api-key", async (t) => {
    await t.step(
      "Should set API key authentication in headers without app ID",
      async () => {
        const res = await apiKeyAuthHeadersDefault["/anything"].get()
        assert(res.ok)

        assertEquals(res.data.headers["X-Api-Key"], token)
        assertEquals(res.data.headers["X-App-Id"], undefined)
      },
    )

    await t.step(
      "Should set custom API key authentication in headers with app ID",
      async () => {
        const res = await apiKeyAuthHeadersCustom["/anything"].get()
        assert(res.ok)

        assertEquals(res.data.headers["X-Key"], token)
        assertEquals(res.data.headers["X-Id"], id)
      },
    )

    await t.step(
      "Should set API key authentication in query without app ID",
      async () => {
        const res = await apiKeyAuthQueryDefault["/anything"].get()
        assert(res.ok)

        assertEquals(res.data.args["X-API-KEY"], token)
        assertEquals(res.data.args["X-APP-ID"], undefined)
      },
    )

    await t.step(
      "Should set custom API key authentication in query with app ID",
      async () => {
        const res = await apiKeyAuthQueryCustom["/anything"].get()
        assert(res.ok)

        assertEquals(res.data.args["X-KEY"], token)
        assertEquals(res.data.args["X-ID"], id)
      },
    )
  })

  await t.step("bearer", async (t) => {
    await t.step(
      "Should set Authorization header as static bearer token (without 'Basic')",
      async () => {
        const res = await staticBearerWithout["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as static bearer token (with 'Basic')",
      async () => {
        const res = await staticBearerWith["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as dynamic bearer token (without 'Basic')",
      async () => {
        await dynamicBearerWithout["/anything"].get()
        const res = await dynamicBearerWithout["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as dynamic bearer token (without 'Basic')",
      async () => {
        const res = await dynamicBearerWithout["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as dynamic bearer token (with 'Basic')",
      async () => {
        const res = await dynamicBearerWith["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as dynamic bearer token with custom token source",
      async () => {
        const res = await dynamicBearerCustomSource["/anything"].get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )
  })
})
