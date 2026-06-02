/**
 * Pioneer AI Service — Claude Opus 4.7
 *
 * Menggunakan Pioneer AI (api.pioneer.ai) sebagai provider untuk Claude Opus 4.7.
 * Pioneer menyediakan endpoint Anthropic-compatible sehingga format request/response
 * sama persis dengan Anthropic SDK standar.
 *
 * Endpoint: https://api.pioneer.ai/v1/messages
 * Model: claude-opus-4-7
 * Docs: https://docs.pioneer.ai/api-reference/inference/anthropic-compatible
 *
 * KEAMANAN: API key hanya digunakan di dev (VITE_PIONEER_API_KEY).
 * Untuk production, buat serverless proxy seperti api/openrouter.ts.
 *
 * @module services/pioneerService
 */

import { logger } from './logger';

const PIONEER_API_URL = 'https://api.pioneer.ai/v1/messages';
const PIONEER_MODEL = 'claude-opus-4-7';

// Dev-only: API key langsung dari env (tidak pernah di-bundle ke production)
const PIONEER_API_KEY = import.meta.env.DEV
    ? (import.meta.env.VITE_PIONEER_API_KEY || '')
    : '';

export const isPioneerEnabled = !!PIONEER_API_KEY;

export interface PioneerMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface PioneerResponse {
    id: string;
    type: string;
    role: string;
    content: { type: string; text: string }[];
    model: string;
    stop_reason: string | null;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * Kirim pesan ke Claude Opus 4.7 via Pioneer AI.
 *
 * @param messages Array pesan percakapan (user/assistant)
 * @param systemPrompt Instruksi sistem opsional
 * @param maxTokens Batas token output (default: 4096)
 * @returns Response dari Pioneer AI
 */
export async function generatePioneerContent(
    messages: PioneerMessage[],
    systemPrompt?: string,
    maxTokens: number = 4096
): Promise<PioneerResponse> {
    if (!PIONEER_API_KEY) {
        throw new Error(
            'VITE_PIONEER_API_KEY belum dikonfigurasi. ' +
            'Tambahkan key dari https://app.pioneer.ai/api-keys ke file .env'
        );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000); // 60s timeout

    try {
        const body: Record<string, unknown> = {
            model: PIONEER_MODEL,
            max_tokens: maxTokens,
            messages,
        };

        if (systemPrompt) {
            body.system = systemPrompt;
        }

        const response = await fetch(PIONEER_API_URL, {
            method: 'POST',
            headers: {
                'X-API-Key': PIONEER_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `Pioneer API Error: ${response.status} ${response.statusText} — ${errorText}`
            );
        }

        return (await response.json()) as PioneerResponse;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Request ke Pioneer AI timeout (>60 detik).');
        }
        throw error;
    }
}

/**
 * Ambil teks dari response Pioneer.
 */
export function getPioneerText(response: PioneerResponse): string {
    return response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
}

/**
 * Wrapper untuk generate JSON terstruktur via Claude Opus 4.7.
 * Otomatis parse JSON dan bersihkan markdown.
 */
export async function generatePioneerJson<T>(
    prompt: string,
    systemInstruction?: string
): Promise<T> {
    const systemPrompt =
        (systemInstruction ? systemInstruction + '\n\n' : '') +
        'Respond ONLY with valid JSON. Do not include markdown formatting like ```json. ' +
        'The response must be a raw JSON object or array.';

    const messages: PioneerMessage[] = [
        { role: 'user', content: prompt },
    ];

    const response = await generatePioneerContent(messages, systemPrompt);
    let content = getPioneerText(response);

    // Bersihkan markdown code block jika ada
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // Temukan JSON object/array terluar
    const firstBrace = content.indexOf('{');
    const firstBracket = content.indexOf('[');
    let start = -1;
    let end = -1;

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

    try {
        return JSON.parse(content) as T;
    } catch (e) {
        logger.error('Pioneer JSON Parse Error', undefined, { content, error: e });
        throw new Error('Respon Claude Opus 4.7 tidak valid (JSON corrupt).');
    }
}

/**
 * Analisis project/kode menggunakan Claude Opus 4.7.
 * Fungsi khusus untuk menganalisis dan memberikan rekomendasi perbaikan.
 *
 * @param context Deskripsi atau kode yang ingin dianalisis
 * @param focusArea Area fokus analisis (opsional)
 * @returns Hasil analisis sebagai teks
 */
export async function analyzeWithClaude(
    context: string,
    focusArea?: string
): Promise<string> {
    const systemPrompt = `Kamu adalah senior software engineer yang ahli dalam React, TypeScript, Supabase, dan pengembangan aplikasi web modern. 
Kamu sedang menganalisis project "Portal Guru" — aplikasi manajemen sekolah untuk guru di Indonesia.
Berikan analisis yang mendalam, praktis, dan actionable dalam Bahasa Indonesia.
${focusArea ? `Fokus pada: ${focusArea}` : ''}`;

    const messages: PioneerMessage[] = [
        { role: 'user', content: context },
    ];

    const response = await generatePioneerContent(messages, systemPrompt, 8192);
    return getPioneerText(response);
}
