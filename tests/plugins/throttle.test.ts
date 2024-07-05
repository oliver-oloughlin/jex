import { assert } from "@std/assert"
import { fixedThrottle } from "../../src/plugins/throttle/fixed_throttle.ts"
import { createClient } from "../utils.ts"

const THROTTLE_INTERVAL = 1_000
const N = 5

const parallell = createClient({
  plugins: [fixedThrottle(THROTTLE_INTERVAL)],
})

const sequential = createClient({
  plugins: [fixedThrottle(THROTTLE_INTERVAL)],
})

Deno.test("plugins - throttle", async (t) => {
  await t.step("fixed_throttle", async (t) => {
    await t.step(
      "Should wait fixed amount of time between requests when run in parallell",
      async () => {
        const before = performance.now()
        const promises: Promise<any>[] = []

        for (let i = 0; i < N; i++) {
          promises.push(parallell["/anything"].get())
        }

        await Promise.all(promises)

        const diff = performance.now() - before
        assert(diff >= THROTTLE_INTERVAL * (N - 1))
        assert(diff < THROTTLE_INTERVAL * N)
      },
    )

    await t.step(
      "Should wait fixed amount of time between requests when run sequentially",
      async () => {
        const before = performance.now()

        for (let i = 0; i < N; i++) {
          await sequential["/anything"].get()
        }

        const diff = performance.now() - before
        assert(diff >= THROTTLE_INTERVAL * (N - 1))
        assert(diff < THROTTLE_INTERVAL * N)
      },
    )
  })
})
