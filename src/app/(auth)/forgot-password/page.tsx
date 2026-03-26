"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Mail, ArrowRight } from "lucide-react"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
      })

      if (error) throw error

      setSent(true)
      toast.success("קישור לאיפוס סיסמה נשלח לאימייל שלך!")
    } catch (error: any) {
      toast.error("שגיאה בשליחת קישור לאיפוס סיסמה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold mb-3 text-slate-900 tracking-tight">שכחת סיסמה?</h1>
        <p className="text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed text-base">
          {sent ? "בדוק את האימייל שלך לקבלת קישור לאיפוס הסיסמה" : "אל דאגה, קורה לכולם. הזן את האימייל שלך ונשלח לך קישור לאיפוס הסיסמה."}
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-100 p-1 lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none shadow-xl shadow-slate-200/50">
        <div className="p-6 lg:p-0">
          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "שלח לי קישור לאיפוס"}
                </Button>
                
                <div className="text-center pt-2">
                  <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary font-bold hover:underline transition-all">
                    <span>חזרה להתחברות</span>
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center space-y-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-primary mb-2 border border-primary/10 animate-bounce">
                <Mail className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">בדוק את האימייל שלך</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  שלחנו קישור לאיפוס סיסמה לכתובת <strong>{email}</strong>.<br />
                  לחץ על הקישור כדי לבחור סיסמה חדשה.
                </p>
              </div>
              <Button 
                variant="ghost" 
                className="w-full h-14 text-primary font-bold hover:bg-primary/5 rounded-2xl"
                onClick={() => setSent(false)}
              >
                לא קיבלתי אימייל, נסה שוב
              </Button>
              <div className="text-center pt-2">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 font-bold hover:underline transition-all">
                  <span>חזרה להתחברות</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
