import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

export { z }

export function parseOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  value: unknown
): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ")
    throw new MedusaError(MedusaError.Types.INVALID_DATA, detail)
  }
  return result.data
}
