import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas getContext in JSDOM environment
if (typeof window !== 'undefined') {
    (HTMLCanvasElement.prototype as any).getContext = function (type: string) {
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
vi.mock('./services/supabase', () => {
    const createBuilder = () => {
        const builder: any = {
            select: vi.fn(() => builder),
            insert: vi.fn(() => builder),
            update: vi.fn(() => builder),
            delete: vi.fn(() => builder),
            upsert: vi.fn().mockResolvedValue({ error: null }),
            eq: vi.fn(() => builder),
            neq: vi.fn(() => builder),
            is: vi.fn(() => builder),
            in: vi.fn(() => builder),
            or: vi.fn(() => builder),
            gte: vi.fn(() => builder),
            lte: vi.fn(() => builder),
            order: vi.fn(() => builder),
            limit: vi.fn(() => builder),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            then: (onfulfilled?: any, onrejected?: any) =>
                Promise.resolve({ data: [], error: null }).then(onfulfilled, onrejected),
        };
        return builder;
    };

    return {
        supabase: {
            from: vi.fn(() => createBuilder()),
            auth: {
                getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
                onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
            },
            rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
            channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
        },
        ai: {
            models: {
                generateContent: vi.fn(),
            },
        },
    };
});

// JSDOM does not implement scrollIntoView. Components that scroll a selected
// item into view would otherwise throw during effect flush.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
}

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
