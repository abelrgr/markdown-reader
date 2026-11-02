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
