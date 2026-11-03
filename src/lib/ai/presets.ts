export interface AiPreset {
  id: 'ollama' | 'lmstudio' | 'llamacpp' | 'openai' | 'anthropic' | 'custom';
  provider: 'openai-compatible' | 'anthropic';
  baseUrl: string;
  needsKey: boolean;
  defaultModel?: string;
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'ollama',
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:11434/v1',
    needsKey: false,
  },
  {
    id: 'lmstudio',
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:1234/v1',
    needsKey: false,
  },
  {
    id: 'llamacpp',
    provider: 'openai-compatible',
    baseUrl: 'http://localhost:8080/v1',
    needsKey: false,
  },
  {
    id: 'openai',
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    needsKey: true,
  },
  {
    id: 'anthropic',
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    needsKey: true,
    defaultModel: 'claude-opus-5-5',
  },
  { id: 'custom', provider: 'openai-compatible', baseUrl: '', needsKey: false },
];

export function isRemote(baseUrl: string): boolean {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase();
    return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '[::1]';
  } catch {
    return true;
  }
}
