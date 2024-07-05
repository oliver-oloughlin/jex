import { assert } from "@std/assert"
import { createClient } from "../utils.ts"

const client = await createClient()

Deno.test("core - params", async (t) => {
  await t.step("Should require passing params", async () => {
    const res = await client["/anything/{anything}"].get({
      params: {
        anything: "foo",
      },
    })

    assert(res.ok)
    const url = new URL(res.data.url)
    assert(url.pathname.includes("/foo"))
  })

  await t.step("Should fail if passing invalid param", async () => {
    const res = await client["/anything/{anything}"].get({
      params: {
        anything: "///foo:bar@baz/https://",
      },
    })

    assert(!res.ok)
  })
})
