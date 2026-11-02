<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { tabs } from '../lib/state/app.svelte';
  import type { TocItem } from '../lib/markdown/types';
  let { toc }: { toc: TocItem[] } = $props();
  let activeId = $state('');
  let observer: IntersectionObserver | undefined;
  let removeScroll: (() => void) | undefined;
  let intersecting = new Set<string>();
  $effect(() => {
    toc;
    void tick().then(() => {
      observer?.disconnect();
      intersecting = new Set<string>();
      const viewer = document.querySelector('[data-testid="viewer"]');
      if (!viewer || typeof IntersectionObserver === 'undefined') return;
      const updateCurrent = (): void => {
        const headings = [...viewer.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,h6')];
        const current = headings
          .filter(
            (heading) =>
              heading.getBoundingClientRect().top <= viewer.getBoundingClientRect().top + 90,
          )
          .at(-1);
        if (current) activeId = current.id;
      };
      viewer.addEventListener('scroll', updateCurrent);
      updateCurrent();
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) intersecting.add(entry.target.id);
            else intersecting.delete(entry.target.id);
          }
          const visible = [...intersecting]
            .map((id) => document.getElementById(id))
            .filter((heading): heading is HTMLElement => heading !== null)
            .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
          if (visible[0]) activeId = visible[0].id;
        },
        { root: viewer, rootMargin: '0px 0px -70% 0px' },
      );
      viewer.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading) => observer?.observe(heading));
      removeScroll = () => viewer.removeEventListener('scroll', updateCurrent);
    });
  });
  onDestroy(() => {
    observer?.disconnect();
    removeScroll?.();
  });
  function goTo(id: string): void {
    document.getElementById(id)?.scrollIntoView();
  }
</script>

<aside class="sidebar" data-testid="sidebar" aria-label={t('sidebar.tableOfContents')}>
  <h2>{t('sidebar.tableOfContents')}</h2>
  <nav>
    {#each toc as item (item.id)}<button
        class:active={activeId === item.id}
        aria-current={activeId === item.id ? 'location' : undefined}
        data-testid="toc-item"
        style={`--depth:${item.depth}`}
        onclick={() => goTo(item.id)}
        >{item.text}{#if activeId === item.id}<span class="sr-only" data-testid="toc-item-active"
            >{item.text}</span
          >{/if}</button
      >{/each}
  </nav>
</aside>
