import { assert, assertEquals } from "@std/assert"
import { schema } from "../../mod.ts"
import { createClient } from "../utils.ts"

type Body = {
  foo: string
  bar: number
  baz: boolean
}

const body: Body = {
  foo: "foo",
  bar: 100,
  baz: true,
}

const stringifiedEntriesBody = Object.fromEntries(
  Object.entries(body).map(([key, val]) => [key, val.toString()]),
)

const json = createClient({
  postAnything: {
    body: schema<Body>(),
    bodySource: "json",
  },
})

const search = createClient({
  postAnything: {
    body: schema<Body>(),
    bodySource: "URLSearchParameters",
  },
})

const form = createClient({
  postAnything: {
    body: schema<Body>(),
    bodySource: "FormData",
  },
})

const raw = createClient({
  postAnything: {
    body: schema<string>(),
    bodySource: "raw",
  },
})

Deno.test("core - body", async (t) => {
  await t.step("Should send data as json", async () => {
    const res = await json["/anything"].post({ body })
    assert(res.ok)
    assertEquals(res.data.json, body)
  })

  await t.step("Should send data as URLSearchParams", async () => {
    const res = await search["/anything"].post({ body })
    assert(res.ok)
    assertEquals(res.data.form, stringifiedEntriesBody)
  })

  await t.step("Should send data as FormData", async () => {
    const res = await form["/anything"].post({ body })
    assert(res.ok)
    assertEquals(res.data.form, stringifiedEntriesBody)
  })

  await t.step("Should send data as raw (text)", async () => {
    const res = await raw["/anything"].post({ body: JSON.stringify(body) })
    assert(res.ok)
    assertEquals(JSON.parse(res.data.data), body)
  })
})
