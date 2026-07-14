import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ErrorBoundary, { AsyncErrorBoundary } from './ErrorBoundary';

// Keep the test output clean and avoid pulling in the real logging/monitoring
// services (which set up intervals and touch localStorage/network).
vi.mock('../services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/errorHandling', () => ({
  errorReporter: {
    report: vi.fn(),
  },
}));

/** Test helper that throws on demand so we can drive the boundary. */
const Bomb = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <div>recovered-content</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // React logs the caught error to console.error; silence it for clean output.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>safe-child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('safe-child')).toBeInTheDocument();
  });

  it('renders a custom fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<div>custom-fallback</div>}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('custom-fallback')).toBeInTheDocument();
  });

  it('renders the default fallback (with action buttons) when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    // The default fallback always renders recovery actions.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('auto-resets the error state when resetKey changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a" fallback={<div>fallback-ui</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('fallback-ui')).toBeInTheDocument();

    // Simulate a route change to a screen that no longer throws.
    rerender(
      <ErrorBoundary resetKey="/b" fallback={<div>fallback-ui</div>}>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('recovered-content')).toBeInTheDocument();
    expect(screen.queryByText('fallback-ui')).not.toBeInTheDocument();
  });

  it('does NOT reset the error state when resetKey is unchanged', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/a" fallback={<div>fallback-ui</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('fallback-ui')).toBeInTheDocument();

    // Re-render with the same resetKey: the boundary should stay in error state.
    rerender(
      <ErrorBoundary resetKey="/a" fallback={<div>fallback-ui</div>}>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('fallback-ui')).toBeInTheDocument();
    expect(screen.queryByText('recovered-content')).not.toBeInTheDocument();
  });
});

describe('AsyncErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  const NavButton = () => {
    const navigate = useNavigate();
    return <button type="button" onClick={() => navigate('/safe')}>go-safe</button>;
  };

  const Thrower = () => {
    throw new Error('route-boom');
  };

  it('recovers from a crashed route after navigating to another route', () => {
    render(
      <MemoryRouter initialEntries={['/crash']}>
        <NavButton />
        <AsyncErrorBoundary context="test">
          <Routes>
            <Route path="/crash" element={<Thrower />} />
            <Route path="/safe" element={<div>safe-page</div>} />
          </Routes>
        </AsyncErrorBoundary>
      </MemoryRouter>
    );

    // Initially crashed: the safe page is not shown.
    expect(screen.queryByText('safe-page')).not.toBeInTheDocument();

    // Navigating changes location.pathname -> boundary resetKey changes -> reset.
    fireEvent.click(screen.getByText('go-safe'));

    expect(screen.getByText('safe-page')).toBeInTheDocument();
  });
});
