"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Lock } from "lucide-react"

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות")
      return
    }
    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })

      if (error) throw error

      toast.success("הסיסמה עודכנה בהצלחה!")
      router.push("/dashboard")
      router.refresh()
    } catch (error: any) {
      toast.error("שגיאה בעדכון הסיסמה", { description: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold mb-3 text-slate-900 tracking-tight">בחירת סיסמה חדשה</h1>
        <p className="text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed text-base">
          הזן את הסיסמה החדשה שלך למטה
        </p>
      </div>

      <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-100 p-1 lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none shadow-xl shadow-slate-200/50">
        <div className="p-6 lg:p-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3 text-right">
                <Label htmlFor="password" size="sm" className="font-semibold text-slate-700 pr-1">סיסמה חדשה</Label>
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
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "עדכן סיסמה והיכנס למערכת"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
