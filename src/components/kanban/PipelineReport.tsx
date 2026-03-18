"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from "recharts"
import { Database } from "@/types/database.types"
import { formatCurrency } from "@/lib/utils"
import { Users, DollarSign, Target, CheckCircle2 } from "lucide-react"

type Stage = Database["public"]["Tables"]["stages"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

interface PipelineReportProps {
  stages: Stage[]
  deals: Deal[]
  showCharts?: boolean
}

export function PipelineReport({ stages, deals, showCharts = true }: PipelineReportProps) {
  // Calculate statistics
  const totalValue = deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
  const wonDeals = deals.filter(d => stages.find(s => s.id === d.stage_id)?.is_won)
  const lostDeals = deals.filter(d => stages.find(s => s.id === d.stage_id)?.is_lost)
  const wonValue = wonDeals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
  const winRate = deals.length > 0 ? (wonDeals.length / deals.length) * 100 : 0

  // Data for deals per stage
  const stageData = stages.map(stage => ({
    name: stage.name,
    count: deals.filter(d => d.stage_id === stage.id).length,
    value: deals.filter(d => d.stage_id === stage.id).reduce((sum, d) => sum + (Number(d.value) || 0), 0)
  }))

  // Data for won vs lost
  const statusData = [
    { name: "זכייה", value: wonDeals.length, color: "#10b981" },
    { name: "הפסד", value: lostDeals.length, color: "#ef4444" },
    { name: "בתהליך", value: deals.length - wonDeals.length - lostDeals.length, color: "#3b82f6" }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6 pb-12">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ערך כולל</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">מכל העיסקאות בפייפליין</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">עיסקאות שנסגרו</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(wonValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{wonDeals.length} עיסקאות מוצלחות</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">אחוז המרה</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">יחס סגירה מוצלח</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סה"כ עיסקאות</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">פעילות בפייפליין</p>
          </CardContent>
        </Card>
      </div>

      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deals per Stage Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">פיזור עיסקאות לפי שלבים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="מספר עיסקאות" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Won vs Lost Pie Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">סטטוס עיסקאות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground font-bold text-xl"
                    >
                      {deals.length}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4">
                  {statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-xs font-medium text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Deals */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">עיסקאות מובילות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deals
                  .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                  .slice(0, 5)
                  .map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium truncate max-w-[150px]">{deal.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {stages.find(s => s.id === deal.stage_id)?.name || "ללא שלב"}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-primary">{formatCurrency(deal.value || 0)}</span>
                    </div>
                  ))}
                {deals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    אין עיסקאות להצגה
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Value per Stage */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold">שווי עיסקאות לפי שלב</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={12} width={100} />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value as number)}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="שווי כולל" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
