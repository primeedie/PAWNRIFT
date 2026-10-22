export type TooltipRect = { left: number; top: number; bottom: number; width: number }
export function tooltipPosition(anchor: TooltipRect, panel: { width: number; height: number }, viewport: { width: number; height: number },
  avoid: readonly { left: number; top: number; width: number; height: number }[] = []) {
  const margin = 12, gap = 8
  const width = Math.max(0, Math.min(panel.width, viewport.width - margin * 2))
  const height = Math.max(0, Math.min(panel.height, viewport.height - margin * 2))
  const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max))
  const centered = anchor.left + anchor.width / 2 - width / 2
  const above = anchor.top - height - gap, below = anchor.bottom + gap
  const candidates = [{ left: centered, top: above >= margin ? above : below }, { left: centered, top: below },
    { left: anchor.left - width - gap, top: anchor.top }, { left: anchor.left + anchor.width + gap, top: anchor.top },
    ...avoid.flatMap((rect) => [{ left: rect.left - width - gap, top: anchor.top }, { left: rect.left + rect.width + gap, top: anchor.top },
      { left: centered, top: rect.top - height - gap }, { left: centered, top: rect.top + rect.height + gap }])]
    .map((point) => ({ left: clamp(point.left, viewport.width - width - margin), top: clamp(point.top, viewport.height - height - margin) }))
  const overlap = (point: { left: number; top: number }) => avoid.reduce((sum, rect) => sum
    + Math.max(0, Math.min(point.left + width, rect.left + rect.width) - Math.max(point.left, rect.left))
    * Math.max(0, Math.min(point.top + height, rect.top + rect.height) - Math.max(point.top, rect.top)), 0)
  return candidates.reduce((best, point) => overlap(point) < overlap(best) ? point : best)
}
