<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { listCommands } from '../lib/commands';

  let open = $state(false);
  onMount(() => {
    const show = (): void => {
      open = true;
    };
    window.addEventListener('app:shortcuts', show);
    return () => window.removeEventListener('app:shortcuts', show);
  });
</script>

<Dialog bind:open onClose={() => (open = false)}>
  <h2>{t('shortcuts.title')}</h2>
  <ul>
    {#each listCommands().filter((command) => command.shortcut) as command, index (`${command.id}-${index}`)}
      <li><span>{command.title()}</span><kbd>{command.shortcut}</kbd></li>
    {/each}
  </ul>
</Dialog>
