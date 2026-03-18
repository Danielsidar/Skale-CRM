"use client"

import { useCallback, useRef, useState, useEffect, useMemo } from "react"
import { cn } from "@/lib/utils"
import { WEBHOOK_VARIABLES } from "@/types/automation"
import { ChevronRight, ArrowRight } from "lucide-react"

const inputBaseClass =
  "border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] placeholder:text-muted-foreground text-right"

const CATEGORY_ORDER = ["עסקה", "איש קשר", "אירוע"]

function groupByCategory(
  vars: typeof WEBHOOK_VARIABLES
): { category: string; items: typeof WEBHOOK_VARIABLES }[] {
  const byCat = new Map<string, typeof WEBHOOK_VARIABLES>()
  for (const v of vars) {
    const list = byCat.get(v.category) ?? []
    list.push(v)
    byCat.set(v.category, list)
  }
  return CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: byCat.get(cat) ?? [],
  })).filter((g) => g.items.length > 0)
}

interface VariableInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  multiline?: boolean
  className?: string
  id?: string
}

type PickerStep = "category" | "variable"

export function VariableInput({
  value,
  onChange,
  placeholder,
  multiline,
  className,
  id,
}: VariableInputProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [pickerAt, setPickerAt] = useState(0)
  const [step, setStep] = useState<PickerStep>("category")
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const elRef = multiline ? textareaRef : inputRef

  const grouped = useMemo(() => groupByCategory(WEBHOOK_VARIABLES), [])
  const currentCategoryItems = useMemo(() => {
    if (step !== "variable" || selectedCategoryIndex < 0 || selectedCategoryIndex >= grouped.length)
      return []
    return grouped[selectedCategoryIndex].items
  }, [step, selectedCategoryIndex, grouped])

  const insertAt = useCallback(
    (cursorPosition: number, text: string) => {
      const next = value.slice(0, cursorPosition) + text + value.slice(cursorPosition)
      onChange(next)
      setShowPicker(false)
      setStep("category")
      setTimeout(() => {
        const el = elRef.current
        if (el) {
          const pos = cursorPosition + text.length
          el.focus()
          el.setSelectionRange(pos, pos)
        }
      }, 0)
    },
    [value, onChange]
  )

  const selectVariable = useCallback(
    (v: (typeof WEBHOOK_VARIABLES)[number]) => {
      insertAt(pickerAt, `{{${v.path}}}`)
    },
    [pickerAt, insertAt]
  )

  const goToCategory = useCallback((index: number) => {
    setSelectedCategoryIndex(index)
    setHighlightedIndex(0)
    setStep("variable")
  }, [])

  const goBack = useCallback(() => {
    setStep("category")
    setHighlightedIndex(selectedCategoryIndex)
  }, [selectedCategoryIndex])

  useEffect(() => {
    if (!showPicker) return
    setStep("category")
    setHighlightedIndex(0)
    setSelectedCategoryIndex(0)
  }, [showPicker])

  useEffect(() => {
    if (!showPicker || !listRef.current) return
    const el = listRef.current.querySelector(`[data-highlight-index="${highlightedIndex}"]`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [showPicker, highlightedIndex, step])

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (showPicker) {
        if (e.key === "Escape") {
          if (step === "variable") {
            goBack()
          } else {
            setShowPicker(false)
          }
          e.preventDefault()
          return
        }
        if (step === "category") {
          const count = grouped.length
          if (e.key === "Enter") {
            goToCategory(highlightedIndex)
            e.preventDefault()
            return
          }
          if (e.key === "ArrowDown") {
            setHighlightedIndex((i) => (i + 1) % count)
            e.preventDefault()
            return
          }
          if (e.key === "ArrowUp") {
            setHighlightedIndex((i) => (i - 1 + count) % count)
            e.preventDefault()
            return
          }
        } else {
          const count = currentCategoryItems.length
          if (e.key === "Enter") {
            const v = currentCategoryItems[highlightedIndex]
            if (v) selectVariable(v)
            e.preventDefault()
            return
          }
          if (e.key === "ArrowDown") {
            setHighlightedIndex((i) => (i + 1) % count)
            e.preventDefault()
            return
          }
          if (e.key === "ArrowUp") {
            setHighlightedIndex((i) => (i - 1 + count) % count)
            e.preventDefault()
            return
          }
        }
        if (e.key === "@") {
          e.preventDefault()
          return
        }
        return
      }
      if (e.key === "@") {
        e.preventDefault()
        const el = elRef.current
        const pos = el && "selectionStart" in el ? el.selectionStart ?? value.length : value.length
        setPickerAt(pos)
        setShowPicker(true)
      }
    },
    [
      showPicker,
      value.length,
      step,
      grouped.length,
      currentCategoryItems,
      highlightedIndex,
      goToCategory,
      goBack,
      selectVariable,
    ]
  )

  useEffect(() => {
    if (!showPicker) return
    const onBlur = () => {
      setTimeout(() => setShowPicker(false), 150)
    }
    const el = elRef.current
    el?.addEventListener("blur", onBlur)
    return () => el?.removeEventListener("blur", onBlur)
  }, [showPicker])

  const textareaClass = "min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-right"

  return (
    <div className="relative w-full" dir="rtl">
      {multiline ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          id={id}
          className={cn(textareaClass, className)}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          id={id}
          className={cn(inputBaseClass, className)}
        />
      )}
      {showPicker && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-1.5 w-full min-w-[260px] max-w-sm overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* שלב 1: קטגוריה */}
          {step === "category" && (
            <>
              <div className="border-b border-border bg-muted/50 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  בחר קטגוריה · ↑↓ Enter
                </p>
              </div>
              <div className="p-2">
                {grouped.map((group, idx) => {
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={group.category}
                      type="button"
                      data-highlight-index={idx}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-3 text-right text-sm transition-colors",
                        "hover:bg-accent/80",
                        isHighlighted && "bg-accent"
                      )}
                      onMouseDown={() => goToCategory(idx)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <span className="font-semibold text-foreground">{group.category}</span>
                      <span className="text-muted-foreground">
                        {group.items.length} משתנים
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground rotate-180" />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* שלב 2: משתנים בתוך קטגוריה */}
          {step === "variable" && (
            <>
              <button
                type="button"
                onClick={goBack}
                className="flex w-full items-center gap-2 border-b border-border bg-muted/50 px-3 py-2 text-right text-xs font-medium text-muted-foreground hover:bg-muted/80"
              >
                <ArrowRight className="h-3.5 w-3" />
                חזרה ל{grouped[selectedCategoryIndex]?.category ?? ""}
              </button>
              <div className="max-h-64 overflow-auto p-2">
                {currentCategoryItems.map((v, idx) => {
                  const isHighlighted = idx === highlightedIndex
                  return (
                    <button
                      key={v.path}
                      type="button"
                      data-highlight-index={idx}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-right text-sm transition-colors",
                        "hover:bg-accent/80",
                        isHighlighted && "bg-accent"
                      )}
                      onMouseDown={() => selectVariable(v)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <span className="font-medium text-foreground">{v.label}</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {`{{${v.path}}}`}
                      </code>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
