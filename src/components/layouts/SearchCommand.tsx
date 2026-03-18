"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Search, Target, Users, UserCheck, Package, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useBusiness } from "@/lib/hooks/useBusiness"

interface SearchResult {
  id: string
  type: "lead" | "contact" | "customer" | "product"
  title: string
  subtitle: string
}

const typeConfig = {
  lead: { label: "ליד", icon: Target, color: "text-orange-500" },
  contact: { label: "איש קשר", icon: Users, color: "text-blue-500" },
  customer: { label: "לקוח", icon: UserCheck, color: "text-green-500" },
  product: { label: "מוצר", icon: Package, color: "text-purple-500" },
}

export function SearchCommand() {
  const supabase = createClient()
  const router = useRouter()
  const { businessId } = useBusiness()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  const doSearch = useCallback(
    async (term: string) => {
      if (!term.trim() || term.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      const searchTerm = `%${term}%`

      const orgFilter = businessId ? { organization_id: businessId } : {}

      const [leads, contacts, customers, products] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, email, phone")
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("contacts")
          .select("id, name, email, phone")
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("customers")
          .select("id, name, email, phone")
          .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("products")
          .select("id, name, description")
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5),
      ])

      const mapped: SearchResult[] = [
        ...(leads.data ?? []).map((l) => ({
          id: l.id,
          type: "lead" as const,
          title: l.name,
          subtitle: [l.email, l.phone].filter(Boolean).join(" · ") || "ליד",
        })),
        ...(contacts.data ?? []).map((c) => ({
          id: c.id,
          type: "contact" as const,
          title: c.name,
          subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || "איש קשר",
        })),
        ...(customers.data ?? []).map((c) => ({
          id: c.id,
          type: "customer" as const,
          title: c.name,
          subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || "לקוח",
        })),
        ...(products.data ?? []).map((p) => ({
          id: p.id,
          type: "product" as const,
          title: p.name,
          subtitle: p.description || "מוצר",
        })),
      ]

      setResults(mapped)
      setSelectedIndex(0)
      setLoading(false)
    },
    [supabase, businessId]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const handleSelect = (result: SearchResult) => {
    const routes: Record<string, string> = {
      lead: "/leads",
      contact: "/contacts",
      customer: "/customers",
      product: "/products",
    }
    router.push(routes[result.type] || "/dashboard")
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex relative w-64 ml-4 items-center"
      >
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          readOnly
          placeholder="חיפוש... ⌘K"
          className="pr-10 bg-muted/50 border-border cursor-pointer text-right rounded-lg pointer-events-none"
          tabIndex={-1}
        />
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
        <div
          className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-4 border-b">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="חיפוש לידים, אנשי קשר, לקוחות, מוצרים..."
              className="flex-1 h-14 bg-transparent outline-none text-sm text-right"
              dir="rtl"
            />
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : query.length > 0 && results.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                לא נמצאו תוצאות עבור &quot;{query}&quot;
              </div>
            ) : results.length > 0 ? (
              <div className="p-2">
                {results.map((result, index) => {
                  const config = typeConfig[result.type]
                  const Icon = config.icon
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors",
                        index === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                הקלד לפחות 2 תווים כדי לחפש
              </div>
            )}
          </div>

          <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>↑↓ ניווט</span>
            <span>↵ בחירה</span>
            <span>ESC סגירה</span>
          </div>
        </div>
      </div>
    </>
  )
}
