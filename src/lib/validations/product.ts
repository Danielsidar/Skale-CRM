import * as z from "zod"

export const productSchema = z.object({
  name: z.string().min(2, "שם המוצר חייב להכיל לפחות 2 תווים"),
  price: z.coerce.number().min(0, "המחיר חייב להיות חיובי"),
  description: z.string().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>
