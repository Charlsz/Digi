"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { drawStroke, redrawStrokes } from "@/lib/render"
import {
  BRUSHES,
  ERASER,
  INKS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  isBrushId,
  type BrushId,
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

function fileName(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "untitled"
}

export function Studio() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get("id")

  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<HTMLCanvasElement | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const redoRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke | null>(null)
  const drawingRef = useRef(false)
  const commitRef = useRef<() => void>(() => {})
  const loadedIdRef = useRef<string | null>(null)
  const toolRef = useRef<ToolId>("sketch")
  const sizeRef = useRef<number>(BRUSHES[0].width)
  const colorRef = useRef<string>(INKS[0].hex)
  const styleRef = useRef<BrushId>("sketch")
  const undoRef = useRef<() => void>(() => {})
  const redoActionRef = useRef<() => void>(() => {})

  const [tool, setTool] = useState<ToolId>("sketch")
  const [size, setSize] = useState<number>(BRUSHES[0].width)
  const [color, setColor] = useState<string>(INKS[0].hex)
  const [title, setTitle] = useState("")
  const [status, setStatus] = useState("")
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState({ undo: 0, redo: 0 })
  const [sheet, setSheet] = useState({ width: 280, height: 392 })

  toolRef.current = tool
  sizeRef.current = size
  colorRef.current = color

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
        setDirty(true)
        setHistory({ undo: strokesRef.current.length, redo: 0 })
        setStatus("")
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
  }, [])

  useEffect(() => {
    if (!requestedId) {
      if (!loadedIdRef.current) return
      strokesRef.current = []
      redoRef.current = []
      loadedIdRef.current = null
      setTitle("")
      setDirty(false)
      setHistory({ undo: 0, redo: 0 })
      setStatus("")
      commitRef.current()
      return
    }

    if (loadedIdRef.current === requestedId) return
    let cancel = false
    setStatus("Opening")

    fetch(`/api/drawings/${requestedId}`)
      .then(async (response) => {
        const body = (await response.json()) as { drawing?: { title: string; style: string; strokes: Stroke[] }; error?: string }
        if (!response.ok || !body.drawing) throw new Error(body.error || "Could not open this sheet.")
        return body.drawing
      })
      .then((drawing) => {
        if (cancel) return
        strokesRef.current = drawing.strokes
        redoRef.current = []
        loadedIdRef.current = requestedId
        setTitle(drawing.title === "Untitled" ? "" : drawing.title)
        if (isBrushId(drawing.style)) {
          styleRef.current = drawing.style
          setTool(drawing.style)
          const brush = BRUSHES.find((item) => item.id === drawing.style)
          if (brush) setSize(brush.width)
        }
        setDirty(false)
        setHistory({ undo: drawing.strokes.length, redo: 0 })
        setStatus("")
        commitRef.current()
      })
      .catch((error: unknown) => {
        if (cancel) return
        setStatus(error instanceof Error ? error.message : "Could not open this sheet.")
      })

    return () => {
      cancel = true
    }
  }, [requestedId])

  function rememberHistory() {
    setHistory({ undo: strokesRef.current.length, redo: redoRef.current.length })
  }

  function undo() {
    const stroke = strokesRef.current.pop()
    if (!stroke) return
    redoRef.current.push(stroke)
    setDirty(true)
    setStatus("")
    rememberHistory()
    commitRef.current()
  }

  function redo() {
    const stroke = redoRef.current.pop()
    if (!stroke) return
    strokesRef.current.push(stroke)
    setDirty(true)
    setStatus("")
    rememberHistory()
    commitRef.current()
  }

  undoRef.current = undo
  redoActionRef.current = redo

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (event.shiftKey) redoActionRef.current()
        else undoRef.current()
        return
      }
      if (event.key === "[") setSize((value) => Math.max(1, value - 1))
      if (event.key === "]") setSize((value) => Math.min(80, value + 1))
      if (event.key.toLowerCase() === "e") chooseTool("eraser")
      const number = Number(event.key)
      if (number >= 1 && number <= BRUSHES.length) chooseTool(BRUSHES[number - 1].id)
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function chooseTool(next: ToolId) {
    setTool(next)
    if (next === "eraser") {
      setSize(ERASER.width)
      return
    }
    styleRef.current = next
    const brush = BRUSHES.find((item) => item.id === next)
    if (brush) setSize(brush.width)
  }

  function clearSheet() {
    if (strokesRef.current.length === 0) return
    if (!window.confirm("Clear this sheet?")) return
    strokesRef.current = []
    redoRef.current = []
    setDirty(true)
    setStatus("")
    rememberHistory()
    commitRef.current()
  }

  function newSheet() {
    if (dirty && !window.confirm("Leave this sheet without saving?")) return
    strokesRef.current = []
    redoRef.current = []
    loadedIdRef.current = null
    setTitle("")
    setDirty(false)
    setStatus("")
    rememberHistory()
    commitRef.current()
    router.push("/")
  }

  function previewData() {
    const ink = inkRef.current
    if (!ink) return ""
    const scale = 1100 / SHEET_HEIGHT
    const copy = document.createElement("canvas")
    copy.width = Math.round(SHEET_WIDTH * scale)
    copy.height = Math.round(SHEET_HEIGHT * scale)
    const ctx = copy.getContext("2d")
    if (!ctx) return ""
    ctx.fillStyle = "#FDFDFC"
    ctx.fillRect(0, 0, copy.width, copy.height)
    ctx.drawImage(ink, 0, 0, copy.width, copy.height)
    return copy.toDataURL("image/png")
  }

  function download() {
    const ink = inkRef.current
    if (!ink || strokesRef.current.length === 0) return
    const copy = document.createElement("canvas")
    copy.width = ink.width
    copy.height = ink.height
    const ctx = copy.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FDFDFC"
    ctx.fillRect(0, 0, copy.width, copy.height)
    ctx.drawImage(ink, 0, 0)
    const link = document.createElement("a")
    link.href = copy.toDataURL("image/png")
    link.download = `${fileName(title)}.png`
    link.click()
  }

  async function save() {
    if (strokesRef.current.length === 0) {
      setStatus("Draw something before saving.")
      return
    }
    const preview = previewData()
    if (!preview) {
      setStatus("Could not prepare the sheet.")
      return
    }

    setBusy(true)
    setStatus("Saving")
    const existing = loadedIdRef.current
    try {
      const response = await fetch(existing ? `/api/drawings/${existing}` : "/api/drawings", {
        method: existing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled",
          style: tool === "eraser" ? styleRef.current : tool,
          width: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          strokes: strokesRef.current,
          preview,
        }),
      })
      const body = (await response.json()) as { drawing?: { id: string }; error?: string }
      if (!response.ok || !body.drawing) throw new Error(body.error || "Could not save.")
      loadedIdRef.current = body.drawing.id
      setDirty(false)
      setStatus("Saved")
      if (!existing) router.replace(`/?id=${body.drawing.id}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col md:h-[calc(100dvh-3.5rem)] md:flex-row md:overflow-hidden">
      <aside className="order-2 border-t border-line px-5 py-5 md:order-1 md:w-[240px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-r md:px-6 md:py-7">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ash">Brush</p>
          <div className="mt-3 grid grid-cols-2 gap-1 md:grid-cols-1">
            {BRUSHES.map((brush, index) => (
              <button
                key={brush.id}
                type="button"
                aria-label={brush.label}
                aria-pressed={tool === brush.id}
                onClick={() => chooseTool(brush.id)}
                className={`px-2 py-2 text-left text-[13px] ${tool === brush.id ? "bg-ink text-paper" : "hover:bg-wash"}`}
              >
                <span className="mr-2 text-[11px] tabular-nums opacity-60">0{index + 1}</span>
                {brush.label}
              </button>
            ))}
            <button
              type="button"
              aria-label="Eraser"
                aria-pressed={tool === "eraser"}
              onClick={() => chooseTool("eraser")}
              className={`px-2 py-2 text-left text-[13px] ${tool === "eraser" ? "bg-ink text-paper" : "hover:bg-wash"}`}
            >
              <span className="mr-2 text-[11px] opacity-60">E</span>
              Eraser
            </button>
          </div>
        </div>

        <label className="mt-7 block">
          <span className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ash">
            Width
            <span className="text-[12px] normal-case tracking-normal text-ink tabular-nums">{size}</span>
          </span>
          <input
            className="mt-3 w-full"
            type="range"
            min={1}
            max={80}
            value={size}
            aria-label="Brush width"
            onChange={(event) => setSize(Number(event.target.value))}
          />
        </label>

        <div className="mt-7" role="radiogroup" aria-label="Ink">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ash">Ink</p>
          <div className="mt-3 flex gap-2">
            {INKS.map((ink) => (
              <button
                key={ink.id}
                type="button"
                role="radio"
                aria-checked={color === ink.hex}
                aria-label={ink.label}
                disabled={tool === "eraser"}
                onClick={() => setColor(ink.hex)}
                className={`h-6 w-6 border disabled:opacity-30 ${color === ink.hex ? "border-ink" : "border-line"}`}
                style={{ backgroundColor: ink.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
          <button type="button" onClick={undo} disabled={history.undo === 0} className="disabled:opacity-30">
            Undo
          </button>
          <button type="button" onClick={redo} disabled={history.redo === 0} className="disabled:opacity-30">
            Redo
          </button>
          <button type="button" onClick={clearSheet} disabled={history.undo === 0} className="disabled:opacity-30">
            Clear
          </button>
          <button type="button" onClick={newSheet}>
            New
          </button>
        </div>

        <p className="mt-8 text-[12px] leading-5 text-ash">Ctrl+Z undo. [ and ] change the width.</p>
      </aside>

      <section className="order-1 flex h-[68dvh] min-h-[440px] flex-col md:order-2 md:h-auto md:min-h-0 md:flex-1">
        <div ref={frameRef} className="flex min-h-0 flex-1 items-center justify-center bg-desk">
          <div className="relative border border-line bg-paper" style={{ width: sheet.width, height: sheet.height }}>
            <canvas
              ref={canvasRef}
              aria-label="Drawing sheet"
              className="block cursor-crosshair touch-none"
              style={{ width: sheet.width, height: sheet.height }}
            />
            <div className="paper-grain pointer-events-none absolute inset-0" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-line px-5 py-3 sm:px-6">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Title</span>
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setDirty(true)
              }}
              placeholder="Untitled"
              maxLength={80}
              className="w-full max-w-sm bg-transparent text-[14px] outline-none placeholder:text-ash"
            />
          </label>
          <p className="hidden text-[12px] text-ash sm:block" role="status">
            {status}
            {status === "" && dirty ? "Unsaved" : ""}
          </p>
          <button type="button" onClick={download} className="text-[13px] text-ash hover:text-ink">
            Download
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="bg-ink px-4 py-2 text-[13px] text-paper disabled:opacity-40"
          >
            Save
          </button>
        </div>
        <p className="border-t border-line px-5 py-2 text-[12px] text-ash sm:hidden" role="status">
          {status || (dirty ? "Unsaved" : "")}
        </p>
      </section>
    </div>
  )
}
