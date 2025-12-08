#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * This script validates the documentation for Portal Guru:
 * - Checks JSDoc completeness for public APIs
 * - Validates internal links
 * - Validates Mermaid diagram syntax
 * - Checks environment variable documentation
 * 
 * Usage: node scripts/validate-docs.js
 * 
 * @module scripts/validate-docs
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../docs');
const SRC_DIR = path.join(__dirname, '../src');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

let errors = [];
let warnings = [];

/**
 * Log functions
 */
function logError(message) {
    console.log(`${colors.red}✗ ERROR:${colors.reset} ${message}`);
    errors.push(message);
}

function logWarning(message) {
    console.log(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`);
    warnings.push(message);
}

function logSuccess(message) {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logInfo(message) {
    console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Get all files matching pattern in directory
 */
function getFiles(dir, extensions, recursive = true) {
    const files = [];

    if (!fs.existsSync(dir)) {
        return files;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && recursive) {
            if (!item.startsWith('.') && item !== 'node_modules') {
                files.push(...getFiles(fullPath, extensions, recursive));
            }
        } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (extensions.includes(ext)) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

/**
 * Check 1: Validate JSDoc completeness
 */
function checkJSDocCompleteness() {
    console.log('\n📝 Checking JSDoc completeness...\n');

    const serviceFiles = getFiles(path.join(SRC_DIR, 'services'), ['.ts']);
    const hookFiles = getFiles(path.join(SRC_DIR, 'hooks'), ['.ts', '.tsx']);
    const utilFiles = getFiles(path.join(SRC_DIR, 'utils'), ['.ts']);

    const allFiles = [...serviceFiles, ...hookFiles, ...utilFiles];
    let documented = 0;
    let undocumented = 0;

    for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(SRC_DIR, file);

        // Check for exported functions without JSDoc
        const exportedFunctions = content.match(/export (const|function|async function) \w+/g) || [];
        const jsDocComments = content.match(/\/\*\*[\s\S]*?\*\//g) || [];

        if (exportedFunctions.length > 0) {
            if (jsDocComments.length >= exportedFunctions.length * 0.5) {
                documented++;
                logSuccess(`${relativePath} - JSDoc coverage OK`);
            } else {
                undocumented++;
                logWarning(`${relativePath} - Low JSDoc coverage (${jsDocComments.length}/${exportedFunctions.length} functions documented)`);
            }
        }
    }

    const coverage = documented / (documented + undocumented) * 100;
    logInfo(`JSDoc coverage: ${coverage.toFixed(1)}% (${documented}/${documented + undocumented} files)`);

    if (coverage < 80) {
        logWarning('JSDoc coverage is below 80%');
    }
}

/**
 * Check 2: Validate internal links in markdown files
 */
function checkInternalLinks() {
    console.log('\n🔗 Checking internal links...\n');

    const mdFiles = getFiles(DOCS_DIR, ['.md']);
    let validLinks = 0;
    let brokenLinks = 0;

    for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(DOCS_DIR, file);
        const fileDir = path.dirname(file);

        // Find all markdown links: [text](path)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            const linkPath = match[2];

            // Skip external links, anchors, and VitePress absolute paths
            if (linkPath.startsWith('http') || linkPath.startsWith('#') || linkPath.startsWith('mailto:') || linkPath.startsWith('/')) {
                continue;
            }

            // Remove anchor from path
            const cleanPath = linkPath.split('#')[0];

            if (cleanPath) {
                const absolutePath = path.resolve(fileDir, cleanPath);

                if (fs.existsSync(absolutePath)) {
                    validLinks++;
                } else {
                    brokenLinks++;
                    logError(`Broken link in ${relativePath}: ${linkPath}`);
                }
            }
        }
    }

    logInfo(`Link validation: ${validLinks} valid, ${brokenLinks} broken`);
}

/**
 * Check 3: Validate Mermaid diagrams
 */
function checkMermaidDiagrams() {
    console.log('\n📊 Checking Mermaid diagrams...\n');

    const mdFiles = getFiles(DOCS_DIR, ['.md']);
    let validDiagrams = 0;
    let invalidDiagrams = 0;

    const validDiagramTypes = [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
        'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'pie',
        'gantt', 'journey', 'gitGraph', 'C4Context', 'mindmap', 'timeline'
    ];

    for (const file of mdFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(DOCS_DIR, file);

        // Find Mermaid code blocks
        const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
        let match;

        while ((match = mermaidRegex.exec(content)) !== null) {
            const diagram = match[1].trim();
            const firstLine = diagram.split('\n')[0].trim();
            const diagramType = firstLine.split(/\s/)[0];

            if (validDiagramTypes.some(type => firstLine.startsWith(type))) {
                validDiagrams++;
                logSuccess(`${relativePath} - Valid ${diagramType} diagram`);
            } else {
                invalidDiagrams++;
                logError(`${relativePath} - Invalid Mermaid diagram type: ${diagramType}`);
            }
        }
    }

    logInfo(`Mermaid diagrams: ${validDiagrams} valid, ${invalidDiagrams} invalid`);
}

/**
 * Check 4: Validate environment variable documentation
 */
function checkEnvDocumentation() {
    console.log('\n🔐 Checking environment variable documentation...\n');

    // Get all env vars used in code
    const srcFiles = getFiles(SRC_DIR, ['.ts', '.tsx']);
    const usedEnvVars = new Set();

    for (const file of srcFiles) {
        const content = fs.readFileSync(file, 'utf-8');

        // Match import.meta.env.VITE_* and process.env.*
        const envMatches = content.match(/import\.meta\.env\.(\w+)/g) || [];
        const processMatches = content.match(/process\.env\.(\w+)/g) || [];

        envMatches.forEach(m => {
            const varName = m.replace('import.meta.env.', '');
            usedEnvVars.add(varName);
        });

        processMatches.forEach(m => {
            const varName = m.replace('process.env.', '');
            usedEnvVars.add(varName);
        });
    }

    // Check if env vars are documented
    const deploymentDoc = path.join(DOCS_DIR, 'guides', 'deployment.md');

    if (fs.existsSync(deploymentDoc)) {
        const docContent = fs.readFileSync(deploymentDoc, 'utf-8');
        let documented = 0;
        let undocumented = 0;

        for (const envVar of usedEnvVars) {
            if (envVar.startsWith('VITE_') || envVar === 'GEMINI_API_KEY') {
                if (docContent.includes(envVar)) {
                    documented++;
                    logSuccess(`${envVar} - documented`);
                } else {
                    undocumented++;
                    logWarning(`${envVar} - not documented in deployment.md`);
                }
            }
        }

        logInfo(`Environment variables: ${documented} documented, ${undocumented} missing`);
    } else {
        logError('deployment.md not found');
    }
}

/**
 * Check 5: Validate documentation structure
 */
function checkDocumentationStructure() {
    console.log('\n📁 Checking documentation structure...\n');

    const requiredDocs = [
        'README.md',
        'architecture/overview.md',
        'architecture/data-flow.md',
        'architecture/security.md',
        'architecture/offline-sync.md',
        'api/README.md',
        'api/database/tables.md',
        'guides/getting-started.md',
        'guides/contributing.md',
        'guides/deployment.md',
        'guides/troubleshooting.md',
        'guides/testing.md',
    ];

    let existing = 0;
    let missing = 0;

    for (const doc of requiredDocs) {
        const docPath = path.join(DOCS_DIR, doc);

        if (fs.existsSync(docPath)) {
            existing++;
            logSuccess(`${doc} exists`);
        } else {
            missing++;
            logError(`${doc} is missing`);
        }
    }

    logInfo(`Documentation structure: ${existing}/${requiredDocs.length} files present`);
}

/**
 * Main validation function
 */
function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('           Portal Guru Documentation Validator');
    console.log('═══════════════════════════════════════════════════════════');

    // Run all checks
    checkDocumentationStructure();
    checkJSDocCompleteness();
    checkInternalLinks();
    checkMermaidDiagrams();
    checkEnvDocumentation();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('                        Summary');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (errors.length === 0 && warnings.length === 0) {
        console.log(`${colors.green}✓ All checks passed!${colors.reset}\n`);
        process.exit(0);
    } else {
        if (errors.length > 0) {
            console.log(`${colors.red}Errors: ${errors.length}${colors.reset}`);
        }
        if (warnings.length > 0) {
            console.log(`${colors.yellow}Warnings: ${warnings.length}${colors.reset}`);
        }
        console.log('');

        // Exit with error code if there are errors
        process.exit(errors.length > 0 ? 1 : 0);
    }
}

// Run the script
main();
