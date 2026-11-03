<script lang="ts">
  import { onDestroy, tick, type Snippet } from 'svelte';
  import { t } from '../lib/i18n/index.svelte';

  let {
    open = $bindable(false),
    onClose,
    children,
    testid,
  }: { open?: boolean; onClose: () => void; children: Snippet; testid?: string } = $props();
  let element: HTMLDialogElement;

  $effect(() => {
    if (open && element && !element.open) void tick().then(() => element?.showModal());
    else if (!open && element?.open) element.close();
  });
  onDestroy(() => {
    if (element?.open) element.close();
  });
</script>

<dialog bind:this={element} data-testid={testid} aria-label={t('dialog.close')} onclose={onClose}>
  <button class="dialog-close" aria-label={t('dialog.close')} onclick={() => element.close()}
    >×</button
  >
  {@render children()}
</dialog>

<style>
  dialog {
    position: fixed;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    box-sizing: border-box;
    width: min(42rem, calc(100vw - 2rem));
    max-width: none;
    max-height: min(88vh, 58rem);
    overflow: auto;
    padding: 1.5rem;
    border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
    border-radius: 0.8rem;
    color: CanvasText;
    background: Canvas;
    box-shadow: 0 1.5rem 5rem #0005;
  }
  dialog::backdrop {
    background: #0008;
    backdrop-filter: blur(2px);
  }
  .dialog-close {
    position: sticky;
    z-index: 1;
    top: 0;
    float: right;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    margin: -0.6rem -0.6rem 0.2rem 0.5rem;
    border: 0;
    border-radius: 50%;
    color: inherit;
    background: transparent;
    font-size: 1.4rem;
    cursor: pointer;
  }
  dialog :global(h2) {
    margin: 0 0 1rem;
    font-size: 1.35rem;
    font-weight: 700;
  }
  dialog :global(label) {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
    margin: 0.65rem 0;
    font-size: 0.9rem;
  }
  dialog :global(label:has(input[type='checkbox'])) {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }
  dialog :global(input:not([type='checkbox'])),
  dialog :global(select),
  dialog :global(textarea) {
    box-sizing: border-box;
    width: 100%;
    min-height: 2.5rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid color-mix(in srgb, CanvasText 25%, transparent);
    border-radius: 0.4rem;
    color: CanvasText;
    background: Canvas;
    font: inherit;
  }
  dialog :global(input[type='checkbox']) {
    width: 1rem;
    height: 1rem;
    accent-color: #2563eb;
  }
  dialog :global(input:not([type='checkbox']):focus-visible),
  dialog :global(select:focus-visible),
  dialog :global(textarea:focus-visible) {
    border-color: #60a5fa;
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }
  dialog :global(button:not(.dialog-close)) {
    min-height: 2.35rem;
    padding: 0.45rem 0.8rem;
    border: 1px solid color-mix(in srgb, CanvasText 22%, transparent);
    border-radius: 0.4rem;
    color: CanvasText;
    background: color-mix(in srgb, CanvasText 7%, Canvas);
    font: inherit;
    cursor: pointer;
  }
  dialog :global(button:not(.dialog-close):hover) {
    background: color-mix(in srgb, CanvasText 13%, Canvas);
  }
  dialog :global(button:focus-visible) {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }
  dialog :global(fieldset) {
    min-width: 0;
    margin: 1rem 0;
    padding: 1rem;
    border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
    border-radius: 0.6rem;
  }
  dialog :global(fieldset > button) {
    margin: 0.25rem 0.35rem 0.35rem 0;
  }
  dialog :global(legend) {
    padding: 0 0.35rem;
    font-weight: 700;
  }
</style>
