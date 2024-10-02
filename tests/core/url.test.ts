import { assert } from "@std/assert/assert"
import { jex } from "../../mod.ts"

Deno.test("core", async (t) => {
  await t.step(
    "Should successfully fetch using relative URL with baseURL",
    async () => {
      const api = jex({
        fetcher: () => Promise.resolve(new Response()),
        baseUrl: "/",
        endpoints: {
          "/test": {
            get: {},
          },
        },
      })

      const res = await api["/test"].get()
      assert(res.ok)
    },
  )

  await t.step(
    "Should successfully fetch using relative URL without baseURL",
    async () => {
      const api = jex({
        fetcher: () => Promise.resolve(new Response()),
        endpoints: {
          "/test": {
            get: {},
          },
        },
      })

      const res = await api["/test"].get()
      assert(res.ok)
    },
  )
})
