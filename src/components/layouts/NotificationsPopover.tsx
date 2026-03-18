"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/lib/hooks/useBusiness"
import {
  type Notification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationIcon,
  getNotificationRoute,
} from "@/lib/services/notifications"
import { formatDistanceToNow } from "date-fns"
import { he } from "date-fns/locale"

export function NotificationsPopover() {
  const supabaseRef = useRef(createClient())
  const router = useRouter()
  const { businessId } = useBusiness()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const supabase = supabaseRef.current

  const loadNotifications = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [{ data }, count] = await Promise.all([
        getNotifications(supabase, { businessId, limit: 15 }),
        getUnreadCount(supabase, businessId),
      ])
      setNotifications(data)
      setUnreadCount(count)
    } catch (err) {
      console.error("Failed to load notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [supabase, businessId])

  useEffect(() => {
    if (!businessId) return
    loadNotifications()

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => loadNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, loadNotifications, supabase])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleMarkAsRead = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(supabase, notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    const route = getNotificationRoute(notification.type, notification.entity_type, notification.entity_id)
    if (route) {
      router.push(route)
      setOpen(false)
    }
  }

  const handleMarkAllRead = async () => {
    if (!businessId) return
    await markAllAsRead(supabase, businessId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative hover:bg-muted rounded-lg"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) loadNotifications()
        }}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[500] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold text-sm">התראות</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
                <CheckCheck className="h-3.5 w-3.5" />
                סמן הכל כנקרא
              </Button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[340px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">אין התראות חדשות</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleMarkAsRead(notification)}
                  className={cn(
                    "w-full text-right p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors flex gap-3",
                    !notification.is_read && "bg-primary/5"
                  )}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm leading-snug", !notification.is_read && "font-semibold")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full text-sm h-9 gap-1.5"
              onClick={() => { router.push("/notifications"); setOpen(false) }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              כל ההתראות
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
