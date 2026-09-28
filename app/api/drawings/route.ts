import { createDrawing, listDrawings } from "@/lib/drawings"
import { DrawingInputError, parseDrawingInput } from "@/lib/drawing-input"

export async function GET() {
  try {
    const drawings = await listDrawings()
    return Response.json({ drawings })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load drawings."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const input = parseDrawingInput(await request.json())
    const drawing = await createDrawing(input)
    return Response.json({ drawing }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the drawing."
    const status = error instanceof DrawingInputError ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}
