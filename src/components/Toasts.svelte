<script lang="ts">
  import { toasts } from '../lib/state/toasts.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.items as toast (toast.id)}<div
      data-testid="toast"
      class:error={toast.kind === 'error'}
    >
      {toast.message}{#if toast.actionLabel && toast.action}<button onclick={toast.action}
          >{toast.actionLabel}</button
        >{/if}
    </div>{/each}
</div>
