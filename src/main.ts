import { mount } from 'svelte'
import { error } from '@tauri-apps/plugin-log'
import './app.css'
import App from './App.svelte'

if (import.meta.env.MODE !== 'e2e') {
  window.addEventListener('error', (event) => {
    void error(event.error instanceof Error ? event.error.message : event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    void error(event.reason instanceof Error ? event.reason.message : String(event.reason))
  })
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
