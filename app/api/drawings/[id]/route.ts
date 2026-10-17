import { deleteDrawing, getDrawing, updateDrawing } from "@/lib/drawings"
import { parseDrawingInput } from "@/lib/drawing-input"
import { jsonError, jsonOk, readJson } from "@/lib/http"
import { isDrawingId } from "@/lib/ids"

function notFound() {
  return jsonOk({ error: "Not found." }, { status: 404 })
}

export async function GET(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!isDrawingId(id)) return notFound()

  try {
    const drawing = await getDrawing(id)
    if (!drawing) return notFound()
    return jsonOk({ drawing })
  } catch (error) {
    return jsonError(error, "Could not open the drawing.")
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!isDrawingId(id)) return notFound()

  try {
    const input = parseDrawingInput(await readJson(request))
    const drawing = await updateDrawing(id, input)
    if (!drawing) return notFound()
    return jsonOk({ drawing })
  } catch (error) {
    return jsonError(error, "Could not save the drawing.")
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!isDrawingId(id)) return notFound()

  try {
    await deleteDrawing(id)
    return jsonOk({ ok: true })
  } catch (error) {
    return jsonError(error, "Could not delete the drawing.")
  }
}
