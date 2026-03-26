import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900">שגיאת אימות</h1>
      <p className="mb-10 max-w-md text-slate-500 font-medium leading-relaxed">
        משהו השתבש בתהליך האימות. יכול להיות שהקישור פג תוקף או שכבר השתמשת בו.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button asChild className="h-14 text-lg font-bold rounded-2xl">
          <Link href="/login">חזרה להתחברות</Link>
        </Button>
        <Button asChild variant="ghost" className="h-14 text-slate-500 font-bold rounded-2xl">
          <Link href="/">חזרה לדף הבית</Link>
        </Button>
      </div>
    </div>
  )
}
