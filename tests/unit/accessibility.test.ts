import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    generateAriaId,
    Keys,
    ariaProps,
    runAccessibilityAudit
} from '../../src/utils/accessibility';

describe('Accessibility Utilities', () => {
    describe('generateAriaId', () => {
        it('generates unique IDs', () => {
            const id1 = generateAriaId();
            const id2 = generateAriaId();
            expect(id1).not.toBe(id2);
        });

        it('uses custom prefix', () => {
            const id = generateAriaId('custom');
            expect(id.startsWith('custom-')).toBe(true);
        });

        it('increments counter', () => {
            const id1 = generateAriaId('test');
            const id2 = generateAriaId('test');
            const num1 = parseInt(id1.split('-')[1]);
            const num2 = parseInt(id2.split('-')[1]);
            expect(num2).toBeGreaterThan(num1);
        });
    });

    describe('Keys constants', () => {
        it('has all navigation keys', () => {
            expect(Keys.ENTER).toBe('Enter');
            expect(Keys.SPACE).toBe(' ');
            expect(Keys.ESCAPE).toBe('Escape');
            expect(Keys.TAB).toBe('Tab');
            expect(Keys.ARROW_UP).toBe('ArrowUp');
            expect(Keys.ARROW_DOWN).toBe('ArrowDown');
            expect(Keys.ARROW_LEFT).toBe('ArrowLeft');
            expect(Keys.ARROW_RIGHT).toBe('ArrowRight');
            expect(Keys.HOME).toBe('Home');
            expect(Keys.END).toBe('End');
        });
    });

    describe('ariaProps helpers', () => {
        describe('button', () => {
            it('returns button role and tabIndex', () => {
                const props = ariaProps.button();
                expect(props.role).toBe('button');
                expect(props.tabIndex).toBe(0);
            });

            it('includes label when provided', () => {
                const props = ariaProps.button('Click me');
                expect(props['aria-label']).toBe('Click me');
            });

            it('includes pressed state', () => {
                const props = ariaProps.button('Toggle', true);
                expect(props['aria-pressed']).toBe(true);
            });

            it('includes expanded state', () => {
                const props = ariaProps.button('Menu', false, true);
                expect(props['aria-expanded']).toBe(true);
            });
        });

        describe('link', () => {
            it('returns aria-current for current page', () => {
                const props = ariaProps.link('Home', true);
                expect(props['aria-current']).toBe('page');
            });

            it('returns undefined aria-current for other pages', () => {
                const props = ariaProps.link('About', false);
                expect(props['aria-current']).toBeUndefined();
            });
        });

        describe('dialog', () => {
            it('returns dialog role and modal', () => {
                const props = ariaProps.dialog();
                expect(props.role).toBe('dialog');
                expect(props['aria-modal']).toBe(true);
            });

            it('includes labelledby', () => {
                const props = ariaProps.dialog('title-id');
                expect(props['aria-labelledby']).toBe('title-id');
            });

            it('includes describedby', () => {
                const props = ariaProps.dialog('title-id', 'desc-id');
                expect(props['aria-describedby']).toBe('desc-id');
            });
        });

        describe('tab', () => {
            it('returns correct props for selected tab', () => {
                const props = ariaProps.tab(true, 'panel-1');
                expect(props.role).toBe('tab');
                expect(props['aria-selected']).toBe(true);
                expect(props['aria-controls']).toBe('panel-1');
                expect(props.tabIndex).toBe(0);
            });

            it('returns correct props for unselected tab', () => {
                const props = ariaProps.tab(false, 'panel-2');
                expect(props['aria-selected']).toBe(false);
                expect(props.tabIndex).toBe(-1);
            });
        });

        describe('tabPanel', () => {
            it('returns correct props for visible panel', () => {
                const props = ariaProps.tabPanel('tab-1', false);
                expect(props.role).toBe('tabpanel');
                expect(props['aria-labelledby']).toBe('tab-1');
                expect(props.hidden).toBe(false);
                expect(props.tabIndex).toBe(0);
            });

            it('returns correct props for hidden panel', () => {
                const props = ariaProps.tabPanel('tab-2', true);
                expect(props.hidden).toBe(true);
            });
        });

        describe('progressbar', () => {
            it('returns correct progress props', () => {
                const props = ariaProps.progressbar(50, 100);
                expect(props.role).toBe('progressbar');
                expect(props['aria-valuenow']).toBe(50);
                expect(props['aria-valuemin']).toBe(0);
                expect(props['aria-valuemax']).toBe(100);
            });

            it('generates label from value', () => {
                const props = ariaProps.progressbar(75, 100);
                expect(props['aria-label']).toBe('Progress: 75%');
            });

            it('uses custom label', () => {
                const props = ariaProps.progressbar(50, 100, 'Upload progress');
                expect(props['aria-label']).toBe('Upload progress');
            });
        });

        describe('slider', () => {
            it('returns correct slider props', () => {
                const props = ariaProps.slider(50, 0, 100, 'Volume');
                expect(props.role).toBe('slider');
                expect(props['aria-valuenow']).toBe(50);
                expect(props['aria-valuemin']).toBe(0);
                expect(props['aria-valuemax']).toBe(100);
                expect(props['aria-label']).toBe('Volume');
                expect(props.tabIndex).toBe(0);
            });
        });

        describe('alert', () => {
            it('returns alert role and assertive live', () => {
                const props = ariaProps.alert();
                expect(props.role).toBe('alert');
                expect(props['aria-live']).toBe('assertive');
            });
        });

        describe('status', () => {
            it('returns status role and polite live', () => {
                const props = ariaProps.status();
                expect(props.role).toBe('status');
                expect(props['aria-live']).toBe('polite');
            });
        });

        describe('combobox', () => {
            it('returns correct combobox props', () => {
                const props = ariaProps.combobox(true, 'listbox-1', 'option-1');
                expect(props.role).toBe('combobox');
                expect(props['aria-expanded']).toBe(true);
                expect(props['aria-controls']).toBe('listbox-1');
                expect(props['aria-activedescendant']).toBe('option-1');
                expect(props['aria-haspopup']).toBe('listbox');
            });
        });

        describe('listbox', () => {
            it('returns correct listbox props', () => {
                const props = ariaProps.listbox('Options', true);
                expect(props.role).toBe('listbox');
                expect(props['aria-label']).toBe('Options');
                expect(props['aria-multiselectable']).toBe(true);
            });
        });

        describe('option', () => {
            it('returns correct option props', () => {
                const props = ariaProps.option(true, false);
                expect(props.role).toBe('option');
                expect(props['aria-selected']).toBe(true);
                expect(props['aria-disabled']).toBe(false);
            });
        });
    });
});

