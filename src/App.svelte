<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Viewer from './components/Viewer.svelte';
  import DropOverlay from './components/DropOverlay.svelte';
  import Toasts from './components/Toasts.svelte';
  import { applyTheme, disposeApp, initApp, isDropInside, tabs } from './lib/state/app.svelte';
  import { settings } from './lib/state/settings.svelte';
  import { native } from './lib/native';
  import { t } from './lib/i18n/index.svelte';
  import { toasts } from './lib/state/toasts.svelte';

  onMount(() => {
    let mounted = true;
    void Promise.resolve(initApp()).catch((error: unknown) => {
      if (!mounted) return;
      const detail = error instanceof Error ? error.message : String(error);
      toasts.push('error', t('error.IO', { detail }));
    });
    return () => { mounted = false; disposeApp(); };
  });
  $effect(() => {
    const value = settings.value;
    applyTheme();
    void native.setZoom(value.zoom);
  });
  $effect(() => {
    const active = tabs.active;
    void native.setWindowTitle(active ? `${active.name} — ${t('app.name')}` : t('app.name'));
  });
</script>

<div class="app-shell">
  {#if tabs.active}
    <header class="tabbar" role="tablist">
      {#each tabs.tabs as tab (tab.id)}
        <div class="tab" data-testid="tab" role="tab" aria-selected={tabs.activeId === tab.id}>
          <button class="tab-name" onclick={() => tabs.activate(tab.id)}>{tab.name}</button>
          <button aria-label={t('tabs.closeNamed', { name: tab.name })} onclick={() => tabs.close(tab.id)}>×</button>
        </div>
      {/each}
    </header>
    {#if tabs.active.status === 'missing'}<section class="missing">{t('app.fileNotAvailable')}</section>
    {:else}<Viewer tab={tabs.active} />{/if}
  {:else}<EmptyState />{/if}
  <DropOverlay visible={isDropInside()} />
  <Toasts />
</div>
