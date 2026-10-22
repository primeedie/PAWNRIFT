export function EnemyHealthBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  return <span className="enemy-health-bar" role="progressbar" aria-label="Enemy health" aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={hp}>
    <span style={{ width: `${Math.max(0,Math.min(100,100*hp/Math.max(1,maxHp)))}%` }} />
  </span>
}
