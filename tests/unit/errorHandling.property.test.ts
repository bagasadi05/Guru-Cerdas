import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { classifyError, errorReporter, ErrorType, ErrorSeverity, ErrorCategory } from '../../src/services/errorHandling';

/**
 * Property-Based Testing for Enhanced Error Handling Infrastructure
 * Feature: portal-guru-improvements, Property 1: Error Capture and Context
 * Validates: Requirements 1.1, 1.4
 * 
 * These tests verify that the error handling system captures errors with complete context
 * including stack trace, user ID, timestamp, and component information.
 */

// Mock global objects for testing
const mockWindow = {
  location: { href: 'https://example.com/test' },
  screen: { width: 1920, height: 1080 }
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
  language: 'en-US',
  onLine: true
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

// Setup global mocks
beforeEach(() => {
  vi.stubGlobal('window', mockWindow);
  vi.stubGlobal('navigator', mockNavigator);
  vi.stubGlobal('localStorage', mockLocalStorage);
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  });
  
  // Reset localStorage mock - return array for logs, object for user
  mockLocalStorage.getItem.mockImplementation((key: string) => {
    if (key === 'portal_guru_logs') {
      return JSON.stringify([]);
    }
    if (key === 'user') {
      return JSON.stringify({ id: 'test-user-123' });
    }
    return null;
  });
});

