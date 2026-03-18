"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { User, Settings, LogOut, HelpCircle, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { NotificationsPopover } from "./NotificationsPopover"
import { SearchCommand } from "./SearchCommand"

const roleLabels: Record<string, string> = {
  admin: "מנהל",
  manager: "מנהל צוות",
  agent: "נציג",
}

export function Header() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const { businesses, businessId } = useBusiness()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")

  const activeBusiness = businesses.find((b) => b.id === businessId)
  const userRole = activeBusiness?.role ?? ""

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setDisplayName(user.user_metadata?.full_name || "משתמש")
        setEmail(user.email ?? "")
      }
    })
  }, [supabase])

  const initials = displayName.substring(0, 2) || "?"

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="flex h-16 items-center justify-end px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <SearchCommand />
          <NotificationsPopover />

          <div className="h-8 w-[1px] bg-border" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto px-2 py-1.5 hover:bg-muted rounded-xl transition-all flex items-center gap-3 flex-row-reverse">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {initials}
                </div>
                <div className="flex-col text-right hidden sm:flex">
                  <span className="text-sm font-semibold">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground">{roleLabels[userRole] || userRole}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 mt-2 rounded-xl">
              <DropdownMenuLabel className="text-right p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">{displayName}</span>
                  <span className="text-xs text-muted-foreground font-normal">{email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} className="text-right justify-end gap-2 cursor-pointer">
                <span>הפרופיל שלי</span>
                <User className="h-4 w-4" />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/settings")} className="text-right justify-end gap-2 cursor-pointer">
                <span>הגדרות</span>
                <Settings className="h-4 w-4" />
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="text-right justify-end gap-2 cursor-pointer">
                <a href="https://wa.me/972507071601?text=%D7%94%D7%99%D7%99%2C%20%D7%90%D7%A9%D7%9E%D7%97%20%D7%9C%D7%A7%D7%91%D7%9C%20%D7%AA%D7%9E%D7%99%D7%9B%D7%94%20%D7%98%D7%9B%D7%A0%D7%99%D7%AA" target="_blank" rel="noopener noreferrer">
                  <span>תמיכה טכנית</span>
                  <HelpCircle className="h-4 w-4" />
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive text-right justify-end gap-2 cursor-pointer font-semibold"
                onClick={handleLogout}
              >
                <span>התנתקות</span>
                <LogOut className="h-4 w-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
