import { getLocale } from '../i18n/index.svelte';
import { native } from '../native';
import type { AiEvent, ChatMessage } from '../native/types';
import { settings } from '../state/settings.svelte';
import { tabs, workspace } from '../state/app.svelte';
import { renderMarkdown } from '../markdown/render';
import { AI_PRESETS, isRemote } from './presets';
import {
  askMessages,
  explainMessages,
  summaryMessages,
  systemPrompt,
  translateMessages,
  wrapDocument,
} from './prompts';
import { selectContext, splitSections } from './context';
import type { Section } from './context';

export class AiSession {
  messages = $state<ChatMessage[]>([]);
  streaming = $state(false);
  error = $state<string | null>(null);
  output = $state('');
  rendered = $state('');
  trimmed = $state(false);
  contextCount = $state(0);
  totalSections = $state(0);
  private requestId: string | null = null;
  private activeTabId: string | null = null;
  private readonly messagesByTab = new Map<string, ChatMessage[]>();
  private renderTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingHost: string | null = null;
  private pendingTranslate = false;
  private pendingAction: (() => void) | null = null;
  private turnPrompt: string | null = null;

  private config() {
    const ai = settings.value.ai;
    const preset = AI_PRESETS.find((entry) => entry.id === ai.presetId) ?? AI_PRESETS[0]!;
    const url = ai.baseUrl || preset.baseUrl;
    const approvedHosts = ai.approvedHosts;
    if (isRemote(url)) {
      let host: string;
      try {
        host = new URL(url).hostname;
      } catch {
        this.error = 'Enter a valid AI provider URL in Settings';
        return null;
      }
      if (!approvedHosts.includes(host)) {
        if (this.pendingHost !== host) {
          this.pendingHost = host;
          queueMicrotask(() => {
            if (this.pendingHost !== host) return;
            window.dispatchEvent(
              new CustomEvent('ai:confirm-host', {
                detail: {
                  host,
                  accept: () => this.approveHost(host),
                  reject: () => {
                    this.pendingHost = null;
                    this.pendingAction = null;
                  },
                },
              }),
            );
          });
        }
        return null;
      }
    }
    return {
      provider: preset.provider,
      baseUrl: url,
      model: ai.model || preset.defaultModel || '',
      secretAccount: preset.needsKey || isRemote(url) ? `ai:${preset.id}` : null,
    } as const;
  }

  approveHost(host: string): void {
    settings.update({
      ai: {
        ...settings.value.ai,
        approvedHosts: [...new Set([...settings.value.ai.approvedHosts, host])],
      },
    });
    this.pendingHost = null;
    const pending = this.pendingAction;
    this.pendingAction = null;
    if (pending) queueMicrotask(pending);
  }

  private documentContext(question: string | null): { doc: string; sections: Section[] } | null {
    const tab = tabs.active;
    if (!tab) return null;
    this.activateTab(tab.id);
    const all = splitSections(tab.content);
    const selected = selectContext(all, question);
    this.totalSections = all.length;
    this.contextCount = selected.length;
    this.trimmed = selected.length < all.length;
    return { doc: wrapDocument(tab.name, selected), sections: selected };
  }

  activateTab(id: string | null): void {
    if (id === this.activeTabId) return;
    this.activeTabId = id;
    this.messages = id ? [...(this.messagesByTab.get(id) ?? [])] : [];
    this.output = '';
    this.rendered = '';
    this.error = null;
  }

  forgetClosedTabs(openIds: ReadonlySet<string>): void {
    for (const id of this.messagesByTab.keys()) if (!openIds.has(id)) this.messagesByTab.delete(id);
    if (this.activeTabId && !openIds.has(this.activeTabId)) this.activateTab(null);
  }