describe('Property-Based Testing: Error Capture and Context', () => {
  
  // Arbitrary generators for different error types
  const errorMessageArbitrary = fc.string({ minLength: 1, maxLength: 200 });
  const stackTraceArbitrary = fc.string({ minLength: 10, maxLength: 1000 });
  const componentNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
  const userIdArbitrary = fc.uuid();
  const urlArbitrary = fc.webUrl();
  
  const jsErrorArbitrary = fc.record({
    name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'SyntaxError'),
    message: errorMessageArbitrary,
    stack: stackTraceArbitrary
  }).map(({ name, message, stack }) => {
    const error = new Error(message);
    error.name = name;
    error.stack = stack;
    return error;
  });

  const contextArbitrary = fc.record({
    componentStack: fc.string({ minLength: 10, maxLength: 500 }),
    component: componentNameArbitrary,
    action: fc.string({ minLength: 1, maxLength: 50 }),
    metadata: fc.dictionary(fc.string(), fc.anything())
  });

  /**
   * **Feature: portal-guru-improvements, Property 1: Error Capture and Context**
   * **Validates: Requirements 1.1, 1.4**
   * 
   * Property: For any error that occurs in the application, the error handling system 
   * should capture the error with complete context including stack trace, user ID, 
   * timestamp, and component information.
   */
  it('property: error classification captures complete context for all error types', () => {
    fc.assert(
      fc.property(
        jsErrorArbitrary,
        contextArbitrary,
        (error, context) => {
          const classifiedError = classifyError(error, context);
          
          // Verify all required context fields are captured
          expect(classifiedError.id).toBeDefined();
          expect(classifiedError.timestamp).toBeDefined();
          expect(classifiedError.url).toBeDefined();
          expect(classifiedError.userAgent).toBeDefined();
          expect(classifiedError.sessionId).toBeDefined();
          
          // Verify timestamp is valid ISO string
          expect(() => new Date(classifiedError.timestamp)).not.toThrow();
          expect(new Date(classifiedError.timestamp).toISOString()).toBe(classifiedError.timestamp);
          
          // Verify error message and stack are preserved
          expect(classifiedError.message).toBe(error.message);
          expect(classifiedError.stack).toBe(error.stack);
          
          // Verify context is preserved
          if (context) {
            expect(classifiedError.context).toEqual(expect.objectContaining(context));
          }
          
          // Verify user ID is captured when available
          expect(classifiedError.userId).toBe('test-user-123');
          
          // Verify error has proper classification
          expect(Object.values(ErrorType)).toContain(classifiedError.type);
          expect(Object.values(ErrorSeverity)).toContain(classifiedError.severity);
          expect(Object.values(ErrorCategory)).toContain(classifiedError.category);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error reporter should preserve all context information when reporting errors
   */
  it('property: error reporter preserves context information for all errors', () => {
    fc.assert(
      fc.property(
        jsErrorArbitrary,
        contextArbitrary,
        (error, context) => {
          const reportedError = errorReporter.report(error, context);
          
          // Verify the reported error maintains all context
          expect(reportedError.id).toBeDefined();
          expect(reportedError.timestamp).toBeDefined();
          expect(reportedError.userId).toBe('test-user-123');
          expect(reportedError.url).toBe(mockWindow.location.href);
          expect(reportedError.userAgent).toBe(mockNavigator.userAgent);
          
          // Verify context is merged properly
          if (context) {
            expect(reportedError.context).toEqual(expect.objectContaining(context));
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Component errors should be classified with UI category and proper severity
   */
  it('property: component errors are properly classified with context', () => {
    fc.assert(
      fc.property(
        jsErrorArbitrary,
        fc.record({
          componentStack: fc.string({ minLength: 10, maxLength: 500 }),
          component: componentNameArbitrary
        }),
        (error, componentContext) => {
          const classifiedError = classifyError(error, componentContext);
          
          // Component errors should be classified as COMPONENT type with UI category
          expect(classifiedError.type).toBe(ErrorType.COMPONENT);
          expect(classifiedError.category).toBe(ErrorCategory.UI);
          expect(classifiedError.severity).toBe(ErrorSeverity.HIGH);
          
          // Component name should be preserved
          expect(classifiedError.component).toBe(componentContext.component);
          
          // Component stack should be in context
          expect(classifiedError.context?.componentStack).toBe(componentContext.componentStack);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Network errors should be properly classified and marked as retryable
   */
  it('property: network errors are classified correctly with retry capability', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'fetch',
          'network',
          'connection'
        ),
        (networkKeyword) => {
          const networkError = new TypeError(`Failed to ${networkKeyword}: network error`);
          const classifiedError = classifyError(networkError);
          
          // Network errors should be properly classified
          expect(classifiedError.type).toBe(ErrorType.NETWORK);
          expect(classifiedError.category).toBe(ErrorCategory.NETWORK);
          expect(classifiedError.retryable).toBe(true);
          expect(classifiedError.recoverable).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All classified errors should have consistent structure and required fields
   */
  it('property: all classified errors have consistent structure', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          jsErrorArbitrary,
          fc.string(),
          fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
          fc.record({ errors: fc.array(fc.string()) })
        ),
        contextArbitrary,
        (error, context) => {
          const classifiedError = classifyError(error, context);
          
          // Verify all required fields are present
          const requiredFields = [
            'id', 'type', 'category', 'message', 'userMessage', 
            'severity', 'timestamp', 'recoverable', 'retryable',
            'sessionId', 'url', 'userAgent'
          ];
          
          for (const field of requiredFields) {
            expect(classifiedError).toHaveProperty(field);
            expect(classifiedError[field as keyof typeof classifiedError]).toBeDefined();
          }
          
          // Verify enums are valid
          expect(Object.values(ErrorType)).toContain(classifiedError.type);
          expect(Object.values(ErrorSeverity)).toContain(classifiedError.severity);
          expect(Object.values(ErrorCategory)).toContain(classifiedError.category);
          
          // Verify boolean fields are actually booleans
          expect(typeof classifiedError.recoverable).toBe('boolean');
          expect(typeof classifiedError.retryable).toBe('boolean');
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Testing for Application Crash Prevention
 * Feature: portal-guru-improvements, Property 4: Application Crash Prevention
 * Validates: Requirements 1.5
 * 
 * These tests verify that the error boundary system prevents application crashes
 * and maintains application stability when critical errors occur.
 */

describe('Property-Based Testing: Application Crash Prevention', () => {
  
  // Arbitrary generators for React component errors
  const reactErrorArbitrary = fc.record({
    name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'RangeError'),
    message: fc.string({ minLength: 1, maxLength: 200 }),
    stack: fc.string({ minLength: 10, maxLength: 1000 }),
    componentStack: fc.string({ minLength: 10, maxLength: 500 })
  }).map(({ name, message, stack, componentStack }) => {
    const error = new Error(message);
    error.name = name;
    error.stack = stack;
    return { error, componentStack };
  });

  const criticalErrorArbitrary = fc.record({
    name: fc.constantFrom('ReferenceError', 'TypeError', 'SyntaxError'),
    message: fc.string({ minLength: 1, maxLength: 200 }),
    stack: fc.string({ minLength: 10, maxLength: 1000 })
  }).map(({ name, message, stack }) => {
    const error = new Error(message);
    error.name = name;
    error.stack = stack;
    return error;
  });

  /**
   * **Feature: portal-guru-improvements, Property 4: Application Crash Prevention**
   * **Validates: Requirements 1.5**
   * 
   * Property: For any critical error, the error boundary system should prevent 
   * application crashes and maintain application stability.
   */
  it('property: error boundaries prevent crashes for all critical errors', () => {
    fc.assert(
      fc.property(
        criticalErrorArbitrary,
        (criticalError) => {
          // Simulate error boundary behavior
          const classifiedError = classifyError(criticalError);
          
          // Critical errors should be classified and handled gracefully
          expect(classifiedError).toBeDefined();
          expect(classifiedError.id).toBeDefined();
          expect(classifiedError.message).toBe(criticalError.message);
          expect(classifiedError.stack).toBe(criticalError.stack);
          
          // Error should be marked as recoverable to allow retry
          expect(classifiedError.recoverable).toBe(true);
          
          // Error should have appropriate severity
          expect([ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL])
            .toContain(classifiedError.severity);
          
          // Error should be properly categorized
          expect(Object.values(ErrorCategory)).toContain(classifiedError.category);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error boundaries should capture and preserve error context for debugging
   */
  it('property: error boundaries preserve debugging context for all errors', () => {
    fc.assert(
      fc.property(
        reactErrorArbitrary,
        ({ error, componentStack }) => {
          const context = {
            componentStack,
            component: 'TestComponent',
            action: 'render'
          };
          
          const classifiedError = classifyError(error, context);
          
          // Verify error context is preserved for debugging
          expect(classifiedError.context).toBeDefined();
          expect(classifiedError.context?.componentStack).toBe(componentStack);
          expect(classifiedError.context?.component).toBe('TestComponent');
          expect(classifiedError.context?.action).toBe('render');
          
          // Verify error is classified as component error
          expect(classifiedError.type).toBe(ErrorType.COMPONENT);
          expect(classifiedError.category).toBe(ErrorCategory.UI);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error reporting should handle all error types without throwing
   */
  it('property: error reporting never throws for any error input', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          criticalErrorArbitrary,
          fc.string(),
          fc.record({ status: fc.integer({ min: 400, max: 599 }) }),
          fc.record({ errors: fc.array(fc.string()) }),
          fc.anything()
        ),
        (errorInput) => {
          // Error reporting should never throw, regardless of input
          expect(() => {
            const classifiedError = classifyError(errorInput);
            errorReporter.report(errorInput);
            
            // Verify basic error structure is always maintained
            expect(classifiedError).toBeDefined();
            expect(classifiedError.id).toBeDefined();
            expect(classifiedError.timestamp).toBeDefined();
            expect(typeof classifiedError.recoverable).toBe('boolean');
            expect(typeof classifiedError.retryable).toBe('boolean');
            
          }).not.toThrow();
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error boundaries should maintain application state consistency
   */
  it('property: error boundaries maintain state consistency after errors', () => {
    fc.assert(
      fc.property(
        fc.array(criticalErrorArbitrary, { minLength: 1, maxLength: 10 }),
        (errors) => {
          // Simulate multiple errors occurring in sequence
          const classifiedErrors = errors.map(error => classifyError(error));
          
          // All errors should be classified consistently
          for (const classifiedError of classifiedErrors) {
            expect(classifiedError).toBeDefined();
            expect(classifiedError.id).toBeDefined();
            expect(classifiedError.timestamp).toBeDefined();
            
            // Each error should have a unique ID
            const otherErrors = classifiedErrors.filter(e => e !== classifiedError);
            expect(otherErrors.every(e => e.id !== classifiedError.id)).toBe(true);
            
            // Timestamps should be valid ISO strings
            expect(() => new Date(classifiedError.timestamp)).not.toThrow();
            expect(new Date(classifiedError.timestamp).toISOString()).toBe(classifiedError.timestamp);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error severity classification should be consistent and appropriate
   */
  it('property: error severity is consistently classified for all error types', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          criticalErrorArbitrary,
          fc.record({ status: fc.constantFrom(401, 403, 404, 429, 500, 502, 503) }),
          fc.record({ errors: fc.array(fc.string(), { minLength: 1 }) })
        ),
        (errorInput) => {
          const classifiedError = classifyError(errorInput);
          
          // Verify severity is always a valid enum value
          expect(Object.values(ErrorSeverity)).toContain(classifiedError.severity);
          
          // Verify severity matches error type appropriately
          if (classifiedError.type === ErrorType.AUTH || classifiedError.type === ErrorType.SERVER) {
            expect([ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]).toContain(classifiedError.severity);
          }
          
          if (classifiedError.type === ErrorType.VALIDATION) {
            expect([ErrorSeverity.LOW, ErrorSeverity.MEDIUM]).toContain(classifiedError.severity);
          }
          
          if (classifiedError.type === ErrorType.COMPONENT) {
            expect(classifiedError.severity).toBe(ErrorSeverity.HIGH);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});