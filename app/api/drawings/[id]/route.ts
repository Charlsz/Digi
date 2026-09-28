import { deleteDrawing, getDrawing, updateDrawing } from "@/lib/drawings"
import { DrawingInputError, parseDrawingInput } from "@/lib/drawing-input"

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!ID.test(id)) return Response.json({ error: "Not found." }, { status: 404 })

  try {
    const drawing = await getDrawing(id)
    if (!drawing) return Response.json({ error: "Not found." }, { status: 404 })
    return Response.json({ drawing })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open the drawing."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!ID.test(id)) return Response.json({ error: "Not found." }, { status: 404 })

  try {
    const input = parseDrawingInput(await request.json())
    const drawing = await updateDrawing(id, input)
    if (!drawing) return Response.json({ error: "Not found." }, { status: 404 })
    return Response.json({ drawing })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the drawing."
    const status = error instanceof DrawingInputError ? 400 : 500
    return Response.json({ error: message }, { status })
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/drawings/[id]">) {
  const { id } = await ctx.params
  if (!ID.test(id)) return Response.json({ error: "Not found." }, { status: 404 })

  try {
    await deleteDrawing(id)
    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the drawing."
    return Response.json({ error: message }, { status: 500 })
  }
}
