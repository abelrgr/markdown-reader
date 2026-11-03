<script lang="ts">
  import { tick } from 'svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { bookmarks, navigationHistory, tabs } from '../lib/state/app.svelte';
  import type { TocItem } from '../lib/markdown/types';
  import FileTree from './FileTree.svelte';
  import SearchPanel from './SearchPanel.svelte';

  const VIRTUALIZE_AFTER = 500;
  const ROW_HEIGHT = 28;
  const OVERSCAN = 8;

  let { toc }: { toc: TocItem[] } = $props();
  let activeId = $state('');
  let nav = $state<HTMLElement>();
  let scrollTop = $state(0);
  let viewportHeight = $state(0);
  let activeSection = $state<'contents' | 'files' | 'search' | 'bookmarks'>('contents');

  function showSearch(): void {
    activeSection = 'search';
  }

  $effect(() => {
    window.addEventListener('app:searchFolder', showSearch);
    return () => window.removeEventListener('app:searchFolder', showSearch);
  });

  const virtualized = $derived(toc.length > VIRTUALIZE_AFTER);
  const firstIndex = $derived(
    virtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0,
  );
  const lastIndex = $derived(
    virtualized
      ? Math.min(toc.length, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN)
      : toc.length,
  );
  const visibleItems = $derived(toc.slice(firstIndex, lastIndex));

  function updateVirtualWindow(): void {
    if (!nav) return;
    scrollTop = nav.scrollTop;
    viewportHeight = nav.clientHeight;
  }

  function updateActiveHeading(headings: HTMLElement[], viewer: HTMLElement): void {
    const threshold = viewer.getBoundingClientRect().top + 90;
    let low = 0;
    let high = headings.length - 1;
    let current = -1;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      const heading = headings[middle];
      if (heading && heading.getBoundingClientRect().top <= threshold) {
        current = middle;
        low = middle + 1;
      } else high = middle - 1;
    }
    const id = headings[current]?.id;
    if (id) activeId = id;
  }

  $effect(() => {
    toc;
    let cancelled = false;
    let viewer: HTMLElement | null = null;
    let headings: HTMLElement[] = [];
    const onScroll = (): void => {
      if (viewer) updateActiveHeading(headings, viewer);
    };

    void tick().then(() => {
      if (cancelled) return;
      viewer = document.querySelector<HTMLElement>('[data-testid="viewer"]');
      if (!viewer) return;
      headings = [...viewer.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')];
      viewer.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    });
    return () => {
      cancelled = true;
      viewer?.removeEventListener('scroll', onScroll);
    };
  });

  $effect(() => {
    toc.length;
    void tick().then(updateVirtualWindow);
  });

  function goTo(id: string): void {
    document.getElementById(id)?.scrollIntoView();
  }
</script>

<aside class="sidebar" data-testid="sidebar" aria-label={t('sidebar.tableOfContents')}>
  <div class="sidebar-tabs" role="tablist" aria-label={t('sidebar.sections')}>
    <button
      role="tab"
      aria-selected={activeSection === 'contents'}
      onclick={() => (activeSection = 'contents')}>{t('sidebar.contents')}</button
    >
    <button
      role="tab"
      aria-selected={activeSection === 'files'}
      onclick={() => (activeSection = 'files')}>{t('sidebar.files')}</button
    >
    <button
      role="tab"
      aria-selected={activeSection === 'search'}
      onclick={() => (activeSection = 'search')}>{t('search.title')}</button
    >
    <button
      role="tab"
      aria-selected={activeSection === 'bookmarks'}
      onclick={() => (activeSection = 'bookmarks')}>{t('sidebar.bookmarks')}</button
    >
  </div>
  {#if activeSection === 'contents'}
    <h2>{t('sidebar.tableOfContents')}</h2>
    <nav
      bind:this={nav}
      class:virtualized
      onscroll={updateVirtualWindow}
      aria-label={t('sidebar.tableOfContents')}
    >
      {#if virtualized}
        <div class="toc-virtual-space" style={`height:${toc.length * ROW_HEIGHT}px`}>
          {#each visibleItems as item, index (item.id)}
            <button
              class:active={activeId === item.id}
              class="toc-virtual-item"
              aria-current={activeId === item.id ? 'location' : undefined}
              data-testid="toc-item"
              style={`--depth:${item.depth};--row:${firstIndex + index}`}
              onclick={() => goTo(item.id)}
              >{item.text}{#if activeId === item.id}<span
                  class="sr-only"
                  data-testid="toc-item-active">{item.text}</span
                >{/if}</button
            >
          {/each}
        </div>
      {:else}
        {#each visibleItems as item (item.id)}
          <button
            class:active={activeId === item.id}
            aria-current={activeId === item.id ? 'location' : undefined}
            data-testid="toc-item"
            style={`--depth:${item.depth}`}
            onclick={() => goTo(item.id)}
            >{item.text}{#if activeId === item.id}<span
                class="sr-only"
                data-testid="toc-item-active">{item.text}</span
              >{/if}</button
          >
        {/each}
      {/if}
    </nav>
  {:else if activeSection === 'files'}
    <h2>{t('sidebar.files')}</h2>
    <FileTree />
  {:else if activeSection === 'search'}
    <h2>{t('search.title')}</h2>
    <SearchPanel />
  {:else}
    <h2>{t('sidebar.bookmarks')}</h2>
    <nav aria-label={t('sidebar.bookmarks')}>
      {#each bookmarks.items.filter((item) => item.path === tabs.active?.path) as bookmark (`${bookmark.path}:${bookmark.headingId}`)}
        <button
          onclick={() => {
            const active = tabs.active;
            if (active) {
              navigationHistory.push({
                path: active.path,
                anchor: null,
                scrollTop: active.scrollTop,
              });
              navigationHistory.push({
                path: bookmark.path,
                anchor: bookmark.headingId,
                scrollTop: 0,
              });
            }
            goTo(bookmark.headingId);
          }}>{bookmark.label}</button
        >
      {/each}
    </nav>
  {/if}
</aside>
