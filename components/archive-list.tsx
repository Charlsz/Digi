"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { DrawingSummary } from "@/lib/types"

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

export function ArchiveList({
  drawings,
  error,
}: {
  drawings: DrawingSummary[]
  error?: string
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState(error ?? "")

  async function remove(drawing: DrawingSummary) {
    if (!window.confirm(`Delete “${drawing.title}”?`)) return
    setPendingId(drawing.id)
    setMessage("")
    const response = await fetch(`/api/drawings/${drawing.id}`, { method: "DELETE" })
    setPendingId(null)
    if (!response.ok) {
      setMessage("Could not delete that sheet.")
      return
    }
    router.refresh()
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-10 flex items-end justify-between border-b border-line pb-4">
        <h1 className="text-[15px]">Archive</h1>
        <p className="text-[12px] text-ash">
          {drawings.length === 0
            ? "Empty"
            : drawings.length === 1
              ? "1 sheet"
              : `${drawings.length} sheets`}
        </p>
      </div>

      {message ? (
        <p className="mb-8 text-[13px] text-ash" role="status">
          {message}
        </p>
      ) : null}

      {drawings.length === 0 ? (
        <p className="max-w-sm text-[14px] leading-7 text-ash">
          Nothing saved yet. Draw a sheet, then keep it here.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 sm:gap-x-10">
          {drawings.map((drawing) => (
            <li key={drawing.id}>
              <a href={`/?id=${drawing.id}`} className="block">
                {/* Data URLs are already encoded images, so the optimizer has nothing to fetch. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={drawing.preview}
                  alt={drawing.title}
                  className="aspect-[5/7] w-full border border-line bg-paper object-cover"
                />
              </a>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <a href={`/?id=${drawing.id}`} className="truncate text-[13px]">
                  {drawing.title}
                </a>
                <button
                  type="button"
                  className="shrink-0 text-[12px] text-ash hover:text-ink disabled:opacity-40"
                  onClick={() => remove(drawing)}
                  disabled={pendingId === drawing.id}
                >
                  Delete
                </button>
              </div>
              <p className="mt-1 text-[12px] capitalize text-ash">
                {drawing.style}
                <span className="px-1.5">·</span>
                {formatDate(drawing.updatedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
