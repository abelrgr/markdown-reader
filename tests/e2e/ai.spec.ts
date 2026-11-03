import { expect, test } from '@playwright/test';
import { openApp, openViaDialog } from './helpers';

const summary = [
  { type: 'delta', text: '**Resumen**\n\n- La sección explica uso [§ Uso].' },
  { type: 'done', stopReason: null },
] as const;

test('AI disabled state opens Settings; enabled local provider streams and links citations', async ({
  page,
}) => {
  await openApp(page);
  await openViaDialog(page, ['/fx/headings.md']);
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:aiToggle')));
  await expect(page.getByText('Enable AI in Settings')).toBeVisible();
  await page.getByRole('button', { name: 'Open Settings' }).click();
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByRole('button', { name: 'Load models' }).click();
  await expect(page.getByLabel('AI model').locator('option')).toHaveCount(4);
  await expect(page.getByRole('status')).toHaveText('Loaded 2 models');
  await expect(page.getByLabel('AI model').locator('option').nth(1)).toHaveAttribute(
    'value',
    'modelo-a',
  );
  await expect(page.getByLabel('AI model').locator('option').nth(2)).toHaveAttribute(
    'value',
    'modelo-b',
  );
  await page.getByLabel('AI model').selectOption('modelo-a');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(
    (script) => {
      window.__e2e.aiScript = script;
    },
    [...summary],
  );
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect(page.getByTestId('ai-transcript')).toContainText('Resumen');
  await page.getByTestId('ai-transcript').getByRole('button', { name: '[§ Uso]' }).click();
  await expect(page.locator('#uso')).toBeVisible();
});

test('AI streaming can be stopped without losing partial text', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('app:settings'));
  });
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'partial' },
      ...Array.from({ length: 20 }, (_, index) => ({ type: 'delta' as const, text: ` ${index}` })),
      { type: 'done', stopReason: null },
    ];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.locator('.ai-output')).toContainText('partial');
  await expect.poll(() => page.evaluate(() => window.__e2e.aiCancelled?.length ?? 0)).toBe(1);
});

test('AI errors and refusals are surfaced with retry', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => {
    window.__e2e.aiScript = [{ type: 'error', message: 'conexión rechazada' }];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect(page.getByRole('alert')).toContainText('conexión rechazada');
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.aiScript = [{ type: 'done', stopReason: 'refusal' }];
  });
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('alert')).toContainText('The model declined to answer');
});

test('AI selection actions and translation open a virtual tab', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.reader').evaluate((article) => {
    const range = document.createRange();
    range.selectNodeContents(article.querySelector('h1')!);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  });
  await expect(page.getByRole('button', { name: 'Explain with AI' })).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: '# Traducción' },
      { type: 'done', stopReason: null },
    ];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByRole('button', { name: 'Translate' }).click();
  await expect(page.getByRole('tab', { name: 'headings.md — Translation' })).toBeVisible();
  await expect(page.locator('.reader h1')).toContainText('Traducción');
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Answer from translated tab.' },
      { type: 'done', stopReason: null },
    ];
  });
  await page.getByLabel('Ask about this document').fill('Question about translated content');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Answer from translated tab.')).toBeVisible();
});

test('remote provider consent names the host and is remembered', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI provider').selectOption('anthropic');
  await page.getByLabel('AI model').fill('claude-haiku-5-5');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  page.on('dialog', async (dialog) => {
    expect(dialog.message()).toContain('api.anthropic.com');
    await dialog.accept();
  });
  await page.evaluate(() => {
    window.__e2e.aiScript = [{ type: 'done', stopReason: null }];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect
    .poll(() =>
      page.evaluate(() => JSON.parse(sessionStorage.getItem('settings') ?? '{}').ai?.approvedHosts),
    )
    .toContain('api.anthropic.com');
  await expect.poll(() => page.evaluate(() => window.__e2e.aiCalls)).toBe(1);
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect.poll(() => page.evaluate(() => window.__e2e.aiCalls)).toBe(2);
});

test('saved API key is never displayed again and can be deleted', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByLabel('AI provider').selectOption('openai');
  const keyInput = page.getByRole('textbox', { name: 'API key' });
  await keyInput.fill('super-secret-test-key');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByText('Key saved')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'API key' })).toHaveCount(0);
  await expect(page.getByText('super-secret-test-key')).toHaveCount(0);
  await page.getByRole('button', { name: 'Delete key' }).click();
  await expect(page.getByRole('textbox', { name: 'API key' })).toBeVisible();
});

