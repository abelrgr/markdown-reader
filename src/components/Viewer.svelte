<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { renderMermaidBlocks } from '../lib/dom/mermaid';
  import { t } from '../lib/i18n/index.svelte';
  import type { Tab } from '../lib/state/tabs.svelte';
  import { enhanceViewer, handleViewerClick, tabs } from '../lib/state/app.svelte';
  import ImageLightbox from './ImageLightbox.svelte';
  import { settings } from '../lib/state/settings.svelte';
  let { tab }: { tab: Tab } = $props();
  let article: HTMLElement;
  let throttle: ReturnType<typeof setTimeout> | undefined;
  let themeObserver: MutationObserver | undefined;
  let lightboxSrc = $state('');
  let lightboxAlt = $state('');
  function onClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.closest('article.reader')) {
      lightboxSrc = target.currentSrc || target.src;
      lightboxAlt = target.alt;
      return;
    }
    void handleViewerClick(event, tab.dir);
  }

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
  onclick={onClick}
  data-reading-theme={settings.value.readingTheme}
  onscroll={saveScroll}
>
  {@html tab.render.html}
</article>
<ImageLightbox bind:src={lightboxSrc} alt={lightboxAlt} />
