import type { BrushId, Drawing, DrawingSummary, Stroke } from "@/lib/types"

export type DrawingPayload = {
  title: string
  style: BrushId
  width: number
  height: number
  strokes: Stroke[]
  preview: string
}

async function readBody<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function fetchDrawing(id: string) {
  const response = await fetch(`/api/drawings/${id}`)
  const body = await readBody<{ drawing?: Drawing; error?: string }>(response)
  if (!response.ok || !body.drawing) {
    throw new Error(body.error || "Could not open this sheet.")
  }
  return body.drawing
}

export async function saveDrawing(payload: DrawingPayload, existingId?: string | null) {
  const response = await fetch(existingId ? `/api/drawings/${existingId}` : "/api/drawings", {
    method: existingId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const body = await readBody<{ drawing?: DrawingSummary; error?: string }>(response)
  if (!response.ok || !body.drawing) {
    throw new Error(body.error || "Could not save.")
  }
  return body.drawing
}

export async function removeDrawing(id: string) {
  const response = await fetch(`/api/drawings/${id}`, { method: "DELETE" })
  if (!response.ok) {
    const body = await readBody<{ error?: string }>(response)
    throw new Error(body.error || "Could not delete that sheet.")
  }
}
