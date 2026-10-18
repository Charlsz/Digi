"use client"

import { BRUSHES, INKS, type ToolId } from "@/lib/types"

type Props = {
  tool: ToolId
  size: number
  color: string
  canUndo: boolean
  canRedo: boolean
  onChooseTool: (tool: ToolId) => void
  onSizeChange: (size: number) => void
  onColorChange: (color: string) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onNew: () => void
}

export function StudioSidebar({
  tool,
  size,
  color,
  canUndo,
  canRedo,
  onChooseTool,
  onSizeChange,
  onColorChange,
  onUndo,
  onRedo,
  onClear,
  onNew,
}: Props) {
  return (
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
              onClick={() => onChooseTool(brush.id)}
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
            onClick={() => onChooseTool("eraser")}
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
          onChange={(event) => onSizeChange(Number(event.target.value))}
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
              onClick={() => onColorChange(ink.hex)}
              className={`h-6 w-6 border disabled:opacity-30 ${color === ink.hex ? "border-ink" : "border-line"}`}
              style={{ backgroundColor: ink.hex }}
            />
          ))}
        </div>
      </div>

      <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
        <button type="button" onClick={onUndo} disabled={!canUndo} className="disabled:opacity-30">
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} className="disabled:opacity-30">
          Redo
        </button>
        <button type="button" onClick={onClear} disabled={!canUndo} className="disabled:opacity-30">
          Clear
        </button>
        <button type="button" onClick={onNew}>
          New
        </button>
      </div>

      <p className="mt-8 text-[12px] leading-5 text-ash">
        Ctrl+Z undo, Ctrl+Y redo. [ and ] change the width.
      </p>
    </aside>
  )
}
