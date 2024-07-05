import { type Plugin, schema } from "../../mod.ts"
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

const q1: Plugin = {
  before: () => {
    return {
      query: {
        foo: "foo",
      },
    }
  },
}

const q2: Plugin = {
  before: () => {
    return {
      query: {
        bar: "bar",
      },
    }
  },
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

const plugins = createClient({
  plugins: [q1, q2],
})

const spacing = createClient({
  getAnything: {
    query: schema<QueryStandard>(),
  },
})

Deno.test("core - query", async (t) => {
  await t.step("Should allow passing only required query", async () => {
    const res = await standard["/anything"].get({
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
      const res = await optional["/anything"].get()
      assert(res.ok)
      const query = new URL(res.raw?.url!).searchParams
      assertEquals(query?.get("foo"), null)
      assertEquals(query?.get("bar"), null)
    },
  )

  await t.step(
    "Should transform to default query when no query is given",
    async () => {
      const res = await transform["/anything"].get()
      assert(res.ok)
      const query = new URL(res.raw?.url!).searchParams
      assertEquals(query?.get("foo"), "foo")
      assertEquals(query?.get("bar"), "100")
    },
  )

  await t.step("Should add plugin queries", async () => {
    const res = await plugins["/anything"].get()
    assert(res.ok)
    const query = new URL(res.raw?.url!).searchParams
    assertEquals(query?.get("foo"), "foo")
    assertEquals(query?.get("bar"), "bar")
  })

  await t.step("Should successfully add query with spacing", async () => {
    const res = await spacing["/anything"].get({
      query: {
        foo: "foo bar",
      },
    })

    assert(res.ok)
    const query = new URL(res.raw?.url!).searchParams
    assertEquals(query?.get("foo"), "foo bar")
  })
})
