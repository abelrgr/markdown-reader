<script lang="ts">
  import { openFromDialog, openPaths, pinRecent, recents, removeRecent, sortRecents } from '../lib/state/app.svelte';
  import { t } from '../lib/i18n/index.svelte';
</script>

<main class="empty-state" data-testid="empty-state">
  <h1>{t('app.name')}</h1>
  <button class="primary" onclick={() => void openFromDialog()}>{t('app.openFile')}</button>
  <p>{t('app.dropFile')}</p>
  {#if sortRecents(recents.items).length}
    <ul>
      {#each sortRecents(recents.items) as entry (entry.path)}
        <li>
          <button data-testid="recent-item" class="recent-name" onclick={() => void openPaths([entry.path])}>{entry.path.split(/[\\/]/).at(-1)}</button>
          <button aria-label={entry.pinned ? t('tabs.unpin') : t('tabs.pin')} onclick={() => pinRecent(entry.path)}>{entry.pinned ? '★' : '☆'}</button>
          <button aria-label={t('tabs.removeRecent')} onclick={() => void removeRecent(entry.path)}>×</button>
        </li>
      {/each}
    </ul>
  {:else}<p>{t('app.noRecentFiles')}</p>{/if}
</main>
