"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useTierFeatures } from "@/lib/hooks/useTierFeatures"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowRight, Terminal, Copy, Check, Zap, Info, FileCode, Code, Key, Plus, Trash2, Eye, EyeOff, Lock } from "lucide-react"
import { toast } from "sonner"
import { getApiKeys, createApiKey, deleteApiKey } from "@/lib/services/api-keys"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const ENDPOINTS = [
  { id: "create_lead", name: "הוספת ליד חדש", method: "POST", path: "/api/v1/leads" },
  { id: "create_customer", name: "הוספת לקוח חדש", method: "POST", path: "/api/v1/customers" },
  { id: "create_product", name: "הוספת מוצר חדש", method: "POST", path: "/api/v1/products" },
  { id: "list_customers", name: "רשימת לקוחות", method: "GET", path: "/api/v1/customers" },
  { id: "add_timeline_note", name: "הוספת הודעה לטיימליין", method: "POST", path: "/api/v1/contacts/timeline" },
]

export default function ApiPage() {
  const { businessId } = useBusiness()
  const { features, loading: featuresLoading } = useTierFeatures()
  const router = useRouter()
  const [keys, setKeys] = useState<any[]>([])
  const [pipelines, setPipelines] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, any>>({
    full_name: "ישראל ישראלי",
    email: "israel@example.com",
    phone: "050-1234567",
    source: "API",
    value: 100,
    product_id: null,
  })
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeCodeTab, setActiveCodeTab] = useState("curl")

  // API Key Management State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  const supabase = createClient()

  const loadData = async () => {
    if (!businessId) return
    try {
      setLoading(true)
      const [keysData, pipelinesData, productsData] = await Promise.all([
        getApiKeys(businessId!).catch(err => {
          console.error("Failed to load API keys:", err);
          return [];
        }),
        supabase.from("pipelines").select("id, name, product_id").eq("business_id", businessId),
        supabase.from("products").select("id, name, price").eq("business_id", businessId),
      ])
      setKeys(keysData)
      if (keysData.length > 0 && !selectedKey) {
        setSelectedKey(keysData[0].key_plain || keysData[0].key_prefix + "••••••••")
      }
      setPipelines(pipelinesData.data || [])
      setProducts(productsData.data || [])
      
      if (pipelinesData.data?.[0]) {
        const { data: stagesData } = await supabase
          .from("stages")
          .select("id, name, pipeline_id")
          .eq("pipeline_id", pipelinesData.data[0].id)
          .order("position", { ascending: true })
        setStages(stagesData || [])
        
        if (!params.pipeline_id) {
          const firstPipeline = pipelinesData.data[0];
          const firstProduct = productsData.data?.find(p => p.id === firstPipeline.product_id);
          
          setParams(p => ({ 
            ...p, 
            pipeline_id: firstPipeline.id, 
            stage_id: stagesData?.[0]?.id,
            product_id: firstPipeline.product_id,
            value: firstProduct ? firstProduct.price : p.value
          }))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [businessId])

  useEffect(() => {
    if (params.pipeline_id) {
      // Find the pipeline to get its default product
      const pipeline = pipelines.find(p => p.id === params.pipeline_id)
      if (pipeline) {
        const product = products.find(prod => prod.id === pipeline.product_id)
        setParams(p => ({ 
          ...p, 
          product_id: pipeline.product_id,
          value: product ? product.price : p.value
        }))
      }

      supabase
        .from("stages")
        .select("id, name")
        .eq("pipeline_id", params.pipeline_id)
        .order("position", { ascending: true })
        .then(({ data }) => {
          setStages(data || [])
          if (data?.[0]) setParams(p => ({ ...p, stage_id: data[0].id }))
        })
    }
  }, [params.pipeline_id])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://skale-crm.com'

  const snippets = useMemo(() => {
    const url = `${baseUrl}${selectedEndpoint.path}`
    const apiKey = selectedKey || "YOUR_API_KEY"
    
    let bodyObj: any = {}
    if (selectedEndpoint.id === "create_lead") {
      bodyObj = {
        full_name: params.full_name,
        email: params.email,
        phone: params.phone,
        source: params.source,
        value: Number(params.value),
        pipeline_id: params.pipeline_id,
        stage_id: params.stage_id,
        product_id: params.product_id,
      }
    } else if (selectedEndpoint.id === "create_customer") {
      bodyObj = {
        name: params.name || "שם העסק",
        contact_name: params.full_name,
        email: params.email,
        phone: params.phone,
        source: params.source,
        notes: params.notes,
      }
    } else if (selectedEndpoint.id === "create_product") {
      bodyObj = {
        name: params.product_name || "שם המוצר",
        description: params.description || "תיאור המוצר",
        price: Number(params.price || 0),
      }
    } else if (selectedEndpoint.id === "add_timeline_note") {
      bodyObj = {
        contact_email: params.email || "israel@example.com",
        type: params.activity_type || "note",
        content: params.activity_content || "תוכן ההודעה",
      }
    }

    const jsonBody = JSON.stringify(bodyObj, null, 2)

    const curl = selectedEndpoint.method === "POST" 
      ? `curl -X POST ${url} \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${jsonBody}'`
      : `curl -X GET ${url} \\
  -H "Authorization: Bearer ${apiKey}"`

    const javascript = selectedEndpoint.method === "POST"
      ? `fetch("${url}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${jsonBody})
})
.then(res => res.json())
.then(console.log);`
      : `fetch("${url}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${apiKey}"
  }
})
.then(res => res.json())
.then(console.log);`

    const makeModuleObj = {
      subflows: [
        {
          flow: [
            {
              id: 1,
              module: "http:MakeRequest",
              version: 4,
              parameters: {
                authenticationType: "noAuth",
                tlsType: "",
                proxyKeychain: "",
              },
              mapper: {
                url,
                method: selectedEndpoint.method.toLowerCase(),
                headers: [
                  { name: "Authorization", value: `Bearer ${apiKey}` },
                  { name: "Content-Type", value: "application/json" },
                ],
                contentType: "json",
                parseResponse: true,
                stopOnHttpError: true,
                allowRedirects: true,
                shareCookies: false,
                requestCompressedContent: true,
                inputMethod: "jsonString",
                jsonStringBodyContent: JSON.stringify(bodyObj, null, 2),
              },
              metadata: {
                designer: { x: 0, y: 0 },
                restore: {
                  parameters: {
                    authenticationType: { label: "No authenticationUse when no credentials are required for the request." },
                    tlsType: { label: "Empty" },
                    proxyKeychain: { label: "Choose a key" },
                  },
                  expect: {
                    method: { mode: "chose", label: selectedEndpoint.method },
                    headers: { mode: "chose", items: [null] },
                    queryParameters: { mode: "chose" },
                    contentType: { label: "application/jsonEnter data in the JSON format, as a string or using a data structure." },
                    parseResponse: { mode: "chose" },
                    stopOnHttpError: { mode: "chose" },
                    allowRedirects: { mode: "chose" },
                    shareCookies: { mode: "chose" },
                    requestCompressedContent: { mode: "chose" },
                    inputMethod: { label: "JSON stringEnter the JSON body as a raw text string. If values contain JSON reserved characters, you must escape them manually." },
                    paginationType: { label: "Empty" },
                  },
                },
                parameters: [
                  { name: "authenticationType", type: "select", label: "Authentication type", required: true, validate: { enum: ["noAuth", "apiKey", "basicAuth", "oAuth"] } },
                  { name: "tlsType", type: "select", label: "Transport layer security (TLS)", validate: { enum: ["mTls", "tls"] } },
                  { name: "proxyKeychain", type: "keychain:proxy", label: "Proxy" },
                ],
                expect: [
                  { name: "url", type: "url", label: "URL", required: true },
                  { name: "method", type: "select", label: "Method", required: true, validate: { enum: ["get", "head", "post", "put", "patch", "delete", "options"] } },
                  { name: "headers", type: "array", label: "Headers", spec: { name: "value", label: "Header", type: "collection", spec: [{ name: "name", label: "Name", type: "text", required: true, validate: { pattern: "^[-!#$%&'*+.^_`|~0-9A-Za-z]+$" } }, { name: "value", label: "Value", type: "text" }] } },
                  { name: "queryParameters", type: "array", label: "Query parameters", spec: { name: "value", label: "Parameter", type: "collection", spec: [{ name: "name", label: "Name", type: "text", required: true }, { name: "value", label: "Value", type: "text" }] } },
                  { name: "contentType", type: "select", label: "Body content type", validate: { enum: ["json", "multipart", "urlEncoded", "custom"] } },
                  { name: "parseResponse", type: "boolean", label: "Parse response", required: true },
                  { name: "stopOnHttpError", type: "boolean", label: "Return error if HTTP request fails", required: true },
                  { name: "timeout", type: "uinteger", label: "Timeout", validate: { min: 1, max: 300 } },
                  { name: "allowRedirects", type: "boolean", label: "Allow redirects", required: true },
                  { name: "shareCookies", type: "boolean", label: "Share cookies with other HTTP modules", required: true },
                  { name: "requestCompressedContent", type: "boolean", label: "Request compressed content", required: true },
                  { name: "inputMethod", type: "select", label: "Body input method", required: true, validate: { enum: ["dataStructure", "jsonString"] } },
                  { name: "jsonStringBodyContent", type: "text", label: "Body content", required: true },
                  { name: "paginationType", type: "select", label: "Pagination type", validate: { enum: ["offsetBased", "pageBased", "urlBased", "tokenBased"] } },
                ],
                interface: [
                  { name: "data", label: "Data", type: "any" },
                  { name: "statusCode", label: "Status Code", type: "number" },
                  { name: "headers", label: "Headers", type: "collection", spec: [{ name: "content-length", label: "Content-Length", type: "text" }, { name: "content-encoding", label: "Content-Encoding", type: "text" }, { name: "content-type", label: "Content-Type", type: "text" }, { name: "server", label: "Server", type: "text" }, { name: "cache-control", label: "Cache-Control", type: "text" }, { name: "set-cookie", label: "Set-Cookie", type: "array", spec: { type: "text" } }] },
                ],
              },
            },
          ],
        },
      ],
      metadata: {
        version: 1,
        scenario: {
          roundtrips: 1,
          maxErrors: 3,
          autoCommit: true,
          autoCommitTriggerLast: true,
          sequential: false,
          slots: null,
          confidential: false,
          dataloss: false,
          dlq: false,
          freshVariables: false,
        },
        designer: { orphans: [] },
        zone: "eu2.make.com",
        notes: [],
      },
    }

    const make = JSON.stringify(makeModuleObj, null, 2)

    return { curl, javascript, make }
  }, [selectedEndpoint, selectedKey, params, baseUrl])

  const copyToClipboard = (text: string, type: 'code' | 'key') => {
    navigator.clipboard.writeText(text)
    if (type === 'code') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    }
    toast.success("הועתק ללוח")
  }

  // API Key Actions
  async function handleCreateKey() {
    if (!newKeyName || !businessId) return
    if (!features.api_access) {
      toast.error("גישת API לא זמינה במסלול שלך")
      return
    }
    if (features.max_api_keys !== null && keys.length >= features.max_api_keys) {
      toast.error(`הגעת למגבלת מפתחות ה-API (${features.max_api_keys})`)
      return
    }
    try {
      setIsCreating(true)
      const result = await createApiKey(newKeyName, businessId)
      setRevealedKey(result.key)
      setIsCreateDialogOpen(false)
      setNewKeyName("")
      loadData()
      toast.success("מפתח API נוצר בהצלחה")
    } catch (error) {
      toast.error("שגיאה ביצירת מפתח API")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("האם אתה בטוח שברצונך למחוק מפתח זה? לא ניתן יהיה להשתמש בו יותר.")) return
    try {
      await deleteApiKey(id)
      setKeys(keys.filter((k) => k.id !== id))
      toast.success("המפתח נמחק בהצלחה")
    } catch (error) {
      toast.error("שגיאה במחיקת המפתח")
    }
  }

  useEffect(() => {
    if (!featuresLoading && !features.api_access) {
      router.replace("/dashboard")
    }
  }, [features.api_access, featuresLoading, router])

  if (!businessId || (!featuresLoading && !features.api_access)) return null

  return (
    <div className="space-y-8 pb-12" dir="rtl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">מרכז ה-API</h1>
        <p className="text-slate-500 text-sm font-medium">ניהול מפתחות, דוקומנטציה ומחולל קוד במקום אחד</p>
      </div>

      {features.max_api_keys !== null && keys.length >= features.max_api_keys && (
        <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
          <Lock className="h-5 w-5 shrink-0 text-orange-600" />
          <div>
            <p className="font-bold text-sm">הגעת למגבלת מפתחות ה-API ({keys.length}/{features.max_api_keys})</p>
            <p className="text-xs mt-0.5 text-orange-700">שדרג את המסלול שלך כדי ליצור מפתחות נוספים.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="docs" className="w-full">
        <TabsList className="mb-8 bg-slate-100 p-1">
          <TabsTrigger value="docs" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <FileCode className="h-4 w-4" />
            תיעוד ומחולל
          </TabsTrigger>
          <TabsTrigger value="keys" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Key className="h-4 w-4" />
            מפתחות API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Generator Controls */}
            <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 font-bold">
                    <Zap className="h-5 w-5 text-primary" />
                    הגדרות המחולל
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-500">בחר פעולה ופרמטרים ליצירת קוד</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">מפתח API</Label>
                    <Select value={selectedKey || ""} onValueChange={setSelectedKey}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all">
                        <SelectValue placeholder="בחר מפתח API" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {keys.length === 0 ? (
                          <SelectItem value="none" disabled>אין מפתחות פעילים</SelectItem>
                        ) : (
                          keys.map(k => (
                            <SelectItem key={k.id} value={k.key_plain || k.key_prefix + "••••••••"}>{k.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold">פעולה</Label>
                    <Select 
                      value={selectedEndpoint.id} 
                      onValueChange={(id) => setSelectedEndpoint(ENDPOINTS.find(e => e.id === id)!)}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {ENDPOINTS.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic Fields based on Endpoint */}
                  {selectedEndpoint.id === "create_lead" && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">שם מלא</Label>
                        <Input 
                          value={params.full_name} 
                          onChange={e => setParams(p => ({ ...p, full_name: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold text-xs">פייפליין</Label>
                          <Select value={params.pipeline_id} onValueChange={v => setParams(p => ({ ...p, pipeline_id: v }))}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all text-xs h-9"><SelectValue /></SelectTrigger>
                            <SelectContent dir="rtl">
                              {pipelines.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 font-bold text-xs">שלב</Label>
                          <Select value={params.stage_id} onValueChange={v => setParams(p => ({ ...p, stage_id: v }))}>
                            <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all text-xs h-9"><SelectValue /></SelectTrigger>
                            <SelectContent dir="rtl">
                              {stages.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">מוצר מקושר</Label>
                        <Select 
                          value={params.product_id || "none"} 
                          onValueChange={v => {
                            const productId = v === "none" ? null : v
                            const product = products.find(p => p.id === productId)
                            setParams(p => ({ 
                              ...p, 
                              product_id: productId,
                              value: product ? product.price : p.value
                            }))
                          }}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all">
                            <SelectValue placeholder="בחר מוצר..." />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="none">ללא מוצר</SelectItem>
                            {products.map(product => (
                              <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">מקור (Source)</Label>
                        <Input 
                          value={params.source} 
                          onChange={e => setParams(p => ({ ...p, source: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">סכום (Value)</Label>
                        <Input 
                          type="number" 
                          value={params.value} 
                          onChange={e => setParams(p => ({ ...p, value: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.id === "create_customer" && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">שם עסק/לקוח</Label>
                        <Input 
                          value={params.name || ""} 
                          onChange={e => setParams(p => ({ ...p, name: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">שם איש קשר</Label>
                        <Input 
                          value={params.full_name} 
                          onChange={e => setParams(p => ({ ...p, full_name: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">אימייל</Label>
                        <Input 
                          value={params.email} 
                          onChange={e => setParams(p => ({ ...p, email: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.id === "create_product" && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">שם המוצר</Label>
                        <Input 
                          value={params.product_name || ""} 
                          onChange={e => setParams(p => ({ ...p, product_name: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">מחיר</Label>
                        <Input 
                          type="number" 
                          value={params.price || 0} 
                          onChange={e => setParams(p => ({ ...p, price: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {selectedEndpoint.id === "add_timeline_note" && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">אימייל איש קשר</Label>
                        <Input
                          value={params.email || ""}
                          onChange={e => setParams(p => ({ ...p, email: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all text-left"
                          dir="ltr"
                          placeholder="israel@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">סוג פעילות</Label>
                        <Select
                          value={params.activity_type || "note"}
                          onValueChange={v => setParams(p => ({ ...p, activity_type: v }))}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 focus:bg-white transition-all">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            <SelectItem value="note">הערה</SelectItem>
                            <SelectItem value="call">שיחה</SelectItem>
                            <SelectItem value="email">מייל</SelectItem>
                            <SelectItem value="meeting">פגישה</SelectItem>
                            <SelectItem value="message">הודעה</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold">תוכן</Label>
                        <Input
                          value={params.activity_content || ""}
                          onChange={e => setParams(p => ({ ...p, activity_content: e.target.value }))}
                          className="bg-slate-50 border-slate-200 focus:bg-white transition-all"
                          placeholder="תוכן ההודעה..."
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Code Preview and Documentation */}
            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
              <Card className="overflow-hidden border-slate-200 shadow-md bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        "font-mono font-bold px-2 py-1 rounded-md",
                        selectedEndpoint.method === "POST" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200" : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"
                      )} variant="outline">{selectedEndpoint.method}</Badge>
                      <code className="text-sm font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-1 rounded-md" dir="ltr">{selectedEndpoint.path}</code>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(activeCodeTab === "make" ? snippets.make : activeCodeTab === "js" ? snippets.javascript : snippets.curl, 'code')} className="h-9 gap-2 border-slate-200 font-bold">
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-400" />}
                        {copied ? "הועתק!" : "העתק קוד"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="curl" className="w-full" onValueChange={setActiveCodeTab}>
                    <div className="px-4 border-b border-slate-100 bg-slate-50/30">
                      <TabsList className="h-12 bg-transparent gap-6">
                        <TabsTrigger value="curl" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-slate-500 data-[state=active]:text-primary">cURL</TabsTrigger>
                        <TabsTrigger value="js" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-slate-500 data-[state=active]:text-primary">JavaScript</TabsTrigger>
                        <TabsTrigger value="make" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none font-bold text-slate-500 data-[state=active]:text-primary">Make Module</TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="curl" className="m-0">
                      <pre className="p-6 text-[13px] font-mono overflow-auto bg-slate-900 text-slate-100 min-h-[250px] text-left ltr selection:bg-primary/30 scrollbar-thin scrollbar-thumb-slate-700">
                        {snippets.curl}
                      </pre>
                    </TabsContent>
                    <TabsContent value="js" className="m-0">
                      <pre className="p-6 text-[13px] font-mono overflow-auto bg-slate-900 text-slate-100 min-h-[250px] text-left ltr selection:bg-primary/30 scrollbar-thin scrollbar-thumb-slate-700">
                        {snippets.javascript}
                      </pre>
                    </TabsContent>
                    <TabsContent value="make" className="m-0">
                      <pre className="p-6 text-[13px] font-mono overflow-auto bg-slate-900 text-slate-100 min-h-[250px] text-left ltr selection:bg-primary/30 scrollbar-thin scrollbar-thumb-slate-700">
                        {snippets.make}
                      </pre>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
                    <Info className="h-5 w-5 text-blue-500" />
                    הוראות שימוש
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6 text-sm">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                    <p className="font-medium text-slate-700">המערכת תומכת באינטגרציה דרך REST API פשוט. כל הבקשות צריכות לכלול את הכותרות הבאות:</p>
                    <ul className="space-y-2 font-mono text-xs" dir="ltr">
                      <li className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg text-slate-600">
                        <Badge variant="outline" className="text-[10px] uppercase">Header</Badge>
                        <span>Authorization: Bearer YOUR_API_KEY</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-lg text-slate-600">
                        <Badge variant="outline" className="text-[10px] uppercase">Header</Badge>
                        <span>Content-Type: application/json</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                      <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        טיפים חשובים:
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-emerald-700/80 leading-relaxed">
                        <li>המערכת מבצעת חיפוש אוטומטי של איש קשר קיים לפי אימייל או טלפון.</li>
                        <li>אם לא תשלח <code className="text-xs bg-emerald-100/50 px-1 rounded">pipeline_id</code>, הליד ייכנס לפייפליין ברירת המחדל.</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        דגשים למפתחים:
                      </h3>
                      <ul className="list-disc list-inside space-y-2 text-blue-700/80 leading-relaxed">
                        <li>השתמש במחולל מימין כדי לראות את מבנה ה-JSON הנדרש.</li>
                        <li>התשובות חוזרות במבנה JSON סטנדרטי עם קודי שגיאה מתאימים.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="keys">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50/30 border-b border-slate-100">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">מפתחות פעילים</CardTitle>
                <CardDescription className="font-medium text-slate-500">נהל את מפתחות הגישה של העסק שלך</CardDescription>
              </div>
              <Button
                onClick={() => {
                  if (!features.api_access) { toast.error("גישת API לא זמינה במסלול שלך"); return }
                  if (features.max_api_keys !== null && keys.length >= features.max_api_keys) { toast.error(`הגעת למגבלת מפתחות ה-API (${features.max_api_keys})`); return }
                  setIsCreateDialogOpen(true)
                }}
                className="gap-2 font-bold h-10 px-5 shadow-sm"
                disabled={!features.api_access || (features.max_api_keys !== null && keys.length >= features.max_api_keys)}
              >
                {(!features.api_access || (features.max_api_keys !== null && keys.length >= features.max_api_keys)) ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                מפתח חדש
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Key className="h-8 w-8 opacity-40 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-500">לא נמצאו מפתחות API פעילים</p>
                  <Button variant="link" onClick={() => setIsCreateDialogOpen(true)} className="text-primary font-bold">
                    צור את המפתח הראשון שלך
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="text-right font-bold text-slate-700 py-4 min-w-[150px]">שם המפתח</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 py-4 min-w-[200px]">מפתח API</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 py-4 min-w-[150px]">נוצר ב-</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 py-4 min-w-[150px]">שימוש אחרון</TableHead>
                      <TableHead className="text-left font-bold text-slate-700 py-4 w-[100px]">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key) => (
                      <TableRow key={key.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-bold text-slate-900 py-4 text-right">{key.name}</TableCell>
                        <TableCell className="py-4 text-right">
                          <code className="bg-slate-100 px-2 py-1 rounded text-xs font-mono ltr inline-block text-slate-600 border border-slate-200">
                            {key.key_plain || key.key_prefix + "••••••••"}
                          </code>
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium py-4 text-right">
                          {new Date(key.created_at).toLocaleDateString("he-IL", { day: 'numeric', month: 'long', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium py-4 text-right">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString("he-IL", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "מעולם לא"}
                        </TableCell>
                        <TableCell className="text-left py-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-destructive hover:bg-destructive/5 transition-colors"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white" dir="rtl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 text-right">יצירת מפתח API חדש</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="space-y-3 text-right">
              <Label htmlFor="name" className="text-sm font-bold text-slate-700">שם המפתח (למשל: Zapier, Webhook)</Label>
              <Input
                id="name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="הכנס שם למפתח..."
                className="h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl text-lg font-medium text-right"
              />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 flex flex-row-reverse gap-3 border-t border-slate-100">
            <Button 
              onClick={handleCreateKey} 
              disabled={!newKeyName || isCreating}
              className="flex-1 h-11 font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              {isCreating ? "יוצר..." : "צור מפתח חדש"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              className="flex-1 h-11 font-bold rounded-xl border-slate-200"
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reveal Key Dialog */}
      <Dialog open={!!revealedKey} onOpenChange={() => revealedKey && setRevealedKey(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-white" dir="rtl">
          <DialogHeader className="p-6 bg-emerald-50 border-b border-emerald-100 text-right">
            <DialogTitle className="text-xl font-black text-emerald-700">המפתח שלך מוכן!</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm font-bold leading-relaxed shadow-sm">
              <div className="flex gap-2 mb-1">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>שים לב! זהו הפעם היחידה שתוכל לראות את המפתח הזה.</span>
              </div>
              <p className="mr-6">העתק אותו ושמור אותו במקום בטוח כבר עכשיו.</p>
            </div>
            
            <div className="relative group">
              <div className="flex items-center gap-2 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-inner">
                <code className="flex-1 font-mono text-sm break-all text-left ltr text-emerald-400">
                  {revealedKey}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  onClick={() => revealedKey && copyToClipboard(revealedKey, 'key')}
                >
                  {keyCopied ? <Check className="h-5 w-5 text-emerald-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button onClick={() => setRevealedKey(null)} className="w-full h-12 font-bold text-lg rounded-xl shadow-lg shadow-primary/20">
              סיימתי, שמרתי את המפתח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
