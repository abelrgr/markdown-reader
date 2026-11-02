<script lang="ts">
  import { t } from '../lib/i18n/index.svelte';
  import type { Tab } from '../lib/state/tabs.svelte';
  let { tab }: { tab: Tab } = $props();
</script>

<footer class="status-bar" data-testid="status-bar">
  <span>{t('status.words', { count: tab.render.stats.words })}</span>
  <span>{t('status.readingMinutes', { count: tab.render.stats.readingMinutes })}</span>
  <span>{t('status.encoding', { encoding: tab.encoding })}</span>
</footer>
