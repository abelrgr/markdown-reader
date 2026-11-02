<script lang="ts">
  import { t } from '../lib/i18n/index.svelte';
  import { tabs } from '../lib/state/app.svelte';
  let dragged = -1;
</script>

<header class="tabbar" role="tablist">
  {#each tabs.tabs as tab, index (tab.id)}
    <div
      class="tab"
      data-testid="tab"
      role="tab"
      tabindex="0"
      aria-selected={tabs.activeId === tab.id}
      draggable="true"
      ondragstart={() => {
        dragged = index;
      }}
      ondragover={(event) => event.preventDefault()}
      ondrop={(event) => {
        event.preventDefault();
        tabs.move(dragged, index);
        dragged = -1;
      }}
    >
      <button class="tab-name" onclick={() => tabs.activate(tab.id)}>{tab.name}</button>
      <button
        data-testid="tab-close"
        aria-label={t('tabs.closeNamed', { name: tab.name })}
        onclick={() => tabs.close(tab.id)}>×</button
      >
    </div>
  {/each}
</header>
