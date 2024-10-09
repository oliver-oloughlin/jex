import type { Type } from "arktype"
import type { Schema } from "../types.ts"

export function arktypeSchema<T extends Type>(
  schema: T,
): Schema<T["infer"], T["infer"]> {
  return {
    _input: schema.infer,
    parse: (data) => schema.assert(data),
  }
}
