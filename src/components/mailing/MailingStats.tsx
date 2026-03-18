"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Card, CardContent } from "@/components/ui/card"
import { Users, Mail, Layout, Send, ArrowUpRight, ArrowDownRight } from "lucide-react"

export function MailingStats() {
  const { businessId } = useBusiness()
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalLists: 0,
    totalTemplates: 0,
    totalCampaigns: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadStats = async () => {
      if (!businessId) return
      
      const [subsRes, listsRes, templatesRes, campaignsRes] = await Promise.all([
        supabase.from("mailing_list_contacts").select("contact_id", { count: "exact", head: true }),
        supabase.from("mailing_lists").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("email_templates").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("email_campaigns").select("id", { count: "exact", head: true }).eq("business_id", businessId)
      ])

      setStats({
        totalSubscribers: subsRes.count || 0,
        totalLists: listsRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        totalCampaigns: campaignsRes.count || 0
      })
      setLoading(false)
    }

    loadStats()
  }, [businessId, supabase])

  const statCards = [
    {
      title: 'סה"כ נרשמים',
      value: stats.totalSubscribers,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: "+12%",
      trendUp: true
    },
    {
      title: 'רשימות תפוצה',
      value: stats.totalLists,
      icon: Mail,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      trend: "+2",
      trendUp: true
    },
    {
      title: 'תבניות מעוצבות',
      value: stats.totalTemplates,
      icon: Layout,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      trend: "0%",
      trendUp: true
    },
    {
      title: 'קמפיינים שנשלחו',
      value: stats.totalCampaigns,
      icon: Send,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: "+5",
      trendUp: true
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((card, i) => (
        <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden group hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${card.trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                {card.trend}
                {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {loading ? "..." : card.value.toLocaleString()}
              </p>
            </div>
          </CardContent>
          <div className={`absolute bottom-0 left-0 h-1 w-full opacity-20 ${card.bg.replace('bg-', 'bg-')}`} />
        </Card>
      ))}
    </div>
  )
}
