/**
 * Hardware & Environment Ports for Voice Grade Processing
 * Following Ports & Adapters (Hexagonal Architecture) discipline.
 */

export interface SpeechRecognitionHandlers {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (errorType: 'not-allowed' | 'network' | 'audio-capture' | 'unsupported' | 'crash_loop', rawMessage?: string) => void;
    onEnd: () => void;
    onStart: () => void;
}

export interface SpeechRecognitionPort {
    start(handlers: SpeechRecognitionHandlers): Promise<void>;
    stop(): void;
    abort(): void;
    isSupported(): boolean;
    isBrave(): Promise<boolean>;
}

export interface AudioFeedbackPort {
    playSuccess(): void;
    playCommand(): void;
    playError(): void;
}

interface SpeechRecognitionResultEvent {
    resultIndex: number;
    results: {
        length: number;
        [index: number]: {
            isFinal: boolean;
            [index: number]: { transcript: string };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

// Browser Web Speech API type shims
interface ISpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface NavigatorWithBrave extends Navigator {
    brave?: {
        isBrave?: () => Promise<boolean>;
    };
}

/**
 * Production Web Speech Recognition Adapter
 */
export class BrowserSpeechRecognitionAdapter implements SpeechRecognitionPort {
    private recognition: ISpeechRecognition | null = null;
    private restartTimestamps: number[] = [];
    private handlers: SpeechRecognitionHandlers | null = null;
    private shouldStayListening = false;
    private processedPrefixByResultIndex: Map<number, number> = new Map();

    public isSupported(): boolean {
        if (typeof window === 'undefined') return false;
        const win = window as unknown as {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
        };
        return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
    }

    public async isBrave(): Promise<boolean> {
        if (typeof navigator === 'undefined') return false;
        const nav = navigator as NavigatorWithBrave;
        try {
            if (nav.brave?.isBrave) {
                return await nav.brave.isBrave();
            }
        } catch {
            return false;
        }
        return false;
    }

    public async start(handlers: SpeechRecognitionHandlers): Promise<void> {
        this.handlers = handlers;
        this.shouldStayListening = true;

        if (!this.isSupported()) {
            handlers.onError('unsupported', 'Browser tidak mendukung SpeechRecognition.');
            return;
        }

        // Pre-flight check on Chrome Mobile / Android to trigger permission dialog if needed
        if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
            if (isMobile) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach((track) => track.stop());
                } catch (err: unknown) {
                    const e = err as { name?: string };
                    if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
                        handlers.onError('not-allowed', 'Izin mikrofon ditolak.');
                        return;
                    }
                }
            }
        }

