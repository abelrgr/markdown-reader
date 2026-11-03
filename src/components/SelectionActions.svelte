<script lang="ts">
  import { onMount } from 'svelte';
  import { aiSession } from '../lib/ai/session.svelte';
  import { settings } from '../lib/state/settings.svelte';
  let text = $state('');
  let visible = $state(false);
  let x = $state(0);
  let y = $state(0);
  onMount(() => {
    const selection = (): void => {
      const selected = window.getSelection()?.toString().trim() ?? '';
      const range = window.getSelection()?.rangeCount
        ? window.getSelection()!.getRangeAt(0).getBoundingClientRect()
        : null;
      text = selected;
      visible =
        !!selected &&
        !!range &&
        !!document.querySelector('.reader')?.contains(window.getSelection()?.anchorNode ?? null);
      if (range) {
        x = range.left;
        y = range.top;
      }
    };
    document.addEventListener('selectionchange', selection);
    return () => document.removeEventListener('selectionchange', selection);
  });
  function explain(): void {
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
    if (settings.value.ai.enabled) void aiSession.run('explain', text);
    visible = false;
  }
</script>

{#if visible}<button
    class="selection-action"
    style:left="{x}px"
    style:top="{y - 42}px"
    onclick={explain}>Explain with AI</button
  >{/if}

<style>
  .selection-action {
    position: fixed;
    z-index: 50;
  }
</style>
