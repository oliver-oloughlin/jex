import { assert, assertThrows } from "@std/assert"
import {
  fixedThrottle,
  rateThrottle,
} from "../../src/plugins/throttle/index.ts"
import { createClient } from "../utils.ts"

const THROTTLE_INTERVAL = 1_000
const N = 5

const parallellFixed = createClient({
  plugins: [fixedThrottle(THROTTLE_INTERVAL)],
})

const sequentialFixed = createClient({
  plugins: [fixedThrottle(THROTTLE_INTERVAL)],
})

const rate2perSec = createClient({
  plugins: [rateThrottle("2/s")],
})

Deno.test("plugins - throttle", async (t) => {
  await t.step("fixed_throttle", async (t) => {
    await t.step(
      "Should wait fixed amount of time between requests when run in parallell",
      async () => {
        const before = performance.now()
        const promises: Promise<any>[] = []

        for (let i = 0; i < N; i++) {
          promises.push(parallellFixed["/anything"].get())
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
          await sequentialFixed["/anything"].get()
          const diff = performance.now() - before
          assert(diff >= THROTTLE_INTERVAL * i)
        }

        const diff = performance.now() - before
        assert(diff >= THROTTLE_INTERVAL * (N - 1))
      },
    )
  })

  await t.step("rate_throttle", async (t) => {
    await t.step(
      "Should hold last request until next window when rate is reached",
      async () => {
        const before = performance.now()
        await Promise.all([
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
        ])
        const diff = performance.now() - before
        assert(diff >= 1_000)
      },
    )

    await t.step(
      "Should hold requests until next available window when rate is reached",
      async () => {
        const before = performance.now()
        await Promise.all([
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
          rate2perSec["/anything"].get(),
        ])
        const diff = performance.now() - before
        assert(diff >= 2_000)
      },
    )

    await t.step(
      "Should throw error if rate number is not a valid number",
      () => {
        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("x/s")
        })
      },
    )

    await t.step("Should throw error if rate number is 0 or under", () => {
      assertThrows(() => {
        // @ts-ignore Should fail
        rateThrottle("0/s")
      })

      assertThrows(() => {
        // @ts-ignore Should fail
        rateThrottle("-10/s")
      })
    })

    await t.step(
      "Should throw error if rate does not include / divider",
      () => {
        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("xs")
        })
      },
    )

    await t.step(
      "Should throw error if rate unit is not a valid TimeUnit",
      () => {
        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("10/sec")
        })

        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("10/m")
        })

        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("10/hour")
        })

        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("10/minute")
        })

        assertThrows(() => {
          // @ts-ignore Should fail
          rateThrottle("10/day")
        })
      },
    )
  })
})
