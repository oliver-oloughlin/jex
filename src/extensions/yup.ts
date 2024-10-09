import type { Schema as YupSchema } from "yup"
import type { Schema } from "../types.ts"

export function yupSchema<T extends YupSchema, TInput = T["__outputType"]>(
  schema: T,
): Schema<TInput, T["__outputType"]> {
  return {
    _input: schema.__outputType as TInput,
    parse: (data) => schema.validateSync(data),
  }
}
