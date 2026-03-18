"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Bell, CheckCheck, Loader2, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/lib/hooks/useBusiness"
import {
  type Notification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationIcon,
  getNotificationRoute,
} from "@/lib/services/notifications"
import { formatDistanceToNow, format } from "date-fns"
import { he } from "date-fns/locale"

type FilterType = "all" | "unread"

export default function NotificationsPage() {
  const { businessId } = useBusiness()
  const supabase = createClient()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")

  const loadNotifications = useCallback(async () => {
    if (!businessId) return;
    setLoading(true)
    const { data } = await getNotifications(supabase, {
      businessId,
      limit: 100,
      unreadOnly: filter === "unread",
    })
    setNotifications(data || [])
    setLoading(false)
  }, [supabase, filter, businessId])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel("notifications-page-realtime")
      .on(
        "postgres_changes",
        { 
          event: "INSERT", 
          schema: "public", 
          table: "notifications",
          filter: `business_id=eq.${businessId}`
        },
        () => loadNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, loadNotifications, businessId])

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(supabase, notification.id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
    }

    const route = getNotificationRoute(notification.type, notification.entity_type, notification.entity_id)
    if (route) router.push(route)
  }

  const handleMarkAllRead = async () => {
    if (!businessId) return;
    await markAllAsRead(supabase, businessId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const groupedNotifications = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const dateKey = format(new Date(n.created_at), "yyyy-MM-dd")
    const today = format(new Date(), "yyyy-MM-dd")
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd")

    let label: string
    if (dateKey === today) label = "היום"
    else if (dateKey === yesterday) label = "אתמול"
    else label = format(new Date(n.created_at), "d בMMMM yyyy", { locale: he })

    if (!acc[label]) acc[label] = []
    acc[label].push(n)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" />
            התראות
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} התראות שלא נקראו` : "כל ההתראות נקראו"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs rounded-md"
              onClick={() => setFilter("all")}
            >
              הכל
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs rounded-md"
              onClick={() => setFilter("unread")}
            >
              לא נקראו
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              סמן הכל כנקרא
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">
            {filter === "unread" ? "אין התראות שלא נקראו" : "אין התראות"}
          </p>
          <p className="text-sm mt-1">
            התראות חדשות יופיעו כאן
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 px-1">
                {dateLabel}
              </h3>
              <div className="space-y-1">
                {items.map((notification) => (
                  <Card
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer hover:shadow-md transition-all border",
                      !notification.is_read && "bg-primary/5 border-primary/20"
                    )}
                    onClick={() => handleClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-relaxed", !notification.is_read && "font-semibold")}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!notification.is_read && (
                              <Badge variant="default" className="text-[10px] h-5">
                                חדש
                              </Badge>
                            )}
                          </div>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: he })}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
