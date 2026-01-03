/**
 * Design Consistency Checker Script
 * 
 * This script analyzes the codebase for UI/UX inconsistencies
 * Run with: npx ts-node scripts/check-design-consistency.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Issue {
    file: string;
    line: number;
    issue: string;
    suggestion: string;
}

const issues: Issue[] = [];

// Patterns to check for inconsistencies
const PATTERNS = {
    // Border radius - should use rounded-2xl for cards, rounded-lg for buttons
    inconsistentRadius: {
        pattern: /className="[^"]*(?<!sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|disabled:)rounded-xl(?![^"]*(?:dropdown|menu))[^"]*"/g,
        issue: 'Using rounded-xl for card/container (should be rounded-2xl)',
        suggestion: 'Change rounded-xl to rounded-2xl for cards'
    },

    // Spacing - page padding should be responsive p-3 sm:p-4 md:p-6
    hardcodedPadding: {
        pattern: /className="[^"]*\sp-[5-8]\s[^"]*(?<!sm:|md:|lg:|xl:)/g,
        issue: 'Non-responsive page padding detected',
        suggestion: 'Use "p-3 sm:p-4 md:p-6 lg:p-8" for page containers'
    },

    // Gradient - should use from-indigo-600 to-purple-600 for primary
    inconsistentGradient: {
        pattern: /from-indigo-500/g,
        issue: 'Using indigo-500 in gradient (should be indigo-600 for primary)',
        suggestion: 'Change from-indigo-500 to from-indigo-600'
    },

    // Shadow - colored shadows should use /25 opacity
    strongShadow: {
        pattern: /shadow-indigo-500\/[3-9]0/g,
        issue: 'Shadow opacity too high (should be /25)',
        suggestion: 'Change shadow opacity to /25'
    },
};

// Files and directories to check
const COMPONENTS_DIR = path.join(__dirname, '../src/components');
// Note: Pages directory is always scanned as it's a subdirectory of components

function scanFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        Object.entries(PATTERNS).forEach(([_key, { pattern, issue, suggestion }]) => {
            // Create a new regex for each line to reset lastIndex
            const regex = new RegExp(pattern.source, pattern.flags);
            if (regex.test(line)) {
                issues.push({
                    file: filePath.replace(path.join(__dirname, '..'), ''),
                    line: index + 1,
                    issue,
                    suggestion
                });
            }
        });
    });
}

function scanDirectory(dirPath: string): void {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            scanFile(fullPath);
        }
    });
}

function generateReport(): void {
    console.log('\n🎨 Design Consistency Report\n');
    console.log('='.repeat(60));

    if (issues.length === 0) {
        console.log('\n✅ No inconsistencies found!\n');
        return;
    }

    console.log(`\n⚠️  Found ${issues.length} potential issues:\n`);

    // Group by file
    const byFile: Record<string, Issue[]> = {};
    issues.forEach(issue => {
        if (!byFile[issue.file]) byFile[issue.file] = [];
        byFile[issue.file].push(issue);
    });

    Object.entries(byFile).forEach(([file, fileIssues]) => {
        console.log(`\n📄 ${file}`);
        fileIssues.forEach(({ line, issue, suggestion }) => {
            console.log(`   Line ${line}: ${issue}`);
            console.log(`   💡 ${suggestion}`);
        });
    });

    console.log('\n' + '='.repeat(60));
    console.log('Run this script after making changes to verify fixes.\n');
}

// Main
console.log('Scanning for design inconsistencies...');
scanDirectory(COMPONENTS_DIR);
generateReport();
