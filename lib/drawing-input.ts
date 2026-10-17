import { SHEET_HEIGHT, SHEET_WIDTH, isBrushId, isToolId, type BrushId, type Stroke } from "@/lib/types"

const MAX_POINTS = 250_000
const MAX_PREVIEW = 3_500_000

export class DrawingInputError extends Error {}

export type DrawingInput = {
  title: string
  style: BrushId
  width: number
  height: number
  strokes: Stroke[]
  preview: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function parseDrawingInput(value: unknown): DrawingInput {
  if (!isRecord(value)) throw new DrawingInputError("Drawing is missing.")

  const title = typeof value.title === "string" ? value.title.trim().slice(0, 80) : ""
  const style = typeof value.style === "string" ? value.style : ""
  if (!isBrushId(style)) throw new DrawingInputError("Choose a drawing style before saving.")

  if (value.width !== SHEET_WIDTH || value.height !== SHEET_HEIGHT) {
    throw new DrawingInputError("This sheet has an unexpected size.")
  }

  if (!Array.isArray(value.strokes) || value.strokes.length === 0) {
    throw new DrawingInputError("Draw something before saving.")
  }

  if (value.strokes.length > 4000) throw new DrawingInputError("This drawing has too many strokes.")

  let points = 0
  const strokes: Stroke[] = value.strokes.map((stroke) => {
    if (!isRecord(stroke) || typeof stroke.brush !== "string" || !isToolId(stroke.brush)) {
      throw new DrawingInputError("A stroke could not be read.")
    }
    if (typeof stroke.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(stroke.color)) {
      throw new DrawingInputError("A stroke color could not be read.")
    }
    if (typeof stroke.size !== "number" || stroke.size < 0.5 || stroke.size > 160) {
      throw new DrawingInputError("A stroke width could not be read.")
    }
    if (!Array.isArray(stroke.points) || stroke.points.length === 0) {
      throw new DrawingInputError("A stroke has no points.")
    }

    points += stroke.points.length
    if (points > MAX_POINTS) throw new DrawingInputError("This drawing is too long to save.")

    return {
      brush: stroke.brush,
      color: stroke.color,
      size: stroke.size,
      points: stroke.points.map((point) => {
        if (!isRecord(point)) throw new DrawingInputError("A point could not be read.")
        const x = point.x
        const y = point.y
        const p = point.p
        const t = point.t
        if (
          typeof x !== "number" ||
          typeof y !== "number" ||
          typeof p !== "number" ||
          typeof t !== "number" ||
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(p) ||
          !Number.isFinite(t)
        ) {
          throw new DrawingInputError("A point could not be read.")
        }
        return {
          x,
          y,
          p: Math.min(1, Math.max(0, p)),
          t,
        }
      }),
    }
  })

  if (
    typeof value.preview !== "string" ||
    (!value.preview.startsWith("data:image/png") && !value.preview.startsWith("data:image/jpeg"))
  ) {
    throw new DrawingInputError("The preview could not be made.")
  }
  if (value.preview.length > MAX_PREVIEW) throw new DrawingInputError("The preview is too large.")

  return {
    title: title || "Untitled",
    style,
    width: SHEET_WIDTH,
    height: SHEET_HEIGHT,
    strokes,
    preview: value.preview,
  }
}
