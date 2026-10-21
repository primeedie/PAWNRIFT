import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cardBalance, cards, starterCards } from '../data/cards'
import { cardCategories, cardPresentation } from '../data/cardPresentation'
import { glossary, plainCardText } from '../data/glossary'
import { CardDescription, CardHand } from '../ui/CardHand'
import { keywordEvents, outsideTooltip, tooltipKeyboard } from '../ui/tooltipEvents'
import { tooltipPosition } from '../ui/tooltipLayout'
import { usePawnStore } from '../game/state/pawnStore'

vi.mock('../game/state/pawnStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../game/state/pawnStore')>()
  return { ...actual, usePawnStore: Object.assign((selector?: (state: ReturnType<typeof actual.usePawnStore.getState>) => unknown) => {
    const state = actual.usePawnStore.getState()
    return selector ? selector(state) : state
  }, actual.usePawnStore) }
})

describe('typed card copy and glossary', () => {
  it('keeps token text identical to every card description and highlights only explicit tokens', () => {
    for (const [id, presentation] of Object.entries(cardPresentation)) {
      expect(plainCardText(presentation.tokens)).toBe(cards[id as keyof typeof cards].description)
      expect(cardCategories[presentation.category].label).toBeTruthy()
      for (const token of presentation.tokens) if (typeof token !== 'string') expect(glossary[token.keyword]).toBeDefined()
    }
    const text = renderToStaticMarkup(<CardDescription tokens={['Discarded? Focused? ', { keyword: 'block' }, '.']} />)
    expect(text.match(/data-keyword=/g)).toHaveLength(1)
    expect(text).toContain('data-keyword="block"')
    expect(text).toContain('Discarded? Focused?')
  })
  it('explains all implemented keywords, limits and expiration without promising future effects', () => {
    expect(Object.keys(glossary)).toEqual(expect.arrayContaining(['energy', 'block', 'focus', 'counter', 'draw', 'discard', 'damage', 'healing']))
    expect(glossary.block.explanation).toContain('after the coming enemy response')
    expect(glossary.block.explanation).toContain('even if enemies only move')
    expect(glossary.counter.explanation).toContain('if you survive')
    expect(glossary.counter.explanation).toContain('even if Block prevents all damage')
    expect(glossary.counter.explanation).toContain('expires after that response')
    expect(glossary.focus.explanation).toContain(`up to ${cardBalance.maxFocus}`)
    expect(glossary.focus.explanation).toContain('does not boost counters')
    expect(glossary.energy.explanation).toContain('after enemies respond')
    expect(glossary.energy.explanation).toContain('afford the full cost before playing')
    expect(glossary.discard.explanation).toContain('even the card just played can return')
    expect(glossary.healing.explanation).toContain('cannot be played at full HP')
  })
  it('preserves every effect, cost, deck count and resource setting from Stage 6', () => {
    expect(Object.fromEntries(Object.entries(cards).map(([id, card]) => [id, { cost: card.cost, effect: card.effect }]))).toEqual({
      cut: { cost: 1, effect: { kind: 'damage', amount: 4 } },
      ward: { cost: 1, effect: { kind: 'block', amount: 3 } },
      riposte: { cost: 1, effect: { kind: 'counter', block: 1, amount: 4 } },
      slip: { cost: 1, effect: { kind: 'move', block: 1 } },
      focus: { cost: 0, effect: { kind: 'focus', amount: 1 } },
      crimson: { cost: 3, effect: { kind: 'damage', amount: 7 } },
      mend: { cost: 2, effect: { kind: 'heal', amount: 4 } },
    })
    expect(starterCards).toEqual(['cut', 'cut', 'cut', 'ward', 'ward', 'riposte', 'riposte', 'slip', 'slip', 'focus', 'crimson', 'mend'])
    expect(cardBalance).toEqual({ handSize: 4, maxEnergy: 3, energyPerTurn: 1, maxFocus: 3 })
  })
})

