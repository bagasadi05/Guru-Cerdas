import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'android/**', 'supabase/**', '.delta/**', '.cache/**', 'src/services/database.types.ts'] },
    // F3.1: analytics components must read through src/services/analytics —
    // no direct Supabase client imports. fetchAnalyticsData.ts is the sanctioned
    // data module pending relocation.
    {
        files: ['src/components/pages/analytics/**/*.{ts,tsx}'],
        rules: {
            'no-restricted-imports': ['error', {
                patterns: [{
                    group: ['**/services/supabase'],
                    message: 'Gunakan src/services/analytics/* — komponen analitik tidak boleh mengimpor client Supabase langsung.',
                }],
            }],
        },
    },
    {
        files: ['src/components/pages/analytics/fetchAnalyticsData.ts'],
        rules: { 'no-restricted-imports': 'off' },
    },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'unused-imports': unusedImports,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            // Auto-remove unused imports
            'unused-imports/no-unused-imports': 'error',
            // Stricter type safety
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            // Prevent accidental console logs in production code
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            // Prefer const over let
            'prefer-const': 'error',
            // Prevent variable redeclaration
            'no-redeclare': 'off',
            '@typescript-eslint/no-redeclare': 'error',
            // Disallow unused expressions
            '@typescript-eslint/no-unused-expressions': 'error',
        },
    },
    {
        files: ['src/utils/**/*.{ts,tsx}', 'src/contexts/**/*.{ts,tsx}'],
        rules: {
            // Utility and context modules legitimately export hooks, constants, and helper functions alongside providers
            'react-refresh/only-export-components': 'off',
        },
    },
    {
        files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/setupTests.ts'],
        rules: {
            // Test files frequently use 'any' for partial mocks, spies, and synthetic test payloads
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);

