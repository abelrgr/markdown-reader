<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { aiSession } from '../lib/ai/session.svelte';
  import { settings } from '../lib/state/settings.svelte';
  import { tabs } from '../lib/state/app.svelte';
  import { linkCitations } from '../lib/dom/citations';
  import AiChatMessage from './AiChatMessage.svelte';
  let open = $state(false);
  let question = $state('');
  let outputRoot = $state<HTMLElement>();
  let chatHistory = $state<HTMLElement>();
  let stickToBottom = $state(true);

  function scrollToLatest(): void {
    if (!chatHistory || !stickToBottom) return;
    requestAnimationFrame(() => {
      if (chatHistory && stickToBottom) chatHistory.scrollTop = chatHistory.scrollHeight;
    });
  }

  function onTranscriptScroll(): void {
    if (!chatHistory) return;
    stickToBottom =
      chatHistory.scrollHeight - chatHistory.scrollTop - chatHistory.clientHeight < 48;
  }
  onMount(() => {
    const toggle = (): void => {
      open = !open;
    };
    const confirmHost = (event: Event): void => {
      const detail = (
        event as CustomEvent<{ host: string; accept: () => void; reject: () => void }>
      ).detail;
      if (window.confirm(`Allow sending selected document context to ${detail.host}?`))
        detail.accept();
      else detail.reject();
    };
    window.addEventListener('app:aiToggle', toggle);
    window.addEventListener('ai:confirm-host', confirmHost);
    const summarize = (): void => {
      open = true;
      void aiSession.run('summary');
    };
    const translate = (): void => {
      open = true;
      void aiSession.run('translate');
    };
    const explain = (): void => {
      open = true;
      const selected = window.getSelection()?.toString().trim();
      if (selected) void aiSession.run('explain', selected);
    };
    window.addEventListener('app:aiSummarize', summarize);
    window.addEventListener('app:aiTranslate', translate);
    window.addEventListener('app:aiExplainSelection', explain);
    return () => {
      window.removeEventListener('app:aiToggle', toggle);
      window.removeEventListener('ai:confirm-host', confirmHost);
      window.removeEventListener('app:aiSummarize', summarize);
      window.removeEventListener('app:aiTranslate', translate);
      window.removeEventListener('app:aiExplainSelection', explain);
    };
  });
  $effect(() => {
    const html = aiSession.rendered;
    const activeId = tabs.active?.id ?? null;
    tabs.tabs.map((tab) => tab.id);
    aiSession.activateTab(activeId);
    aiSession.forgetClosedTabs(new Set(tabs.tabs.map((tab) => tab.id)));
    if (activeId === null) {
      open = false;
      question = '';
      aiSession.reset();
    }
    tabs.active?.render.toc;
    if (open && outputRoot && html)
      queueMicrotask(
        () =>
          outputRoot &&
          linkCitations(outputRoot, tabs.active?.render.toc ?? [], (id) =>
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
          ),
      );
  });
  $effect(() => {
    aiSession.rendered;
    aiSession.messages.length;
    aiSession.streaming;
    if (!chatHistory) return;
    void tick().then(() => {
      requestAnimationFrame(() => {
        if (chatHistory) chatHistory.scrollTop = chatHistory.scrollHeight;
      });
    });
  });
  $effect(() => {
    const history = chatHistory;
    if (!history) return;
    const observer = new MutationObserver(scrollToLatest);
    observer.observe(history, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  });
  function ask(): void {
    const value = question.trim();
    if (!value) return;
    stickToBottom = true;
    question = '';
    void aiSession.run('ask', value);
  }
</script>

{#if open}
  <aside class="ai-panel" aria-label="AI assistant" data-testid="ai-panel">
    <header>
      <h2>AI assistant</h2>
      <button aria-label="Close AI assistant" onclick={() => (open = false)}>×</button>
    </header>
    {#if !settings.value.ai.enabled}
      <p>Enable AI in Settings to use the reading assistant.</p>
      <button onclick={() => window.dispatchEvent(new CustomEvent('app:settings'))}
        >Open Settings</button
      >
    {:else if !tabs.active}
      <p>Open a document to use AI.</p>
    {:else}
      <div class="actions">
        <button disabled={aiSession.streaming} onclick={() => void aiSession.run('summary')}
          >Summarize</button
        >
        <button disabled={aiSession.streaming} onclick={() => void aiSession.run('translate')}
          >Translate</button
        >
        <button
          type="button"
          disabled={aiSession.streaming || aiSession.messages.length === 0}
          onclick={() => {
            aiSession.reset();
            question = '';
            stickToBottom = true;
          }}>New chat</button
        >
      </div>
      {#if aiSession.trimmed}<p class="context-note">
          Used {aiSession.contextCount} of {aiSession.totalSections} sections
        </p>{/if}
      <div
        class="chat-history"
        bind:this={chatHistory}
        onscroll={onTranscriptScroll}
        aria-live="polite"
        data-testid="ai-transcript"
      >
        {#each aiSession.messages as message, index (`${message.role}-${index}`)}
          <AiChatMessage {message} toc={tabs.active?.render.toc ?? []} />
        {/each}
        {#if aiSession.output}
          <article class="streaming-message">
            <span class="speaker">Assistant</span>
            <div class="ai-output" bind:this={outputRoot}>{@html aiSession.rendered}</div>
          </article>
        {/if}
      </div>
      {#if aiSession.error}<p role="alert" class="ai-error">{aiSession.error}</p>
        <button onclick={() => void aiSession.run('summary')}>Retry</button>{/if}
      <div class="ask-row">
        <input
          aria-label="Ask about this document"
          bind:value={question}
          onkeydown={(event) => {
            if (event.key === 'Enter') ask();
          }}
          placeholder="Ask about this document"
        /><button onclick={ask}>Ask</button>
      </div>
      {#if aiSession.streaming}<button onclick={() => aiSession.cancel()}>Stop</button>{/if}
    {/if}
  </aside>
{/if}

<style>
  .ai-panel {
    position: fixed;
    z-index: 40;
    inset: 3rem 0 2rem auto;
    display: flex;
    flex-direction: column;
    width: min(34rem, 94vw);
    overflow: hidden;
    padding: 0 1rem 1rem;
    background: var(--surface, Canvas);
    color: CanvasText;
    border-left: 1px solid #8886;
    box-shadow: 0 4px 24px #0003;
  }
  header,
  .actions,
  .ask-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  header {
    justify-content: space-between;
    flex: none;
    padding: 0.8rem 0;
    border-bottom: 1px solid #8885;
  }
  h2 {
    font-size: 1.1rem;
  }
  .ai-output {
    overflow-wrap: anywhere;
  }
  .actions {
    flex: none;
    padding: 0.6rem 0;
  }
  .chat-history {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0.5rem 0.15rem;
  }
  .streaming-message {
    max-width: 94%;
    margin: 0.7rem 0;
    padding: 0.75rem 0.9rem;
    border-radius: 0.85rem;
    background: color-mix(in srgb, CanvasText 8%, Canvas);
    overflow-wrap: anywhere;
  }
  .speaker {
    display: block;
    margin-bottom: 0.35rem;
    font-size: 0.72rem;
    font-weight: 700;
    opacity: 0.72;
  }
  .ask-row input {
    flex: 1;
    min-width: 0;
    min-height: 2.7rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid color-mix(in srgb, CanvasText 35%, transparent);
    border-radius: 0.5rem;
    outline: none;
    color: CanvasText;
    background: Canvas;
    caret-color: #60a5fa;
  }
  .ask-row input:focus-visible {
    border-color: #60a5fa;
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
    box-shadow: 0 0 0 3px color-mix(in srgb, #60a5fa 22%, transparent);
  }
  .ask-row {
    flex: none;
    padding-top: 0.65rem;
    border-top: 1px solid #8885;
  }
  .context-note {
    font-size: 0.8rem;
    opacity: 0.75;
  }
  .ai-error {
    color: #b42318;
  }
</style>
