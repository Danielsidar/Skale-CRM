import * as z from "zod"

export const appointmentSchema = z.object({
  title: z.string().min(1, "כותרת היא חובה"),
  description: z.string().optional(),
  date: z.string().min(1, "תאריך הוא חובה"),
  time: z.string().min(1, "שעה היא חובה"),
  duration: z.string().min(1, "משך זמן הוא חובה"),
  assigned_to_user_id: z.string().min(1, "בחירת נציג היא חובה"),
  location: z.string().optional(),
  meeting_link: z.string().url("קישור לא תקין").optional().or(z.literal("")),
})

export type AppointmentFormValues = z.infer<typeof appointmentSchema>
