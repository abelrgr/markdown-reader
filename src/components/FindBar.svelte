<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { clearFindHighlights, findRanges, highlightRanges } from '../lib/dom/find';

  let open = $state(false);
  let query = $state('');
  let current = $state(0);
  let input = $state<HTMLInputElement>();
  let ranges = $state<Range[]>([]);
  let currentElement: HTMLElement | null = null;
  const count = $derived(ranges.length);

  function refresh(): void {
    currentElement?.removeAttribute('data-testid');
    currentElement = null;
    const root = document.querySelector<HTMLElement>('[data-testid="viewer"]');
    ranges = root ? findRanges(root, query) : [];
    if (current >= ranges.length) current = Math.max(0, ranges.length - 1);
    highlightRanges(ranges, current);
    currentElement = ranges[current]?.startContainer.parentElement ?? null;
    currentElement?.setAttribute('data-testid', 'find-current');
  }
  function move(direction: number): void {
    if (!ranges.length) return;
    current = (current + direction + ranges.length) % ranges.length;
    highlightRanges(ranges, current);
    const range = ranges[current];
    const element = range?.startContainer.parentElement;
    currentElement?.removeAttribute('data-testid');
    currentElement = element;
    currentElement?.setAttribute('data-testid', 'find-current');
    element?.scrollIntoView({ block: 'center' });
  }
  function close(): void {
    open = false;
    query = '';
    ranges = [];
    currentElement?.removeAttribute('data-testid');
    currentElement = null;
    clearFindHighlights();
  }
  onMount(() => {
    const show = (): void => {
      open = true;
      void tick().then(() => {
        input?.focus();
        refresh();
      });
    };
    window.addEventListener('app:find', show);
    return () => {
      window.removeEventListener('app:find', show);
      clearFindHighlights();
      currentElement?.removeAttribute('data-testid');
    };
  });
  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      move(event.shiftKey ? -1 : 1);
    }
  }
</script>

{#if open}
  <div class="find-bar" role="search">
    <input
      bind:this={input}
      data-testid="find-input"
      aria-label={t('find.placeholder')}
      placeholder={t('find.placeholder')}
      bind:value={query}
      oninput={() => {
        current = 0;
        refresh();
      }}
      onkeydown={onKeydown}
    />
    <span data-testid="find-count"
      >{count
        ? t('find.resultCount', { current: current + 1, total: count })
        : query
          ? t('find.noResults')
          : '0/0'}</span
    >
    <button aria-label={t('find.previous')} onclick={() => move(-1)}>↑</button>
    <button aria-label={t('find.next')} onclick={() => move(1)}>↓</button>
    <button aria-label={t('find.close')} onclick={close}>×</button>
  </div>
{/if}
