"use client"

import { Suspense, useEffect, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { EmailBuilder } from "@/components/mailing/builder/EmailBuilder"
import { createClient } from "@/lib/supabase/client"
import { useBusiness } from "@/lib/hooks/useBusiness"
import { useSidebarStore } from "@/lib/store"
import { generateEmailHTML } from "@/lib/mailing/email-html-generator"
import { useMailingWizardStore } from "@/lib/mailing/wizard-store"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function TemplateBuilderPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <TemplateBuilderContent />
    </Suspense>
  )
}

function TemplateBuilderContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { businessId } = useBusiness()
  const { setCollapsed } = useSidebarStore()
  const { 
    setEmailJson, 
    setEmailHtml, 
    setSelectedTemplateId, 
    setDesignMethod, 
    setIsDesigningExternally, 
    setStep 
  } = useMailingWizardStore()
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(!!params.id && params.id !== 'new')
  const supabase = createClient()

  const campaignMode = searchParams.get('campaignMode') === 'true'
  const initialName = searchParams.get('name')

  // Collapse sidebar on enter, restore on exit
  useEffect(() => {
    setCollapsed(true)
    return () => setCollapsed(false)
  }, [setCollapsed])

  useEffect(() => {
    if (params.id && params.id !== 'new' && businessId) {
      const loadTemplate = async () => {
        // Try to select everything to see what columns exist
        const { data, error } = await supabase
          .from("email_templates")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) {
          console.error("Load error:", error)
          toast.error("שגיאה בטעינת תבנית")
          router.push("/mailing/templates")
        } else {
          console.log("Loaded template columns:", Object.keys(data))
          setTemplate(data)
        }
        setLoading(false)
      }
      loadTemplate()
    } else {
      setLoading(false)
    }
  }, [params.id, businessId, supabase, router])

  const handleSave = async (json: any) => {
    if (!businessId) return

    const html = generateEmailHTML(json)
    
    const payload: any = {
      business_id: businessId,
      name: template?.name || initialName || "תבנית חדשה",
      subject: template?.subject || "",
      content_json: json,
      content_html: html,
    }

    console.log("Saving template with payload:", payload)

    const isNew = !params.id || params.id === 'new'

    let error
    let savedTemplate: any = null
    
    try {
      if (!isNew) {
        payload.updated_at = new Date().toISOString()
        const { data, error: err } = await supabase
          .from("email_templates")
          .update(payload)
          .eq("id", params.id)
          .select()
        
        error = err
        savedTemplate = data?.[0]
      } else {
        const { data, error: err } = await supabase
          .from("email_templates")
          .insert(payload)
          .select()
        
        error = err
        savedTemplate = data?.[0]
      }
    } catch (e: any) {
      console.error("Critical Save Exception:", e)
      toast.error(`שגיאה קריטית בשמירה: ${e.message}`)
      return
    }

    if (error) {
      console.error("Supabase Save Error Details:", {
        error,
        payload,
        isNew,
        paramsId: params.id
      })
      toast.error(`שגיאה בשמירת תבנית: ${error.message || 'שגיאה לא ידועה'}`)
    } else {
      toast.success(!isNew ? "תבנית עודכנה" : "תבנית נשמרה")
      
      if (campaignMode) {
        // Update the wizard store
        setEmailJson(json);
        setEmailHtml(html);
        setSelectedTemplateId(savedTemplate.id);
        setDesignMethod("template");
        setIsDesigningExternally(false);
        setStep("REVIEW");
        
        router.push("/mailing/send");
      } else {
        router.push("/mailing/templates")
      }
    }
  }

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isNew = !params.id || params.id === 'new'

  return (
    <div className="flex-1 flex flex-col -m-4 lg:-m-8 overflow-hidden">
      <EmailBuilder 
        templateId={!isNew ? (params.id as string) : undefined}
        initialData={template?.content_json}
        onSave={handleSave}
        onClose={() => router.push("/mailing/templates")}
      />
    </div>
  )
}
