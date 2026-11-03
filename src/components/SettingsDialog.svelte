<script lang="ts">
  import { onMount } from 'svelte';
  import Dialog from './Dialog.svelte';
  import { t, setLocale } from '../lib/i18n/index.svelte';
  import { settings } from '../lib/state/settings.svelte';
  import { AI_PRESETS, isRemote } from '../lib/ai/presets';
  import { native } from '../lib/native';

  let open = $state(false);
  let models = $state<string[]>([]);
  let customModel = $state(false);
  let apiKey = $state('');
  let keySaved = $state(false);
  let aiError = $state('');
  let loadingModels = $state(false);
  let modelNotice = $state('');
  let preset = $derived(
    AI_PRESETS.find((item) => item.id === settings.value.ai.presetId) ?? AI_PRESETS[0]!,
  );
  let aiConfig = $derived({
    provider: preset.provider,
    baseUrl: settings.value.ai.baseUrl || preset.baseUrl,
    model: settings.value.ai.model || preset.defaultModel || '',
    secretAccount:
      preset.needsKey || isRemote(settings.value.ai.baseUrl || preset.baseUrl)
        ? `ai:${preset.id}`
        : null,
  });
  function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
      const detail = 'detail' in error ? error.detail : undefined;
      const message = 'message' in error ? error.message : undefined;
      if (typeof detail === 'string') return detail;
      if (typeof message === 'string') return message;
      try {
        return JSON.stringify(error);
      } catch {
        /* fall through */
      }
    }
    return String(error);
  }
  async function loadAiModels(): Promise<void> {
    aiError = '';
    modelNotice = '';
    loadingModels = true;
    try {
      models = await native.aiListModels(aiConfig);
      customModel = !!settings.value.ai.model && !models.includes(settings.value.ai.model);
      modelNotice = models.length
        ? `Loaded ${models.length} models`
        : 'No models returned; enter the model name manually.';
    } catch (error) {
      aiError = errorMessage(error);
    } finally {
      loadingModels = false;
    }
  }
  async function checkSavedKey(): Promise<void> {
    keySaved = !!aiConfig.secretAccount && (await native.secretExists(aiConfig.secretAccount));
  }
  async function saveKey(): Promise<void> {
    if (!aiConfig.secretAccount || !apiKey) return;
    await native.secretSet(aiConfig.secretAccount, apiKey);
    apiKey = '';
    keySaved = true;
  }
  async function deleteKey(): Promise<void> {
    if (!aiConfig.secretAccount) return;
    await native.secretDelete(aiConfig.secretAccount);
    keySaved = false;
  }
  $effect(() => {
    if (open && aiConfig.secretAccount) {
      const account = aiConfig.secretAccount;
      void native.secretExists(account).then((exists) => {
        keySaved = exists;
      });
    } else if (open) keySaved = false;
  });
  function updateAi(patch: Partial<typeof settings.value.ai>): void {
    settings.update({ ai: { ...settings.value.ai, ...patch } });
  }
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
  <fieldset class="ai-settings">
    <legend>AI assistant</legend>
    <label
      ><input
        type="checkbox"
        checked={settings.value.ai.enabled}
        onchange={(event) => updateAi({ enabled: event.currentTarget.checked })}
      /> Enable AI</label
    >
    <label
      >Provider
      <select
        aria-label="AI provider"
        value={settings.value.ai.presetId}
        onchange={(event) => {
          const selected =
            AI_PRESETS.find((item) => item.id === event.currentTarget.value) ?? AI_PRESETS[0]!;
          updateAi({
            presetId: selected.id,
            baseUrl: selected.baseUrl,
            model: selected.defaultModel ?? '',
          });
          models = [];
          customModel = false;
          void checkSavedKey();
        }}
      >
        {#each AI_PRESETS as item}<option value={item.id}>{item.id}</option>{/each}
      </select>
    </label>
    <label
      >Base URL<input
        aria-label="AI base URL"
        value={settings.value.ai.baseUrl}
        oninput={(event) => updateAi({ baseUrl: event.currentTarget.value })}
      /></label
    >
    {#if models.length > 0 && !customModel}
      <label
        >Model
        <select
          aria-label="AI model"
          value={models.includes(settings.value.ai.model) ? settings.value.ai.model : ''}
          onchange={(event) => {
            const value = event.currentTarget.value;
            if (value === '__custom__') customModel = true;
            else updateAi({ model: value });
          }}
        >
          <option value="" disabled>Select a model…</option>
          {#each models as model}<option value={model}>{model}</option>{/each}
          <option value="__custom__">Enter model manually…</option>
        </select>
      </label>
    {:else}
      <label
        >Model
        <input
          aria-label="AI model"
          value={settings.value.ai.model}
          oninput={(event) => updateAi({ model: event.currentTarget.value })}
        />
      </label>
      {#if models.length > 0 && customModel}
        <button type="button" onclick={() => (customModel = false)}
          >Choose from loaded models</button
        >
      {/if}
    {/if}
    <button type="button" disabled={loadingModels} onclick={() => void loadAiModels()}>
      {loadingModels ? 'Loading models…' : 'Load models'}
    </button>
    {#if modelNotice}<p role="status">{modelNotice}</p>{/if}
    {#if aiConfig.secretAccount}
      {#if keySaved}<p>Key saved</p>
        <button type="button" onclick={() => void deleteKey()}>Delete key</button>
      {:else}<label
          >API key<input
            aria-label="API key"
            type="password"
            bind:value={apiKey}
            autocomplete="new-password"
          /></label
        ><button type="button" onclick={() => void saveKey()}>Save key</button>{/if}
    {/if}
    {#if aiError}<p role="alert">{aiError}</p>{/if}
    <p>
      Local providers keep document content on this computer. Remote providers receive selected
      document context when you ask.
    </p>
  </fieldset>
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
  <label
    ><input
      type="checkbox"
      checked={settings.value.autoCheckUpdates}
      onchange={(event) => settings.update({ autoCheckUpdates: event.currentTarget.checked })}
    />{t('settings.autoCheckUpdates')}</label
  >
</Dialog>
