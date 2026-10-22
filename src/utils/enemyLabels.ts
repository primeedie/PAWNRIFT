type LabelPoint = { id: string; x: number; y: number }
// Small pixel offsets, recomputed from the actual camera; never depend on hidden entities.
export function enemyLabelOffsets(points: readonly LabelPoint[], viewportHeight: number) {
  const placed: LabelPoint[] = [], offsets = new Map<string, number>()
  for (const point of [...points].sort((a,b) => a.y-b.y || a.id.localeCompare(b.id))) {
    const base = Math.max(18,Math.min(viewportHeight-18,point.y))
    const candidates = [base,...placed.map(other=>other.y-30)].filter(y=>y>=18&&y<=base).sort((a,b)=>b-a)
    const y = candidates.find((y) => placed.every((other) => Math.abs(other.x-point.x)>=100 || Math.abs(other.y-y)>=29)) ?? candidates[0]
    offsets.set(point.id,y-point.y); placed.push({ ...point,y })
  }
  return offsets
}
