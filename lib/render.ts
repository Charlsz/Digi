import type { Point, Stroke, ToolId } from "@/lib/types"

type Stamp = {
  x: number
  y: number
  p: number
  speed: number
  index: number
}

function hash(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function rgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.2, radius), 0, Math.PI * 2)
  ctx.fill()
}

function softDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius)
  gradient.addColorStop(0, rgba(color, alpha))
  gradient.addColorStop(0.5, rgba(color, alpha * 0.42))
  gradient.addColorStop(1, rgba(color, 0))
  ctx.globalAlpha = 1
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}

function strokeLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  size: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = size
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  if (points.length === 1) {
    ctx.beginPath()
    ctx.arc(points[0].x, points[0].y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
  }
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

function spacingFor(brush: ToolId, size: number) {
  switch (brush) {
    case "manga":
      return 0.9
    case "pencil":
      return 0.65
    case "sketch":
      return Math.max(1.4, size * 0.16)
    case "sumi":
      return Math.max(2.4, size * 0.16)
    case "tone":
      return Math.max(2, size * 0.2)
    default:
      return Math.max(1, size * 0.12)
  }
}

function walk(stroke: Stroke, visit: (stamp: Stamp) => void) {
  const points = stroke.points
  if (points.length === 0) return

  if (points.length === 1) {
    visit({ ...points[0], speed: 0, index: 0 })
    return
  }

  const spacing = spacingFor(stroke.brush, stroke.size)
  let index = 0

  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    const from = points[pointIndex - 1]
    const to = points[pointIndex]
    const distance = Math.hypot(to.x - from.x, to.y - from.y)
    const speed = distance / Math.max(1, to.t - from.t)
    const steps = Math.max(1, Math.ceil(distance / spacing))

    for (let step = 1; step <= steps; step += 1) {
      const amount = step / steps
      visit({
        x: from.x + (to.x - from.x) * amount,
        y: from.y + (to.y - from.y) * amount,
        p: from.p + (to.p - from.p) * amount,
        speed,
        index,
      })
      index += 1
    }
  }
}

function paintSketch(ctx: CanvasRenderingContext2D, stamp: Stamp, stroke: Stroke) {
  for (let pass = 0; pass < 2; pass += 1) {
    const driftX = (hash(stamp.index, pass + 1) - 0.5) * stroke.size * 0.55
    const driftY = (hash(stamp.index, pass + 5) - 0.5) * stroke.size * 0.55
    const radius = Math.max(
      0.4,
      stroke.size * (0.16 + stamp.p * 0.2) * (0.62 + hash(stamp.index, pass + 9) * 0.7),
    )
    dot(
      ctx,
      stamp.x + driftX,
      stamp.y + driftY,
      radius,
      stroke.color,
      0.14 + hash(stamp.index, pass + 2) * 0.12,
    )
  }
}

function paintManga(ctx: CanvasRenderingContext2D, stamp: Stamp, stroke: Stroke) {
  const speedFactor = clamp(1.28 - stamp.speed * 0.62, 0.16, 1.25)
  const pressureFactor = 0.4 + stamp.p * 0.75
  const radius = Math.max(0.35, (stroke.size / 2) * speedFactor * pressureFactor)
  dot(ctx, stamp.x, stamp.y, radius, stroke.color, 1)
}

function paintSumi(ctx: CanvasRenderingContext2D, stamp: Stamp, stroke: Stroke) {
  const driftX = (hash(stamp.index, 2) - 0.5) * stroke.size * 0.14
  const driftY = (hash(stamp.index, 6) - 0.5) * stroke.size * 0.1
  const radius = stroke.size * (0.42 + stamp.p * 0.7)
  softDot(ctx, stamp.x + driftX, stamp.y + driftY, radius, stroke.color, 0.05 + stamp.p * 0.035)
  dot(ctx, stamp.x, stamp.y, radius * 0.16, stroke.color, 0.045)
}

function paintPencil(ctx: CanvasRenderingContext2D, stamp: Stamp, stroke: Stroke) {
  if (hash(stamp.index, 4) < 0.12) return
  const driftX = (hash(stamp.index, 1) - 0.5) * 1.6
  const driftY = (hash(stamp.index, 8) - 0.5) * 1.6
  const radius = Math.max(0.25, stroke.size * 0.14)
  dot(
    ctx,
    stamp.x + driftX,
    stamp.y + driftY,
    radius,
    stroke.color,
    0.28 + hash(stamp.index, 3) * 0.45,
  )
}

function paintTone(ctx: CanvasRenderingContext2D, stamp: Stamp, stroke: Stroke) {
  const cell = Math.max(4, stroke.size * 0.34)
  const x = Math.round(stamp.x / cell) * cell
  const y = Math.round(stamp.y / cell) * cell
  dot(ctx, x, y, cell * 0.26, stroke.color, 1)
}

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return

  ctx.save()

  if (stroke.brush === "eraser") {
    ctx.globalCompositeOperation = "destination-out"
    strokeLine(ctx, stroke.points, stroke.size, "#000000", 1)
  } else if (stroke.brush === "marker") {
    strokeLine(ctx, stroke.points, stroke.size, stroke.color, 0.9)
  } else {
    const paint =
      stroke.brush === "manga"
        ? paintManga
        : stroke.brush === "sumi"
          ? paintSumi
          : stroke.brush === "pencil"
            ? paintPencil
            : stroke.brush === "tone"
              ? paintTone
              : paintSketch
    walk(stroke, (stamp) => paint(ctx, stamp, stroke))
  }

  ctx.restore()
}

export function redrawStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number,
  ratio: number,
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, width, height)
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  for (const stroke of strokes) drawStroke(ctx, stroke)
}
