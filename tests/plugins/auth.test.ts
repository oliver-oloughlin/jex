import { basicAuth } from "../../plugins/auth/basic.ts"
import { assert, assertEquals } from "@std/assert"
import { createClient } from "../utils.ts"

const USERNAME = "user"
const PASSWORD = "pass"

export const client = createClient({
  getAnything: {
    plugins: [
      basicAuth({
        username: USERNAME,
        password: PASSWORD,
      }),
    ],
  },
})

Deno.test("plugins - auth", async (t) => {
  await t.step("basic", async (t) => {
    await t.step("Should set correct auth headers", async () => {
      const res = await client.anything.get()
      assert(res.ok)

      const auth = res.data.headers.Authorization
      const token = auth.replace("Basic ", "")
      const decoded = atob(token)
      const [user, pass] = decoded.split(":")

      assert(auth.includes("Basic"))
      assertEquals(user, USERNAME)
      assertEquals(pass, PASSWORD)
    })
  })
})
