import { afterEach, expect, test } from 'vitest'
import { fakeNative } from './fake'

afterEach(() => {
  window.__E2E_STARTUP__ = []
})

test('consumes startup paths once', async () => {
  window.__E2E_STARTUP__ = ['/fx/basic.md']

  await expect(fakeNative.takeStartupPaths()).resolves.toEqual(['/fx/basic.md'])
  await expect(fakeNative.takeStartupPaths()).resolves.toEqual([])
})
