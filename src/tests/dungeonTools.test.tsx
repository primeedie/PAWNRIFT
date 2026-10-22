import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DungeonTools from '../ui/DungeonTools'
import TransformationTools from '../ui/TransformationTools'

describe('public dungeon toolbox', () => {
  afterEach(() => vi.unstubAllEnvs())
  it('keeps seed, layout, generation and map-reveal testing available in production', () => {
    vi.stubEnv('DEV', false)
    const html = renderToStaticMarkup(<DungeonTools />)
    expect(html).toContain('<summary>Playtest Tools</summary>')
    expect(html).toContain('Seed<input')
    expect(html).toContain('Layout<select')
    expect(html).toContain('Generate seed')
    expect(html).toContain('New dungeon')
    expect(html).toContain('Active:')
    expect(html).toContain('does not complete a floor')
    expect(html).toContain('Reveal complete map')
    expect(html).toContain('type="checkbox"')
    for (const label of ['Map Diagnostics', 'Replace selected slot', 'Restore Knight charges', 'Set duration (test)',
      'Reset Astral Eye', 'Spawn visible test enemy', 'Restore HP', 'Restore Energy', 'Restore Focus', 'Reset all cooldowns',
      'Regenerate current floor', 'Copy current seed', 'Restore normal fog', 'Master seed', 'Floor seed']) expect(html).toContain(label)
  })
  it('retains the reveal-map checkbox for local development', () => {
    vi.stubEnv('DEV', true)
    expect(renderToStaticMarkup(<DungeonTools />)).toContain('Reveal complete map')
  })
  it('renders every transformation testing control in production', () => {
    vi.stubEnv('DEV', false)
    const html = renderToStaticMarkup(<TransformationTools />)
    for (const label of ['Transformation testing', 'Knight', 'Bishop', 'Rook', 'Queen', 'Light', 'Dark',
      'Grant / unlock attunement', 'Test activation', 'Clear recovery (test)', 'Simulate corresponding boss win', 'Test death retention']) {
      expect(html).toContain(label)
    }
    expect(html).not.toContain('· development')
  })
})
