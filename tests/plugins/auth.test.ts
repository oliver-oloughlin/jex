import { basicAuth } from "../../src/plugins/auth/basic.ts"
import { assert, assertEquals } from "@std/assert"
import { createClient } from "../utils.ts"
import { bearerAuth } from "../../src/plugins/auth/bearer.ts"

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

const token = "78h23gbd3489hf7f2879fb7298f3"

const bearerWithout = createClient({
  plugins: [bearerAuth(token)],
})

const bearerWith = createClient({
  plugins: [bearerAuth(`Bearer ${token}`)],
})

Deno.test("plugins - auth", async (t) => {
  await t.step("basic", async (t) => {
    await t.step("Should set Authorization header as basic auth", async () => {
      const res = await basic.anything.get()
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

  await t.step("bearer", async (t) => {
    await t.step(
      "Should set Authorization header as bearer token (without 'Basic')",
      async () => {
        const res = await bearerWithout.anything.get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )

    await t.step(
      "Should set Authorization header as bearer token (with 'Basic')",
      async () => {
        const res = await bearerWith.anything.get()
        assert(res.ok)
        const auth = res.data.headers.Authorization
        assert(auth.startsWith("Bearer "))
        assertEquals(auth.replace("Bearer ", ""), token)
      },
    )
  })
})
