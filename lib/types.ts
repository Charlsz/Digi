export const SHEET_WIDTH = 1000
export const SHEET_HEIGHT = 1400

export const BRUSHES = [
  { id: "sketch", label: "Sketch", width: 16 },
  { id: "manga", label: "Manga", width: 11 },
  { id: "tone", label: "Tone", width: 18 },
  { id: "sumi", label: "Sumi", width: 42 },
  { id: "pencil", label: "Pencil", width: 3 },
  { id: "marker", label: "Marker", width: 24 },
] as const

export const ERASER = { id: "eraser", label: "Eraser", width: 28 } as const

export const INKS = [
  { id: "sumi", label: "Sumi", hex: "#111111" },
  { id: "charcoal", label: "Charcoal", hex: "#3A3A39" },
  { id: "stone", label: "Stone", hex: "#6A6A69" },
  { id: "ash", label: "Ash", hex: "#9C9C9B" },
] as const

export type BrushId = (typeof BRUSHES)[number]["id"]
export type ToolId = BrushId | "eraser"

export type Point = {
  x: number
  y: number
  p: number
  t: number
}

export type Stroke = {
  brush: ToolId
  color: string
  size: number
  points: Point[]
}

export type Drawing = {
  id: string
  title: string
  style: BrushId
  width: number
  height: number
  strokes: Stroke[]
  preview: string
  createdAt: string
  updatedAt: string
}

export type DrawingSummary = Omit<Drawing, "strokes">

export function isBrushId(value: string): value is BrushId {
  return BRUSHES.some((brush) => brush.id === value)
}

export function isToolId(value: string): value is ToolId {
  return value === "eraser" || isBrushId(value)
}
