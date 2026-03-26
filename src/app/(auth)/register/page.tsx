"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="w-full">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-primary/5 text-primary lg:hidden border border-primary/10">
          <Loader2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold mb-3 text-slate-900 tracking-tight">הרשמה למערכת</h1>
        <p className="text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed text-base">
          צור חשבון חדש ב-Skale CRM כדי להתחיל לנהל את הלידים שלך
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-100 p-1 lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none shadow-xl shadow-slate-200/50">
        <div className="p-6 lg:p-0">
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3 text-right">
                <Label htmlFor="fullName" className="text-sm font-semibold text-slate-700 pr-1">שם מלא</Label>
                <Input
                  id="fullName"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="text-right h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                />
              </div>
              <div className="space-y-3 text-right">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700 pr-1">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-left h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                  dir="ltr"
                />
              </div>
              <div className="space-y-3 text-right">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700 pr-1">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="text-left h-14 bg-white border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/5"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-5 pt-2">
              <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 rounded-2xl" type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "הרשמה"}
              </Button>
              <div className="text-center text-sm font-medium text-slate-500">
                כבר יש לך חשבון?{" "}
                <Link href="/login" className="text-primary font-bold hover:underline transition-all">
                  התחברות כאן
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
