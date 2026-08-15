import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadTestIndex } from './testLoader'

describe('test loader cache behavior', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not reuse a stale test index after a deployment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    await loadTestIndex()

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/tests\/index\.json$/), { cache: 'no-store' })
  })
})
