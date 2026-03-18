import * as z from "zod"

export const customerSchema = z.object({
  name: z.string().min(2, "שם הלקוח חייב להכיל לפחות 2 תווים"),
  contact_name: z.string().min(2, "שם איש הקשר חייב להכיל לפחות 2 תווים"),
  email: z.string().email("אימייל לא תקין").optional().or(z.literal("")),
  phone: z.string().min(9, "מספר טלפון לא תקין").optional().or(z.literal("")),
  source: z.string().optional(),
  notes: z.string().optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
