<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { t, setLocale } from '../lib/i18n/index.svelte';
  import { settings } from '../lib/state/settings.svelte';

  let open = $state(false);
  onMount(() => {
    const show = (): void => {
      open = true;
    };
    window.addEventListener('app:settings', show);
    return () => window.removeEventListener('app:settings', show);
  });
  function updateLanguage(language: 'auto' | 'es' | 'en'): void {
    settings.update({ language });
    setLocale(
      language === 'auto'
        ? navigator.language.toLowerCase().startsWith('es')
          ? 'es'
          : 'en'
        : language,
    );
    document.documentElement.lang = language === 'auto' ? navigator.language : language;
  }
</script>

<Dialog bind:open onClose={() => (open = false)}>
  <h2>{t('settings.title')}</h2>
  <label
    >{t('settings.theme')}
    <select
      aria-label={t('settings.theme')}
      value={settings.value.theme}
      onchange={(event) =>
        settings.update({ theme: event.currentTarget.value as typeof settings.value.theme })}
    >
      <option value="system">{t('settings.themeSystem')}</option><option value="light"
        >{t('settings.themeLight')}</option
      ><option value="dark">{t('settings.themeDark')}</option>
    </select>
  </label>
  <label
    >{t('settings.fontFamily')}
    <select
      aria-label={t('settings.fontFamily')}
      value={settings.value.fontFamily}
      onchange={(event) =>
        settings.update({
          fontFamily: event.currentTarget.value as typeof settings.value.fontFamily,
        })}
    >
      <option value="sans">{t('settings.fontSans')}</option><option value="serif"
        >{t('settings.fontSerif')}</option
      ><option value="mono">{t('settings.fontMono')}</option>
    </select>
  </label>
  <label
    >{t('settings.fontSize')}
    <input
      aria-label={t('settings.fontSize')}
      type="number"
      min="14"
      max="24"
      value={settings.value.fontSize}
      oninput={(event) => settings.update({ fontSize: Number(event.currentTarget.value) })}
    /></label
  >
  <label
    >{t('settings.lineHeight')}
    <input
      type="number"
      min="1.4"
      max="2"
      step="0.1"
      value={settings.value.lineHeight}
      onchange={(event) => settings.update({ lineHeight: Number(event.currentTarget.value) })}
    /></label
  >
  <label
    >{t('settings.contentWidth')}
    <select
      value={settings.value.contentWidth}
      onchange={(event) =>
        settings.update({
          contentWidth: event.currentTarget.value as typeof settings.value.contentWidth,
        })}
    >
      <option value="narrow">{t('settings.widthNarrow')}</option><option value="medium"
        >{t('settings.widthMedium')}</option
      ><option value="wide">{t('settings.widthWide')}</option><option value="full"
        >{t('settings.widthFull')}</option
      >
    </select>
  </label>
  <label
    >{t('settings.readingTheme')}
    <select
      aria-label={t('settings.readingTheme')}
      value={settings.value.readingTheme}
      onchange={(event) =>
        settings.update({
          readingTheme: event.currentTarget.value as typeof settings.value.readingTheme,
        })}
    >
      <option value="default">{t('settings.readingDefault')}</option>
      <option value="github">GitHub</option>
      <option value="sepia">{t('settings.readingSepia')}</option>
      <option value="contrast">{t('settings.readingContrast')}</option>
    </select>
  </label>
  <label
    >{t('settings.customCss')}
    <textarea
      aria-label={t('settings.customCss')}
      maxlength="20000"
      rows="5"
      value={settings.value.customCss}
      oninput={(event) => settings.update({ customCss: event.currentTarget.value })}></textarea>
  </label>
  <label
    ><input
      aria-label={t('settings.blockRemoteImages')}
      type="checkbox"
      checked={settings.value.blockRemoteImages}
      onchange={(event) => settings.update({ blockRemoteImages: event.currentTarget.checked })}
    />{t('settings.blockRemoteImages')}</label
  >
  <label
    >{t('settings.language')}
    <select
      value={settings.value.language}
      onchange={(event) =>
        updateLanguage(event.currentTarget.value as typeof settings.value.language)}
    >
      <option value="auto">{t('settings.languageAuto')}</option><option value="en"
        >{t('settings.languageEnglish')}</option
      ><option value="es">{t('settings.languageSpanish')}</option>
    </select>
  </label>
  <label
    ><input
      type="checkbox"
      checked={settings.value.restoreSession}
      onchange={(event) => settings.update({ restoreSession: event.currentTarget.checked })}
    />{t('settings.restoreSession')}</label
  >
  <label
    ><input
      type="checkbox"
      checked={settings.value.showSidebar}
      onchange={(event) => settings.update({ showSidebar: event.currentTarget.checked })}
    />{t('settings.showSidebar')}</label
  >
</Dialog>
