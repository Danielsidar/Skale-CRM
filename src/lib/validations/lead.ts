import * as z from "zod"

export const leadSchema = z.object({
  name: z.string().min(2, "שם העסק חייב להכיל לפחות 2 תווים"),
  contact_name: z.string().min(2, "שם איש הקשר חייב להכיל לפחות 2 תווים"),
  email: z.string().email("אימייל לא תקין").optional().or(z.literal("")),
  phone: z.string().min(9, "מספר טלפון לא תקין").optional().or(z.literal("")),
  pipeline_id: z.string().uuid("יש לבחור פייפליין"),
  status: z.string().min(1, "יש לבחור סטטוס"),
  product_id: z.string().uuid("יש לבחור מוצר").optional().or(z.literal("")),
  estimated_value: z.coerce.number().min(0).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type LeadFormValues = z.infer<typeof leadSchema>
