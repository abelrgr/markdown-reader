<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { fuzzyFilter } from '../lib/fuzzy';
  import { t } from '../lib/i18n/index.svelte';
  import { openFolderPath, openPaths, recents, tabs, workspace } from '../lib/state/app.svelte';

  interface QuickItem {
    path: string;
    label: string;
    kind: 'file' | 'folder';
  }

  let open = $state(false);
  let query = $state('');
  let selected = $state(0);
  let input: HTMLInputElement;

  const candidates = $derived.by(() => {
    if (workspace.listing) {
      return workspace.listing.entries.map((entry) => ({
        path: entry.path,
        label: entry.relPath,
        kind: 'file' as const,
      }));
    }
    const items: QuickItem[] = tabs.tabs.map((tab) => ({
      path: tab.path,
      label: `${t('palette.tabs')}: ${tab.name}`,
      kind: 'file',
    }));
    for (const entry of recents.items) {
      if (items.some((item) => item.path === entry.path)) continue;
      items.push({
        path: entry.path,
        label: `${t('palette.recents')}: ${entry.path.split(/[\\/]/).at(-1) ?? entry.path}`,
        kind: entry.kind,
      });
    }
    return items;
  });
  const results = $derived(fuzzyFilter(candidates, query, (item) => `${item.label} ${item.path}`));

  function show(): void {
    query = '';
    selected = 0;
    open = true;
    void tick().then(() => input?.focus());
  }

  function close(): void {
    open = false;
  }

  function choose(item = results[selected]): void {
    if (!item) return;
    close();
    if (item.kind === 'folder') void openFolderPath(item.path);
    else void openPaths([item.path]);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      selected = (selected + 1) % results.length;
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      selected = (selected - 1 + results.length) % results.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose();
    }
  }

  onMount(() => {
    window.addEventListener('app:quickOpen', show);
    return () => window.removeEventListener('app:quickOpen', show);
  });
</script>

<Dialog bind:open onClose={close} testid="quick-open-dialog">
  <h2>{t('palette.quickOpen')}</h2>
  <input
    bind:this={input}
    aria-label={t('palette.quickOpen')}
    placeholder={t('palette.quickOpen')}
    bind:value={query}
    oninput={() => (selected = 0)}
    onkeydown={onKeydown}
  />
  <ul class="palette-results">
    {#each results as item, index (`${item.kind}:${item.path}`)}
      <li>
        <button
          class:selected={index === selected}
          data-testid="quick-open-item"
          onclick={() => choose(item)}
        >
          <span aria-hidden="true">{item.kind === 'folder' ? '📁' : '📄'}</span>
          <span>{item.label}</span>
        </button>
      </li>
    {:else}
      <li class="palette-empty">{t('find.noResults')}</li>
    {/each}
  </ul>
</Dialog>
