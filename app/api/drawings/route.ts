import { createDrawing, listDrawings } from "@/lib/drawings"
import { parseDrawingInput } from "@/lib/drawing-input"
import { jsonError, jsonOk, readJson } from "@/lib/http"

export async function GET() {
  try {
    const drawings = await listDrawings()
    return jsonOk({ drawings })
  } catch (error) {
    return jsonError(error, "Could not load drawings.")
  }
}

export async function POST(request: Request) {
  try {
    const input = parseDrawingInput(await readJson(request))
    const drawing = await createDrawing(input)
    return jsonOk({ drawing }, { status: 201 })
  } catch (error) {
    return jsonError(error, "Could not save the drawing.")
  }
}