describe('Accessibility Audit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('returns empty array for accessible page', () => {
        document.body.innerHTML = `
            <main>
                <h1>Page Title</h1>
                <button>Click me</button>
                <a href="/">Home</a>
                <label for="input1">Name</label>
                <input id="input1" type="text" />
            </main>
        `;

        const issues = runAccessibilityAudit();
        const errors = issues.filter(i => i.type === 'error');
        expect(errors.length).toBe(0);
    });

    it('detects images without alt', () => {
        document.body.innerHTML = `
            <main><h1>Test</h1><img src="test.jpg" /></main>
        `;

        const issues = runAccessibilityAudit();
        const imgIssues = issues.filter(i => i.element.includes('img'));
        expect(imgIssues.length).toBeGreaterThan(0);
    });

    it('detects buttons without accessible names', () => {
        document.body.innerHTML = `
            <main><h1>Test</h1><button></button></main>
        `;

        const issues = runAccessibilityAudit();
        const btnIssues = issues.filter(i => i.element.includes('button'));
        expect(btnIssues.length).toBeGreaterThan(0);
    });

    it('detects form inputs without labels', () => {
        document.body.innerHTML = `
            <main><h1>Test</h1><input type="text" /></main>
        `;

        const issues = runAccessibilityAudit();
        const inputIssues = issues.filter(i => i.element.includes('input'));
        expect(inputIssues.length).toBeGreaterThan(0);
    });

    it('detects missing h1', () => {
        document.body.innerHTML = `
            <main><h2>Not h1</h2></main>
        `;

        const issues = runAccessibilityAudit();
        const h1Issues = issues.filter(i => i.issue.includes('h1'));
        expect(h1Issues.length).toBeGreaterThan(0);
    });

    it('allows aria-label as alternative to text content', () => {
        document.body.innerHTML = `
            <main><h1>Test</h1><button aria-label="Close">X</button></main>
        `;

        const issues = runAccessibilityAudit();
        const btnIssues = issues.filter(i => i.element.includes('button') && i.type === 'error');
        expect(btnIssues.length).toBe(0);
    });

    it('allows aria-hidden images to skip alt check', () => {
        document.body.innerHTML = `
            <main><h1>Test</h1><img src="decorative.jpg" aria-hidden="true" /></main>
        `;

        const issues = runAccessibilityAudit();
        const imgIssues = issues.filter(i => i.element.includes('img'));
        expect(imgIssues.length).toBe(0);
    });
});
