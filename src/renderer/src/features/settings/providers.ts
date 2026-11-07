import type { ProviderId } from '@shared/types';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  badge: string;
  /** Where to create a key. */
  link: string;
  blurb: string;
}

export const PROVIDER_INFO: readonly ProviderInfo[] = [
  {
    id: 'groq',
    label: 'Groq',
    badge: 'Free',
    link: 'console.groq.com/keys',
    blurb: 'Fast and free. Also gives you accurate voice recognition.',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    badge: 'Free tier',
    link: 'aistudio.google.com/apikey',
    blurb: 'Free tier. Can also look at screenshots.',
  },
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT API)',
    badge: 'Paid',
    link: 'platform.openai.com/api-keys',
    blurb: 'Needs an API key with billing. A ChatGPT subscription is not an API key.',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude API)',
    badge: 'Paid',
    link: 'console.anthropic.com/settings/keys',
    blurb:
      'Needs an API key with billing. A Claude chat subscription is not an API key. Claude has no voice recognition, so add Groq or OpenAI too, or use the offline voice model.',
  },
];