        this.initRecognition();
    }

    private initRecognition() {
        if (!this.shouldStayListening || !this.handlers) return;

        const win = window as unknown as {
            SpeechRecognition?: SpeechRecognitionConstructor;
            webkitSpeechRecognition?: SpeechRecognitionConstructor;
        };
        const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechClass) return;

        try {
            if (this.recognition) {
                try {
                    this.recognition.abort();
                } catch {
                    // Ignore abort error
                }
            }

            const rec = new SpeechClass();
            rec.lang = 'id-ID';
            rec.continuous = true;
            rec.interimResults = true;
            rec.maxAlternatives = 1;

            rec.onstart = () => {
                this.handlers?.onStart();
            };

            rec.onresult = (event: SpeechRecognitionResultEvent) => {
                let currentInterim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    const rawTranscript = res[0]?.transcript || '';
                    if (res.isFinal) {
                        const previousProcessedLength = this.processedPrefixByResultIndex.get(i) || 0;
                        const delta = rawTranscript.slice(previousProcessedLength).trim();
                        this.processedPrefixByResultIndex.delete(i);
                        if (delta) {
                            this.handlers?.onResult(delta, true);
                        }
                    } else {
                        currentInterim += rawTranscript;
                        this.handlers?.onResult(currentInterim.trim(), false);
                    }
                }
            };

            rec.onerror = (event: SpeechRecognitionErrorEvent) => {
                const err = event.error || '';
                if (err === 'not-allowed') {
                    this.handlers?.onError('not-allowed', event.message);
                } else if (err === 'audio-capture') {
                    this.handlers?.onError('audio-capture', event.message);
                } else if (err === 'network') {
                    this.handlers?.onError('network', event.message);
                }
            };

            rec.onend = () => {
                this.processedPrefixByResultIndex.clear();
                if (!this.shouldStayListening) {
                    this.handlers?.onEnd();
                    return;
                }

                // Protect against Chrome crash loop
                const now = Date.now();
                this.restartTimestamps = this.restartTimestamps.filter((t) => now - t < 1200);
                this.restartTimestamps.push(now);

                if (this.restartTimestamps.length > 5) {
                    this.shouldStayListening = false;
                    this.handlers?.onError('crash_loop', 'Terlalu banyak crash speech loop dalam waktu singkat.');
                    this.handlers?.onEnd();
                    return;
                }

                // Restart listening automatically
                setTimeout(() => {
                    if (this.shouldStayListening) {
                        try {
                            this.recognition?.start();
                        } catch {
                            this.initRecognition();
                        }
                    }
                }, 100);
            };

            this.recognition = rec;
            rec.start();
        } catch (error: unknown) {
            const e = error as { message?: string };
            this.handlers.onError('crash_loop', e?.message);
        }
    }

    public stop(): void {
        this.shouldStayListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch {
                // Ignore stop error
            }
        }
        this.handlers?.onEnd();
    }

    public abort(): void {
        this.shouldStayListening = false;
        if (this.recognition) {
            try {
                this.recognition.abort();
            } catch {
                // Ignore abort error
            }
        }
        this.handlers?.onEnd();
    }
}

/**
 * Production Web Audio Synthesizer Adapter
 */
export class WebAudioFeedbackAdapter implements AudioFeedbackPort {
    public playSuccess(): void {
        import('../../../../utils/soundFeedback')
            .then((m) => m.playSuccessChime())
            .catch(() => {});
    }

    public playCommand(): void {
        import('../../../../utils/soundFeedback')
            .then((m) => m.playCommandTone())
            .catch(() => {});
    }

    public playError(): void {
        import('../../../../utils/soundFeedback')
            .then((m) => m.playErrorTone())
            .catch(() => {});
    }
}

/**
 * Silent Audio Adapter (For Tests & Headless Execution)
 */
export class SilentAudioFeedbackAdapter implements AudioFeedbackPort {
    public playSuccess(): void {}
    public playCommand(): void {}
    public playError(): void {}
}

/**
 * Fake Speech Recognition Adapter (For Unit Testing)
 */
export class FakeSpeechRecognitionAdapter implements SpeechRecognitionPort {
    public handlers: SpeechRecognitionHandlers | null = null;
    public listening = false;
    private supported = true;
    private brave = false;

    public setSupported(val: boolean) {
        this.supported = val;
    }

    public setBrave(val: boolean) {
        this.brave = val;
    }

    public isSupported(): boolean {
        return this.supported;
    }

    public async isBrave(): Promise<boolean> {
        return this.brave;
    }

    public async start(handlers: SpeechRecognitionHandlers): Promise<void> {
        this.handlers = handlers;
        this.listening = true;
        handlers.onStart();
    }

    public stop(): void {
        this.listening = false;
        this.handlers?.onEnd();
    }

    public abort(): void {
        this.listening = false;
        this.handlers?.onEnd();
    }

    public emitTranscript(transcript: string, isFinal = true): void {
        if (!this.listening || !this.handlers) return;
        this.handlers.onResult(transcript, isFinal);
    }

    public emitError(type: 'not-allowed' | 'network' | 'audio-capture' | 'unsupported' | 'crash_loop', msg?: string): void {
        if (!this.handlers) return;
        this.handlers.onError(type, msg);
    }
}
