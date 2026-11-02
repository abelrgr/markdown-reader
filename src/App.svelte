<script lang="ts">
  import { onMount } from 'svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Viewer from './components/Viewer.svelte';
  import DropOverlay from './components/DropOverlay.svelte';
  import Toasts from './components/Toasts.svelte';
  import TabBar from './components/TabBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import MetaCard from './components/MetaCard.svelte';
  import {
    applyTheme,
    disposeApp,
    initApp,
    isDropInside,
    openPaths,
    tabs,
  } from './lib/state/app.svelte';
  import { settings } from './lib/state/settings.svelte';
  import { native } from './lib/native';
  import { t } from './lib/i18n/index.svelte';
  import { toasts } from './lib/state/toasts.svelte';
  import { bindShortcuts } from './lib/commands';
  import { registerAppCommands } from './lib/app-commands';
  import { recents } from './lib/state/app.svelte';
  import SettingsDialog from './components/SettingsDialog.svelte';
  import AboutDialog from './components/AboutDialog.svelte';
  import ShortcutsDialog from './components/ShortcutsDialog.svelte';
  import { buildMenuModel } from './lib/menu';
  import { runCommand, type CommandId } from './lib/commands';

  onMount(() => {
    registerAppCommands();
    const unbind = bindShortcuts(window, /Mac|iPhone|iPad/.test(navigator.platform));
    let mounted = true;
    void Promise.resolve(initApp()).catch((error: unknown) => {
      if (!mounted) return;
      const detail = error instanceof Error ? error.message : String(error);
      toasts.push('error', t('error.IO', { detail }));
    });
    return () => {
      mounted = false;
      unbind();
      disposeApp();
    };
  });
  $effect(() => {
    const value = settings.value;
    applyTheme();
    void native.setZoom(value.zoom);
  });
  $effect(() => {
    recents.items;
    t('menu.file');
    void native.setMenu(
      buildMenuModel(recents.items, { isMac: /Mac|iPhone|iPad/.test(navigator.platform) }),
      (id) => {
        if (id.startsWith('recent:')) void openPaths([id.slice(7)]);
        else void runCommand(id as CommandId);
      },
    );
  });
  $effect(() => {
    const active = tabs.active;
    void native.setWindowTitle(active ? `${active.name} — ${t('app.name')}` : t('app.name'));
  });
</script>

<div class="app-shell">
  {#if tabs.active}
    <TabBar />
    <div class="workspace">
      {#if settings.value.showSidebar}<Sidebar toc={tabs.active.render.toc} />{/if}
      <main class="document-area">
        {#if tabs.active.status === 'missing'}<section class="missing">
            {t('app.fileNotAvailable')}
            <button onclick={() => tabs.active && tabs.close(tabs.active.id)}
              >{t('app.remove')}</button
            >
          </section>
        {:else}{#if tabs.active.render.frontmatter}<MetaCard
              data={tabs.active.render.frontmatter}
            />{/if}<Viewer tab={tabs.active} />{/if}
      </main>
    </div>
    {#if tabs.active.status !== 'missing'}<StatusBar tab={tabs.active} />{/if}
  {:else}<EmptyState />{/if}
  <DropOverlay visible={isDropInside()} />
  <Toasts />
  <SettingsDialog />
  <AboutDialog />
  <ShortcutsDialog />
</div>
