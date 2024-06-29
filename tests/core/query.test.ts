import { schema } from "../../mod.ts"
import { assert, assertEquals } from "@std/assert"
import { createClient } from "../utils.ts"

type QueryStandard = {
  foo: string
  bar?: number
}

type QueryOptional = {
  foo?: string
  bar?: number
}

type QueryTransform = {
  foo: string
  bar: number
}

const standard = createClient({
  getAnything: {
    query: schema<QueryStandard>(),
  },
})

const optional = createClient({
  getAnything: {
    query: schema<QueryOptional>(),
  },
})

const transform = createClient({
  getAnything: {
    query: schema<QueryTransform, Partial<QueryTransform>>((q) => ({
      foo: q.foo ?? "foo",
      bar: q.bar ?? 100,
    })),
  },
})

Deno.test("core - query", async (t) => {
  await t.step("Should allow passing only required query", async () => {
    const res = await standard.anything.get({
      query: {
        foo: "foo",
      },
    })

    assert(res.ok)

    const query = new URL(res.raw?.url!).searchParams

    assertEquals(query?.get("foo"), "foo")
    assertEquals(query?.get("bar"), null)
  })

  await t.step(
    "Should allow passing no query when all are optional",
    async () => {
      const res = await optional.anything.get()
      assert(res.ok)

      const query = new URL(res.raw?.url!).searchParams

      assertEquals(query?.get("foo"), null)
      assertEquals(query?.get("bar"), null)
    },
  )

  await t.step(
    "Should transform to default query when no query is given",
    async () => {
      const res = await transform.anything.get()
      assert(res.ok)

      const query = new URL(res.raw?.url!).searchParams

      assertEquals(query?.get("foo"), "foo")
      assertEquals(query?.get("bar"), "100")
    },
  )
})