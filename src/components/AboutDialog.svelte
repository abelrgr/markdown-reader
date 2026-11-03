<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { t } from '../lib/i18n/index.svelte';
  import { native } from '../lib/native';
  import { runCommand } from '../lib/commands';

  let open = $state(false);
  let version = $state('2.0.0-beta.1');
  let tauriVersion = $state('');
  async function loadInfo(): Promise<void> {
    try {
      const info = await native.appInfo();
      version = info.version;
      tauriVersion = info.tauriVersion;
    } catch {
      /* Keep package version when native metadata is unavailable. */
    }
  }
  onMount(() => {
    const show = (): void => {
      open = true;
      void loadInfo();
    };
    window.addEventListener('app:about', show);
    return () => window.removeEventListener('app:about', show);
  });
</script>

<Dialog bind:open onClose={() => (open = false)} testid="about-dialog">
  <h2>{t('about.title')}</h2>
  <p>{t('about.version', { version })}</p>
  {#if tauriVersion}<p>{t('about.tauriVersion', { version: tauriVersion })}</p>{/if}
  <p>{t('about.author')}</p>
  <a href="https://github.com/abelrgr/markdown-reader" target="_blank" rel="noreferrer"
    >{t('about.repository')}</a
  >
  <p>{t('about.license')}</p>
  <button onclick={() => void runCommand('help.checkUpdates')}>{t('menu.checkUpdates')}</button>
</Dialog>
