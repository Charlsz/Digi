"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { drawStroke, redrawStrokes } from "@/lib/render"
import {
  BRUSHES,
  INKS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  type Point,
  type Stroke,
  type ToolId,
} from "@/lib/types"

const FOLLOW: Record<ToolId, number> = {
  sketch: 0.62,
  manga: 0.4,
  tone: 0.55,
  sumi: 0.34,
  pencil: 0.82,
  marker: 0.5,
  eraser: 0.72,
}

function sheetPoint(event: PointerEvent, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  const pressure =
    event.pointerType === "mouse" ? 0.65 : Math.min(1, Math.max(0.05, event.pressure || 0.5))
  return {
    x: ((event.clientX - rect.left) / Math.max(rect.width, 1)) * SHEET_WIDTH,
    y: ((event.clientY - rect.top) / Math.max(rect.height, 1)) * SHEET_HEIGHT,
    p: pressure,
    t: event.timeStamp,
  }
}

function pull(previous: Point, next: Point, amount: number): Point {
  return {
    x: previous.x + (next.x - previous.x) * amount,
    y: previous.y + (next.y - previous.y) * amount,
    p: next.p,
    t: next.t,
  }
}

export function useSheetCanvas({
  frameRef,
  canvasRef,
  onStrokeCommitted,
}: {
  frameRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  onStrokeCommitted: (strokeCount: number) => void
}) {
  const inkRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const redoRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke | null>(null)
  const drawingRef = useRef(false)
  const commitRef = useRef<() => void>(() => {})
  const toolRef = useRef<ToolId>("sketch")
  const sizeRef = useRef<number>(BRUSHES[0].width)
  const colorRef = useRef<string>(INKS[0].hex)
  const onStrokeRef = useRef(onStrokeCommitted)

  useEffect(() => {
    onStrokeRef.current = onStrokeCommitted
  }, [onStrokeCommitted])

  const [sheet, setSheet] = useState({ width: 280, height: 392 })

  useEffect(() => {
    const frame = frameRef.current
    const canvas = canvasRef.current
    if (!frame || !canvas) return

    const ink = document.createElement("canvas")
    const ratio = window.devicePixelRatio || 1
    ink.width = Math.round(SHEET_WIDTH * ratio)
    ink.height = Math.round(SHEET_HEIGHT * ratio)
    canvas.width = ink.width
    canvas.height = ink.height
    inkRef.current = ink

    const paint = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(ink, 0, 0)
      if (!currentRef.current) return
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      drawStroke(ctx, currentRef.current)
    }

    const commit = () => {
      const ctx = ink.getContext("2d")
      if (!ctx) return
      redrawStrokes(ctx, strokesRef.current, ink.width, ink.height, ratio)
      paint()
    }

    commitRef.current = commit
    commit()

    const fit = () => {
      const bounds = frame.getBoundingClientRect()
      const pad = bounds.width < 720 ? 20 : 40
      const scale = Math.min(
        (bounds.width - pad * 2) / SHEET_WIDTH,
        (bounds.height - pad * 2) / SHEET_HEIGHT,
      )
      const next = Math.max(scale, 0.18)
      setSheet({
        width: Math.max(1, Math.floor(SHEET_WIDTH * next)),
        height: Math.max(1, Math.floor(SHEET_HEIGHT * next)),
      })
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(frame)

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      event.preventDefault()
      try {
        canvas.setPointerCapture(event.pointerId)
      } catch {
        // Untrusted events cannot capture the pointer. The stroke still records.
      }
      currentRef.current = {
        brush: toolRef.current,
        color: colorRef.current,
        size: sizeRef.current,
        points: [sheetPoint(event, canvas)],
      }
      drawingRef.current = true
      paint()
    }

    const onMove = (event: PointerEvent) => {
      const stroke = currentRef.current
      if (!drawingRef.current || !stroke) return
      const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : []
      const events = coalesced.length > 0 ? coalesced : [event]
      for (const item of events) {
        const next = sheetPoint(item, canvas)
        const previous = stroke.points[stroke.points.length - 1]
        const followed = pull(previous, next, FOLLOW[stroke.brush])
        if (Math.hypot(followed.x - previous.x, followed.y - previous.y) < 0.45) continue
        stroke.points.push(followed)
      }
      paint()
    }

    const finish = (event: PointerEvent) => {
      if (!drawingRef.current || !currentRef.current) return
      drawingRef.current = false
      try {
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      } catch {
        // The pointer was never captured.
      }
      const stroke = currentRef.current
      currentRef.current = null
      if (stroke.points.length > 0) {
        strokesRef.current.push(stroke)
        redoRef.current = []
        onStrokeRef.current(strokesRef.current.length)
      }
      commit()
    }

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", finish)
    canvas.addEventListener("pointercancel", finish)

    return () => {
      observer.disconnect()
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", finish)
      canvas.removeEventListener("pointercancel", finish)
    }
  }, [canvasRef, frameRef])

  const commit = useCallback(() => {
    commitRef.current()
  }, [])

  const setToolRefs = useCallback((nextTool: ToolId, nextSize: number, nextColor: string) => {
    toolRef.current = nextTool
    sizeRef.current = nextSize
    colorRef.current = nextColor
  }, [])

  return {
    sheet,
    strokesRef,
    redoRef,
    inkRef,
    commit,
    setToolRefs,
  }
}
