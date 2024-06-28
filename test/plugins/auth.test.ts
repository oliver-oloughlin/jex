import { client } from "../config.ts"

Deno.test("plugins - auth", async (t) => {
  await t.step("basic", async (t) => {
    await t.step("Should set correct auth headers", async () => {
      const res = await client.getBasicAuth.get({
        init: { headers: { "BAR": "BAR" } },
      })
      if (!res.ok) {
        throw res
      }
    })
  })
})