describe('beginner card presentation', () => {
  beforeEach(() => usePawnStore.getState().loadDungeon('card-ui-fixture'))
  it('renders four semantic cards with separate selection, category and tooltip buttons', () => {
    const html = renderToStaticMarkup(<CardHand />)
    expect(html.match(/<article /g)).toHaveLength(4)
    expect(html.match(/class="card-select"/g)).toHaveLength(4)
    expect(html.match(/data-keyword="energy"/g)).toHaveLength(5)
    expect(html.match(/class="energy-icon"/g)).toHaveLength(5)
    expect(html).toContain('Explain Energy')
    expect(html).toContain('Open card guide')
    expect(html).toContain('card-category')
    let depth = 0
    for (const match of html.matchAll(/<\/?button\b[^>]*>/g)) {
      depth += match[0].startsWith('</') ? -1 : 1
      expect(depth).toBeGreaterThanOrEqual(0)
      expect(depth).toBeLessThanOrEqual(1) // No interactive button nested inside the card-select button.
    }
    expect(depth).toBe(0)
  })
  it('shows an explicit affordability explanation but leaves keyword inspection enabled', () => {
    usePawnStore.setState({ energy: 0 })
    const html = renderToStaticMarkup(<CardHand />)
    expect(html).toContain('unaffordable')
    expect(html).toContain('more Energy')
    expect(html).toContain('Costs')
    expect(html).toContain('you have 0')
    expect(html).not.toMatch(/class="keyword[^>]*disabled/)
  })
})

describe('tooltip input isolation', () => {
  it('handles hover/focus/tap and leave without selecting cards or advancing the game', () => {
    usePawnStore.getState().loadDungeon('inspection-only')
    const before = usePawnStore.getState()
    const show = vi.fn(), leave = vi.fn()
    const handlers = keywordEvents(show, leave)
    const trigger = {} as HTMLButtonElement
    const stopPropagation = vi.fn()
    handlers.onPointerEnter({ pointerType: 'mouse', currentTarget: trigger } as Parameters<typeof handlers.onPointerEnter>[0])
    expect(show).toHaveBeenLastCalledWith(trigger)
    handlers.onFocus({ currentTarget: trigger } as Parameters<typeof handlers.onFocus>[0])
    expect(show).toHaveBeenCalledTimes(2)
    handlers.onPointerEnter({ pointerType: 'touch', currentTarget: trigger } as Parameters<typeof handlers.onPointerEnter>[0])
    expect(show).toHaveBeenCalledTimes(2)
    handlers.onPointerDown({ stopPropagation } as Parameters<typeof handlers.onPointerDown>[0])
    handlers.onClick({ currentTarget: trigger, stopPropagation } as Parameters<typeof handlers.onClick>[0])
    expect(show).toHaveBeenLastCalledWith(trigger, true)
    expect(stopPropagation).toHaveBeenCalledTimes(2)
    handlers.onPointerLeave()
    handlers.onBlur()
    expect(leave).toHaveBeenCalledTimes(2)
    expect(usePawnStore.getState()).toBe(before)
  })
  it('Escape dismisses only help and focused arrow/space input cannot reach gameplay', () => {
    const node = {} as Node
    const inside = { contains: (candidate: Node | null) => candidate === node }
    const outside = { contains: () => false }
    const before = usePawnStore.getState()
    for (const key of ['Escape', 'ArrowUp', ' ', 'e', 'q']) {
      const dismiss = vi.fn(), stopPropagation = vi.fn(), preventDefault = vi.fn()
      tooltipKeyboard({ key, target: node, stopPropagation, preventDefault }, inside, outside, dismiss)
      expect(stopPropagation).toHaveBeenCalledOnce()
      expect(dismiss).toHaveBeenCalledTimes(key === 'Escape' ? 1 : 0)
      expect(preventDefault).toHaveBeenCalledTimes(key === 'Escape' ? 1 : 0)
    }
    expect(usePawnStore.getState()).toBe(before)
  })
  it('recognizes outside dismissal while allowing the pointer into the panel or another keyword', () => {
    const trigger = {} as Node, child = {} as Node, panel = {} as Node, board = {} as Node
    const triggerRegion = { contains: (node: Node | null) => node === trigger || node === child }
    const panelRegion = { contains: (node: Node | null) => node === panel }
    expect(outsideTooltip(trigger, triggerRegion, panelRegion)).toBe(false)
    expect(outsideTooltip(child, triggerRegion, panelRegion)).toBe(false)
    expect(outsideTooltip(panel, triggerRegion, panelRegion)).toBe(false)
    expect(outsideTooltip(board, triggerRegion, panelRegion)).toBe(true)
    const anotherKeyword = { closest: () => ({}) } as unknown as EventTarget
    expect(outsideTooltip(anotherKeyword, triggerRegion, panelRegion)).toBe(false)
  })
})

describe('tooltip viewport placement', () => {
  it('keeps every edge/corner tooltip within narrow, short and desktop viewports', () => {
    for (const viewport of [{ width: 320, height: 240 }, { width: 650, height: 480 }, { width: 1440, height: 900 }]) {
      const panel = { width: Math.min(350, viewport.width - 24), height: Math.min(300, viewport.height * 0.65) }
      for (const left of [-50, 0, viewport.width / 2, viewport.width - 10, viewport.width + 50]) {
        for (const top of [-50, 0, viewport.height / 2, viewport.height - 10, viewport.height + 50]) {
          const result = tooltipPosition({ left, top, bottom: top + 25, width: 35 }, panel, viewport)
          expect(result.left).toBeGreaterThanOrEqual(12)
          expect(result.top).toBeGreaterThanOrEqual(12)
          expect(result.left + panel.width).toBeLessThanOrEqual(viewport.width - 12)
          expect(result.top + panel.height).toBeLessThanOrEqual(viewport.height - 12)
        }
      }
    }
  })
})