  async run(kind: 'summary' | 'explain' | 'translate' | 'ask', input?: string): Promise<void> {
    const config = this.config();
    if (!config) {
      this.pendingAction = () => void this.run(kind, input);
      return;
    }
    const question = kind === 'ask' ? (input ?? '') : null;
    const targetLanguage = getLocale() === 'es' ? 'English' : 'Spanish';
    this.turnPrompt =
      kind === 'ask'
        ? question
        : kind === 'summary'
          ? 'Summarize this document'
          : kind === 'explain'
            ? `Explain this excerpt: ${input ?? ''}`
            : `Translate this document into ${targetLanguage}`;
    const context = this.documentContext(question);
    if (!context) {
      this.error = 'Open a document first';
      return;
    }
    if (!config.model) {
      this.error = 'Choose a model in Settings';
      return;
    }
    this.streaming = true;
    this.error = null;
    this.output = '';
    this.rendered = '';
    this.pendingTranslate = kind === 'translate';
    const id = crypto.randomUUID();
    this.requestId = id;
    let outgoing: ChatMessage[];
    switch (kind) {
      case 'summary':
        outgoing = summaryMessages(context.doc);
        break;
      case 'explain':
        outgoing = explainMessages(context.doc, input ?? '');
        break;
      case 'translate':
        outgoing = translateMessages(context.doc, targetLanguage);
        break;
      case 'ask':
        outgoing = askMessages(context.doc, this.messages, question!);
        break;
    }
    if (kind === 'ask') {
      this.messages = [...this.messages, { role: 'user', content: question! }];
      if (this.activeTabId) this.messagesByTab.set(this.activeTabId, [...this.messages]);
    }
    try {
      await native.aiChat(id, config, systemPrompt(getLocale()), outgoing, (event: AiEvent) =>
        this.receive(event, kind),
      );
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      if (this.requestId === id) {
        this.requestId = null;
        this.streaming = false;
        this.renderNow();
        if (this.pendingTranslate && this.output) await this.openTranslation();
        this.pendingTranslate = false;
      }
    }
  }

  private receive(event: AiEvent, kind: 'summary' | 'explain' | 'translate' | 'ask'): void {
    if (event.type === 'delta') {
      this.output += event.text;
      this.scheduleRender();
      return;
    }
    if (event.type === 'error') {
      this.error = event.message;
      this.streaming = false;
      return;
    }
    if (event.stopReason === 'refusal') this.error = 'The model declined to answer';
    if (kind === 'ask' && this.output) {
      this.messages = [...this.messages, { role: 'assistant', content: this.output }];
      if (this.activeTabId) this.messagesByTab.set(this.activeTabId, [...this.messages]);
      this.output = '';
      this.rendered = '';
    } else if (this.turnPrompt && this.output) {
      this.messages = [
        ...this.messages,
        { role: 'user', content: this.turnPrompt },
        { role: 'assistant', content: this.output },
      ];
      if (this.activeTabId) this.messagesByTab.set(this.activeTabId, [...this.messages]);
      if (kind !== 'translate') {
        this.output = '';
        this.rendered = '';
      }
    }
    void kind;
  }

  private scheduleRender(): void {
    if (this.renderTimer) return;
    this.renderTimer = setTimeout(() => {
      this.renderTimer = undefined;
      this.renderNow();
    }, 100);
  }

  private renderNow(): void {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.renderTimer = undefined;
    const output = this.output;
    void renderMarkdown(output).then((result) => {
      if (this.output === output) this.rendered = result.html;
    });
  }

  private async openTranslation(): Promise<void> {
    if (!this.output) return;
    await tabs.openVirtual(`${tabs.active?.name ?? 'Document'} — Translation`, this.output);
  }

  cancel(): void {
    if (this.requestId) void native.aiCancel(this.requestId);
    this.streaming = false;
  }
  reset(): void {
    this.cancel();
    this.messages = [];
    if (this.activeTabId) this.messagesByTab.delete(this.activeTabId);
    this.error = null;
    this.turnPrompt = null;
    this.output = '';
    this.rendered = '';
    this.activeTabId = null;
  }
  get activeTab(): string | null {
    return this.activeTabId;
  }
}

export const aiSession = new AiSession();
