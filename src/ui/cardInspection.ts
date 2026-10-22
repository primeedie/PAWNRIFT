type CardRect = { left: number; top: number; width: number; height: number }
// Fixed-position face escapes the hand's horizontal scroll clip; the card slot never resizes.
export function cardInspection(rect: CardRect, viewport: { width: number; height: number }) {
  const scale = Math.min(1.6, (viewport.width - 24) / rect.width, (viewport.height - 32) / rect.height)
  const extraX = rect.width * (scale - 1) / 2
  const left = Math.min(viewport.width - 12 - rect.width - extraX, Math.max(12 + extraX, rect.left))
  const top = Math.max(12 + rect.height * (scale - 1) + 8, Math.min(rect.top, viewport.height - rect.height - 12))
  return { left, top, width: rect.width, height: rect.height, transform: `translateY(-8px) scale(${scale})` }
}
