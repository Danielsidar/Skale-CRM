import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SuperAdminSidebar } from "./SuperAdminSidebar"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: superAdmin } = await supabase
    .from("super_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single()

  if (!superAdmin) {
    redirect("/leads")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex" dir="rtl">
      <SuperAdminSidebar />
      <div className="flex-1 mr-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
