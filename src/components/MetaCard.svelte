<script lang="ts">
  import { t } from '../lib/i18n/index.svelte';
  let { data }: { data: Record<string, unknown> } = $props();
  const featured = ['title', 'date', 'tags', 'author'];
  function display(value: unknown): string {
    return Array.isArray(value) ? value.join(', ') : String(value);
  }
  let extra = $derived(Object.entries(data).filter(([key]) => !featured.includes(key)));
</script>

<section class="meta-card" data-testid="meta-card" aria-label={t('meta.title')}>
  {#each featured.filter((key) => key in data) as key}<p>
      <strong>{key}</strong>: {display(data[key])}
    </p>{/each}
  {#if extra.length}<details>
      <summary>{t('meta.more')}</summary>{#each extra as [key, value]}<p>
          <strong>{key}</strong>: {display(value)}
        </p>{/each}
    </details>{/if}
</section>
