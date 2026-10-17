import { getSupabase } from "@/lib/supabase"
import type { BrushId, Drawing, DrawingSummary, Stroke } from "@/lib/types"

type DrawingRow = {
  id: string
  title: string
  style: BrushId
  width: number
  height: number
  strokes?: Stroke[]
  preview: string
  created_at: string
  updated_at: string
}

function toSummary(row: DrawingRow): DrawingSummary {
  return {
    id: row.id,
    title: row.title,
    style: row.style,
    width: row.width,
    height: row.height,
    preview: row.preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toDrawing(row: DrawingRow): Drawing {
  return {
    ...toSummary(row),
    strokes: row.strokes ?? [],
  }
}

export async function listDrawings() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("drawings")
    .select("id, title, style, width, height, preview, created_at, updated_at")
    .order("updated_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data as DrawingRow[]).map(toSummary)
}

export async function getDrawing(id: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("drawings")
    .select("id, title, style, width, height, strokes, preview, created_at, updated_at")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return toDrawing(data as DrawingRow)
}

export async function createDrawing(input: {
  title: string
  style: BrushId
  width: number
  height: number
  strokes: Stroke[]
  preview: string
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("drawings")
    .insert({
      title: input.title,
      style: input.style,
      width: input.width,
      height: input.height,
      strokes: input.strokes,
      preview: input.preview,
    })
    .select("id, title, style, width, height, preview, created_at, updated_at")
    .single()

  if (error) throw new Error(error.message)
  return toSummary(data as DrawingRow)
}

export async function updateDrawing(
  id: string,
  input: {
    title: string
    style: BrushId
    width: number
    height: number
    strokes: Stroke[]
    preview: string
  },
) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("drawings")
    .update({
      title: input.title,
      style: input.style,
      width: input.width,
      height: input.height,
      strokes: input.strokes,
      preview: input.preview,
    })
    .eq("id", id)
    .select("id, title, style, width, height, preview, created_at, updated_at")
    .single()

  if (error) {
    if (error.code === "PGRST116") return null
    throw new Error(error.message)
  }

  return toSummary(data as DrawingRow)
}

export async function deleteDrawing(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase.from("drawings").delete().eq("id", id)
  if (error) throw new Error(error.message)
}
