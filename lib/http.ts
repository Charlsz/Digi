import { DrawingInputError } from "@/lib/drawing-input"

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new DrawingInputError("The request body is not valid JSON.")
  }
}

export function jsonOk<T>(body: T, init?: ResponseInit) {
  return Response.json(body, init)
}

export function jsonError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback
  const status = error instanceof DrawingInputError ? 400 : 500
  return Response.json({ error: message }, { status })
}
