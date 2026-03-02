// In production, calls go through the serverless proxy at /api/openrouter (same domain).
// VITE_OPENROUTER_PROXY_URL can override this (e.g. for staging/custom domains).
// In local dev, falls back to VITE_OPENROUTER_API_KEY for direct calls.
const OPENROUTER_PROXY_URL = import.meta.env.VITE_OPENROUTER_PROXY_URL || '';
const DEV_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const IS_DEV = import.meta.env.DEV === true;
const OPENROUTER_DIRECT_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Default to same-domain proxy — works on Vercel without any env var needed
const DEFAULT_PROXY = '/api/openrouter';

// Primary reasoning model + free fallbacks
const PRIMARY_MODEL = 'arcee-ai/trinity-large-preview:free';
const FALLBACK_MODELS = [
    PRIMARY_MODEL,
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.2-3b-instruct:free",
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
 * Generates content using the OpenRouter API with robust fallback and retry logic.
 * 
 * @param messages The conversation history to send to the model.
 * @param useReasoning Whether to enable reasoning capabilities (if supported by the model).
 * @returns The full response object from OpenRouter.
 */
export async function generateOpenRouterContent(
    messages: OpenRouterMessage[],
    useReasoning: boolean = true
): Promise<OpenRouterResponse> {
    if (!OPENROUTER_PROXY_URL && !DEFAULT_PROXY && !(IS_DEV && DEV_API_KEY)) {
        throw new Error(
            IS_DEV
                ? "Set VITE_OPENROUTER_API_KEY in .env for local dev, or VITE_OPENROUTER_PROXY_URL for proxy mode."
                : "VITE_OPENROUTER_PROXY_URL is not set. Please configure the serverless proxy URL in your .env file."
        );
    }

    // Resolve endpoint + headers:
    // 1. Explicit proxy URL (env var override)
    // 2. Dev direct call with API key
    // 3. Default same-domain proxy /api/openrouter (production Vercel)
    const endpoint = OPENROUTER_PROXY_URL || (IS_DEV && DEV_API_KEY ? OPENROUTER_DIRECT_URL : DEFAULT_PROXY);
    const authHeaders: Record<string, string> = (!OPENROUTER_PROXY_URL && IS_DEV && DEV_API_KEY)
        ? { "Authorization": `Bearer ${DEV_API_KEY}` }
        : {};

    let lastError: any = null;

    // Iterate through models
    for (const model of FALLBACK_MODELS) {
        try {
            // Attempt to call API with current model
            // Add a small retry loop for the SAME model in case of temporary glitches (non-429)
            // But for 429, we usually want to switch models fast unless we want to wait huge delay.
            // Here we just try each model once per call to keep UI responsive, 
            // relying on the model switch availability effectively acting as retries.

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s hard timeout

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
                    // Enable reasoning for primary model; fallbacks may ignore it gracefully
                    ...(useReasoning ? { reasoning: { enabled: true } } : {}),
                    temperature: 0.7,
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 429) {
                console.warn(`Model ${model} rate limited (429). Switch to next model.`);
                lastError = new Error(`Rate limit exceeded for ${model}`);
                continue; // Try next model immediately
            }

            if (!response.ok) {
                const errorText = await response.text();
                // If 5xx error, also try next model
                if (response.status >= 500) {
                    console.warn(`Model ${model} server error (${response.status}). Switch to next model.`);
                    lastError = new Error(`Server error ${response.status} from ${model}`);
                    continue;
                }
                throw new Error(`OpenRouter API Error (${model}): ${response.status} ${response.statusText} - ${errorText}`);
            }

            // If success, return immediately
            return await response.json();

        } catch (error: unknown) {
            console.warn(`Failed with model ${model}:`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
            // If it's a timeout or network error, continue to next model
            if (lastError.name === 'AbortError' || lastError.message.includes('fetch')) {
                continue;
            }
            // If it's a critical application error (like invalid key), maybe stop? 
            // But generally safer to try all.
        }
    }

    // If we're here, all models failed
    console.error("All AI models failed.", lastError);
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
    } catch (e: any) {
        // Last ditch effort: regex for partial valid objects? 
        // For now, just logging is safer.
        console.error("JSON Parse Error. Content was:", content, e);
        throw new Error("Respon AI tidak valid (JSON corrupt).");
    }
}
