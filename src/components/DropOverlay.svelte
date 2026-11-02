<script lang="ts">
  import { t } from '../lib/i18n/index.svelte';
  let { visible }: { visible: boolean } = $props();
</script>
{#if visible}<div class="drop-overlay" data-testid="drop-overlay"><span>{t('app.dropFile')}</span></div>{/if}
