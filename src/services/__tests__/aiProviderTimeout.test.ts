import { describe, expect, it, vi } from 'vitest';
import { ProviderRouter, type AiProvider } from '../aiProvider';

const fakeProvider = (name: 'gemini' | 'groq') => {
  const generateContent = vi.fn(async () => ({ choices: [{ message: { content: '{}' } }] }));
  return { provider: { name, generateContent } as unknown as AiProvider, generateContent };
};

describe('ProviderRouter timeouts', () => {
  it('gives a full Modul Ajar 60 s instead of the 30 s default', async () => {
    const router = new ProviderRouter();
    const { provider, generateContent } = fakeProvider('gemini');
    router.register(provider);

    await router.generateContent('modul-ajar', [{ role: 'user', content: 'x' }]);

    expect(generateContent).toHaveBeenCalledWith(expect.any(Array), expect.any(String), { timeoutMs: 60_000 });
  });

  it('leaves other tasks on the provider default', async () => {
    const router = new ProviderRouter();
    const { provider, generateContent } = fakeProvider('gemini');
    router.register(provider);

    await router.generateContent('general', [{ role: 'user', content: 'x' }]);

    expect(generateContent).toHaveBeenCalledWith(expect.any(Array), expect.any(String), { timeoutMs: undefined });
  });
});
