import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DungeonTools from '../ui/DungeonTools'

describe('public dungeon toolbox', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('keeps seed, layout and generation controls available in production without map-reveal debugging', () => {
    vi.stubEnv('DEV', false)
    const html = renderToStaticMarkup(<DungeonTools />)
    expect(html).toContain('<summary>Dungeon tools</summary>')
    expect(html).toContain('Seed<input')
    expect(html).toContain('Layout<select')
    expect(html).toContain('Generate seed')
    expect(html).toContain('New dungeon')
    expect(html).toContain('Active:')
    expect(html).toContain('resets this run')
    expect(html).not.toContain('Reveal complete map')
    expect(html).not.toContain('type="checkbox"')
  })
  it('retains the reveal-map checkbox for local development', () => {
    vi.stubEnv('DEV', true)
    expect(renderToStaticMarkup(<DungeonTools />)).toContain('Reveal complete map')
  })
})
