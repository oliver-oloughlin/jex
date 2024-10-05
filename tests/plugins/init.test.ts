import { assert, assertEquals } from "@std/assert"
import { defaultInit } from "../../src/plugins/init/defaultInit.ts"
import { createClient } from "../utils.ts"
import { schema } from "../../mod.ts"

const DEFAULT_HEADER_KEY = "X-Foo"
const DEFAULT_HEADER_VALUE = "bar"
const OVERRIDE_HEADER_VALUE = "baz"

const client = createClient({
  plugins: [defaultInit({
    headers: {
      [DEFAULT_HEADER_KEY]: DEFAULT_HEADER_VALUE,
    },
  })],
  getAnything: {
    headers: schema<{ "X-Foo"?: string }>(),
  },
})

Deno.test("plugins - init", async (t) => {
  await t.step("default_init", async (t) => {
    await t.step("Should set default headers", async () => {
      const res = await client["/anything"].get()
      assert(res.ok)
      assertEquals(res.data.headers[DEFAULT_HEADER_KEY], DEFAULT_HEADER_VALUE)
    })

    await t.step("Should override default headers", async () => {
      const res = await client["/anything"].get({
        headers: { [DEFAULT_HEADER_KEY]: OVERRIDE_HEADER_VALUE },
      })

      assert(res.ok)
      assertEquals(res.data.headers[DEFAULT_HEADER_KEY], OVERRIDE_HEADER_VALUE)
    })
  })
})
