import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DungeonTools from '../ui/DungeonTools'
import TransformationTools from '../ui/TransformationTools'

describe('public dungeon toolbox', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('keeps seed, layout, generation and map-reveal testing available in production', () => {
    vi.stubEnv('DEV', false)
    const html = renderToStaticMarkup(<DungeonTools />)
    expect(html).toContain('<summary>Dungeon tools</summary>')
    expect(html).toContain('Seed<input')
    expect(html).toContain('Layout<select')
    expect(html).toContain('Generate seed')
    expect(html).toContain('New dungeon')
    expect(html).toContain('Active:')
    expect(html).toContain('resets this run')
    expect(html).toContain('Reveal complete map')
    expect(html).toContain('type="checkbox"')
  })
  it('retains the reveal-map checkbox for local development', () => {
    vi.stubEnv('DEV', true)
    expect(renderToStaticMarkup(<DungeonTools />)).toContain('Reveal complete map')
  })
  it('renders every transformation testing control in production', () => {
    vi.stubEnv('DEV', false)
    const html = renderToStaticMarkup(<TransformationTools />)
    for (const label of ['Transformation testing', 'Knight', 'Bishop', 'Rook', 'Queen', 'Light', 'Dark',
      'Grant / unlock attunement', 'Test activation', 'Simulate completed floor', 'Simulate corresponding boss win', 'Test death retention']) {
      expect(html).toContain(label)
    }
    expect(html).not.toContain('· development')
  })
})