test('custom remote providers expose a protected API key field', async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByLabel('AI provider').selectOption('custom');
  await page.getByLabel('AI base URL').fill('https://api.deepseek.com/v1');
  await page.getByLabel('AI base URL').focus();
  await expect(page.getByLabel('AI base URL')).toHaveCSS('outline-style', 'solid');
  await expect(page.getByLabel('API key')).toBeVisible();
  await page.getByLabel('API key').fill('test-secret');
  await page.getByRole('button', { name: 'Save key' }).click();
  await expect(page.getByText('Key saved')).toBeVisible();
  await expect(page.getByLabel('API key')).toHaveCount(0);
});

test('chat keeps earlier turns visible and sends conversation history on follow-up', async ({
  page,
}) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Respuesta uno [§ Uso].' },
      { type: 'done', stopReason: null },
    ];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  const input = page.getByLabel('Ask about this document');
  await input.focus();
  await expect(input).toHaveCSS('outline-style', 'solid');
  await input.fill('¿Qué es sanitization?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Respuesta uno', { exact: false })).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Respuesta dos.' },
      { type: 'done', stopReason: null },
    ];
  });
  await input.fill('¿Qué más dice?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Respuesta dos', { exact: false })).toBeVisible();
  await expect(page.getByText('¿Qué es sanitization?')).toBeVisible();
  await expect(page.getByText('¿Qué más dice?')).toBeVisible();
  const secondRequest = await page.evaluate(() => window.__e2e.aiRequests?.[1] ?? []);
  expect(secondRequest.map((message) => `${message.role}:${message.content}`)).toEqual([
    expect.stringMatching(/^user:<document/),
    'user:¿Qué es sanitization?',
    'assistant:Respuesta uno [§ Uso].',
    'user:¿Qué más dice?',
  ]);
  await page.getByRole('button', { name: 'New chat' }).click();
  await expect(page.getByText('¿Qué es sanitization?')).toHaveCount(0);
  await expect(page.getByText('Respuesta uno', { exact: false })).toHaveCount(0);
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Fresh conversation.' },
      { type: 'done', stopReason: null },
    ];
  });
  await input.fill('Fresh question');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Fresh conversation.')).toBeVisible();
  await expect(page.getByText('¿Qué más dice?')).toHaveCount(0);
  const freshRequest = await page.evaluate(() => window.__e2e.aiRequests?.[2] ?? []);
  expect(freshRequest.map((message) => `${message.role}:${message.content}`)).toEqual([
    expect.stringMatching(/^user:<document[\s\S]*Fresh question/),
  ]);
});

test('a summary stays in the chat and provides context for follow-up questions', async ({
  page,
}) => {
  await openApp(page);
  await openViaDialog(page, ['/fx/headings.md']);
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Summary of the document.' },
      { type: 'done', stopReason: null },
    ];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByRole('button', { name: 'Summarize' }).click();
  await expect(page.getByText('Summary of the document.')).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'Follow-up response.' },
      { type: 'done', stopReason: null },
    ];
  });
  await page.getByLabel('Ask about this document').fill('What did the summary say?');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('Summary of the document.')).toBeVisible();
  await expect(page.getByText('Follow-up response.')).toBeVisible();
  const followUp = await page.evaluate(() => window.__e2e.aiRequests?.[1] ?? []);
  expect(followUp.map((message) => `${message.role}:${message.content}`)).toEqual([
    expect.stringMatching(/^user:<document/),
    'user:Summarize this document',
    'assistant:Summary of the document.',
    'user:What did the summary say?',
  ]);
});

test('closing the last document also closes the AI panel', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:aiToggle')));
  await expect(page.getByTestId('ai-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Close headings.md' }).click();
  await expect(page.getByTestId('ai-panel')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open file…' })).toBeVisible();
});

test('long streamed answers autoscroll while tokens arrive', async ({ page }) => {
  await openApp(page, { startup: ['/fx/headings.md'] });
  await expect(page.locator('.reader')).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('app:settings')));
  await page.getByRole('checkbox', { name: 'Enable AI' }).check();
  await page.getByLabel('AI model').fill('test-model');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      { type: 'delta', text: 'First response, retained.' },
      { type: 'done', stopReason: null },
    ];
    window.dispatchEvent(new CustomEvent('app:aiToggle'));
  });
  await page.getByLabel('Ask about this document').fill('First question');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByText('First response, retained.')).toBeVisible();
  await page.evaluate(() => {
    window.__e2e.aiScript = [
      ...Array.from({ length: 60 }, (_, index) => ({
        type: 'delta' as const,
        text: `Paragraph ${index}: ${'long answer text '.repeat(15)}\n\n`,
      })),
      { type: 'done', stopReason: null },
    ];
  });
  await page.getByLabel('Ask about this document').fill('Second question, give a long answer');
  await page.getByRole('button', { name: 'Ask' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByTestId('ai-transcript')
        .evaluate(
          (el) =>
            el.scrollHeight > el.clientHeight + 20 &&
            el.scrollHeight - el.scrollTop - el.clientHeight < 8,
        ),
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Stop' }).click();
});
