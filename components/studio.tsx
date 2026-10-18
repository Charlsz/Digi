"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { StudioSidebar } from "@/components/studio-sidebar"
import { useSheetCanvas } from "@/hooks/use-sheet-canvas"
import { clearDraft, readDraft, writeDraft } from "@/lib/drafts"
import { fetchDrawing, saveDrawing } from "@/lib/drawing-client"
import { fileSlug } from "@/lib/slug"
import {
  BRUSHES,
  ERASER,
  INKS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  isBrushId,
  type BrushId,
  type ToolId,
} from "@/lib/types"

export function Studio() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedId = searchParams.get("id")

  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadedIdRef = useRef<string | null>(null)
  const styleRef = useRef<BrushId>("sketch")
  const dirtyRef = useRef(false)
  const draftReadyRef = useRef(false)
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

  const onStrokeCommitted = useCallback((strokeCount: number) => {
    setDirty(true)
    setStatus("")
    setHistory({ undo: strokeCount, redo: 0 })
  }, [])

  const {
    sheet,
    strokesRef,
    redoRef,
    inkRef,
    commit,
    setToolRefs,
  } = useSheetCanvas({
    frameRef,
    canvasRef,
    onStrokeCommitted,
  })

  useEffect(() => {
    setToolRefs(tool, size, color)
  }, [tool, size, color, setToolRefs])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  function rememberHistory() {
    setHistory({
      undo: strokesRef.current.length,
      redo: redoRef.current.length,
    })
  }

  function markDirty(next = true) {
    setDirty(next)
    if (next) setStatus("")
  }

  useEffect(() => {
    if (requestedId) return
    if (draftReadyRef.current) return
    draftReadyRef.current = true

    const draft = readDraft()
    if (!draft || draft.strokes.length === 0 || draft.drawingId) return

    strokesRef.current = draft.strokes
    redoRef.current = []
    // Restoring local draft state from storage after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage once
    setTitle(draft.title)
    setTool(draft.tool)
    styleRef.current = draft.style
    setSize(draft.size)
    setColor(draft.color)
    setDirty(true)
    setHistory({ undo: draft.strokes.length, redo: 0 })
    setStatus("Restored draft")
    commit()
  }, [requestedId, strokesRef, redoRef, commit])

  useEffect(() => {
    if (!dirty) return
    const timer = window.setTimeout(() => {
      writeDraft({
        title,
        tool,
        style: styleRef.current,
        size,
        color,
        strokes: strokesRef.current,
        drawingId: loadedIdRef.current,
        savedAt: new Date().toISOString(),
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [dirty, title, tool, size, color, strokesRef, history])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
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
      commit()
      return
    }

    if (loadedIdRef.current === requestedId) return
    let cancel = false
    setStatus("Opening")

    fetchDrawing(requestedId)
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
        clearDraft()
        setHistory({ undo: drawing.strokes.length, redo: 0 })
        setStatus("")
        commit()
      })
      .catch((error: unknown) => {
        if (cancel) return
        setStatus(error instanceof Error ? error.message : "Could not open this sheet.")
      })

    return () => {
      cancel = true
    }
  }, [requestedId, strokesRef, redoRef, commit])

  const undo = useCallback(() => {
    const stroke = strokesRef.current.pop()
    if (!stroke) return
    redoRef.current.push(stroke)
    setDirty(true)
    setStatus("")
    setHistory({
      undo: strokesRef.current.length,
      redo: redoRef.current.length,
    })
    commit()
  }, [strokesRef, redoRef, commit])

  const redo = useCallback(() => {
    const stroke = redoRef.current.pop()
    if (!stroke) return
    strokesRef.current.push(stroke)
    setDirty(true)
    setStatus("")
    setHistory({
      undo: strokesRef.current.length,
      redo: redoRef.current.length,
    })
    commit()
  }, [strokesRef, redoRef, commit])

  useEffect(() => {
    undoRef.current = undo
    redoActionRef.current = redo
  }, [undo, redo])

  useEffect(() => {
    function chooseFromKey(next: ToolId) {
      setTool(next)
      if (next === "eraser") {
        setSize(ERASER.width)
        return
      }
      styleRef.current = next
      const brush = BRUSHES.find((item) => item.id === next)
      if (brush) setSize(brush.width)
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return
      }
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault()
        if (event.shiftKey) redoActionRef.current()
        else undoRef.current()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault()
        redoActionRef.current()
        return
      }
      if (event.key === "[") setSize((value) => Math.max(1, value - 1))
      if (event.key === "]") setSize((value) => Math.min(80, value + 1))
      if (key === "e") chooseFromKey("eraser")
      const number = Number(event.key)
      if (number >= 1 && number <= BRUSHES.length) chooseFromKey(BRUSHES[number - 1].id)
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
    markDirty()
    rememberHistory()
    commit()
  }

  function newSheet() {
    if (dirty && !window.confirm("Leave this sheet without saving?")) return
    strokesRef.current = []
    redoRef.current = []
    loadedIdRef.current = null
    setTitle("")
    setDirty(false)
    clearDraft()
    setStatus("")
    rememberHistory()
    commit()
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
    link.download = `${fileSlug(title)}.png`
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
      const drawing = await saveDrawing(
        {
          title: title.trim() || "Untitled",
          style: tool === "eraser" ? styleRef.current : (tool as BrushId),
          width: SHEET_WIDTH,
          height: SHEET_HEIGHT,
          strokes: strokesRef.current,
          preview,
        },
        existing,
      )
      loadedIdRef.current = drawing.id
      setDirty(false)
      clearDraft()
      setStatus("Saved")
      if (!existing) router.replace(`/?id=${drawing.id}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col md:h-[calc(100dvh-3.5rem)] md:flex-row md:overflow-hidden">
      <StudioSidebar
        tool={tool}
        size={size}
        color={color}
        canUndo={history.undo > 0}
        canRedo={history.redo > 0}
        onChooseTool={chooseTool}
        onSizeChange={setSize}
        onColorChange={setColor}
        onUndo={undo}
        onRedo={redo}
        onClear={clearSheet}
        onNew={newSheet}
      />

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
                markDirty()
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
