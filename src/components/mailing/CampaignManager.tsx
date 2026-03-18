"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, History, Mail } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { toast } from "sonner"

export function CampaignManager() {
  const { businessId } = useBusiness()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const supabase = createClient()

  const loadCampaigns = async () => {
    if (!businessId) return
    setLoading(true)
    const { data, error } = await supabase
      .from("email_campaigns")
      .select(`
        *,
        targeted_lists:email_campaign_lists(
          mailing_lists(name)
        )
      `)
      .eq("business_id", businessId)
      .order("sent_at", { ascending: false })

    if (error) {
      toast.error("שגיאה בטעינת קמפיינים")
    } else {
      setCampaigns(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadCampaigns()
  }, [businessId, supabase])

  if (!businessId) return null

  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.subject.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-10"
            placeholder="חיפוש קמפיין..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Link href="/mailing/send">
          <Button className="gap-2">
            <Send className="h-4 w-4" />
            קמפיין חדש
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם הקמפיין</TableHead>
              <TableHead className="text-right">נושא</TableHead>
              <TableHead className="text-right">רשימות תפוצה</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">תאריך שליחה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">טוען...</TableCell>
              </TableRow>
            ) : filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">אין קמפיינים</TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-muted-foreground">{campaign.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      {campaign.targeted_lists?.map((tl: any) => tl.mailing_lists.name).join(", ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`text-xs inline-flex px-2 py-1 rounded-full ${
                      campaign.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' :
                      campaign.status === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                      'bg-slate-500/10 text-slate-500'
                    }`}>
                      {campaign.status === 'sent' ? 'נשלח' :
                       campaign.status === 'failed' ? 'נכשל' :
                       campaign.status === 'draft' ? 'טיוטה' : campaign.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(campaign.sent_at).toLocaleDateString('he-IL', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
