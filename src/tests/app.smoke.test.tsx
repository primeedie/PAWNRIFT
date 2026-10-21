import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../App'
import { useAppStore } from '../game/state/appStore'

describe('foundation smoke test', () => {
  beforeEach(() => useAppStore.getState().showTitle())

  it('starts on a title screen with a Play button', () => {
    expect(useAppStore.getState().screen).toBe('title')
    const markup = renderToStaticMarkup(<App />)
    expect(markup).toContain('<h1>PAWNRIFT</h1>')
    expect(markup).not.toMatch(/Dungeon|A little pawn|journey starts|glimpse|quiet corner/)
    expect(markup).toMatch(/<button[^>]*>Play<\/button>/)
  })

  it('opens the scene and can return to the title', () => {
    useAppStore.getState().play()
    expect(useAppStore.getState().screen).toBe('scene')
    useAppStore.getState().showTitle()
    expect(useAppStore.getState().screen).toBe('title')
  })
})
