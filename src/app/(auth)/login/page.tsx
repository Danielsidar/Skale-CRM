"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Mail, Lock, CheckCircle2 } from "lucide-react"

async function prefetchAfterLogin(supabase: ReturnType<typeof createClient>, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    // Prefetch businesses in parallel with pipelines lookup
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: membershipRows } = await supabase
      .from("business_users")
      .select("business_id, role")
      .eq("user_id", user.id)

    if (!membershipRows?.length) return

    const ids = membershipRows.map((r) => r.business_id)
    const { data: bizRows } = await supabase
      .from("businesses")
      .select("id, name")
      .in("id", ids)

    if (!bizRows?.length) return

    // Cache business data
    queryClient.setQueryData(["business-session"], {
      user,
      businesses: bizRows.map((b) => ({
        id: b.id,
        name: b.name,
        role: membershipRows.find((m) => m.business_id === b.id)?.role ?? "agent",
      })),
    })

    // Prefetch pipelines for the first business
    const firstBusinessId = bizRows[0].id
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("*, stages(*)")
      .eq("business_id", firstBusinessId)
      .order("created_at", { ascending: true })

    if (pipelines) {
      queryClient.setQueryData(["pipelines", firstBusinessId], pipelines)
    }
  } catch {
    // Silent fail - prefetch is best-effort
  }
}

type Step = "email" | "password" | "setup" | "magic-link-sent"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")

  const handleMagicLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email) {
      toast.error("אנא הזן אימייל")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      })

      if (error) throw error

      toast.success("קישור התחברות נשלח לאימייל שלך!")
      setStep("magic-link-sent")
    } catch (error: any) {
      toast.error("שגיאה בשליחת קישור התחברות", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

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
        // Prefetch critical data in background before navigating
        prefetchAfterLogin(supabase, queryClient).finally(() => {
          router.push("/dashboard")
          router.refresh()
        })
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
        prefetchAfterLogin(supabase, queryClient).finally(() => {
          router.push("/dashboard")
          router.refresh()
        })
      }
    } catch (error: any) {
      toast.error("שגיאה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-primary/5 text-primary lg:hidden border border-primary/10">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold mb-3 text-slate-900 tracking-tight">ברוך השב</h1>
        <p className="text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed text-base">
          {step === "email" && "הזן את האימייל שלך כדי להתחיל"}
          {step === "password" && `שלום ${fullName || 'אורח'}, הזן את הסיסמה שלך`}
          {step === "setup" && `ברוך הבא ${fullName || 'אורח'}! הגדר סיסמה לחשבון שלך`}
          {step === "magic-link-sent" && "שלחנו לך אימייל עם קישור להתחברות מהירה"}
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-100 p-1 lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none shadow-xl shadow-slate-200/50">
        <div className="p-6 lg:p-0">
          {step === "email" && (
            <div className="space-y-6">
              <form onSubmit={handleCheckEmail} className="space-y-6">
                <div className="space-y-3 text-right">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700 pr-1">אימייל</Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-left h-14 bg-white border-slate-200 group-hover:border-primary/50 transition-all duration-300 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 rounded-2xl" type="submit" disabled={loading}>
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "המשך עם סיסמה"}
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-400 font-medium">או</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full h-14 text-lg font-bold border-slate-200 hover:bg-slate-50 transition-all duration-200 rounded-2xl" 
                    onClick={handleMagicLink}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        <span>התחברות דרך אימייל (Magic Link)</span>
                      </div>
                    )}
                  </Button>
                </div>
              </form>
              
              <div className="text-center text-sm font-medium text-slate-500 pt-2">
                אין לך חשבון?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline transition-all">
                  הרשמה עכשיו
                </Link>
              </div>
            </div>
          )}

          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="flex items-center gap-2 mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                <div className="flex-1 truncate text-sm font-bold text-slate-600 text-left" dir="ltr">{email}</div>
                <Button variant="ghost" size="sm" onClick={() => setStep("email")} className="h-8 px-3 text-primary font-bold hover:text-primary/80 hover:bg-primary/5 rounded-xl transition-colors shrink-0">
                  שינוי
                </Button>
              </div>
              <div className="space-y-3 text-right">
                <div className="flex items-center justify-between flex-row-reverse mb-1 px-1">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">סיסמה</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline font-bold"
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
                  className="text-left h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                  dir="ltr"
                />
              </div>
              <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 rounded-2xl" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "התחברות"}
              </Button>
            </form>
          )}

          {step === "setup" && (
            <form onSubmit={handleSetupPassword} className="space-y-6">
              <div className="flex items-center gap-2 mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-inner">
                <div className="flex-1 truncate text-sm font-bold text-slate-600 text-left" dir="ltr">{email}</div>
                <Button variant="ghost" size="sm" onClick={() => setStep("email")} className="h-8 px-3 text-primary font-bold hover:text-primary/80 hover:bg-primary/5 rounded-xl shrink-0">
                  שינוי
                </Button>
              </div>
              <div className="space-y-4">
                <div className="space-y-3 text-right">
                  <Label htmlFor="newPassword" size="sm" className="font-semibold text-slate-700 pr-1">סיסמה חדשה</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                    className="text-left h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-3 text-right">
                  <Label htmlFor="confirmPassword" size="sm" className="font-semibold text-slate-700 pr-1">אימות סיסמה</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="text-left h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 rounded-2xl" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "הגדר סיסמה והתחבר"}
              </Button>
            </form>
          )}

          {step === "magic-link-sent" && (
            <div className="text-center space-y-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary mb-2 border border-primary/10 animate-bounce">
                <Mail className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">בדוק את האימייל שלך</h3>
                <p className="text-slate-500 text-sm">
                  שלחנו קישור התחברות לכתובת <strong>{email}</strong>.<br />
                  לחץ על הקישור כדי להיכנס למערכת.
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="w-full h-14 text-primary font-bold hover:bg-primary/5 rounded-2xl"
                onClick={() => setStep("email")}
              >
                חזרה להתחברות
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
