const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Priority list of FREE models to try in order
const FALLBACK_MODELS = [
    "xiaomi/mimo-v2-flash:free"              // Primary: User selected
];

export interface OpenRouterMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning_details?: any;
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
    _useReasoning: boolean = true
): Promise<OpenRouterResponse> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API Key is missing. Please check your .env configuration.");
    }

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

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    // "HTTP-Referer": window.location.origin, // Optional: for OpenRouter analytics
                    // "X-Title": "Portal Guru" // Optional: for OpenRouter analytics
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    // reasoning: useReasoning ? { enabled: true } : undefined, // Reasoning support varies by model, safer to omit for generic fallback
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

        } catch (error: any) {
            console.warn(`Failed with model ${model}:`, error);
            lastError = error;
            // If it's a timeout or network error, continue to next model
            if (error.name === 'AbortError' || error.message.includes('fetch')) {
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
    return response.choices && response.choices[0] ? response.choices[0].message?.content || '' : '';
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

    // 2. Find the outer-most curly braces to ignore preamble/postscript
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
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
