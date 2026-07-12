import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist', 'android/**', 'supabase/**'] },
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
);
