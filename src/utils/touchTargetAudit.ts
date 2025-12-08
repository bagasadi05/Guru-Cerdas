/**
 * Touch Target Audit Utility
 * 
 * Scans all interactive elements on the page and reports 
 * any that are smaller than the minimum recommended touch target (44x44px).
 * 
 * Usage: Call auditTouchTargets() in browser console or import and use in tests.
 */

// Minimum touch target size per Apple HIG & Material Design guidelines
export const MIN_TOUCH_TARGET_SIZE = 44;

interface TouchTargetIssue {
    element: HTMLElement;
    selector: string;
    actualWidth: number;
    actualHeight: number;
    requiredSize: number;
    severity: 'warning' | 'error';
}

interface AuditResult {
    totalElements: number;
    passedElements: number;
    failedElements: number;
    issues: TouchTargetIssue[];
    score: number;
}

/**
 * Get a CSS selector path for an element
 */
function getSelector(element: HTMLElement): string {
    if (element.id) {
        return `#${element.id}`;
    }

    const classes = Array.from(element.classList).slice(0, 3).join('.');
    const tagName = element.tagName.toLowerCase();

    if (classes) {
        return `${tagName}.${classes}`;
    }

    if (element.getAttribute('aria-label')) {
        return `${tagName}[aria-label="${element.getAttribute('aria-label')}"]`;
    }

    return tagName;
}

/**
 * Audits all interactive elements for touch target compliance
 */
export function auditTouchTargets(): AuditResult {
    const interactiveSelectors = [
        'button',
        'a',
        '[role="button"]',
        'input',
        'select',
        'textarea',
        '[tabindex]:not([tabindex="-1"])',
        '[onclick]',
        '.touch-target',
        '.clickable'
    ].join(', ');

    const elements = document.querySelectorAll<HTMLElement>(interactiveSelectors);
    const issues: TouchTargetIssue[] = [];

    elements.forEach((element) => {
        // Skip hidden elements
        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') {
            return;
        }

        const rect = element.getBoundingClientRect();

        // Check if element is too small
        if (rect.width < MIN_TOUCH_TARGET_SIZE || rect.height < MIN_TOUCH_TARGET_SIZE) {
            const severity = Math.min(rect.width, rect.height) < 36 ? 'error' : 'warning';

            issues.push({
                element,
                selector: getSelector(element),
                actualWidth: Math.round(rect.width),
                actualHeight: Math.round(rect.height),
                requiredSize: MIN_TOUCH_TARGET_SIZE,
                severity
            });
        }
    });

    const totalElements = elements.length;
    const failedElements = issues.length;
    const passedElements = totalElements - failedElements;
    const score = totalElements > 0 ? Math.round((passedElements / totalElements) * 100) : 100;

    return {
        totalElements,
        passedElements,
        failedElements,
        issues,
        score
    };
}

/**
 * Logs audit results to console with formatting
 */
export function logAuditResults(result: AuditResult): void {
    console.group('%c🎯 Touch Target Audit Results', 'font-size: 16px; font-weight: bold;');

    console.log(`%cScore: ${result.score}%`, `font-size: 20px; color: ${result.score >= 90 ? 'green' : result.score >= 70 ? 'orange' : 'red'}`);
    console.log(`Total interactive elements: ${result.totalElements}`);
    console.log(`✅ Passed: ${result.passedElements}`);
    console.log(`❌ Failed: ${result.failedElements}`);

    if (result.issues.length > 0) {
        console.group('%c⚠️ Issues Found:', 'color: orange; font-weight: bold;');
        result.issues.forEach((issue, index) => {
            const color = issue.severity === 'error' ? 'red' : 'orange';
            console.log(
                `%c${index + 1}. ${issue.selector}`,
                `color: ${color}`,
                `- Size: ${issue.actualWidth}x${issue.actualHeight}px (min: ${issue.requiredSize}px)`,
                issue.element
            );
        });
        console.groupEnd();
    }

    console.groupEnd();
}

/**
 * Runs audit and displays results
 */
export function runTouchTargetAudit(): AuditResult {
    const result = auditTouchTargets();
    logAuditResults(result);
    return result;
}

/**
 * Highlights elements with touch target issues on the page
 */
export function highlightIssues(result: AuditResult): void {
    // Remove any existing highlights
    document.querySelectorAll('.touch-target-highlight').forEach(el => el.remove());

    result.issues.forEach((issue) => {
        const rect = issue.element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.className = 'touch-target-highlight';
        highlight.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            border: 2px solid ${issue.severity === 'error' ? 'red' : 'orange'};
            background: ${issue.severity === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(255,165,0,0.2)'};
            pointer-events: none;
            z-index: 99999;
            box-sizing: border-box;
        `;
        document.body.appendChild(highlight);
    });
}

/**
 * Removes all highlights
 */
export function clearHighlights(): void {
    document.querySelectorAll('.touch-target-highlight').forEach(el => el.remove());
}

// Attach to window for console usage
if (typeof window !== 'undefined') {
    (window as any).auditTouchTargets = runTouchTargetAudit;
    (window as any).highlightTouchIssues = (result?: AuditResult) => {
        const auditResult = result || auditTouchTargets();
        highlightIssues(auditResult);
        return auditResult;
    };
    (window as any).clearTouchHighlights = clearHighlights;
}

export default {
    auditTouchTargets,
    runTouchTargetAudit,
    logAuditResults,
    highlightIssues,
    clearHighlights,
    MIN_TOUCH_TARGET_SIZE
};
