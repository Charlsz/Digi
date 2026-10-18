import type { BrushId, Stroke, ToolId } from "@/lib/types"

const DRAFT_KEY = "digi:draft:v1"

export type DraftSheet = {
  title: string
  tool: ToolId
  style: BrushId
  size: number
  color: string
  strokes: Stroke[]
  drawingId: string | null
  savedAt: string
}

export function readDraft(): DraftSheet | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as DraftSheet
    if (!value || !Array.isArray(value.strokes)) return null
    return value
  } catch {
    return null
  }
}

export function writeDraft(draft: DraftSheet) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Quota or private mode — skip quietly.
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Ignore storage failures.
  }
}
