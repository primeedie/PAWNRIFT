export type TooltipRect = { left: number; top: number; bottom: number; width: number }
export function tooltipPosition(anchor: TooltipRect, panel: { width: number; height: number }, viewport: { width: number; height: number }) {
  const margin = 12, gap = 8
  const width = Math.max(0, Math.min(panel.width, viewport.width - margin * 2))
  const height = Math.max(0, Math.min(panel.height, viewport.height - margin * 2))
  const clamp = (value: number, max: number) => Math.max(margin, Math.min(value, max))
  return {
    left: clamp(anchor.left + anchor.width / 2 - width / 2, viewport.width - width - margin),
    top: clamp(anchor.top - height - gap >= margin ? anchor.top - height - gap : anchor.bottom + gap,
      viewport.height - height - margin),
  }
}
