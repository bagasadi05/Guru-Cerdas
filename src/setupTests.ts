import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas getContext in JSDOM environment
if (typeof window !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = function (type) {
        if (type === '2d') {
            return {
                clearRect: () => {},
                drawImage: () => {},
                fillRect: () => {},
                getImageData: () => ({ data: new Uint8ClampedArray() }),
                putImageData: () => {},
                createImageData: () => ({}),
                setTransform: () => {},
                scale: () => {},
                translate: () => {},
                rotate: () => {},
                arc: () => {},
                rect: () => {},
                fill: () => {},
                stroke: () => {},
                beginPath: () => {},
                closePath: () => {},
                moveTo: () => {},
                lineTo: () => {},
            } as unknown as CanvasRenderingContext2D;
        }
        return null;
    };
}

// Mock Supabase client
vi.mock('./services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        order: vi.fn().mockResolvedValue({ data: [], error: null }),
                    })),
                    in: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
            })),
            upsert: vi.fn().mockResolvedValue({ error: null }),
        })),
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signInWithPassword: vi.fn(),
            signOut: vi.fn(),
        }
    },
    ai: {
        models: {
            generateContent: vi.fn(),
        }
    }
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
