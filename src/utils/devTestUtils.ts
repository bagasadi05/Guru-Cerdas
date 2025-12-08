/**
 * Development Testing Utilities
 * 
 * This file exports testing utilities that are available in the browser console
 * during development. These utilities help with testing responsive design,
 * accessibility, and touch target compliance.
 * 
 * Available Functions (in browser console):
 * 
 * Responsive Testing:
 * - checkResponsive() - Log current responsive design status
 * - getBreakpoint() - Get current breakpoint info
 * - checkOverflow() - Check for horizontal overflow issues
 * - getGrids() - Get info about all grid layouts on page
 * - auditSpacing() - Check for spacing inconsistencies
 * 
 * Touch Target Testing:
 * - auditTouchTargets() - Run touch target audit and log results
 * - highlightTouchIssues() - Highlight elements with touch target issues
 * - clearTouchHighlights() - Remove all highlights
 */

// Import utilities to register them on window
import './touchTargetAudit';
import './responsiveTestUtils';

// Only log in development
if (import.meta.env.DEV) {
    console.log(
        '%c🛠️ Dev Testing Utilities Available',
        'font-size: 14px; font-weight: bold; color: #6366f1;'
    );
    console.log(`
Available commands:
  • checkResponsive() - Check responsive design status
  • auditTouchTargets() - Audit touch target sizes
  • highlightTouchIssues() - Highlight elements with issues
  • clearTouchHighlights() - Clear highlights
  • getBreakpoint() - Get current breakpoint
  • checkOverflow() - Check for horizontal overflow
    `);
}

export { };
