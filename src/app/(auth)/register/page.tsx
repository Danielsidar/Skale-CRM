"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        toast.error("שגיאת הרשמה", {
          description: error.message,
        })
      } else {
        toast.success("נרשמת בהצלחה!", {
          description: "אנא בדוק את האימייל שלך לאישור החשבון.",
        })
        router.push("/login")
      }
    } catch (err) {
      toast.error("קרתה שגיאה בלתי צפויה")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">הרשמה למערכת</CardTitle>
          <CardDescription>
            צור חשבון חדש ב-Skale CRM כדי להתחיל לנהל את הלידים שלך
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-start">
              <Label htmlFor="fullName">שם מלא</Label>
              <Input
                id="fullName"
                placeholder="ישראל ישראלי"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="text-start"
              />
            </div>
            <div className="space-y-2 text-start">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-start"
              />
            </div>
            <div className="space-y-2 text-start">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-start"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
              הרשמה
            </Button>
            <div className="text-center text-sm">
              כבר יש לך חשבון?{" "}
              <Link href="/login" className="text-primary hover:underline">
                התחברות כאן
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
