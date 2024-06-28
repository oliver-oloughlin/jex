import { z } from "npm:zod"
import { jex } from "../mod.ts"
import { basicAuth } from "../plugins/auth/basic.ts"

export const client = jex({
  baseUrl: "https://httpbin.org",
  resources: {
    getBasicAuth: {
      path: "/get",
      actions: {
        get: {
          headers: z.object({
            foo: z.string().default("foo"),
          }),
        },
      },
      plugins: [
        basicAuth({
          username: "user",
          password: "pass",
        }),
      ],
    },
  },
})
