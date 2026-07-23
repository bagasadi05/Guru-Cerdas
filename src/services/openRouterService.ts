import { logger } from './logger';

// Gemini (primary — langsung dari client, gratis & cepat)
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

// OpenRouter (fallback)
const OPENROUTER_PROXY_URL = import.meta.env.VITE_OPENROUTER_PROXY_URL || '';
const DEV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const IS_DEV = import.meta.env.DEV === true;
const OPENROUTER_DIRECT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_PROXY = '/api/openrouter';

const CUSTOM_MODEL = import.meta.env.VITE_AI_MODEL || '';
const FALLBACK_MODELS = CUSTOM_MODEL ? [CUSTOM_MODEL] : [
    'auto',
    'openai/gpt-4o-mini',
];

export interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | null;
    // Returned by reasoning models; pass back unmodified in multi-turn conversations
    // so the model can continue from where it left off.
    reasoning_details?: unknown;
}

export interface OpenRouterResponse {
    choices: {
        message: OpenRouterMessage;
    }[];
}

/**
 * Generates content — tries Gemini (direct) first, falls back to OpenRouter.
 */
export async function generateOpenRouterContent(
    messages: OpenRouterMessage[],
    useReasoning: boolean = true
): Promise<OpenRouterResponse> {
    // 1. Try Gemini directly if key is available
    if (GEMINI_KEY) {
        try {
            const result = await callGemini(messages);
            logger.info(`[AI] Gemini success`, 'AI');
            return result;
        } catch (err: any) {
            logger.warn(`[AI] Gemini failed, falling back to OpenRouter: ${err.message}`, 'AI');
        }
    }

    // 2. Fallback: OpenRouter
    return callOpenRouter(messages, useReasoning);
}

/**
 * Call Gemini API directly. Returns OpenRouterResponse-compatible shape.
 */
async function callGemini(messages: OpenRouterMessage[]): Promise<OpenRouterResponse> {
    const url = `${GEMINI_ENDPOINT}/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;

    // Convert OpenRouter messages → Gemini contents
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || '' }],
        }));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;

    const body: Record<string, any> = {
        contents,
        generationConfig: { temperature: 0.7 },
    };
    if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini API ${response.status}: ${text}`);
    }

    const data = await response.json();
    const geminiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
        choices: [{ message: { role: 'assistant', content: geminiText } }],
    } as OpenRouterResponse;
}

/**
 * Call OpenRouter API with fallback model list.
 */
async function callOpenRouter(
    messages: OpenRouterMessage[],
    useReasoning: boolean
): Promise<OpenRouterResponse> {
    if (IS_DEV && !DEV_API_KEY && !OPENROUTER_PROXY_URL) {
        throw new Error("Set VITE_OPENROUTER_API_KEY in .env for local dev, or VITE_OPENROUTER_PROXY_URL for proxy mode.");
    }

    const endpoint = OPENROUTER_PROXY_URL || (IS_DEV && DEV_API_KEY ? OPENROUTER_DIRECT_URL : DEFAULT_PROXY);
    const authHeaders: Record<string, string> = DEV_API_KEY
        ? { "Authorization": `Bearer ${DEV_API_KEY}` }
        : {};

    let lastError: Error | null = null;

    for (const model of FALLBACK_MODELS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    ...authHeaders,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    ...(useReasoning ? { reasoning: { enabled: true } } : {}),
                    temperature: 0.7,
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                const errorText = await response.text();
                logger.warn(`Model ${model} rate limited (429).`, 'OpenRouter', { errorText });
                lastError = new Error(`Rate limit exceeded for ${model}`);
                if (errorText.includes('Rate limit exceeded') && !errorText.includes('openrouter')) {
                    throw new Error("Batas wawasan AI tercapai. Tunggu 1 menit.");
                }
                await new Promise(resolve => setTimeout(resolve, 1500));
                continue;
            }

            if (!response.ok) {
                const errorText = await response.text();
                if (response.status >= 500) {
                    logger.warn(`Model ${model} 5xx.`, 'OpenRouter');
                    lastError = new Error(`Server error ${response.status} from ${model}`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }
                throw new Error(`OpenRouter Error (${model}): ${response.status} - ${errorText}`);
            }

            return await response.json();

        } catch (error: unknown) {
            logger.warn(`Failed with model ${model}:`, 'OpenRouter', error);
            lastError = error instanceof Error ? error : new Error(String(error));
            if (lastError.name === 'AbortError' || lastError.message.includes('fetch')) {
                continue;
            }
        }
    }

    logger.error("All AI models failed.", lastError || 'OpenRouter', lastError);
    throw new Error("Layanan AI sedang sibuk atau tidak tersedia. Silakan coba beberapa saat lagi.");
}

/**
 * Helper to extract the assistant's text content from the response.
 */
export function getAssistantContent(response: OpenRouterResponse): string {
    return response.choices && response.choices[0] ? response.choices[0].message?.content ?? '' : '';
}

/**
 * Wrapper for JSON generation commands.
 * Automatically tries to parse JSON and handles markdown cleanup.
 */
export async function generateOpenRouterJson<T>(
    prompt: string,
    systemInstruction?: string
): Promise<T> {
    const messages: OpenRouterMessage[] = [];

    if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction });
    }

    // Force JSON in prompt for models that don't support response_format: json_object strictly
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json. The response should be a raw JSON object string.`;

    messages.push({ role: 'user', content: jsonPrompt });

    const response = await generateOpenRouterContent(messages, false);
    let content = getAssistantContent(response);

    // Robust JSON extraction:
    // 1. Remove markdown code blocks
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // 2. Find the outer-most JSON structure (Object or Array)
    const firstBrace = content.indexOf('{');
    const firstBracket = content.indexOf('[');

    let start = -1;
    let end = -1;

    // Determine start based on which appears first
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = content.lastIndexOf('}');
    } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        start = firstBracket;
        end = content.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1 && end > start) {
        content = content.substring(start, end + 1);
    }

    // 3. Try parsing
    try {
        return JSON.parse(content) as T;
    } catch (e: unknown) {
        // Last ditch effort: regex for partial valid objects? 
        // For now, just logging is safer.
        logger.error("JSON Parse Error. Content was:", e instanceof Error ? e : 'OpenRouterJSON', { content });
        throw new Error("Respon AI tidak valid (JSON corrupt).");
    }
}
