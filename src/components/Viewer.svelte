<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { renderMermaidBlocks } from '../lib/dom/mermaid';
  import { t } from '../lib/i18n/index.svelte';
  import type { Tab } from '../lib/state/tabs.svelte';
  import { enhanceViewer, handleViewerClick, tabs } from '../lib/state/app.svelte';
  let { tab }: { tab: Tab } = $props();
  let article: HTMLElement;
  let throttle: ReturnType<typeof setTimeout> | undefined;
  let themeObserver: MutationObserver | undefined;

  function renderDiagrams(): void {
    if (!article) return;
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    void renderMermaidBlocks(article, theme, t('viewer.mermaidError'));
  }

  $effect(() => {
    tab.render;
    tick().then(() => {
      if (!article) return;
      enhanceViewer(article, tab.dir);
      article.scrollTop = tab.scrollTop;
      themeObserver?.disconnect();
      themeObserver = new MutationObserver(renderDiagrams);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
      renderDiagrams();
    });
  });
  function saveScroll(): void {
    if (throttle) return;
    throttle = setTimeout(() => {
      tabs.setScroll(tab.id, article.scrollTop);
      throttle = undefined;
    }, 200);
  }
  onDestroy(() => {
    if (throttle) clearTimeout(throttle);
    themeObserver?.disconnect();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<article
  bind:this={article}
  class="prose dark:prose-invert reader"
  data-testid="viewer"
  onclick={(event) => void handleViewerClick(event, tab.dir)}
  onscroll={saveScroll}
>
  {@html tab.render.html}
</article>
