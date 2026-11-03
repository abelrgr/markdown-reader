<script lang="ts">
  import { renderMarkdown } from '../lib/markdown/render';
  import type { ChatMessage } from '../lib/native/types';
  import { linkCitations } from '../lib/dom/citations';
  import type { TocItem } from '../lib/markdown/types';

  let { message, toc = [] }: { message: ChatMessage; toc?: TocItem[] } = $props();
  let html = $state('');
  let root = $state<HTMLElement>();

  $effect(() => {
    const content = message.content;
    if (message.role === 'user') {
      html = '';
      return;
    }
    void renderMarkdown(content).then((result) => {
      if (message.content === content) {
        html = result.html;
        queueMicrotask(
          () =>
            root &&
            linkCitations(root, toc, (id) =>
              document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
            ),
        );
      }
    });
  });
</script>

<article bind:this={root} class="message" class:user={message.role === 'user'}>
  <span class="speaker">{message.role === 'user' ? 'You' : 'Assistant'}</span>
  {#if message.role === 'assistant'}<div class="message-content">{@html html}</div>
  {:else}<p class="message-content">{message.content}</p>{/if}
</article>

<style>
  .message {
    max-width: 94%;
    margin: 0.7rem 0;
    padding: 0.75rem 0.9rem;
    border-radius: 0.85rem;
    background: color-mix(in srgb, CanvasText 8%, Canvas);
    overflow-wrap: anywhere;
  }
  .message.user {
    margin-left: auto;
    background: color-mix(in srgb, #3b82f6 19%, Canvas);
  }
  .speaker {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    opacity: 0.72;
  }
  .message-content {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .message-content :global(p) {
    margin: 0.35rem 0;
  }
  .message-content :global(p:first-child) {
    margin-top: 0;
  }
  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }
  .message-content :global(pre) {
    max-width: 100%;
    overflow: auto;
  }
</style>
