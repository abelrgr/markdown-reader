import { mount, unmount } from 'svelte'
import { afterEach, expect, test } from 'vitest'
import App from './App.svelte'

let mounted: ReturnType<typeof mount> | undefined

afterEach(() => {
  if (mounted) unmount(mounted)
  mounted = undefined
  document.body.innerHTML = ''
})

test('shows the Markdown Reader app name', () => {
  const target = document.createElement('div')
  document.body.append(target)
  mounted = mount(App, { target })

  expect(target.querySelector('main')?.textContent).toBe('Markdown Reader')
})
