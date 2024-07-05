import type { Schema } from "./types.ts"

export function schema<const TOutput, const TInput = TOutput>(
  transform?: (input: TInput) => TOutput,
): Schema<TInput, TOutput> {
  return {
    parse: (data) => data as TOutput,
    _transform: transform,
    _input: null as TInput,
  }
}
