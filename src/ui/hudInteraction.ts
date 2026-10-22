export function gameplayBlocked() {
  return !!document.querySelector('details[name="hud-panels"][open], dialog[open]')
}
export function restoreGameFocus() {
  document.querySelector<HTMLElement>('.scene-screen')?.focus({ preventScroll: true })
}
export function closeHudPanels() {
  document.querySelectorAll<HTMLDetailsElement>('details[name="hud-panels"]').forEach((panel) => { panel.open = false })
  restoreGameFocus()
}
export function restoreAfterPanelClose(panel: { open: boolean; contains: (node: Node | null) => boolean }, active: Node | null, restore: () => void) {
  if (!panel.open && panel.contains(active)) restore()
}
