<script lang="ts">
  import { tick } from 'svelte';
  import { folderSearch, searchFolder, tabs } from '../lib/state/app.svelte';
  import { t } from '../lib/i18n/index.svelte';

  let timer: ReturnType<typeof setTimeout> | undefined;
  let caseSensitive = $state(false);

  function updateQuery(value: string): void {
    folderSearch.query = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void searchFolder(value, caseSensitive), 300);
  }

  async function openHit(hit: (typeof folderSearch.hits)[number]): Promise<void> {
    try {
      const tab = await tabs.open(hit.path);
      await tick();
      const viewer = document.querySelector<HTMLElement>('[data-testid="viewer"]');
      if (!viewer) return;
      const blocks = [...viewer.querySelectorAll<HTMLElement>('[data-line]')];
      const target = blocks.filter((block) => Number(block.dataset.line) <= hit.line).at(-1);
      target?.scrollIntoView({ block: 'start' });
      if (!target) viewer.scrollTop = 0;
    } catch {
      // The standard file-open flow reports native errors via its state handler.
      await searchFolder(folderSearch.query, caseSensitive);
    }
  }
</script>

<section class="search-panel" data-testid="search-panel">
  <input
    aria-label={t('search.placeholder')}
    placeholder={t('search.placeholder')}
    value={folderSearch.query}
    oninput={(event) => updateQuery(event.currentTarget.value)}
  />
  <label>
    <input type="checkbox" bind:checked={caseSensitive} />
    {t('search.caseSensitive')}
  </label>
  {#if folderSearch.searching}<p role="status">…</p>{/if}
  {#if folderSearch.truncated}<p>{t('search.truncated')}</p>{/if}
  <ul class="search-results">
    {#each folderSearch.hits as hit, index (`${hit.path}:${hit.line}:${index}`)}
      <li>
        <button data-testid="search-result" onclick={() => void openHit(hit)}>
          <strong>{hit.relPath}:{hit.line}</strong>
          <span>{hit.preview}</span>
        </button>
      </li>
    {/each}
  </ul>
</section>
