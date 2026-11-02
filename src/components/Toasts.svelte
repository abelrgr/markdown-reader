<script lang="ts">
  import { toasts } from '../lib/state/toasts.svelte';
</script>
<div class="toasts" aria-live="polite">
  {#each toasts.items as toast (toast.id)}<div data-testid="toast" class:error={toast.kind === 'error'}>{toast.message}</div>{/each}
</div>
