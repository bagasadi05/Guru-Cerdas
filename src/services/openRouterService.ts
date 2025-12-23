
import { isAiEnabled } from './supabase';

const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL_NAME = "xiaomi/mimo-v2-flash:free";

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
 * Generates content using the OpenRouter API.
 * 
 * @param messages The conversation history to send to the model.
 * @param useReasoning Whether to enable reasoning capabilities (if supported by the model).
 * @returns The full response object from OpenRouter.
 */
export async function generateOpenRouterContent(
    messages: OpenRouterMessage[],
    useReasoning: boolean = true
): Promise<OpenRouterResponse> {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OpenRouter API Key is missing. Please check your .env configuration.");
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                // "HTTP-Referer": window.location.origin, // Optional: for OpenRouter analytics
                // "X-Title": "Portal Guru" // Optional: for OpenRouter analytics
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: messages,
                reasoning: useReasoning ? { enabled: true } : undefined,
                temperature: 0.7, // Adjust as needed
                // response_format: { type: "json_object" } // Check model support for JSON mode if needed, Mimo might rely on prompt
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Failed to generate content via OpenRouter:", error);
        throw error;
    }
}

/**
 * Helper to extract the assistant's text content from the response.
 */
export function getAssistantContent(response: OpenRouterResponse): string {
    return response.choices[0]?.message?.content || '';
}

/**
 * Wrapper for JSON generation commands.
 * Note: Not all free models support 'json_object' natively, so proper prompting is key.
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
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json.`;

    messages.push({ role: 'user', content: jsonPrompt });

    const response = await generateOpenRouterContent(messages, false); // Reasoning often breaks strict JSON output
    let content = getAssistantContent(response);

    // Robust JSON extraction:
    // 1. Remove markdown code blocks (just in case)
    // 2. Find the outer-most curly braces to ignore preamble/postscript
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        content = content.substring(firstBrace, lastBrace + 1);
    }

    try {
        return JSON.parse(content) as T;
    } catch (e) {
        console.error("Failed to parse JSON from OpenRouter response. Content:", content);
        console.error("Parse Error details:", e);
        throw new Error("AI did not return valid JSON.");
    }
}
