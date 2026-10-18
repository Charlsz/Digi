export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function rgba(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
