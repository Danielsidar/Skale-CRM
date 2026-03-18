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
import { Loader2, ArrowRight } from "lucide-react"

type Step = "email" | "password" | "setup"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setLoading(true)
    try {
      const response = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error || "שגיאה בבדיקת המשתמש")
      
      if (!data.exists) {
        toast.info("משתמש לא נמצא. האם ברצונך להירשם?")
        router.push(`/register?email=${encodeURIComponent(email)}`)
        return
      }

      setFullName(data.fullName)
      if (data.needsPasswordSetup) {
        setStep("setup")
      } else {
        setStep("password")
      }
    } catch (error: any) {
      toast.error("שגיאה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("שגיאת התחברות", {
          description: error.message === "Invalid login credentials" 
            ? "פרטי ההתחברות אינם נכונים" 
            : error.message,
        })
      } else {
        toast.success("התחברת בהצלחה")
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      toast.error("קרתה שגיאה בלתי צפויה")
    } finally {
      setLoading(false)
    }
  }

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות")
      return
    }
    if (newPassword.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "שגיאה בהגדרת הסיסמה")

      toast.success("הסיסמה הוגדרה בהצלחה!")
      
      // Auto-login after password setup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      })

      if (loginError) {
        setStep("password")
        setPassword("")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error: any) {
      toast.error("שגיאה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold">כניסה למערכת</CardTitle>
          <CardDescription>
            {step === "email" && "הזן את האימייל שלך כדי להתחיל"}
            {step === "password" && `שלום ${fullName || 'אורח'}, הזן את הסיסמה שלך`}
            {step === "setup" && `ברוך הבא ${fullName || 'אורח'}! הגדר סיסמה לחשבון שלך`}
          </CardDescription>
        </CardHeader>
        
        {step === "email" && (
          <form onSubmit={handleCheckEmail}>
            <CardContent className="space-y-4">
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
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "המשך"}
              </Button>
              <div className="text-center text-sm">
                אין לך חשבון?{" "}
                <Link href="/register" className="text-primary hover:underline">
                  הרשמה עכשיו
                </Link>
              </div>
            </CardFooter>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md overflow-hidden">
                <div className="flex-1 truncate text-sm">{email}</div>
                <Button variant="ghost" size="sm" onClick={() => setStep("email")} className="h-7 px-2">
                  שינוי
                </Button>
              </div>
              <div className="space-y-2 text-start">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">סיסמה</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    שכחת סיסמה?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="text-start"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "התחברות"}
              </Button>
            </CardFooter>
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={handleSetupPassword}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-md overflow-hidden">
                <div className="flex-1 truncate text-sm">{email}</div>
                <Button variant="ghost" size="sm" onClick={() => setStep("email")} className="h-7 px-2">
                  שינוי
                </Button>
              </div>
              <div className="space-y-2 text-start">
                <Label htmlFor="newPassword">סיסמה חדשה</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  className="text-start"
                />
              </div>
              <div className="space-y-2 text-start">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="text-start"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "הגדר סיסמה והתחבר"}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
