<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { fuzzyFilter } from '../lib/fuzzy';
  import { t } from '../lib/i18n/index.svelte';
  import { listCommands } from '../lib/commands';

  let open = $state(false);
  let query = $state('');
  let selected = $state(0);
  let input: HTMLInputElement;
  const results = $derived(
    fuzzyFilter(listCommands(), query, (command) => `${command.title()} ${command.shortcut ?? ''}`),
  );

  function show(): void {
    query = '';
    selected = 0;
    open = true;
    void tick().then(() => input?.focus());
  }

  function close(): void {
    open = false;
  }

  function run(command = results[selected]): void {
    if (!command) return;
    close();
    void command.run();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      selected = (selected + 1) % results.length;
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      selected = (selected - 1 + results.length) % results.length;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  }

  onMount(() => {
    window.addEventListener('app:commandPalette', show);
    return () => window.removeEventListener('app:commandPalette', show);
  });
</script>

<Dialog bind:open onClose={close} testid="command-palette-dialog">
  <h2>{t('palette.command')}</h2>
  <input
    bind:this={input}
    aria-label={t('palette.command')}
    placeholder={t('palette.command')}
    bind:value={query}
    oninput={() => (selected = 0)}
    onkeydown={onKeydown}
  />
  <ul class="palette-results">
    {#each results as command, index (`${command.id}-${index}`)}
      <li>
        <button
          class:selected={index === selected}
          data-testid="palette-command"
          onclick={() => run(command)}
        >
          <span>{command.title()}</span>
          {#if command.shortcut}<kbd>{command.shortcut}</kbd>{/if}
        </button>
      </li>
    {:else}
      <li class="palette-empty">{t('find.noResults')}</li>
    {/each}
  </ul>
</Dialog>
