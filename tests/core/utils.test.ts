import { assert } from "@std/assert/assert"
import { isValidBody } from "../../src/utils.ts"
import { assertFalse } from "@std/assert/false"

class ArrayBufferView_ArrayBuffer implements ArrayBufferView {
  buffer: ArrayBufferLike = new ArrayBuffer(10)
  byteLength: number = 10
  byteOffset: number = 0
}

class ArrayBufferView_SharedArrayBuffer implements ArrayBufferView {
  buffer: ArrayBufferLike = new SharedArrayBuffer(10)
  byteLength: number = 10
  byteOffset: number = 0
}

Deno.test("core - utils", async (t) => {
  await t.step("isValidBody()", async (t) => {
    await t.step("Should return true for string value", () => {
      assert(isValidBody("string"))
    })

    await t.step("Should return true for URLSearchParams value", () => {
      assert(isValidBody(new URLSearchParams()))
    })

    await t.step("Should return true for FormData value", () => {
      assert(isValidBody(new FormData()))
    })

    await t.step("Should return true for Blob value", () => {
      assert(isValidBody(new Blob()))
    })

    await t.step("Should return true for ArrayBuffer value", () => {
      assert(isValidBody(new ArrayBuffer(10)))
    })

    await t.step("Should return true for Blob value", () => {
      assert(isValidBody(new ReadableStream()))
    })

    await t.step(
      "Should return true for ArrayBufferView value with ArrayBuffer",
      () => {
        assert(isValidBody(new ArrayBufferView_ArrayBuffer()))
      },
    )

    await t.step(
      "Should return true for ArrayBufferView value with SharedArrayBuffer",
      () => {
        assert(isValidBody(new ArrayBufferView_SharedArrayBuffer()))
      },
    )

    await t.step("Should return false for plain object value", () => {
      assertFalse(isValidBody({
        foo: "foo",
        bar: 10,
        baz: {
          riz: [1, 2, 3],
        },
      }))
    })

    await t.step("Should return false for number values", () => {
      assertFalse(isValidBody(10))
    })

    await t.step("Should return false for array values", () => {
      assertFalse(isValidBody([1, 2, 3]))
    })
  })
})
